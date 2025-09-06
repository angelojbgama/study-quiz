# tools/refactor_router.py
import argparse
import json
import os
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path
from typing import Iterable

# --------- Config padrão ---------
DEFAULT_ROOT = Path(".").resolve()
SRC_DIRS = ["src"]  # pastas onde vamos procurar arquivos JS/TS
EXTS = {".js", ".jsx", ".ts", ".tsx"}

# Mapeamentos opcionais de nomes de rotas em strings (uso cauteloso)
ROUTE_RENAMES = {
    "QuestionEditorScreen": "QuestionEditor",
}

# ---------------------------------


def debug(msg: str):
    print(f"[refactor] {msg}")


def iter_code_files(root: Path, src_dirs: Iterable[str]) -> Iterable[Path]:
    for base in src_dirs:
        base_path = (root / base).resolve()
        if not base_path.exists():
            continue
        for p in base_path.rglob("*"):
            if p.is_file() and p.suffix in EXTS:
                yield p
    # também inclui arquivos de nível raiz comuns (ex.: App.js)
    for name in ["App.js", "app.json", "app.config.js", "app.config.ts"]:
        p = root / name
        if p.exists() and p.is_file():
            yield p


def backup_path(root: Path) -> Path:
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    return root / f".backup_refactor_{ts}"


def make_backup(root: Path, dry: bool = False):
    bk = backup_path(root)
    to_copy = []

    # backup de src/app, se existir
    app_dir = root / "src" / "app"
    if app_dir.exists():
        to_copy.append(("src/app", app_dir))

    # package.json
    pkg = root / "package.json"
    if pkg.exists():
        to_copy.append(("package.json", pkg))

    if not to_copy:
        debug("Nenhum item crítico para backup encontrado (ok).")
        return

    if dry:
        debug(f"(dry-run) Criaria backup em: {bk}")
        for rel, p in to_copy:
            debug(f"(dry-run)  - copiaria {rel}")
        return

    bk.mkdir(parents=True, exist_ok=True)
    for rel, p in to_copy:
        dest = bk / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        if p.is_dir():
            shutil.copytree(p, dest)
        else:
            shutil.copy2(p, dest)
    debug(f"Backup criado em: {bk}")


def rename_src_app_to_core(root: Path, dry: bool = False) -> bool:
    src_app = root / "src" / "app"
    src_core = root / "src" / "core"
    if not src_app.exists():
        debug("Pasta src/app não encontrada (ok).")
        return False
    if src_core.exists():
        debug("Pasta src/core já existe. Vou mover o conteúdo de src/app para src/core (merge).")
        if not dry:
            for item in src_app.iterdir():
                target = src_core / item.name
                if item.is_dir():
                    shutil.move(str(item), str(target))
                else:
                    shutil.move(str(item), str(target))
            # remove src/app vazio
            try:
                src_app.rmdir()
            except OSError:
                pass
        return True
    if dry:
        debug("(dry-run) Renomearia src/app -> src/core")
        return True
    shutil.move(str(src_app), str(src_core))
    debug("Renomeado: src/app -> src/core")
    return True


# transforma apenas paths dentro de import/export/require
IMPORT_PATTERNS = [
    re.compile(r'(import\s+[^;]*?\s+from\s+)([\'"])([^\'"]+)(\2)'),
    re.compile(r'(export\s+[^;]*?\s+from\s+)([\'"])([^\'"]+)(\2)'),
    re.compile(r'(\brequire\(\s*)([\'"])([^\'"]+)(\2)(\s*\))'),
]

def transform_import_path(p: str) -> str:
    original = p
    # casos explícitos
    p = p.replace("src/app/", "src/core/")
    p = p.replace("/app/", "/core/")
    p = p.replace("\\app\\", "\\core\\")  # windows-style, por via das dúvidas

    # relativos
    if p.startswith("../app/"):
        p = "../core/" + p[len("../app/"):]
    if p.startswith("./app/"):
        p = "./core/" + p[len("./app/"):]
    if p.startswith("app/"):
        # muito raro e perigoso, só altera se começar exatamente com "app/"
        p = "core/" + p[len("app/"):]

    return p if p != original else original


def refactor_imports_in_text(text: str) -> str:
    def _repl(m):
        prefix, quote, path, suffix = m.group(1), m.group(2), m.group(3), m.group(4)
        new_path = transform_import_path(path)
        return f"{prefix}{quote}{new_path}{quote}"

    def _repl_req(m):
        prefix, quote, path, _quote2, tail = m.groups()
        new_path = transform_import_path(path)
        return f"{prefix}{quote}{new_path}{quote}{tail}"

    for pat in IMPORT_PATTERNS[:-1]:
        text = pat.sub(_repl, text)
    text = IMPORT_PATTERNS[-1].sub(_repl_req, text)
    return text


def remove_statusbar_translucent_lines(text: str) -> str:
    # remove linhas contendo "statusBarTranslucent:" e opções vizinhas com trailing vírgula
    # trata casos simples de objeto de opções
    lines = text.splitlines()
    out = []
    for i, ln in enumerate(lines):
        if "statusBarTranslucent" in ln:
            # simplesmente pula a linha
            continue
        out.append(ln)
    return "\n".join(out)


def rename_routes_in_text(text: str) -> str:
    # substitui apenas strings literais exatas "QuestionEditorScreen" -> "QuestionEditor"
    for old, new in ROUTE_RENAMES.items():
        text = re.sub(rf'(["\']){re.escape(old)}\1', rf'"\g<0>"', text)  # placeholder, será trocado abaixo
        # A regex acima apenas marca; agora troca literal segura:
        text = text.replace(f'"{old}"', f'"{new}"').replace(f"'{old}'", f"'{new}'")
    return text


def process_file(p: Path, fix_statusbar: bool, rename_routes: bool, dry: bool) -> bool:
    try:
        src = p.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return False

    dst = refactor_imports_in_text(src)
    if fix_statusbar:
        dst = remove_statusbar_translucent_lines(dst)
    if rename_routes:
        dst = rename_routes_in_text(dst)

    if dst != src:
        if dry:
            debug(f"(dry-run) Alteraria: {p.relative_to(DEFAULT_ROOT)}")
            return True
        p.write_text(dst, encoding="utf-8")
        debug(f"Alterado: {p.relative_to(DEFAULT_ROOT)}")
        return True
    return False


def remove_expo_router_from_package_json(root: Path, dry: bool) -> bool:
    pkg = root / "package.json"
    if not pkg.exists():
        debug("package.json não encontrado (ok).")
        return False
    try:
        data = json.loads(pkg.read_text(encoding="utf-8"))
    except Exception as e:
        debug(f"Falha ao ler package.json: {e}")
        return False

    changed = False
    for key in ("dependencies", "devDependencies"):
        if key in data and isinstance(data[key], dict) and "expo-router" in data[key]:
            debug(f"Removendo expo-router de {key}...")
            if not dry:
                data[key].pop("expo-router", None)
            changed = True

    if changed and not dry:
        pkg.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        debug("package.json atualizado (expo-router removido).")
    elif changed and dry:
        debug("(dry-run) Atualizaria package.json (remover expo-router).")
    else:
        debug("expo-router não está listado em package.json (ok).")

    return changed


def main():
    ap = argparse.ArgumentParser(description="Refatora projeto: desativa Expo Router e ajusta imports para src/core.")
    ap.add_argument("--root", default=str(DEFAULT_ROOT), help="raiz do projeto (default: diretório atual)")
    ap.add_argument("--dry-run", action="store_true", help="não escreve nada; só mostra o que faria")
    ap.add_argument("--remove-expo-router", action="store_true", help="remove expo-router do package.json (se existir)")
    ap.add_argument("--fix-statusbar", action="store_true", help="remove linhas com statusBarTranslucent nos navegadores")
    ap.add_argument("--rename-routes", action="store_true", help="renomeia rotas problemáticas (ex.: QuestionEditorScreen -> QuestionEditor)")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    os.chdir(root)
    debug(f"Raiz: {root}")

    # 1) backup
    make_backup(root, dry=args.dry_run)

    # 2) renomeia src/app -> src/core
    moved = rename_src_app_to_core(root, dry=args.dry_run)
    if not moved:
        debug("Nada para renomear em src/app (ok).")

    # 3) percorre arquivos e atualiza imports/require (+ opções)
    changed_count = 0
    for f in iter_code_files(root, SRC_DIRS):
        if process_file(f, fix_statusbar=args.fix_statusbar, rename_routes=args.rename_routes, dry=args.dry_run):
            changed_count += 1
    debug(f"Arquivos alterados: {changed_count}")

    # 4) package.json: remove expo-router (opcional)
    if args.remove_expo_router:
        remove_expo_router_from_package_json(root, dry=args.dry_run)

    debug("Feito.")
    debug("Próximos passos sugeridos:")
    debug("  - Limpar cache: npx expo start -c")
    debug("  - Se removeu o expo-router, rode a instalação para garantir lockfile atualizado (opcional)")
    debug("  - Teste a navegação: a Tab bar deve permanecer e as rotas do Stack funcionar normalmente.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
