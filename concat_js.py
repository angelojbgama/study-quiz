#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Concat all .js files (optionally other extensions) into a single text file.

Usage examples:
  # Recursively scan current directory (.) and write to all_js.txt
  python concat_js.py

  # Choose a project folder and output name
  python concat_js.py --root ./meu_projeto --output unidos.txt

  # Include .js, .jsx and .mjs, skip node_modules and dist (default), sort by path
  python concat_js.py --ext .js .jsx .mjs

  # Sort by modification time (newest first)
  python concat_js.py --sort mtime

  # Do not add file headers in the output
  python concat_js.py --no-header

  # Exclude extra folders (in addition to defaults)
  python concat_js.py --exclude-folders vendor third_party

  # Only scan top-level (no recursion)
  python concat_js.py --no-recursive
"""

import argparse
import os
from pathlib import Path
from datetime import datetime

DEFAULT_EXCLUDED_DIRS = {
    "node_modules", ".git", "dist", "build", "coverage", ".next", "out",
    ".cache", ".turbo", ".idea", ".vscode", "__pycache__", ".venv", "venv", "env", ".expo",
    ""
}

def human_size(num_bytes: int) -> str:
    for unit in ["B", "KB", "MB", "GB"]:
        if num_bytes < 1024.0:
            return f"{num_bytes:.1f} {unit}"
        num_bytes /= 1024.0
    return f"{num_bytes:.1f} TB"

def collect_files(root: Path, recursive: bool, ex_dirs: set[str], extensions: set[str]) -> list[Path]:
    """
    Scan `root` for files with the given extensions. Returns a list of Path objects.
    """
    files: list[Path] = []
    ext_norm = {e.lower() for e in extensions}
    root = root.resolve()

    if recursive:
        for cur_root, dirs, filenames in os.walk(root, followlinks=False):
            # prune excluded directories
            dirs[:] = [d for d in dirs if d not in ex_dirs]
            for name in filenames:
                p = Path(cur_root) / name
                if p.suffix.lower() in ext_norm:
                    files.append(p)
    else:
        for p in root.iterdir():
            if p.is_file() and p.suffix.lower() in ext_norm:
                files.append(p)

    return files

def read_file_text(p: Path, encoding: str = "utf-8") -> str:
    with open(p, "r", encoding=encoding, errors="replace") as f:
        text = f.read()
    # Normalize newlines
    return text.replace("\r\n", "\n").replace("\r", "\n")

def write_output_header(f, root: Path, files_count: int, total_size: int, args):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    ex_dirs_list = sorted(args.exclude_folders)
    header = [
        "/*",
        f"  Arquivo gerado por concat_js.py em {now}",
        f"  Raiz escaneada: {root}",
        f"  Recursivo: {'sim' if args.recursive else 'não'}",
        f"  Extensões: {', '.join(sorted(args.ext))}",
        f"  Pastas excluídas: {', '.join(ex_dirs_list) if ex_dirs_list else '(nenhuma)'}",
        f"  Ordenação: {args.sort}",
        f"  Total de arquivos: {files_count}",
        f"  Tamanho combinado: {human_size(total_size)}",
        "*/",
        ""
    ]
    f.write("\n".join(header))

def main():
    parser = argparse.ArgumentParser(
        description="Lê todos os arquivos .js (e/ou outras extensões) e concatena em um único arquivo de texto."
    )
    parser.add_argument("--root", default=".", help="Diretório raiz para procurar arquivos (padrão: .)")
    parser.add_argument("--output", "-o", default="all_js.txt", help="Arquivo de saída (padrão: all_js.txt)")
    parser.add_argument("--ext", nargs="+", default=[".js"], help="Extensões a incluir (ex.: .js .jsx .mjs). Padrão: .js")
    parser.add_argument("--exclude-folders", nargs="*", default=[], help="Pastas extras para excluir além das padrão (node_modules, dist, build, etc.)")
    parser.add_argument("--include-hidden", action="store_true", help="Incluir arquivos/pastas ocultos (começando com .). Por padrão são incluídos, exceto as pastas padrão excluídas.")
    parser.add_argument("--no-recursive", dest="recursive", action="store_false", help="Não procurar recursivamente")
    parser.add_argument("--sort", choices=["path", "name", "mtime", "size"], default="path", help="Critério de ordenação (padrão: path)")
    parser.add_argument("--no-header", dest="with_header", action="store_false", help="Não escrever cabeçalho e separadores de arquivo")
    parser.add_argument("--max-size-mb", type=float, default=None, help="Ignorar arquivos maiores que este tamanho (em MB). Padrão: incluir todos.")
    parser.add_argument("--follow-symlinks", action="store_true", help="(Avançado) Seguir links simbólicos (padrão: não)")
    args = parser.parse_args()

    root = Path(args.root).expanduser()
    if not root.exists() or not root.is_dir():
        raise SystemExit(f"Diretório raiz inválido: {root}")

    # Build excluded directories set
    excluded = set(DEFAULT_EXCLUDED_DIRS)
    for extra in args.exclude_folders:
        excluded.add(extra)

    # Collect files
    files = collect_files(root, args.recursive, excluded, set(args.ext))

    # Sort files
    if args.sort == "path":
        files.sort(key=lambda p: str(p).lower())
    elif args.sort == "name":
        files.sort(key=lambda p: p.name.lower())
    elif args.sort == "mtime":
        files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    elif args.sort == "size":
        files.sort(key=lambda p: p.stat().st_size, reverse=True)

    output_path = Path(args.output).expanduser().resolve()

    # Prevent including the output file itself if it resides under root
    files = [p for p in files if p.resolve() != output_path]

    # Optionally filter by size
    if args.max_size_mb is not None:
        limit_bytes = int(args.max_size_mb * (1024 ** 2))
        files = [p for p in files if p.stat().st_size <= limit_bytes]

    total_size = sum(p.stat().st_size for p in files)
    if not files:
        print("Nenhum arquivo encontrado com as extensões especificadas.")
        return

    # Ensure parent directory for output
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8", errors="replace") as out:
        if args.with_header:
            write_output_header(out, root.resolve(), len(files), total_size, args)

        for i, p in enumerate(files, start=1):
            try:
                content = read_file_text(p)
            except Exception as e:
                print(f"[AVISO] Falha ao ler {p}: {e}")
                continue

            if args.with_header:
                # relative path if possible
                try:
                    rel = p.resolve().relative_to(root.resolve())
                except Exception:
                    rel = p.name
                sep = [
                    "",
                    f"/* ===== Início do arquivo #{i}: {rel} ===== */",
                    ""
                ]
                out.write("\n".join(sep))

            out.write(content)

            if args.with_header:
                out.write("\n\n/* ===== Fim do arquivo ===== */\n")

    print(f"OK! Concatenei {len(files)} arquivo(s) em: {output_path}")
    print(f"Tamanho combinado: {human_size(total_size)}")

# Python 3.9+ compatibility for Path.is_relative_to
def _patch_is_relative_to():
    if not hasattr(Path, "is_relative_to"):
        def is_relative_to(self, *other):
            try:
                self.relative_to(*other)
                return True
            except Exception:
                return False
        setattr(Path, "is_relative_to", is_relative_to)

if __name__ == "__main__":
    _patch_is_relative_to()
    main()
