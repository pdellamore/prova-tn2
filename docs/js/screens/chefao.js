/* Chefões: simulado cronometrado. Diferente da tela de questões, aqui ela
   marca e segue — a correção comentada só aparece no fim, como numa prova.
   A confiança continua sendo pedida, porque é dela que saem os acertos falsos. */

import { ler, mudar } from "../store.js";
import { ganhar, darBadge } from "../xp.js";
import { registrar } from "../metrics.js";
import { contagem, formatarRelogio } from "../clock.js";
import { esc, rico, selo, caixaFonte, atencao, anunciar, bip } from "../ui.js";

const PESO = { E: 3, I: 2, C: 1 };

/** Sorteia preservando a proporção por módulo e dando preferência ao essencial. */
export function sortear(lista, quantos) {
  const porModulo = new Map();
  for (const q of lista) {
    if (!porModulo.has(q.modulo)) porModulo.set(q.modulo, []);
    porModulo.get(q.modulo).push(q);
  }
  for (const [, qs] of porModulo) {
    qs.sort(() => Math.random() - 0.5);
    qs.sort((a, b) => PESO[b.prioridade] - PESO[a.prioridade]);
  }
  // Rodízio entre os módulos: ninguém fica de fora e ninguém domina a prova.
  const filas = [...porModulo.values()];
  const saida = [];
  let vazias = 0;
  while (saida.length < quantos && vazias < filas.length) {
    vazias = 0;
    for (const fila of filas) {
      if (saida.length >= quantos) break;
      if (fila.length) saida.push(fila.shift());
      else vazias += 1;
    }
  }
  return saida.sort(() => Math.random() - 0.5);
}

function questoesDoChefao(c, cfg) {
  const liberados = new Set(
    c.modulos.filter((m) => m.disponivel && (!cfg.trilha || m.trilha === cfg.trilha)).map((m) => m.id),
  );
  let lista = c.questoes.filter((q) => liberados.has(q.modulo));
  if (ler().prefs.cortarC) lista = lista.filter((q) => q.prioridade !== "C");
  return lista;
}

export function melhorTentativa(id, e = ler()) {
  const reg = e.chefoes[id];
  if (!reg || !reg.tentativas || !reg.tentativas.length) return null;
  return reg.tentativas.reduce((a, b) => (b.pct > a.pct ? b : a));
}

/* ──────────── índice ──────────── */

function indice(raiz, c) {
  const e = ler();
  raiz.dataset.orgao = "rim";
  raiz.innerHTML = `<section>
    <h1>Chefões</h1>
    <p style="color:var(--tinta-fraca)">Simulados cronometrados. Você marca tudo primeiro e só vê o gabarito no fim — é assim que a prova vai ser.</p>
    <div class="pilha">
      ${c.chefoes
        .map((cfg) => {
          const disponiveis = questoesDoChefao(c, cfg).length;
          const pronto = disponiveis >= cfg.questoes;
          const melhor = melhorTentativa(cfg.id, e);
          const n = (e.chefoes[cfg.id]?.tentativas || []).length;
          return `<div class="cartao" data-orgao="${esc(cfg.orgao)}">
            <div class="linha-entre">
              <h2 style="margin:0">${esc(cfg.titulo)}</h2>
              <span class="fonte">${cfg.questoes} questões · ${cfg.minutos} min</span>
            </div>
            <p style="margin:.35rem 0 .6rem;color:var(--tinta-fraca);font-size:.93rem">${esc(cfg.desc)}</p>
            ${
              melhor
                ? `<div class="linha-entre"><span class="fonte">${n} ${n === 1 ? "tentativa" : "tentativas"}</span>
                   <span class="num" style="font-weight:600">melhor: ${melhor.pct}%${melhor.pct >= cfg.aprovacao ? " 🏅" : ""}</span></div>
                   <div class="barra" style="margin:.4rem 0 .2rem"><i style="width:${melhor.pct}%"></i></div>`
                : ""
            }
            <div class="acoes">
              ${
                pronto
                  ? `<a class="btn btn-forte" href="#/chefao/${esc(cfg.id)}/comecar">${melhor ? "Tentar de novo" : "Encarar"}</a>`
                  : `<span class="fonte">Faltam questões: ${disponiveis} de ${cfg.questoes} liberadas. Chega com o conteúdo dos próximos dias.</span>`
              }
            </div>
          </div>`;
        })
        .join("")}
    </div>
    <p class="rodape">As questões erradas aqui também entram no <a href="#/erros">caderno de erros</a>.</p>
  </section>`;
}

/* ──────────── a batalha ──────────── */

const CONF = [
  { id: "certeza", rot: "Certeza" },
  { id: "duvida", rot: "Dúvida" },
  { id: "chute", rot: "Chute" },
];

export async function desenhar(raiz, { c, args }) {
  const cfg = c.chefoes.find((x) => x.id === args[0]);
  if (!cfg) return indice(raiz, c);
  if (args[1] !== "comecar") return indice(raiz, c);

  const lista = sortear(questoesDoChefao(c, cfg), cfg.questoes);
  if (lista.length < cfg.questoes) return indice(raiz, c);

  raiz.dataset.orgao = cfg.orgao;
  const respostas = new Array(lista.length).fill(null);
  let i = 0;
  let pararRelogio = null;
  let acabou = false;

  const fim = () => {
    if (acabou) return;
    acabou = true;
    if (pararRelogio) pararRelogio();
    fechar();
  };

  pararRelogio = contagem(
    cfg.minutos * 60000,
    (resta) => {
      const el = raiz.querySelector("#relogio");
      if (el) {
        el.textContent = formatarRelogio(resta);
        el.classList.toggle("apertado", resta < 120000);
      }
    },
    fim,
  );

  function pintar() {
    if (i >= lista.length) return fim();
    const q = lista[i];
    const r = respostas[i];
    raiz.innerHTML = `<section>
      <div class="chefao-topo">
        <span class="olho">${esc(cfg.titulo)} · ${i + 1} de ${lista.length}</span>
        <span id="relogio" class="relogio num">${formatarRelogio(cfg.minutos * 60000)}</span>
      </div>
      <div class="progresso-blocos" aria-hidden="true">${lista
        .map((_, k) => `<i class="${k === i ? "ativo" : respostas[k] ? "passado" : ""}"></i>`)
        .join("")}</div>
      <div class="cartao">
        <div class="linha-entre" style="margin-bottom:.5rem">
          <span class="flex-chips">${selo(q.prioridade)} <span class="etiqueta etiqueta-${esc(c.moduloPorId[q.modulo]?.trilha || "rim")}">${esc(q.subtema)}</span></span>
          <span class="fonte">${esc(q.modulo)}</span>
        </div>
        <p style="font-weight:600">${rico(q.enunciado)}</p>
        <ul class="alternativas">
          ${q.alternativas
            .map(
              (a, k) => `<li><button class="alt${r && r.escolha === k ? " marcada" : ""}" type="button" data-i="${k}">
                <span class="alt-letra">${"ABCDE"[k]}</span><span>${rico(a)}</span></button></li>`,
            )
            .join("")}
        </ul>
        <div id="conf"></div>
      </div>
      <div class="acoes">
        <button class="btn" id="voltar" type="button" ${i === 0 ? "disabled" : ""}>← Anterior</button>
        <button class="btn" id="pular" type="button">${i + 1 >= lista.length ? "Encerrar" : "Pular"}</button>
        <button class="btn btn-forte" id="entregar" type="button">Entregar a prova</button>
      </div>
      <p class="fonte" style="text-align:center">Respondidas: ${respostas.filter(Boolean).length} de ${lista.length}</p>
    </section>`;

    for (const b of raiz.querySelectorAll(".alt")) {
      b.addEventListener("click", () => {
        respostas[i] = { escolha: Number(b.dataset.i), confianca: respostas[i]?.confianca || null };
        for (const x of raiz.querySelectorAll(".alt")) x.classList.toggle("marcada", x === b);
        pedirConfianca();
      });
    }
    if (r) pedirConfianca();

    raiz.querySelector("#voltar").addEventListener("click", () => {
      i = Math.max(0, i - 1);
      pintar();
    });
    raiz.querySelector("#pular").addEventListener("click", () => {
      i += 1;
      pintar();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    raiz.querySelector("#entregar").addEventListener("click", fim);
  }

  function pedirConfianca() {
    const caixa = raiz.querySelector("#conf");
    if (!caixa) return;
    const atual = respostas[i]?.confianca;
    caixa.innerHTML = `<p class="olho" style="margin:.8rem 0 .3rem">Antes de seguir: o quanto você tem certeza?</p>
      <div class="confianca">${CONF.map(
        (x) => `<button class="btn${atual === x.id ? " sel" : ""}" type="button" data-c="${x.id}">${x.rot}</button>`,
      ).join("")}</div>`;
    for (const b of caixa.querySelectorAll("[data-c]")) {
      b.addEventListener("click", () => {
        respostas[i] = { ...respostas[i], confianca: b.dataset.c };
        i += 1;
        pintar();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  }

  function fechar() {
    const detalhes = lista.map((q, k) => {
      const r = respostas[k];
      const escolha = r ? r.escolha : null;
      const confianca = r?.confianca || "chute";
      const certa = escolha === q.correta;
      const falso = certa && confianca === "chute";
      return { q, escolha, confianca, certa, falso, respondida: r !== null };
    });

    const acertos = detalhes.filter((d) => d.certa && !d.falso).length;
    const pct = Math.round((acertos / lista.length) * 100);
    const passou = pct >= cfg.aprovacao;

    mudar((e) => {
      const reg = (e.chefoes[cfg.id] ||= { tentativas: [] });
      if (!Array.isArray(reg.tentativas)) reg.tentativas = [];
      reg.tentativas.push({ em: Date.now(), pct, acertos, total: lista.length, minutos: cfg.minutos });
      for (const d of detalhes) {
        if (!d.respondida) continue;
        const rq = (e.questoes[d.q.id] ||= { tentativas: [] });
        rq.tentativas.push({ em: Date.now(), escolha: d.escolha, certa: d.certa, confianca: d.confianca, chefao: cfg.id });
      }
    });

    ganhar("chefao", Math.max(0.3, pct / 100));
    if (passou) darBadge(cfg.badge);
    bip(passou ? "ok" : "erro");
    registrar({ tipo: "chefao", id: cfg.id, pct, acertos, total: lista.length });
    anunciar(`${cfg.titulo} encerrado: ${acertos} de ${lista.length}, ${pct}%.`);

    const naoRespondidas = detalhes.filter((d) => !d.respondida).length;
    const falsos = detalhes.filter((d) => d.falso).length;
    const comCerteza = detalhes.filter((d) => !d.certa && d.confianca === "certeza" && d.respondida).length;

    raiz.innerHTML = `<section>
      <p class="olho">${esc(cfg.titulo)}</p>
      <div class="cartao" style="text-align:center">
        <span class="numerao" style="color:var(--orgao)">${pct}%</span>
        <p style="margin:.2rem 0 .6rem;font-weight:600">${acertos} de ${lista.length} ${acertos === 1 ? "certa" : "certas"}</p>
        <p style="margin:0;color:var(--tinta-fraca);font-size:.93rem">${
          passou
            ? "Chefão derrotado. Acerto no chute não contou."
            : `Faltou chegar a ${cfg.aprovacao}%. Os erros já estão no caderno — refazer só eles é o caminho mais curto.`
        }</p>
      </div>
      <div class="medidores" style="margin-top:.75rem">
        <div class="medidor"><div class="rot">Em branco</div><div class="val">${naoRespondidas}</div><div class="obs">não respondidas</div></div>
        <div class="medidor"><div class="rot">Acertou no chute</div><div class="val">${falsos}</div><div class="obs">conta como erro</div></div>
        <div class="medidor"><div class="rot">Errou com certeza</div><div class="val">${comCerteza}</div><div class="obs">o mais perigoso</div></div>
      </div>
      <div class="acoes" style="justify-content:center;margin-top:.8rem">
        <a class="btn btn-forte" href="#/questoes/erros">Refazer só os erros</a>
        <a class="btn" href="#/chefao">Voltar aos chefões</a>
      </div>
      <div class="secao-titulo"><h2>Correção comentada</h2><span class="conta">${lista.length} questões</span></div>
      <div class="pilha">${detalhes.map(cartaoRevisao).join("")}</div>
    </section>`;
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  function cartaoRevisao(d, k) {
    const q = d.q;
    const amb = q.ambiguidade ? c.ambiguidades[q.ambiguidade] : null;
    const marca = !d.respondida ? "branco" : d.certa && !d.falso ? "acerto" : "erro";
    const rotulo = !d.respondida ? "Em branco" : d.falso ? "Acertou no chute" : d.certa ? "Certo" : "Errado";
    const erradas = Object.entries(q.porque_erradas || {})
      .map(([n, txt]) => `<li><b>${"ABCDE"[Number(n)]})</b> ${rico(txt)}</li>`)
      .join("");
    return `<details class="cartao revisao-q revisao-${marca}">
      <summary>
        <span class="revisao-n">${k + 1}</span>
        <span class="revisao-res">${esc(rotulo)}</span>
        <span class="revisao-sub">${esc(q.subtema)}</span>
      </summary>
      <div style="margin-top:.6rem">
        <p style="font-weight:600">${rico(q.enunciado)}</p>
        <ul class="alternativas">${q.alternativas
          .map(
            (a, n) =>
              `<li><div class="alt${n === q.correta ? " certa" : n === d.escolha ? " errada" : ""}" style="cursor:default">
                <span class="alt-letra">${"ABCDE"[n]}</span><span>${rico(a)}</span></div></li>`,
          )
          .join("")}</ul>
        <div class="resposta ${d.certa && !d.falso ? "acerto" : "erro"}">
          <div class="veredito">Gabarito ${"ABCDE"[q.correta]}</div>
          <div>${rico(q.justificativa)}</div>
          ${erradas ? `<p class="olho" style="margin:.7rem 0 .2rem">Por que as outras erram</p><ul class="porques">${erradas}</ul>` : ""}
          ${caixaFonte(q.fonte)}
          ${atencao(amb)}
        </div>
      </div>
    </details>`;
  }

  pintar();
  return () => {
    if (pararRelogio) pararRelogio();
  };
}
