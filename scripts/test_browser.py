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
    servidor, base = servir()
    try:
        with sync_playwright() as pw:
            navegador = pw.chromium.launch()
            for rotulo, viewport in (("celular", CELULAR), ("desktop", DESKTOP)):
                ctx = navegador.new_context(viewport=viewport, locale="pt-BR", accept_downloads=True)
                fluxo(ctx.new_page(), base, rotulo, fotos)
                ctx.close()

            ctx = navegador.new_context(viewport=CELULAR, locale="pt-BR")
            sem_armazenamento(ctx.new_page(), base)
            ctx.close()

            ctx = navegador.new_context(viewport=CELULAR, locale="pt-BR")
            resiliencia_do_progresso(ctx.new_page(), base)
            ctx.close()
            navegador.close()
    finally:
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
