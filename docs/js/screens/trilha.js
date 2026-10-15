/* Trilha do Rim e do Fígado. Caminho reto no celular, sinuoso no desktop.
   Nada é bloqueado de verdade: o nó mostra o que ficou para trás. */

import { ler } from "../store.js";
import { diaISO } from "../clock.js";
import { esc, selo } from "../ui.js";

const PASSO = 84;
const RAIO = 19;

/** Posições dos nós. amp = 0 no celular (coluna reta). */
export function pontos(n, { amp = 0, x0 = 34, y0 = 34, passo = PASSO } = {}) {
  return Array.from({ length: n }, (_, i) => ({
    x: x0 + amp * Math.sin(i * 0.85),
    y: y0 + i * passo,
  }));
}

/** Caminho suave passando pelos pontos. */
export function caminho(pts) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const my = (a.y + b.y) / 2;
    d += ` C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`;
  }
  return d;
}

export function situacao(c, mod, e = ler()) {
  const l = e.licoes[mod.id];
  if (!mod.disponivel) return "futuro";
  if (l?.concluida) return "dominado";
  if (l?.blocosVistos?.length) return "andamento";
  const atrasado = (c.cronograma.find((d) => (d.modulos || []).includes(mod.id))?.data || "") < diaISO();
  return atrasado ? "atras" : "novo";
}

function trilhaSVG(c, trilhaId, mods, amp) {
  const e = ler();
  const pts = pontos(mods.length, { amp, x0: amp ? 120 : 34 });
  const alt = (pts[pts.length - 1]?.y || 0) + 44;
  const feitos = mods.filter((m) => e.licoes[m.id]?.concluida).length;
  const total = mods.length;
  const nos = mods
    .map((m, i) => {
      const p = pts[i];
      const st = situacao(c, m, e);
      const tx = p.x + RAIO + 14;
      const extra =
        st === "futuro"
          ? m.chega
          : st === "atras"
            ? "ficou para trás"
            : st === "dominado"
              ? "concluída"
              : st === "andamento"
                ? "em andamento"
                : `${m.duracao_min} min`;
      return `<g class="no ${st}" role="listitem">
        <a href="${m.disponivel ? `#/licao/${esc(m.id)}` : "#/hoje"}" aria-label="${esc(m.id)} ${esc(m.titulo)} — ${esc(extra)}">
          <circle class="no-circ" cx="${p.x}" cy="${p.y}" r="${RAIO}"></circle>
          <text class="no-id" x="${p.x}" y="${p.y}">${esc(m.id)}</text>
          <text class="no-txt" x="${tx}" y="${p.y - 7}">${esc(m.titulo)}</text>
          <text class="no-sub" x="${tx}" y="${p.y + 10}"><tspan class="no-pri pri-${esc(m.prioridade)}">${esc(m.prioridade)}</tspan> · ${esc(extra)}</text>
        </a>
      </g>`;
    })
    .join("");

  return `<div class="cartao trilha" data-orgao="${esc(trilhaId)}">
    <div class="linha-entre" style="margin-bottom:.6rem">
      <h2 style="margin:0">${trilhaId === "rim" ? "Trilha do Rim" : "Trilha do Fígado"}</h2>
      <span class="fonte">${feitos}/${total} lições</span>
    </div>
    <div class="barra" style="margin-bottom:.8rem"><i style="width:${total ? (feitos / total) * 100 : 0}%"></i></div>
    <svg class="trilha-svg" viewBox="0 0 ${amp ? 560 : 360} ${alt}" role="list"
         aria-label="Trilha de ${trilhaId === "rim" ? "nefropatias" : "doenças hepáticas"}">
      <path class="trilha-caminho" d="${caminho(pts)}"></path>
      ${nos}
    </svg>
  </div>`;
}

export async function desenhar(raiz, { c }) {
  const rim = c.modulos.filter((m) => m.trilha === "rim");
  const figado = c.modulos.filter((m) => m.trilha === "figado");
  const mq = window.matchMedia("(min-width: 48rem)");

  const pintar = () => {
    const amp = mq.matches ? 70 : 0;
    raiz.dataset.orgao = "rim";
    raiz.innerHTML = `
      <h1>Trilhas</h1>
      <p style="color:var(--tinta-fraca)">${selo("E")} essencial · ${selo("I")} importante · ${selo("C")} complementar. Você pode pular: o que ficou para trás aparece com a borda tracejada.</p>
      ${trilhaSVG(c, "rim", rim, amp)}
      ${trilhaSVG(c, "figado", figado, amp)}
      <div class="cartao">
        <div class="linha-entre"><h2 style="margin:0">Chefões</h2><span class="fonte">simulados cronometrados</span></div>
        <p style="margin:.35rem 0 .6rem;color:var(--tinta-fraca);font-size:.93rem">No fim de cada trilha há um simulado com o gabarito só no final — e, no domingo, o Chefão Final com rim e fígado misturados.</p>
        <div class="acoes" style="margin:0"><a class="btn btn-forte" href="#/chefao">Ver os chefões</a></div>
      </div>
      <div class="cartao">
        <div class="linha-entre"><h2 style="margin:0">Mini-jogos</h2><span class="fonte">rodadas de 2 a 5 minutos</span></div>
        <p style="margin:.35rem 0 .6rem;color:var(--tinta-fraca);font-size:.93rem">Pegadinha ou não?, Qual é o número?, Ligar colunas e Monte o caso — para quando não der para sentar e estudar uma lição inteira.</p>
        <div class="acoes" style="margin:0"><a class="btn" href="#/jogos">Ver os mini-jogos</a></div>
      </div>`;
  };

  pintar();
  const aoMudarLargura = () => pintar();
  mq.addEventListener("change", aoMudarLargura);
  return () => mq.removeEventListener("change", aoMudarLargura);
}
