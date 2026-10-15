#!/usr/bin/env python3
"""Validação do conteúdo do site.

Confere, em todos os JSON de docs/data/:
  - IDs únicos em cada coleção e entre coleções;
  - toda questão com 5 alternativas e exatamente 1 correta;
  - justificativa e fonte preenchidas;
  - toda fonte apontando para arquivo e página que existem em slides-texto/;
  - além disso, que algum termo do item aparece na página citada, quando a
    página tem texto extraído (as de imagem são listadas como "sem texto");
  - nenhum campo obrigatório vazio;
  - referências cruzadas (módulo, ambiguidade, pré-teste, missões) resolvidas;
  - nenhuma alternativa com marcação de negrito, que entregaria o gabarito.

Uso: python3 scripts/validate_content.py
"""

import json
import re
import sys
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DADOS = RAIZ / "docs" / "data"
SLIDES = RAIZ / "slides-texto"

erros: list[str] = []
avisos: list[str] = []


def erro(msg: str) -> None:
    erros.append(msg)


def aviso(msg: str) -> None:
    avisos.append(msg)


def ler(nome: str):
    caminho = DADOS / nome
    if not caminho.exists():
        erro(f"{nome}: arquivo não encontrado")
        return None
    try:
        return json.loads(caminho.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        erro(f"{nome}: JSON inválido — {e}")
        return None


def paginas_dos_slides() -> dict[str, dict[int, str]]:
    """{arquivo: {pagina: texto}} a partir de slides-texto/*.txt."""
    mapa: dict[str, dict[int, str]] = {}
    for arq in sorted(SLIDES.glob("*.txt")):
        bruto = arq.read_text(encoding="utf-8", errors="replace")
        partes = re.split(r"=== p(\d+) ===", bruto)
        mapa[arq.stem] = {
            int(num): texto for num, texto in zip(partes[1::2], partes[2::2])
        }
    return mapa


def sem_acento(t: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", t.lower()) if unicodedata.category(c) != "Mn"
    )


PARADAS = set(
    """a o e de da do das dos em no na nos nas um uma uns umas por para com que se ao aos
    as os mais menos como qual quais quando onde pelo pela sobre entre ser sao e ou nao
    seu sua seus suas este esta isso aquilo ja tambem apenas deve devem pode podem""".split()
)


def termos(texto: str) -> set[str]:
    bruto = sem_acento(re.sub(r"[^\wÀ-ÿ,. ]", " ", texto))
    saida = set()
    for palavra in re.split(r"[\s,]+", bruto):
        palavra = palavra.strip(".")
        if not palavra or palavra in PARADAS:
            continue
        if len(palavra) >= 5 or re.search(r"\d", palavra):
            saida.add(palavra)
    return saida


def checar_fonte(rotulo: str, fonte, paginas, texto_do_item: str) -> None:
    if not isinstance(fonte, dict) or not fonte.get("arquivo") or not fonte.get("pagina"):
        erro(f"{rotulo}: fonte ausente ou incompleta")
        return
    arquivo = fonte["arquivo"]
    pagina = fonte["pagina"]
    if arquivo not in paginas:
        erro(f"{rotulo}: fonte aponta para '{arquivo}', que não existe em slides-texto/")
        return
    if pagina not in paginas[arquivo]:
        erro(f"{rotulo}: {arquivo} não tem a página {pagina}")
        return
    conteudo = paginas[arquivo][pagina].strip()
    if len(conteudo) < 15:
        aviso(f"{rotulo}: {arquivo} p. {pagina} é slide de imagem (sem texto extraído) — confira no PDF")
        return
    da_pagina = termos(conteudo)
    do_item = termos(texto_do_item)
    if not (da_pagina & do_item):
        aviso(
            f"{rotulo}: nenhum termo em comum com {arquivo} p. {pagina} — confira se a página está certa"
        )


def vazio(v) -> bool:
    return v is None or (isinstance(v, str) and not v.strip()) or (isinstance(v, (list, dict)) and not v)


def main() -> int:
    paginas = paginas_dos_slides()
    if not paginas:
        erro("slides-texto/ está vazio: sem como conferir as fontes")

    modulos = ler("modulos.json") or []
    cronograma = ler("cronograma.json") or []
    flashcards = ler("flashcards.json") or []
    questoes = ler("questoes.json") or []
    ambiguidades = ler("ambiguidades.json") or []
    badges = ler("badges.json") or []
    chefoes = ler("chefoes.json") or []

    ids_modulo = {m["id"] for m in modulos}
    ids_amb = {a["id"] for a in ambiguidades}
    ids_questao = {q["id"] for q in questoes}
    todos_ids: dict[str, str] = {}

    def registrar(colecao: str, item_id: str) -> None:
        if item_id in todos_ids:
            erro(f"id repetido: '{item_id}' em {colecao} e em {todos_ids[item_id]}")
        else:
            todos_ids[item_id] = colecao

    # ── módulos ──
    for m in modulos:
        rot = f"modulos.json[{m.get('id','?')}]"
        registrar("modulos.json", m["id"])
        for campo in ("trilha", "titulo", "prioridade", "duracao_min"):
            if vazio(m.get(campo)):
                erro(f"{rot}: campo '{campo}' vazio")
        if m.get("prioridade") not in ("E", "I", "C"):
            erro(f"{rot}: prioridade deve ser E, I ou C")
        if m.get("trilha") not in ("rim", "figado"):
            erro(f"{rot}: trilha deve ser 'rim' ou 'figado'")
        if not m.get("disponivel") and vazio(m.get("chega")):
            erro(f"{rot}: módulo indisponível precisa do campo 'chega'")

    # ── ambiguidades ──
    for a in ambiguidades:
        rot = f"ambiguidades.json[{a.get('id','?')}]"
        registrar("ambiguidades.json", a["id"])
        for campo in ("titulo", "resumo", "lados", "fontes"):
            if vazio(a.get(campo)):
                erro(f"{rot}: campo '{campo}' vazio")
        for f in a.get("fontes", []):
            checar_fonte(rot, f, paginas, a.get("resumo", "") + " " + " ".join(a.get("lados", [])))

    ids_chefao = {x["id"] for x in chefoes}
    ids_badge = {b["id"] for b in badges}
    for x in chefoes:
        rot = f"chefoes.json[{x.get('id','?')}]"
        registrar("chefoes.json", x["id"])
        for campo in ("titulo", "orgao", "questoes", "minutos", "aprovacao", "badge", "desc"):
            if vazio(x.get(campo)):
                erro(f"{rot}: campo '{campo}' vazio")
        if x.get("trilha") not in ("rim", "figado", None):
            erro(f"{rot}: trilha deve ser 'rim', 'figado' ou null")
        if not isinstance(x.get("questoes"), int) or x["questoes"] < 1:
            erro(f"{rot}: 'questoes' deve ser um inteiro positivo")

    for b in badges:
        registrar("badges.json", b["id"])
        if vazio(b.get("titulo")) or vazio(b.get("desc")):
            erro(f"badges.json[{b['id']}]: título ou descrição vazios")

    for x in chefoes:
        if x.get("badge") and x["badge"] not in ids_badge:
            erro(f"chefoes.json[{x['id']}]: conquista '{x['badge']}' não existe em badges.json")
        disponiveis = [
            q for q in questoes
            if (mod := next((m for m in modulos if m["id"] == q["modulo"]), None))
            and mod.get("disponivel")
            and (not x.get("trilha") or mod["trilha"] == x["trilha"])
        ]
        if len(disponiveis) < x.get("questoes", 0):
            aviso(
                f"chefoes.json[{x['id']}]: só há {len(disponiveis)} questões liberadas para "
                f"{x['questoes']} pedidas — o chefão aparece bloqueado até o conteúdo chegar"
            )

    # ── flashcards ──
    for f in flashcards:
        rot = f"flashcards.json[{f.get('id','?')}]"
        registrar("flashcards.json", f["id"])
        for campo in ("modulo", "tipo", "prioridade", "frente", "verso"):
            if vazio(f.get(campo)):
                erro(f"{rot}: campo '{campo}' vazio")
        if f.get("modulo") not in ids_modulo:
            erro(f"{rot}: módulo '{f.get('modulo')}' não existe")
        if f.get("prioridade") not in ("E", "I", "C"):
            erro(f"{rot}: prioridade deve ser E, I ou C")
        if f.get("ambiguidade") and f["ambiguidade"] not in ids_amb:
            erro(f"{rot}: ambiguidade '{f['ambiguidade']}' não existe")
        checar_fonte(rot, f.get("fonte"), paginas, f"{f.get('frente','')} {f.get('verso','')}")

    # ── questões ──
    for q in questoes:
        rot = f"questoes.json[{q.get('id','?')}]"
        registrar("questoes.json", q["id"])
        for campo in ("modulo", "tema", "subtema", "prioridade", "enunciado", "justificativa"):
            if vazio(q.get(campo)):
                erro(f"{rot}: campo '{campo}' vazio")
        if q.get("modulo") not in ids_modulo:
            erro(f"{rot}: módulo '{q.get('modulo')}' não existe")
        if q.get("prioridade") not in ("E", "I", "C"):
            erro(f"{rot}: prioridade deve ser E, I ou C")
        if q.get("dificuldade") not in (1, 2, 3):
            erro(f"{rot}: dificuldade deve ser 1, 2 ou 3")

        alts = q.get("alternativas") or []
        if len(alts) != 5:
            erro(f"{rot}: tem {len(alts)} alternativas, deveriam ser 5")
        for i, a in enumerate(alts):
            if vazio(a):
                erro(f"{rot}: alternativa {'ABCDE'[i]} vazia")
            if "**" in a:
                erro(f"{rot}: alternativa {'ABCDE'[i]} tem negrito, o que entrega o gabarito")
        if len(set(alts)) != len(alts):
            erro(f"{rot}: alternativas repetidas")

        correta = q.get("correta")
        if not isinstance(correta, int) or not 0 <= correta < len(alts):
            erro(f"{rot}: campo 'correta' fora da faixa das alternativas")
        else:
            erradas = q.get("porque_erradas") or {}
            for chave, txt in erradas.items():
                if not chave.isdigit() or not 0 <= int(chave) < len(alts):
                    erro(f"{rot}: porque_erradas tem a chave '{chave}', fora da faixa")
                elif int(chave) == correta:
                    erro(f"{rot}: porque_erradas explica a alternativa correta")
                elif vazio(txt):
                    erro(f"{rot}: porque_erradas['{chave}'] vazio")

        el = q.get("elaboracao")
        if el:
            if vazio(el.get("pergunta")) or vazio(el.get("justificativa")):
                erro(f"{rot}: elaboração sem pergunta ou sem justificativa")
            ops = el.get("opcoes") or []
            if len(ops) < 2:
                erro(f"{rot}: elaboração precisa de ao menos 2 opções")
            if not isinstance(el.get("correta"), int) or not 0 <= el["correta"] < len(ops):
                erro(f"{rot}: elaboração com 'correta' fora da faixa")

        if q.get("ambiguidade") and q["ambiguidade"] not in ids_amb:
            erro(f"{rot}: ambiguidade '{q['ambiguidade']}' não existe")
        checar_fonte(rot, q.get("fonte"), paginas, f"{q.get('enunciado','')} {q.get('justificativa','')}")

    # ── lições ──
    ids_bloco: set[str] = set()
    for m in modulos:
        arquivo = DADOS / "licoes" / f"{m['id']}.json"
        if not arquivo.exists():
            if m.get("disponivel"):
                erro(f"licoes/{m['id']}.json: módulo marcado como disponível, mas sem lição")
            continue
        try:
            licao = json.loads(arquivo.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            erro(f"licoes/{m['id']}.json: JSON inválido — {e}")
            continue
        rot0 = f"licoes/{m['id']}.json"
        if licao.get("id") != m["id"]:
            erro(f"{rot0}: campo 'id' não bate com o nome do arquivo")
        if vazio(licao.get("blocos")):
            erro(f"{rot0}: sem blocos")
        if vazio(licao.get("feynman")):
            erro(f"{rot0}: sem checklist da técnica Feynman")
        for qid in licao.get("preteste", []):
            if qid not in ids_questao:
                erro(f"{rot0}: pré-teste aponta para a questão '{qid}', que não existe")
        for b in licao.get("blocos", []):
            rot = f"{rot0}[{b.get('id','?')}]"
            if b.get("id") in ids_bloco:
                erro(f"{rot}: id de bloco repetido")
            ids_bloco.add(b.get("id"))
            if vazio(b.get("titulo")) or vazio(b.get("pontos")):
                erro(f"{rot}: título ou pontos vazios")
            if b.get("prioridade") and b["prioridade"] not in ("E", "I", "C"):
                erro(f"{rot}: prioridade deve ser E, I ou C")
            if b.get("ambiguidade") and b["ambiguidade"] not in ids_amb:
                erro(f"{rot}: ambiguidade '{b['ambiguidade']}' não existe")
            ch = b.get("checagem")
            if ch:
                alts = ch.get("alternativas") or []
                if len(alts) < 2:
                    erro(f"{rot}: checagem com menos de 2 alternativas")
                if not isinstance(ch.get("correta"), int) or not 0 <= ch["correta"] < len(alts):
                    erro(f"{rot}: checagem com 'correta' fora da faixa")
                if vazio(ch.get("justificativa")):
                    erro(f"{rot}: checagem sem justificativa")
                for i, a in enumerate(alts):
                    if "**" in a:
                        erro(f"{rot}: alternativa {'ABCDE'[i]} da checagem tem negrito, o que entrega o gabarito")
                if ch.get("fonte"):
                    checar_fonte(f"{rot}.checagem", ch["fonte"], paginas, ch.get("justificativa", ""))
            texto = " ".join(b.get("pontos", [])) + " " + " ".join(b.get("cuidado", []) or [])
            checar_fonte(rot, b.get("fonte"), paginas, texto)

    # ── cronograma ──
    ids_missao: set[str] = set()
    for d in cronograma:
        rot0 = f"cronograma.json[{d.get('id','?')}]"
        for campo in ("data", "curto", "rotulo", "titulo", "orgao", "foco"):
            if vazio(d.get(campo)):
                erro(f"{rot0}: campo '{campo}' vazio")
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", d.get("data", "")):
            erro(f"{rot0}: data fora do formato AAAA-MM-DD")
        for mid in d.get("modulos", []):
            if mid not in ids_modulo:
                erro(f"{rot0}: módulo '{mid}' não existe")
        for ms in d.get("missoes", []):
            rot = f"{rot0}[{ms.get('id','?')}]"
            if ms.get("id") in ids_missao:
                erro(f"{rot}: id de missão repetido")
            ids_missao.add(ms.get("id"))
            for campo in ("titulo", "desc", "rota", "tipo"):
                if vazio(ms.get(campo)):
                    erro(f"{rot}: campo '{campo}' vazio")
            if ms.get("tipo") not in ("licoes", "questoes", "cards", "calculo", "feynman", "chefao", "jogo", "livre"):
                erro(f"{rot}: tipo de missão desconhecido: {ms.get('tipo')}")
            for mid in ms.get("modulos", []) or []:
                if mid not in ids_modulo:
                    erro(f"{rot}: módulo '{mid}' não existe")
            if ms.get("tipo") == "chefao" and ms.get("chefao") not in ids_chefao:
                erro(f"{rot}: missão de chefão aponta para '{ms.get('chefao')}', que não existe")

    # ── relatório ──
    com_licao = sum(1 for m in modulos if (DADOS / "licoes" / (m["id"] + ".json")).exists())
    disponiveis = sum(1 for m in modulos if m.get("disponivel"))
    print(f"módulos: {len(modulos)} ({disponiveis} disponíveis) · lições escritas: {com_licao}")
    print(f"questões: {len(questoes)} · flashcards: {len(flashcards)} · ambiguidades: {len(ambiguidades)}")
    print(f"dias no cronograma: {len(cronograma)} · conquistas: {len(badges)} · chefões: {len(chefoes)}")

    if avisos:
        print(f"\n{len(avisos)} aviso(s):")
        for a in avisos:
            print(f"  ~ {a}")
    if erros:
        print(f"\n{len(erros)} ERRO(S):")
        for e in erros:
            print(f"  ✗ {e}")
        return 1
    print("\n✓ conteúdo válido")
    return 0


if __name__ == "__main__":
    sys.exit(main())
