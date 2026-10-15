/* Flashcards com repetição espaçada. Ela marca a confiança antes de virar o card:
   chute ou erro volta na mesma sessão; certeza sobe de caixa. */

import { ler } from "../store.js";
import { fila, revisar, contagemHoje, estadoCard } from "../srs.js";
import { cardsDoModulo } from "../content.js";
import { ganhar, darBadge } from "../xp.js";
import { registrar } from "../metrics.js";
import { esc, rico, selo, caixaFonte, apoio, atencaoDobra, anunciar, bip } from "../ui.js";

export async function desenhar(raiz, { c, args }) {
  const filtro = args[0] || "";
  const relampago = filtro === "relampago";
  const liberados = c.modulos.filter((m) => m.disponivel).map((m) => m.id);
  let base = cardsDoModulo(c, !relampago && filtro && c.moduloPorId[filtro] ? [filtro] : liberados);
  if (ler().prefs.cortarC) base = base.filter((f) => f.prioridade !== "C");

  const orgao = !relampago && filtro && c.moduloPorId[filtro] ? c.moduloPorId[filtro].trilha : "rim";
  raiz.dataset.orgao = orgao;

  const cont = contagemHoje(base);
  // Na véspera não interessa o que venceu: interessa o essencial e o que ela erra.
  let sessao = relampago ? filaRelampago(base) : fila(base, { maxNovos: 15 });
  // cards errados voltam no fim desta mesma sessão
  const volta = [];
  let i = 0;
  let vistos = 0;
  let acertos = 0;

  if (!sessao.length) {
    raiz.innerHTML = `<section>
      <h1>Flashcards</h1>
      <div class="cartao" style="text-align:center">
        <span class="numerao" style="color:var(--ok)">✓</span>
        <p>Nada vencido agora. ${cont.dominados} ${cont.dominados === 1 ? "card dominado" : "cards dominados"} de ${base.length}.</p>
        <p class="fonte">Os próximos voltam sozinhos quando a revisão vencer.</p>
        <div class="acoes" style="justify-content:center">
          <button class="btn" id="forcar" type="button">Revisar mesmo assim</button>
          <a class="btn btn-forte" href="#/hoje">Voltar para Hoje</a>
        </div>
      </div></section>`;
    raiz.querySelector("#forcar").addEventListener("click", () => {
      sessao = [...base].sort(() => Math.random() - 0.5).slice(0, 20);
      i = 0;
      pintar();
    });
    return;
  }

  function pintar() {
    if (i >= sessao.length) {
      if (volta.length) {
        sessao = volta.splice(0, volta.length);
        i = 0;
      } else return fim();
    }
    const f = sessao[i];
    const st = estadoCard(f.id);
    const mod = c.moduloPorId[f.modulo];
    raiz.innerHTML = `<section>
      <p class="olho">${relampago ? "Revisão relâmpago" : "Flashcards"} · ${i + 1} de ${sessao.length}${volta.length ? ` (+${volta.length} para repetir)` : ""}</p>
      <div class="card-pilha">
        <div class="card-face">
          <div class="card-topo">
            ${selo(f.prioridade)}
            <span class="etiqueta etiqueta-${esc(mod?.trilha || "rim")}">${esc(mod?.id || f.modulo)}</span>
            <span style="margin-left:auto" class="fonte">caixa ${st ? st.caixa : 0}</span>
          </div>
          <div class="card-frente">${rico(f.frente)}</div>
          <div id="verso"></div>
        </div>
      </div>
      <div id="controles"></div>
    </section>`;
    perguntarConfianca(f);
  }

  function perguntarConfianca(f) {
    raiz.querySelector("#controles").innerHTML = `
      <p class="olho" style="margin-top:1rem">Antes de virar: você sabe?</p>
      <div class="confianca">
        <button class="btn" type="button" data-n="2"><span>Certeza</span><small>sei de cor</small></button>
        <button class="btn" type="button" data-n="1"><span>Dúvida</span><small>quase</small></button>
        <button class="btn" type="button" data-n="0"><span>Chute</span><small>não sei</small></button>
      </div>`;
    for (const b of raiz.querySelectorAll("[data-n]")) {
      b.addEventListener("click", () => virar(f, Number(b.dataset.n)));
    }
  }

  function virar(f, notaMarcada) {
    raiz.querySelector("#verso").innerHTML = `<div class="card-verso">${rico(f.verso)}</div>
      ${apoio(f.apoio)}
      ${atencaoDobra(f.ambiguidade ? c.ambiguidades[f.ambiguidade] : null)}
      ${caixaFonte(f.fonte)}`;
    raiz.querySelector("#controles").innerHTML = `
      <p class="olho" style="margin-top:1rem">Você acertou?</p>
      <div class="confianca">
        <button class="btn" type="button" data-r="acertei"><span>Acertei</span></button>
        <button class="btn" type="button" data-r="errei"><span>Errei</span></button>
      </div>`;
    for (const b of raiz.querySelectorAll("[data-r]")) {
      b.addEventListener("click", () => {
        const acertou = b.dataset.r === "acertei";
        // chute acertado volta como se fosse erro
        const nota = acertou ? (notaMarcada === 0 ? 0 : notaMarcada) : 0;
        const novo = revisar(f.id, nota);
        vistos += 1;
        if (acertou && notaMarcada > 0) acertos += 1;
        if (nota === 0) volta.push(f);
        ganhar(nota === 2 ? "card_certeza" : nota === 1 ? "card_duvida" : "card_erro");
        bip(acertou ? "ok" : "erro");
        registrar({ tipo: "card", id: f.id, modulo: f.modulo, nota, caixa: novo.caixa });
        anunciar(acertou ? "Acertou." : "Errou: volta ainda nesta sessão.");
        i += 1;
        pintar();
      });
    }
  }

  function fim() {
    if (vistos >= 20) darBadge("vinte-cards");
    const pct = vistos ? Math.round((acertos / vistos) * 100) : 0;
    raiz.innerHTML = `<section>
      <div class="cartao" style="text-align:center">
        <span class="numerao" style="color:var(--orgao)">${pct}%</span>
        <p>${vistos} ${vistos === 1 ? "card revisado" : "cards revisados"} nesta sessão.</p>
        <p class="fonte">Os que você errou ou chutou voltam ainda hoje e amanhã.</p>
        <div class="acoes" style="justify-content:center">
          <a class="btn btn-forte" href="#/hoje">Voltar para Hoje</a>
          <a class="btn" href="#/painel">Ver o painel</a>
        </div>
      </div></section>`;
    anunciar(`Sessão fechada: ${vistos} cards.`);
  }

  pintar();
}

/**
 * Fila da revisão relâmpago: só os essenciais, com os que ela mais errou na
 * frente. Ignora as datas da repetição espaçada — é a passada da véspera.
 */
export function filaRelampago(base, estado = ler(), teto = 40) {
  const erros = (f) => {
    const st = estado.cards[f.id];
    if (!st) return 0;
    return (st.erros || 0) + (st.caixa <= 1 ? 1 : 0);
  };
  return [...base]
    .filter((f) => f.prioridade === "E")
    .sort((a, b) => erros(b) - erros(a) || Math.random() - 0.5)
    .slice(0, teto);
}
