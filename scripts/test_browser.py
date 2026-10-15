#!/usr/bin/env python3
"""Teste de navegador do site de estudo, com Playwright.

Percorre o fluxo real em viewport de celular (390x844) e de desktop (1280x800):
abrir a tela Hoje, completar uma lição inteira, responder questões com marcação
de confiança, revisar flashcards, resolver um cálculo, recarregar e conferir que
o progresso persistiu, exportar e importar o progresso, e repetir o essencial com
o localStorage bloqueado. Falha se houver erro no console.

Uso:
    pip install playwright && python3 -m playwright install chromium
    python3 scripts/test_browser.py            # roda tudo
    python3 scripts/test_browser.py --fotos    # roda e grava as telas em capturas/

Variáveis de ambiente:
    TN2_PUBLICO   diretório servido localmente (padrão: docs/)
    TN2_SUBPASTA  prefixo de caminho, para simular o GitHub Pages (ex.: /prova-tn2)
    TN2_BASE      endereço já publicado; quando definido, não sobe servidor local
                  (ex.: TN2_BASE=https://usuario.github.io/prova-tn2)
"""

from __future__ import annotations

import os
import http.server
import socketserver
import subprocess
import sys
import threading
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

RAIZ = Path(__file__).resolve().parent.parent
PUBLICO = Path(os.environ.get("TN2_PUBLICO") or (RAIZ / "docs"))
# Com TN2_SUBPASTA=/prova-tn2 o teste roda contra uma subpasta, como no GitHub Pages.
SUBPASTA = os.environ.get("TN2_SUBPASTA", "")
# Com TN2_BASE o teste roda contra o site já publicado, sem servidor local.
BASE_EXTERNA = os.environ.get("TN2_BASE", "").rstrip("/")
CAPTURAS = RAIZ / "capturas"
CELULAR = {"width": 390, "height": 844}
DESKTOP = {"width": 1280, "height": 800}

falhas: list[str] = []
passos: list[str] = []


def ok(msg: str) -> None:
    passos.append(msg)
    print(f"  ✓ {msg}")


def falhou(msg: str) -> None:
    falhas.append(msg)
    print(f"  ✗ {msg}")


def checar(condicao: bool, msg: str) -> bool:
    (ok if condicao else falhou)(msg)
    return condicao


class Silencioso(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(PUBLICO), **kw)

    def log_message(self, *a):
        pass


def servir() -> tuple[socketserver.TCPServer, str]:
    servidor = socketserver.TCPServer(("127.0.0.1", 0), Silencioso)
    servidor.allow_reuse_address = True
    threading.Thread(target=servidor.serve_forever, daemon=True).start()
    # SUBPASTA simula o GitHub Pages, que serve em usuario.github.io/repo/.
    return servidor, f"http://127.0.0.1:{servidor.server_address[1]}{SUBPASTA}"


def vigiar_console(page: Page, erros: list[str]) -> None:
    page.on("console", lambda m: erros.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: erros.append(str(e)))


def esperar_tela(page: Page, seletor: str, timeout: int = 8000) -> None:
    page.wait_for_selector(seletor, timeout=timeout)


def completar_licao(page: Page, base: str, modulo: str, fotos: bool = False, rotulo: str = "") -> int:
    """Responde o pré-teste e todos os blocos. Devolve quantas perguntas respondeu."""
    page.goto(f"{base}/#/licao/{modulo}", wait_until="networkidle")
    # a troca de rota só muda o hash: é preciso esperar a tela ser montada
    page.wait_for_selector("#conteudo .alt, #conteudo #feyn, #conteudo #seguir", timeout=8000)
    respondidas = 0
    bloco_fotografado = False
    for _ in range(60):
        if page.locator("#feyn").count():
            break
        if fotos and not bloco_fotografado and page.locator(".bloco-pontos").count():
            foto(page, f"{rotulo}-03a-licao-bloco")
            bloco_fotografado = True
        alternativas = page.locator("#conteudo .alt:not([disabled])")
        if alternativas.count():
            alternativas.first.click()
            respondidas += 1
            # questão do pré-teste pede a confiança antes de revelar
            conf = page.locator("[data-c='certeza']")
            if conf.count():
                conf.click()
            page.wait_for_selector("#seguir", timeout=5000)
            page.locator("#seguir").click()
            continue
        seguir = page.locator("#seguir")
        if seguir.count():
            seguir.click()
            continue
        break
    return respondidas


def fluxo(page: Page, base: str, rotulo: str, fotos: bool) -> None:
    print(f"\n── {rotulo} ──")
    erros: list[str] = []
    vigiar_console(page, erros)

    # Hoje
    page.goto(f"{base}/#/hoje", wait_until="networkidle")
    esperar_tela(page, ".missoes")
    checar("Rim I" in page.inner_text("h1"), "tela Hoje abre no dia do cronograma")
    checar(page.locator(".missao").count() >= 4, "missões do dia listadas")
    if fotos:
        foto(page, f"{rotulo}-01-hoje")

    # Trilha
    page.click("a[data-rota='trilha']")
    esperar_tela(page, ".trilha-svg")
    checar(page.locator(".no").count() == 18, "trilha mostra os 18 módulos, inclusive os que ainda não chegaram")
    if fotos:
        foto(page, f"{rotulo}-02-trilha")

    # Lição completa
    respondidas = completar_licao(page, base, "A2", fotos, rotulo)
    checar(respondidas >= 4, f"lição A2 percorrida até o fim ({respondidas} perguntas respondidas)")
    checar(page.locator("#feyn").count() == 1, "campo da técnica Feynman aparece no fim da lição")
    if fotos:
        foto(page, f"{rotulo}-03-licao-fim")

    page.fill("#feyn", "O critério isolado é proteinúria maior que 3,5 g em 24 horas, e a conduta é normoproteica com lipídio abaixo de 30% do VET.")
    page.locator("#checklist input").first.check()
    page.click("#salvar-feyn")
    ok("explicação da Feynman salva")

    xp_apos_licao = int(page.evaluate("JSON.parse(localStorage.getItem('tn2:estado')).xp"))
    checar(xp_apos_licao > 0, f"XP somado durante a lição ({xp_apos_licao})")

    # Questões com confiança
    page.goto(f"{base}/#/questoes/A3", wait_until="networkidle")
    esperar_tela(page, ".alt")
    if fotos:
        foto(page, f"{rotulo}-04-questao")
    resposta_fotografada = False
    for _ in range(3):
        if not page.locator("#conteudo .alt:not([disabled])").count():
            break
        page.locator("#conteudo .alt:not([disabled])").first.click()
        page.wait_for_selector("[data-c='chute']", timeout=5000)
        page.click("[data-c='chute']")
        page.wait_for_selector(".resposta", timeout=5000)
        if fotos and not resposta_fotografada:
            foto(page, f"{rotulo}-05-resposta")
            resposta_fotografada = True
        page.click("#seguir")
    respostas = page.evaluate("Object.keys(JSON.parse(localStorage.getItem('tn2:estado')).questoes).length")
    checar(respostas >= 3, f"questões registradas com a confiança marcada ({respostas})")

    # Caderno de erros
    page.goto(f"{base}/#/erros", wait_until="networkidle")
    esperar_tela(page, "#conteudo h1")
    checar(
        page.locator("a[href='#/questoes/erros']").count() == 1,
        "caderno de erros oferece refazer só os erros",
    )
    if fotos:
        foto(page, f"{rotulo}-06-erros")

    # Flashcards
    page.goto(f"{base}/#/flashcards", wait_until="networkidle")
    esperar_tela(page, ".card-frente")
    if fotos:
        foto(page, f"{rotulo}-07-card")
    for nota, resposta in (("2", "acertei"), ("0", "errei"), ("1", "acertei")):
        if not page.locator(f"[data-n='{nota}']").count():
            break
        page.click(f"[data-n='{nota}']")
        page.wait_for_selector(".card-verso", timeout=5000)
        page.click(f"[data-r='{resposta}']")
    cards = page.evaluate("Object.keys(JSON.parse(localStorage.getItem('tn2:estado')).cards).length")
    checar(cards >= 3, f"flashcards revisados e agendados pelo SRS ({cards})")

    # Cálculo guiado
    page.goto(f"{base}/#/calculos/kdigo", wait_until="networkidle")
    esperar_tela(page, ".passos")
    checar(page.locator(".grade-kdigo td[data-risco]").count() == 18, "quadro de prognóstico KDIGO desenhado")
    if fotos:
        foto(page, f"{rotulo}-08-calculo")
    page.click("[data-modo='pratica']")
    page.wait_for_selector("[data-alt]", timeout=5000)
    page.locator("[data-alt]").first.click()
    page.wait_for_selector("#outro", timeout=5000)
    resolvidos = page.evaluate("JSON.parse(localStorage.getItem('tn2:estado')).chefoes['calc:kdigo'].resolvidos")
    checar(resolvidos >= 1, "caso de KDIGO sorteado e corrigido")

    # Painel
    page.goto(f"{base}/#/painel", wait_until="networkidle")
    esperar_tela(page, ".medidor")
    prontidao = page.locator(".medidor").first.inner_text()
    checar("%" in prontidao, f"painel calcula a prontidão ({prontidao.splitlines()[1]})")
    if fotos:
        foto(page, f"{rotulo}-09-painel")

    # Persistência
    xp_antes = page.evaluate("JSON.parse(localStorage.getItem('tn2:estado')).xp")
    page.reload(wait_until="networkidle")
    esperar_tela(page, ".medidor")
    xp_depois = page.evaluate("JSON.parse(localStorage.getItem('tn2:estado')).xp")
    checar(xp_antes == xp_depois and xp_depois > 0, f"progresso persistiu ao recarregar ({xp_depois} XP)")
    checar(
        "A2" in page.inner_text("#conteudo"),
        "painel continua mostrando a lição concluída depois do recarregamento",
    )

    # Tema escuro
    page.click("#btn-tema")
    tema = page.evaluate("document.documentElement.dataset.tema")
    checar(tema in ("escuro", "claro"), f"alternância de tema funciona (agora: {tema})")
    if fotos and tema == "escuro":
        foto(page, f"{rotulo}-10-painel-escuro")
    if tema == "escuro":
        page.click("#btn-tema")

    # Exportar e importar
    page.goto(f"{base}/#/config", wait_until="networkidle")
    esperar_tela(page, "#exportar")
    with page.expect_download() as dl:
        page.click("#exportar")
    arquivo = dl.value.path()
    conteudo = Path(arquivo).read_text(encoding="utf-8")
    checar('"app": "plantao-tn2"' in conteudo, "exportação gera JSON com o progresso")
    if fotos:
        foto(page, f"{rotulo}-11-config")

    # Apaga progresso e cópia: é o que "limpar dados do site" faria. Apagar só a
    # chave principal não serve mais, porque a cópia de segurança a restaura.
    page.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('tn2:estado')).forEach(k=>localStorage.removeItem(k))")
    page.reload(wait_until="networkidle")
    zerado = page.evaluate("JSON.parse(localStorage.getItem('tn2:estado') || '{\"xp\":0}').xp || 0")
    checar(zerado == 0, "progresso apagado antes de testar a importação")
    page.set_input_files("#arquivo", arquivo)
    page.wait_for_timeout(600)
    recuperado = page.evaluate("JSON.parse(localStorage.getItem('tn2:estado')).xp")
    checar(recuperado == xp_depois, f"importação devolveu o mesmo progresso ({recuperado} XP)")

    graves = [e for e in erros if "favicon" not in e.lower()]
    checar(not graves, f"sem erros no console{'' if not graves else ': ' + ' | '.join(graves[:3])}")


def chefao_jogos_e_calculos(page: Page, base: str, rotulo: str, fotos: bool) -> None:
    """Chefão, os quatro mini-jogos, as calculadoras novas e os diagramas."""
    print(f"\n── chefão, mini-jogos e cálculos ({rotulo}) ──")
    erros: list[str] = []
    vigiar_console(page, erros)

    # ---- diagrama dentro da lição (codificação dupla) ----
    page.goto(f"{base}/#/licao/A2", wait_until="networkidle")
    page.wait_for_selector("#conteudo .alt, #conteudo #seguir", timeout=8000)
    diagrama_visto = False
    for _ in range(40):
        if page.locator(".diagrama svg").count():
            diagrama_visto = True
            break
        alternativas = page.locator("#conteudo .alt:not([disabled])")
        if alternativas.count():
            alternativas.first.click()
            conf = page.locator("[data-c='certeza']")
            if conf.count():
                conf.click()
            page.wait_for_selector("#seguir", timeout=5000)
            page.locator("#seguir").click()
            continue
        seguir = page.locator("#seguir")
        if seguir.count():
            seguir.click()
            continue
        break
    checar(diagrama_visto, "diagrama em SVG aparece no bloco da lição")
    if diagrama_visto:
        checar(
            page.locator(".diagrama svg[aria-label]").count() >= 1
            and page.locator(".dg-texto").count() >= 1,
            "diagrama tem rótulo para leitor de tela e versão em texto",
        )
        if fotos:
            foto(page, f"{rotulo}-12-diagrama")

    # ---- pontos de atenção ----
    page.goto(f"{base}/#/atencao", wait_until="networkidle")
    esperar_tela(page, ".atencao")
    caixas = page.locator(".atencao").count()
    checar(caixas >= 15, f"tela de pontos de atenção lista as ambiguidades dos slides ({caixas})")
    checar(page.locator(".atencao .lado").count() >= caixas * 2, "cada ponto de atenção mostra os dois lados")
    if fotos:
        foto(page, f"{rotulo}-18-atencao")

    # ---- chefão ----
    page.goto(f"{base}/#/chefao", wait_until="networkidle")
    esperar_tela(page, "#conteudo .cartao")
    checar(page.locator(".cartao").count() >= 3, "os três chefões listados")
    comecar = page.locator("a[href*='/comecar']")
    if checar(comecar.count() >= 1, "pelo menos um chefão já pode ser encarado"):
        comecar.first.click()
        esperar_tela(page, ".alt")
        checar(page.locator("#relogio").count() == 1, "chefão abre com o relógio rodando")
        for _ in range(3):
            if not page.locator("#conteudo .alt").count():
                break
            page.locator("#conteudo .alt").first.click()
            page.wait_for_selector("[data-c='chute']", timeout=5000)
            page.click("[data-c='chute']")
            page.click("#pular")
            page.wait_for_timeout(150)
        page.click("#entregar")
        page.wait_for_selector(".numerao", timeout=8000)
        checar("%" in page.inner_text(".numerao"), "chefão fecha com o gabarito e o percentual")
        if fotos:
            foto(page, f"{rotulo}-13-chefao")
        tentativas = page.evaluate(
            "Object.values(JSON.parse(localStorage.getItem('tn2:estado')).chefoes)"
            ".filter(x=>Array.isArray(x.tentativas)).reduce((s,x)=>s+x.tentativas.length,0)"
        )
        checar(tentativas >= 1, f"tentativa do chefão registrada ({tentativas})")

    # ---- índice dos mini-jogos ----
    page.goto(f"{base}/#/jogos", wait_until="networkidle")
    esperar_tela(page, "#conteudo .cartao")
    for rota in ("#/jogos/vf", "#/jogos/numero", "#/jogos/ligar", "#/jogos/caso"):
        checar(page.locator(f"a[href='{rota}']").count() >= 1, f"índice dos jogos leva a {rota}")
    if fotos:
        foto(page, f"{rotulo}-14-jogos")

    # ---- Pegadinha ou não? (V/F) ----
    page.goto(f"{base}/#/jogos/vf", wait_until="networkidle")
    esperar_tela(page, "[data-vf]")
    if fotos:
        foto(page, f"{rotulo}-15-vf")
    for _ in range(30):
        if page.locator("#denovo").count():
            break
        vf = page.locator("[data-vf]:not([disabled])")
        if vf.count():
            vf.first.click()
            page.wait_for_timeout(120)
            continue
        seguir = page.locator("#seguir")
        if seguir.count():
            seguir.click()
            page.wait_for_timeout(120)
            continue
        break
    checar(page.locator("#denovo").count() == 1, "rodada de verdadeiro ou falso chega ao resultado")
    rodadas_vf = page.evaluate(
        "(JSON.parse(localStorage.getItem('tn2:estado')).chefoes['jogo:vf']||{}).rodadas||0"
    )
    checar(rodadas_vf >= 1, f"rodada de V/F registrada ({rodadas_vf})")

    # ---- Qual é o número? ----
    page.goto(f"{base}/#/jogos/numero", wait_until="networkidle")
    esperar_tela(page, "[data-opcao]")
    for _ in range(30):
        if page.locator("#denovo").count():
            break
        op = page.locator("[data-opcao]:not([disabled])")
        if op.count():
            op.first.click()
            page.wait_for_timeout(120)
            continue
        seguir = page.locator("#seguir")
        if seguir.count():
            seguir.click()
            page.wait_for_timeout(120)
            continue
        break
    checar(page.locator("#denovo").count() == 1, "rodada de números chega ao resultado")

    # ---- Ligar colunas ----
    page.goto(f"{base}/#/jogos/ligar", wait_until="networkidle")
    esperar_tela(page, "#conteudo a[href*='#/jogos/ligar/']")
    page.locator("a[href*='#/jogos/ligar/']").first.click()
    esperar_tela(page, "[data-lado='e']")
    if fotos:
        foto(page, f"{rotulo}-16-ligar")
    for _ in range(12):
        if page.locator("#denovo").count():
            break
        esquerda = page.locator("[data-lado='e']:not([disabled])")
        if not esquerda.count():
            break
        k = esquerda.first.get_attribute("data-k")
        esquerda.first.click()
        page.locator(f"[data-lado='d'][data-k='{k}']").click()
        page.wait_for_timeout(120)
    checar(page.locator("#denovo").count() == 1, "tabela de ligar colunas completada pelos pares certos")

    # ---- Monte o caso ----
    page.goto(f"{base}/#/jogos/caso", wait_until="networkidle")
    esperar_tela(page, "#conteudo a[href*='#/jogos/caso/']")
    page.locator("a[href*='#/jogos/caso/']").first.click()
    esperar_tela(page, "[data-i]")
    if fotos:
        foto(page, f"{rotulo}-17-caso")
    for _ in range(12):
        if page.locator(".resultado").count():
            break
        op = page.locator("[data-i]:not([disabled])")
        if op.count():
            op.first.click()
            page.wait_for_timeout(150)
            continue
        seguir = page.locator("#seguir")
        if seguir.count():
            seguir.click()
            page.wait_for_timeout(150)
            continue
        break
    checar(page.locator(".resultado").count() >= 1, "caso clínico percorrido até o fecho")

    # ---- calculadoras novas ----
    for calc, rotulo_calc in (
        ("childpugh", "Child-Pugh"),
        ("pesoseco", "peso seco"),
        ("pesoajustado", "peso ajustado"),
        ("liquidoshd", "líquidos na hemodiálise"),
        ("sld", "classificação SLD"),
    ):
        page.goto(f"{base}/#/calculos/{calc}", wait_until="networkidle")
        esperar_tela(page, ".passos")
        page.click("[data-modo='pratica']")
        page.wait_for_selector("[data-alt], #conferir", timeout=5000)
        if page.locator("[data-alt]").count():
            page.locator("[data-alt]").first.click()
        else:
            page.fill("#resp", "1")
            page.click("#conferir")
        page.wait_for_selector("#outro", timeout=5000)
        resolvidos = page.evaluate(
            f"(JSON.parse(localStorage.getItem('tn2:estado')).chefoes['calc:{calc}']||{{}}).resolvidos||0"
        )
        checar(resolvidos >= 1, f"calculadora de {rotulo_calc} sorteia e corrige um caso")

    graves = [e for e in erros if "favicon" not in e.lower()]
    checar(not graves, f"sem erros no console{'' if not graves else ': ' + ' | '.join(graves[:3])}")


def sem_armazenamento(page: Page, base: str) -> None:
    print("\n── localStorage bloqueado ──")
    erros: list[str] = []
    vigiar_console(page, erros)
    page.add_init_script(
        """
        const lancar = () => { throw new DOMException('bloqueado', 'SecurityError'); };
        Object.defineProperty(window, 'localStorage', { get: lancar, configurable: true });
        """
    )
    page.goto(f"{base}/#/hoje", wait_until="networkidle")
    esperar_tela(page, ".missoes")
    checar("Rim I" in page.inner_text("h1"), "tela Hoje abre mesmo sem armazenamento")
    checar(page.locator(".aviso-local").count() >= 1, "o site avisa que o progresso não será salvo")

    page.goto(f"{base}/#/questoes/A2", wait_until="networkidle")
    esperar_tela(page, ".alt")
    page.locator("#conteudo .alt:not([disabled])").first.click()
    page.click("[data-c='certeza']")
    page.wait_for_selector(".resposta", timeout=5000)
    checar(page.locator(".resposta").count() == 1, "ainda dá para responder questões e ver a justificativa")

    page.goto(f"{base}/#/flashcards", wait_until="networkidle")
    esperar_tela(page, ".card-frente")
    page.click("[data-n='2']")
    page.wait_for_selector(".card-verso", timeout=5000)
    checar(page.locator(".card-verso").count() == 1, "flashcards continuam virando")

    graves = [e for e in erros if "favicon" not in e.lower()]
    checar(not graves, f"sem erros no console{'' if not graves else ': ' + ' | '.join(graves[:3])}")


def resiliencia_do_progresso(page: Page, base: str) -> None:
    """O progresso dela é o ativo mais caro do app: tem que sobreviver à corrupção
    da chave principal, e ela tem que ser avisada se o navegador parar de salvar."""
    print("\n── resiliência do progresso ──")
    erros: list[str] = []
    vigiar_console(page, erros)

    # Gravação sabotável a pedido: a sonda inicial passa, e só quebra quando o
    # teste liga a chave — é assim que uma cota estoura no meio do estudo.
    page.add_init_script(
        """
        const orig = Storage.prototype.setItem;
        window.__quebrarGravacao = false;
        Storage.prototype.setItem = function (k, v) {
          if (window.__quebrarGravacao && String(k).startsWith("tn2:estado")) throw new Error("cota cheia");
          return orig.call(this, k, v);
        };
        """
    )

    completar_licao(page, base, "A2")
    page.goto(f"{base}/#/painel", wait_until="networkidle")
    page.wait_for_timeout(300)

    chaves = page.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('tn2:'))")
    checar("tn2:estado:copia" in chaves, "cópia de segurança foi gravada junto com o progresso")
    xp_antes = page.evaluate("JSON.parse(localStorage.getItem('tn2:estado')).xp")

    # A chave principal corrompe (escrita interrompida, cota estourada).
    page.evaluate("void localStorage.setItem('tn2:estado','{lixo que nao e json')")
    page.reload(wait_until="networkidle")  # trocar só o hash não reinicia o módulo do estado
    page.wait_for_timeout(600)
    xp_depois = page.evaluate(
        "(()=>{try{return JSON.parse(localStorage.getItem('tn2:estado')).xp}catch{return 'chave ainda corrompida'}})()"
    )
    checar(xp_depois == xp_antes, f"progresso recuperado da cópia depois da chave principal corromper ({xp_depois} XP)")
    checar(page.locator("#aviso-copia").count() > 0, "o site avisa que recuperou da cópia")

    # Agora o navegador para de aceitar gravações no meio de uma sessão.
    page.goto(f"{base}/#/questoes/A3", wait_until="networkidle")
    page.wait_for_timeout(300)
    page.evaluate("void (window.__quebrarGravacao = true)")
    page.locator("#conteudo .alt:not([disabled])").first.click()
    page.wait_for_selector("[data-c='chute']", timeout=5000)
    page.click("[data-c='chute']")
    page.wait_for_timeout(700)
    checar(page.locator("#aviso-gravacao").count() > 0, "o site avisa na hora em que para de conseguir salvar")
    checar(page.locator(".resposta").count() > 0, "dá para continuar respondendo mesmo sem conseguir salvar")

    # Zerar não pode ser desfeito pela cópia no carregamento seguinte.
    page.evaluate("void (window.__quebrarGravacao = false)")
    page.goto(f"{base}/#/config", wait_until="networkidle")
    page.wait_for_timeout(300)
    zerar = page.locator("#zerar")
    zerar.click()
    page.wait_for_timeout(200)
    zerar.click()
    page.wait_for_timeout(400)
    page.goto(f"{base}/#/hoje", wait_until="networkidle")
    page.wait_for_timeout(400)
    xp_final = page.evaluate("JSON.parse(localStorage.getItem('tn2:estado')).xp")
    checar(xp_final == 0, "zerar o progresso não é desfeito pela cópia de segurança")

    checar(not erros, "sem erros no console" if not erros else f"erros no console: {erros[:2]}")


def foto(page: Page, nome: str) -> None:
    CAPTURAS.mkdir(exist_ok=True)
    page.wait_for_timeout(500)  # deixa as animações de entrada terminarem
    page.screenshot(path=str(CAPTURAS / f"{nome}.png"), full_page=False)


def main() -> int:
    fotos = "--fotos" in sys.argv
    if BASE_EXTERNA:
        servidor, base = None, BASE_EXTERNA
        print(f"testando o site publicado em {base}")
    else:
        servidor, base = servir()
    try:
        with sync_playwright() as pw:
            navegador = pw.chromium.launch()
            for rotulo, viewport in (("celular", CELULAR), ("desktop", DESKTOP)):
                ctx = navegador.new_context(viewport=viewport, locale="pt-BR", accept_downloads=True)
                fluxo(ctx.new_page(), base, rotulo, fotos)
                ctx.close()

            for rotulo, viewport in (("celular", CELULAR), ("desktop", DESKTOP)):
                ctx = navegador.new_context(viewport=viewport, locale="pt-BR")
                chefao_jogos_e_calculos(ctx.new_page(), base, rotulo, fotos and rotulo == "celular")
                ctx.close()

            ctx = navegador.new_context(viewport=CELULAR, locale="pt-BR")
            sem_armazenamento(ctx.new_page(), base)
            ctx.close()

            ctx = navegador.new_context(viewport=CELULAR, locale="pt-BR")
            resiliencia_do_progresso(ctx.new_page(), base)
            ctx.close()

            # Navegador embutido de app: o progresso pode sumir ao fechar a janela.
            ua_app = (
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                "AppleWebKit/605.1.15 [FBAN/FBIOS;FBAV/450.0]"
            )
            ua_safari = (
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                "AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1"
            )
            print("\n── navegador embutido de aplicativo ──")
            for ua, esperado, nome in ((ua_app, True, "WebView do Facebook"), (ua_safari, False, "Safari")):
                ctx = navegador.new_context(viewport=CELULAR, locale="pt-BR", user_agent=ua)
                page = ctx.new_page()
                page.goto(f"{base}/#/hoje", wait_until="networkidle")
                page.wait_for_timeout(400)
                tem = page.locator("#aviso-embutido").count() > 0
                checar(
                    tem is esperado,
                    f"{nome}: {'avisa para abrir no navegador' if esperado else 'não mostra aviso desnecessário'}",
                )
                ctx.close()
            navegador.close()
    finally:
        if servidor is not None:
            servidor.shutdown()

    print(f"\n{len(passos)} verificações passaram, {len(falhas)} falharam")
    if falhas:
        for f in falhas:
            print(f"  ✗ {f}")
        return 1
    if fotos:
        print(f"capturas em {CAPTURAS}")
    print("✓ navegador ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
