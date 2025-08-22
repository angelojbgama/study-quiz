#!/usr/bin/env python3
# merge_jsons.py
# Une todos os JSONs de uma pasta em um único JSON (um array).
# Uso:
#   python merge_jsons.py /caminho/da/pasta -o unido.json
#   python merge_jsons.py . -r -p "*.json" --sort mtime --dedup-key id

from pathlib import Path
import argparse
import json
import sys

def coletar_arquivos(raiz: Path, padrao: str, recursivo: bool):
    if recursivo:
        yield from raiz.rglob(padrao)
    else:
        yield from raiz.glob(padrao)

def ordenar_arquivos(arquivos, criterio: str):
    if criterio == "name":
        return sorted(arquivos, key=lambda p: p.name.lower())
    if criterio == "mtime":
        return sorted(arquivos, key=lambda p: p.stat().st_mtime)
    return list(arquivos)

def carregar_json(caminho: Path):
    with caminho.open("r", encoding="utf-8") as f:
        conteudo = f.read().strip()
        if not conteudo:
            return None
        return json.loads(conteudo)

def deduplicar_itens(itens, chave: str):
    vistos = set()
    resultado = []
    for item in itens:
        if isinstance(item, dict) and chave in item:
            valor = item[chave]
            if valor in vistos:
                continue
            vistos.add(valor)
        resultado.append(item)
    return resultado

def main():
    parser = argparse.ArgumentParser(
        description="Une todos os JSONs de uma pasta em um único JSON (um array)."
    )
    parser.add_argument("pasta", help="Pasta onde estão os .json", type=str)
    parser.add_argument("-o", "--output", default="unido.json",
                        help="Arquivo de saída (default: unido.json)")
    parser.add_argument("-r", "--recursive", action="store_true",
                        help="Pesquisar recursivamente nas subpastas")
    parser.add_argument("-p", "--pattern", default="*.json",
                        help="Padrão de nome (glob) para arquivos (default: *.json)")
    parser.add_argument("--sort", choices=["name", "mtime", "none"], default="name",
                        help="Ordenação dos arquivos: name, mtime ou none (default: name)")
    parser.add_argument("--indent", type=int, default=2,
                        help="Indentação do JSON de saída (default: 2)")
    parser.add_argument("--skip-invalid", action="store_true",
                        help="Ignora arquivos com JSON inválido (em vez de abortar)")
    parser.add_argument("--dedup-key", type=str, default=None,
                        help="Remove itens duplicados no array final com base nesta chave (ex.: id)")
    parser.add_argument("--ensure-ascii", action="store_true",
                        help="Força escape ASCII no JSON de saída")
    args = parser.parse_args()

    pasta = Path(args.pasta)
    if not pasta.exists() or not pasta.is_dir():
        print(f"ERRO: pasta '{pasta}' não existe ou não é um diretório.", file=sys.stderr)
        sys.exit(1)

    arquivos = list(coletar_arquivos(pasta, args.pattern, args.recursive))
    if not arquivos:
        print("Aviso: nenhum arquivo encontrado com o padrão informado.", file=sys.stderr)

    arquivos = ordenar_arquivos(arquivos, args.sort)

    agregados = []
    for arq in arquivos:
        try:
            data = carregar_json(arq)
        except json.JSONDecodeError as e:
            msg = f"JSON inválido em '{arq}': {e}"
            if args.skip_invalid:
                print(f"Aviso: {msg} — ignorando.", file=sys.stderr)
                continue
            else:
                print(msg, file=sys.stderr)
                sys.exit(2)
        except Exception as e:
            msg = f"Falha ao ler '{arq}': {e}"
            if args.skip_invalid:
                print(f"Aviso: {msg} — ignorando.", file=sys.stderr)
                continue
            else:
                print(msg, file=sys.stderr)
                sys.exit(3)

        if data is None:
            continue

        if isinstance(data, list):
            agregados.extend(data)
        else:
            agregados.append(data)

    if args.dedup_key:  # <-- corrigido
        agregados = deduplicar_itens(agregados, args.dedup_key)  # <-- corrigido

    saida = Path(args.output)
    saida.parent.mkdir(parents=True, exist_ok=True)
    with saida.open("w", encoding="utf-8") as f:
        json.dump(agregados, f, ensure_ascii=args.ensure_ascii, indent=args.indent)

    print(f"OK! {len(agregados)} itens salvos em '{saida}'.")

if __name__ == "__main__":
    main()
