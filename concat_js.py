#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
concat_js.py — Concatena todos os .js do projeto em um único arquivo de texto.

Uso:
  python concat_js.py                # varre a pasta atual e gera projeto_js_concatenado.txt
  python concat_js.py --root src     # varre somente a pasta src
  python concat_js.py --out saida.txt
  python concat_js.py --plain        # sem cabeçalhos entre arquivos
  python concat_js.py --include-jsx  # inclui .jsx além de .js
  python concat_js.py --also-mjs     # inclui .mjs
  python concat_js.py --no-rel-path  # cabeçalhos com caminho absoluto (quando não usar --plain)

Diretórios ignorados por padrão: node_modules, .git, build, dist, .expo, android, ios, .next
"""

import argparse
import os
from pathlib import Path

DEFAULT_IGNORES = {
    "node_modules",
    ".git",
    "build",
    "dist",
    ".expo",
    "android",
    "ios",
    ".next",
    ".turbo",
    ".output",
    "coverage",
    ".cache",
}

def natural_sort_key(s: str):
    import re
    return [int(text) if text.isdigit() else text.lower()
            for text in re.split(r"(\d+)", s)]

def gather_files(root: Path, include_jsx: bool, also_mjs: bool, extra_ignores: set[str]) -> list[Path]:
    exts = {".js"}
    if include_jsx:
        exts.add(".jsx")
    if also_mjs:
        exts.add(".mjs")

    files: list[Path] = []
    ignore_dirs = set(DEFAULT_IGNORES) | extra_ignores

    for dirpath, dirnames, filenames in os.walk(root):
        # filtra diretórios ignorados (in-place)
        dirnames[:] = [d for d in dirnames if d not in ignore_dirs and not d.startswith(".gradle")]
        for name in filenames:
            p = Path(dirpath) / name
            if p.suffix.lower() in exts:
                files.append(p)

    files = sorted(files, key=lambda p: natural_sort_key(str(p)))
    return files

def read_text_safe(p: Path) -> str:
    try:
        return p.read_text(encoding="utf-8", errors="replace")
    except Exception:
        # tenta latin-1 como fallback
        try:
            return p.read_text(encoding="latin-1", errors="replace")
        except Exception as e:
            return f"/* [ERRO ao ler {p}]: {e} */\n"

def main():
    ap = argparse.ArgumentParser(description="Concatena todos os .js do projeto em um único arquivo de texto.")
    ap.add_argument("--root", default=".", help="Diretório raiz para varrer (default: .)")
    ap.add_argument("--out", default="projeto_js_concatenado.txt", help="Arquivo de saída (default: projeto_js_concatenado.txt)")
    ap.add_argument("--plain", action="store_true", help="Não insere cabeçalhos entre arquivos (texto totalmente corrido)")
    ap.add_argument("--include-jsx", action="store_true", help="Inclui arquivos .jsx")
    ap.add_argument("--also-mjs", action="store_true", help="Inclui arquivos .mjs")
    ap.add_argument("--ignore", action="append", default=[], help="Adicionar diretórios extras para ignorar (pode repetir)")
    ap.add_argument("--no-rel-path", action="store_true", help="Nos cabeçalhos, usar caminho absoluto em vez de relativo")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    out_path = Path(args.out).resolve()
    extra_ignores = set(args.ignore)

    files = gather_files(root, include_jsx=args.include_jsx, also_mjs=args.also_mjs, extra_ignores=extra_ignores)
    if not files:
        print("Nenhum arquivo .js encontrado.")
        return

    print(f"Arquivos encontrados: {len(files)}")
    print(f"Escrevendo em: {out_path}")

    out_path.parent.mkdir(parents=True, exist_ok=True)

    with out_path.open("w", encoding="utf-8", errors="replace") as f:
        if not args.plain:
            # sumário
            f.write("/* ===== SUMÁRIO ===== */\n")
            for i, p in enumerate(files, 1):
                path_str = str(p if args.no_rel_path else p.relative_to(root))
                f.write(f"/* {i:03d}. {path_str} */\n")
            f.write("/* ==================== */\n\n")

        for i, p in enumerate(files, 1):
            code = read_text_safe(p)
            if args.plain:
                # apenas concatena com uma quebra de linha entre arquivos
                if i > 1:
                    f.write("\n")
                f.write(code.rstrip() + "\n")
            else:
                path_str = str(p if args.no_rel_path else p.relative_to(root))
                f.write(f"\n/* ===== INÍCIO: {path_str} ===== */\n")
                f.write(code.rstrip() + "\n")
                f.write(f"/* =====  FIM  : {path_str} ===== */\n")

    print("Concluído.")

if __name__ == "__main__":
    main()
