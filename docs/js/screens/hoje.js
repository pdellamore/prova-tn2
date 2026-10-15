/* Tela Hoje: o dia do cronograma e as missões daquele dia. */

import { ler, mudar } from "../store.js";
import { diaISO } from "../clock.js";
import { streak } from "../xp.js";
import { contagemHoje } from "../srs.js";
import { cardsDoModulo } from "../content.js";
import { esc, rico, selo, ICONE, anunciar } from "../ui.js";

export function diaDoCronograma(c, escolhido) {
  const hoje = diaISO();
  const idx = c.cronograma.findIndex((d) => d.data === (escolhido || hoje));
  if (idx >= 0) return idx;
  // antes do primeiro dia → primeiro; depois do último → último
  if (hoje < c.cronograma[0].data) return 0;
  return c.cronograma.length - 1;
}

/** Quanto de uma missão já foi feito. Devolve {feito, alvo}. */
export function progressoMissao(c, m, e = ler()) {
  if (m.tipo === "licoes") {
    const alvo = m.modulos.length;
    return { feito: m.modulos.filter((id) => e.licoes[id]?.concluida).length, alvo };
  }
  if (m.tipo === "questoes") {
    const lista = c.questoes.filter((q) => (m.modulos || []).includes(q.modulo));
    const respondidas = lista.filter((q) => e.questoes[q.id]?.tentativas?.length).length;
    return { feito: Math.min(respondidas, m.alvo), alvo: m.alvo };
  }
  if (m.tipo === "cards") {
    const hoje = diaISO();
    const feitos = Object.values(e.cards).filter((s) => s.ultima && diaISO(new Date(s.ultima)) === hoje).length;
    return { feito: Math.min(feitos, m.alvo), alvo: m.alvo };
  }
  if (m.tipo === "calculo") {
    const feitos = (m.calculos || []).filter((id) => (e.chefoes["calc:" + id]?.resolvidos || 0) > 0).length;
    return { feito: feitos, alvo: (m.calculos || []).length };
  }
  if (m.tipo === "feynman") {
    const feitos = (m.modulos || []).filter((id) => (e.feynman[id]?.texto || "").trim().length > 40).length;
    return { feito: feitos, alvo: (m.modulos || []).length };
  }
  return { feito: e.missoes[m.id] ? 1 : 0, alvo: 1 };
}

export async function desenhar(raiz, { c, args }) {
  const e = ler();
  const idx = diaDoCronograma(c, e.prefs.diaManual);
  const dia = c.cronograma[idx];
  const hojeReal = diaISO();
  const liberados = c.modulos.filter((m) => m.disponivel).map((m) => m.id);
  const cont = contagemHoje(cardsDoModulo(c, liberados));
  const dias = streak();

  const missoes = (dia.missoes || []).map((m) => ({ ...m, ...progressoMissao(c, m, e) }));
  const feitas = missoes.filter((m) => m.feito >= m.alvo).length;

  raiz.dataset.orgao = dia.orgao || "rim";
  raiz.innerHTML = `
    <section aria-labelledby="t-hoje">
      <p class="olho">${esc(dia.rotulo)}${dia.data === hojeReal ? " · hoje" : ""}</p>
      <h1 id="t-hoje">${esc(dia.titulo)}</h1>
      <p style="color:var(--tinta-fraca)">${rico(dia.foco)}</p>

      <div class="medidores" style="margin:1rem 0">
        <div class="medidor"><div class="rot">Missões</div><div class="val">${feitas}<span style="font-size:1rem;color:var(--tinta-fraca)">/${missoes.length}</span></div><div class="obs">do dia</div></div>
        <div class="medidor"><div class="rot">Vencem hoje</div><div class="val">${cont.vencidos}</div><div class="obs">${cont.novos} novos</div></div>
        <div class="medidor"><div class="rot">Sequência</div><div class="val">${dias}</div><div class="obs">${dias === 1 ? "dia" : "dias"} seguidos</div></div>
      </div>

      ${dia.atrasada ? `<div class="aviso-local">${rico(dia.atrasada)}</div>` : ""}
      ${lembreteDeBackup(e)}

      <div class="cartao">
        <div class="linha-entre" style="margin-bottom:.4rem">
          <h2 style="margin:0">Missões do dia</h2>
          <span class="fonte">${feitas} de ${missoes.length}</span>
        </div>
        <ul class="missoes">
          ${missoes.map(cartaoMissao).join("")}
        </ul>
      </div>

      <div class="secao-titulo"><h2>Outro dia</h2></div>
      <div class="flex-chips" role="group" aria-label="Escolher o dia do cronograma">
        ${c.cronograma
          .map(
            (d, i) =>
              `<button class="btn btn-pequeno${i === idx ? " btn-forte" : ""}" data-dia="${esc(d.data)}" type="button">${esc(d.curto)}</button>`,
          )
          .join("")}
        ${e.prefs.diaManual ? `<button class="btn btn-pequeno" data-dia="auto" type="button">Voltar para hoje</button>` : ""}
      </div>

      <div class="secao-titulo"><h2>Se faltar tempo</h2></div>
      <div class="cartao">
        <p style="margin:0 0 .5rem">A ordem de corte dos slides é: primeiro os itens ${selo("C")} complementares, depois os ${selo("I")} importantes. Os ${selo("E")} essenciais nunca saem.</p>
        <label style="display:flex;gap:.5rem;align-items:flex-start;font-size:.92rem">
          <input type="checkbox" id="cortar-c" ${e.prefs.cortarC ? "checked" : ""} style="margin-top:.25rem" />
          <span>Esconder o conteúdo complementar das lições, questões e cards${e.prefs.cortarC ? " <b>(ligado)</b>" : ""}</span>
        </label>
      </div>

      <p class="rodape">Todo o conteúdo vem dos slides da disciplina. <a href="#/config">Exportar ou importar progresso</a></p>
    </section>`;

  for (const b of raiz.querySelectorAll("[data-dia]")) {
    b.addEventListener("click", () => {
      const v = b.dataset.dia;
      mudar((st) => {
        st.prefs.diaManual = v === "auto" ? null : v;
      });
      location.hash = "#/hoje";
      desenhar(raiz, { c, args });
    });
  }

  const corte = raiz.querySelector("#cortar-c");
  corte.addEventListener("change", () => {
    mudar((st) => {
      st.prefs.cortarC = corte.checked;
    });
    anunciar(corte.checked ? "Conteúdo complementar escondido." : "Conteúdo complementar visível.");
    desenhar(raiz, { c, args });
  });
}

/** Depois que já há trabalho feito, lembra de guardar um arquivo — uma vez por dia. */
function lembreteDeBackup(e) {
  const ultimo = Number(e.prefs && e.prefs.ultimoExport) || 0;
  const horas = (Date.now() - ultimo) / 36e5;
  if ((e.xp || 0) < 120 || horas < 20) return "";
  return `<div class="cartao" style="border-style:dashed">
    <p style="margin:0;font-size:.93rem">${
      ultimo ? "Já faz um dia desde o último backup." : "Você já tem progresso salvo aqui."
    } Guarde um arquivo, para não depender só deste navegador.
    <a href="#/config">Exportar progresso</a></p>
  </div>`;
}

function cartaoMissao(m) {
  const pronta = m.feito >= m.alvo;
  const progresso = m.alvo > 1 ? ` <span class="fonte">${m.feito}/${m.alvo}</span>` : "";
  return `<li><a class="missao${pronta ? " feita" : ""}" href="${esc(m.rota)}">
    <span class="missao-caixa">${ICONE.check}</span>
    <span class="missao-txt"><b>${esc(m.titulo)}${progresso}</b><small>${rico(m.desc)}</small></span>
    <span class="missao-seta">${ICONE.seta}</span>
  </a></li>`;
}
