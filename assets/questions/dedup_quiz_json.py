#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Remove questões duplicadas de um JSON de quiz SEM mesclar conteúdo.

Formatos aceitos:
1) Array JSON padrão: [ {...}, {...}, ... ]
2) NDJSON: um objeto JSON por linha
3) Objetos separados por vírgulas sem colchetes (o script tenta normalizar)

Chave de deduplicação:
- Campo "question" normalizado (minúsculas, espaços colapsados, sem acentos por padrão)
- Opcional: incluir também "quiz" na chave (--include-quiz-in-key)

Uso:
  python dedup_quiz_json.py -i input.json -o sem_duplicatas.json
  python dedup_quiz_json.py -i input.json -o out.json --include-quiz-in-key
  python dedup_quiz_json.py -i input.json -o out.json --list-removed
  python dedup_quiz_json.py -i input.json -o out.json --no-strip-accents
  # manter a ÚLTIMA ocorrência de cada questão
  python dedup_quiz_json.py -i input.json -o out.json --keep-last
"""
import argparse
import json
import re
import unicodedata
from pathlib import Path
from typing import Any, Dict, List, Tuple


def normalize_text(s: Any, strip_accents: bool = True) -> str:
    """Minúsculas, espaços colapsados e (opcionalmente) sem acentos."""
    if s is None:
        return ""
    text = str(s).strip()
    text = re.sub(r"\s+", " ", text)
    text = text.casefold()
    if strip_accents:
        text = unicodedata.normalize("NFKD", text)
        text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return text


def make_key(item: Dict[str, Any], include_quiz: bool, strip_accents: bool) -> str:
    q = normalize_text(item.get("question", ""), strip_accents=strip_accents)
    if include_quiz:
        quiz = normalize_text(item.get("quiz", ""), strip_accents=strip_accents)
        return f"{quiz}:::{q}"
    return q


def load_items(path: Path) -> List[Dict[str, Any]]:
    """Carrega itens a partir de arquivo em diferentes formatos."""
    text = path.read_text(encoding="utf-8")

    # 1) Tenta JSON padrão
    try:
        data = json.loads(text)
        if isinstance(data, list):
            return data
        elif isinstance(data, dict):
            return [data]
    except Exception:
        pass

    # 2) Tenta NDJSON (um objeto por linha)
    items: List[Dict[str, Any]] = []
    ndjson_ok = True
    for line in text.splitlines():
        line = line.strip().rstrip(",")
        if not line:
            continue
        try:
            obj = json.loads(line)
            if isinstance(obj, dict):
                items.append(obj)
            else:
                ndjson_ok = False
                break
        except Exception:
            ndjson_ok = False
            break
    if ndjson_ok and items:
        return items

    # 3) Tenta embrulhar em [ ... ] e limpar vírgula final
    wrapped = "[" + text.strip().rstrip(",") + "]"
    try:
        data = json.loads(wrapped)
        if isinstance(data, list):
            return data
    except Exception as e:
        raise SystemExit(f"Falha ao ler o JSON. Verifique o formato. Erro: {e}")

    return []


def main():
    ap = argparse.ArgumentParser(description="Remove questões duplicadas de um JSON de quiz (sem mesclar).")
    ap.add_argument("-i", "--input", required=True, help="Caminho do JSON de entrada")
    ap.add_argument("-o", "--output", required=True, help="Caminho do JSON de saída (sem duplicatas)")
    ap.add_argument(
        "--include-quiz-in-key",
        action="store_true",
        help="Inclui 'quiz' junto com 'question' na chave de deduplicação"
    )
    ap.add_argument(
        "--no-strip-accents",
        action="store_true",
        help="Não remover acentos na normalização (por padrão remove)"
    )
    ap.add_argument(
        "--list-removed",
        action="store_true",
        help="Lista as perguntas que foram removidas por serem duplicatas"
    )
    ap.add_argument(
        "--keep-last",
        action="store_true",
        help="Mantém a ÚLTIMA ocorrência de cada pergunta (padrão: mantém a PRIMEIRA)"
    )
    args = ap.parse_args()

    in_path = Path(args.input)
    out_path = Path(args.output)

    if not in_path.exists():
        raise SystemExit(f"Arquivo de entrada não encontrado: {in_path}")

    items = load_items(in_path)
    if not items:
        raise SystemExit("Nenhum item de quiz encontrado no arquivo de entrada.")

    strip_accents = not args.no_strip_accents
    include_quiz = args.include_quiz_in_key

    removed: List[Tuple[str, Dict[str, Any]]] = []

    if not args.keep_last:
        # Mantém a PRIMEIRA ocorrência
        seen_keys = set()
        deduped: List[Dict[str, Any]] = []
        for it in items:
            key = make_key(it, include_quiz=include_quiz, strip_accents=strip_accents)
            if key in seen_keys:
                removed.append((key, it))
            else:
                seen_keys.add(key)
                deduped.append(it)
    else:
        # Mantém a ÚLTIMA ocorrência sem alterar a ordem final
        last_index = {}
        for idx, it in enumerate(items):
            key = make_key(it, include_quiz=include_quiz, strip_accents=strip_accents)
            last_index[key] = idx

        deduped = []
        for idx, it in enumerate(items):
            key = make_key(it, include_quiz=include_quiz, strip_accents=strip_accents)
            if last_index[key] == idx:
                deduped.append(it)
            else:
                removed.append((key, it))

    out_path.write_text(json.dumps(deduped, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Itens lidos: {len(items)}")
    print(f"Itens após deduplicação: {len(deduped)}")
    print(f"Duplicatas removidas: {len(removed)}")

    if args.list_removed and removed:
        print("\n--- Duplicatas removidas ---")
        for k, it in removed:
            q = it.get("question", "")
            quiz = it.get("quiz", "")
            resumo = (q[:80] + "…") if isinstance(q, str) and len(q) > 80 else q
            print(f"- [{k}] quiz='{quiz}' question='{resumo}'")


if __name__ == "__main__":
    main()
