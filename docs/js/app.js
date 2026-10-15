/* Casca do aplicativo: rota por hash, cabeçalho e cronômetro de estudo. */

import { ler, aoMudar, alternarTema, semArmazenamento, aoFalharGravacao, veioDaCopia } from "./store.js";
import { nivelDe, quandoGanhar, somarTempo } from "./xp.js";
import { cronometroDeEstudo } from "./clock.js";
import { conteudo, cardsDoModulo } from "./content.js";
import { contagemHoje } from "./srs.js";
import { mostrarXP, configurarSom, anunciar } from "./ui.js";

import * as hoje from "./screens/hoje.js";
import * as trilha from "./screens/trilha.js";
import * as licaoTela from "./screens/licao.js";
import * as questoes from "./screens/questoes.js";
import * as flashcards from "./screens/flashcards.js";
import * as calculos from "./screens/calculos.js";
import * as chefao from "./screens/chefao.js";
import * as jogos from "./screens/jogos.js";
import * as painel from "./screens/painel.js";
import * as erros from "./screens/erros.js";
import * as atencao from "./screens/atencao.js";
import * as config from "./screens/config.js";

const TELAS = {
  hoje,
  trilha,
  licao: licaoTela,
  questoes,
  flashcards,
  calculos,
  chefao,
  jogos,
  painel,
  erros,
  atencao,
  config,
};

const main = document.getElementById("conteudo");
let limparTela = null;

function rotaAtual() {
  const bruto = (location.hash || "#/hoje").replace(/^#\/?/, "");
  const partes = bruto.split("/").filter(Boolean);
  return { nome: partes[0] || "hoje", args: partes.slice(1) };
}

async function desenhar() {
  const { nome, args } = rotaAtual();
  const tela = TELAS[nome] || TELAS.hoje;

  if (limparTela) {
    try {
      limparTela();
    } catch {
      /* uma tela que falha ao sair não impede a próxima */
    }
    limparTela = null;
  }

  main.innerHTML = `<p class="vazio">Carregando…</p>`;
  for (const a of document.querySelectorAll(".aba")) {
    const alvo = a.dataset.rota;
    if (
      alvo === nome ||
      (nome === "licao" && alvo === "trilha") ||
      (nome === "chefao" && alvo === "trilha") ||
      (nome === "erros" && alvo === "painel")
    ) {
      a.setAttribute("aria-current", "page");
    } else {
      a.removeAttribute("aria-current");
    }
  }

  try {
    const c = await conteudo();
    limparTela = (await tela.desenhar(main, { c, args })) || null;
  } catch (erro) {
    console.error(erro);
    main.innerHTML = `<div class="cartao"><h2>Não consegui carregar o conteúdo</h2>
      <p>${erro.message ? String(erro.message) : "Erro desconhecido."}</p>
      <p class="fonte">Se você abriu o arquivo direto do disco (file://), use um servidor local — o navegador bloqueia a leitura dos JSON.</p></div>`;
  }

  if (!args.length) window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  main.focus({ preventScroll: true });
}

function atualizarCabecalho() {
  const n = nivelDe(ler().xp);
  const anel = document.getElementById("anel-nivel");
  anel.style.setProperty("--pct", n.pct);
  anel.dataset.nivel = n.indice;
  document.getElementById("chip-nome").textContent = n.nome;
  document.getElementById("chip-nivel").title = n.proximo
    ? `${ler().xp} XP · faltam ${n.faltam} para ${n.proximo.nome}`
    : `${ler().xp} XP · nível máximo`;
}

async function atualizarPino() {
  try {
    const c = await conteudo();
    const liberados = c.modulos.filter((m) => m.disponivel).map((m) => m.id);
    const { vencidos } = contagemHoje(cardsDoModulo(c, liberados));
    const pino = document.getElementById("pino-cards");
    if (vencidos > 0) {
      pino.hidden = false;
      pino.classList.remove("vis-oculto");
      pino.textContent = vencidos > 99 ? "99+" : String(vencidos);
      pino.setAttribute("aria-label", `${vencidos} cards vencem hoje`);
    } else {
      pino.hidden = true;
      pino.classList.add("vis-oculto");
    }
  } catch {
    /* sem conteúdo ainda: o pino fica escondido */
  }
}

document.getElementById("btn-tema").addEventListener("click", () => {
  const t = alternarTema();
  anunciar(t === "escuro" ? "Tema escuro" : "Tema claro");
});

window.addEventListener("hashchange", desenhar);
aoMudar(() => {
  atualizarCabecalho();
  atualizarPino();
});

quandoGanhar(mostrarXP);
configurarSom(ler().prefs.som);
cronometroDeEstudo((seg) => somarTempo(seg));

atualizarCabecalho();
atualizarPino();
desenhar();

/** Faixa de aviso acima do conteúdo, usada só para coisas sobre o progresso. */
function faixa(id, texto) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    el.className = "aviso-local";
    el.setAttribute("role", "status");
    main.before(el);
  }
  el.textContent = texto;
}

/* Navegador embutido de app (WhatsApp, Instagram, Facebook): o localStorage costuma
   funcionar e ser descartado ao fechar a janela, então o aviso de armazenamento não
   dispara e ela só descobriria o problema ao perder o progresso. Daí o aviso próprio. */
function navegadorEmbutido() {
  try {
    const ua = navigator.userAgent || "";
    return /FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|GSA\/|\bWV\b/i.test(ua);
  } catch {
    return false;
  }
}

if (navegadorEmbutido()) {
  faixa(
    "aviso-embutido",
    "Você abriu dentro de outro aplicativo. Toque nos três pontinhos e escolha “Abrir no navegador” — assim o progresso fica salvo de verdade.",
  );
}

if (semArmazenamento) {
  faixa(
    "aviso-armazenamento",
    "O navegador está bloqueando o armazenamento: dá para estudar normalmente, mas o progresso some ao fechar a aba.",
  );
} else if (veioDaCopia) {
  faixa("aviso-copia", "Recuperei seu progresso da cópia de segurança. Confira o painel; se faltar algo, importe seu último arquivo em Ajustes.");
}

// Se a gravação parar de funcionar no meio do estudo (cota cheia, modo restrito),
// ela precisa saber na hora — não ao perder tudo no dia seguinte.
aoFalharGravacao((h) => {
  if (h.falhou) {
    faixa(
      "aviso-gravacao",
      "Parei de conseguir salvar o progresso neste navegador. Vá em Ajustes e exporte agora, antes de continuar.",
    );
  } else {
    const el = document.getElementById("aviso-gravacao");
    if (el) el.remove();
  }
});

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      /* sem service worker, o site só não funciona offline */
    });
  });
}
