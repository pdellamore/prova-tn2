/* Cálculos: primeiro o exemplo resolvido passo a passo, depois casos
   com números sorteados dentro das faixas dos slides. */

import { ler, mudar } from "../store.js";
import { ganhar, darBadge } from "../xp.js";
import { registrar } from "../metrics.js";
import { esc, rico, selo, caixaFonte, anunciar, bip } from "../ui.js";
import * as kdigo from "../calc/kdigo.js";
import * as cockcroft from "../calc/cockcroft.js";
import * as mst from "../calc/mst.js";

const CALCS = { kdigo, cockcroft, mst };

export async function desenhar(raiz, { args }) {
  const id = args[0];
  if (!id || !CALCS[id]) return indice(raiz);
  return umCalculo(raiz, CALCS[id]);
}

function indice(raiz) {
  const e = ler();
  raiz.dataset.orgao = "rim";
  raiz.innerHTML = `<section>
    <h1>Cálculos</h1>
    <p style="color:var(--tinta-fraca)">Cada um abre com um exemplo resolvido e depois sorteia casos novos dentro das faixas dos slides.</p>
    <div class="pilha">
      ${Object.values(CALCS)
        .map((m) => {
          const feitos = e.chefoes["calc:" + m.meta.id]?.resolvidos || 0;
          const seguidas = e.chefoes["calc:" + m.meta.id]?.seguidas || 0;
          return `<a class="cartao" href="#/calculos/${esc(m.meta.id)}" style="text-decoration:none;color:inherit;display:block" data-orgao="${esc(m.meta.orgao)}">
            <div class="linha-entre">
              <h2 style="margin:0">${esc(m.meta.titulo)} ${selo(m.meta.prioridade)}</h2>
              <span class="fonte">${feitos ? `${feitos} ${feitos === 1 ? "resolvido" : "resolvidos"}` : "não começou"}</span>
            </div>
            <p style="margin:.3rem 0 0;color:var(--tinta-fraca);font-size:.93rem">${esc(m.meta.descricao)}</p>
            ${seguidas >= 3 ? `<p class="fonte" style="margin:.3rem 0 0">sequência atual: ${seguidas}</p>` : ""}
          </a>`;
        })
        .join("")}
    </div>
    <div class="cartao" style="margin-top:1rem">
      <p class="olho">Chegam depois</p>
      <p style="margin:0;font-size:.93rem;color:var(--tinta-fraca)">Peso seco por desconto de ascite e edema, peso ajustado da MASLD, Child-Pugh, prescrição de líquidos na HD e a classificação MASLD × MetALD × ALD entram com o conteúdo de sexta e sábado.</p>
    </div>
  </section>`;
}

function campo(cp, valor) {
  if (cp.tipo === "select") {
    return `<div class="campo"><label for="c-${cp.id}">${esc(cp.rot)}</label>
      <select id="c-${cp.id}" data-campo="${cp.id}">${cp.opcoes
        .map(([v, r]) => `<option value="${esc(v)}"${String(valor) === v ? " selected" : ""}>${esc(r)}</option>`)
        .join("")}</select></div>`;
  }
  return `<div class="campo"><label for="c-${cp.id}">${esc(cp.rot)}</label>
    <input id="c-${cp.id}" data-campo="${cp.id}" type="number" inputmode="decimal" step="${cp.passo || "any"}" value="${valor ?? ""}" /></div>`;
}

function umCalculo(raiz, m) {
  raiz.dataset.orgao = m.meta.orgao;
  let modo = "exemplo";
  let caso = null;

  function pintar() {
    raiz.innerHTML = `<section>
      <p class="olho"><a href="#/calculos" style="color:inherit;text-decoration:none">← Cálculos</a></p>
      <h1>${esc(m.meta.titulo)} ${selo(m.meta.prioridade)}</h1>
      <div class="flex-chips" style="margin:.6rem 0 1rem" role="tablist">
        <button class="btn btn-pequeno${modo === "exemplo" ? " btn-forte" : ""}" type="button" data-modo="exemplo">Exemplo resolvido</button>
        <button class="btn btn-pequeno${modo === "pratica" ? " btn-forte" : ""}" type="button" data-modo="pratica">Praticar</button>
        <button class="btn btn-pequeno${modo === "livre" ? " btn-forte" : ""}" type="button" data-modo="livre">Calcular do zero</button>
      </div>
      <div id="corpo"></div>
    </section>`;
    for (const b of raiz.querySelectorAll("[data-modo]")) {
      b.addEventListener("click", () => {
        modo = b.dataset.modo;
        caso = null;
        pintar();
      });
    }
    const corpo = raiz.querySelector("#corpo");
    if (modo === "exemplo") exemplo(corpo);
    else if (modo === "pratica") pratica(corpo);
    else livre(corpo);
  }

  function solucaoHTML(sol) {
    return `<ol class="passos">${sol.passos.map((p) => `<li>${p}</li>`).join("")}</ol>
      <div class="resultado"><span class="numerao">${esc(sol.rotulo)}</span><p style="margin:.2rem 0 0">${esc(sol.detalhe)}</p></div>`;
  }

  function exemplo(corpo) {
    const sol = m.resolver(m.exemplo.dados);
    corpo.innerHTML = `<div class="cartao">
      <p class="olho">Dados do exemplo</p>
      <ul style="margin:.2rem 0 .8rem">${m.campos
        .map((cp) => `<li>${esc(cp.rot)}: <b>${esc(rotuloValor(cp, m.exemplo.dados[cp.id]))}</b></li>`)
        .join("")}</ul>
      ${solucaoHTML(sol)}
      ${m.exemplo.nota ? `<p class="fonte" style="margin-top:.6rem">${esc(m.exemplo.nota)}</p>` : ""}
      ${caixaFonte(m.meta.fonte)}
      ${m.meta.id === "kdigo" ? gradeKdigo(sol) : ""}
      <div class="acoes"><button class="btn btn-forte" type="button" data-ir="pratica">Agora um caso novo</button></div>
    </div>`;
    corpo.querySelector("[data-ir]").addEventListener("click", () => {
      modo = "pratica";
      pintar();
    });
  }

  function pratica(corpo) {
    caso ||= m.gerar();
    const temAlternativas = typeof m.alternativas === "function";
    corpo.innerHTML = `<div class="cartao">
      <p class="olho">Caso sorteado</p>
      <ul style="margin:.2rem 0 .9rem">${m.campos
        .filter((cp) => rotuloValor(cp, caso[cp.id]) !== "—")
        .map((cp) => `<li>${esc(cp.rot)}: <b>${esc(rotuloValor(cp, caso[cp.id]))}</b></li>`)
        .join("")}</ul>
      ${
        temAlternativas
          ? `<p style="font-weight:600">Qual é a classificação?</p>
             <ul class="alternativas">${m
               .alternativas(caso)
               .map((a, i) => `<li><button class="alt" type="button" data-alt="${esc(a)}"><span class="alt-letra">${"ABCDE"[i]}</span><span>${esc(a)}</span></button></li>`)
               .join("")}</ul>`
          : `<div class="campos"><div class="campo"><label for="resp">Sua resposta</label>
             <input id="resp" type="text" inputmode="decimal" placeholder="só o número" /></div></div>
             <div class="acoes"><button class="btn btn-forte" id="conferir" type="button">Conferir</button></div>`
      }
      <div id="eco"></div>
    </div>`;

    const eco = corpo.querySelector("#eco");
    const julgar = (resposta) => {
      const r = m.conferir(caso, resposta);
      const reg = "calc:" + m.meta.id;
      mudar((e) => {
        const c = (e.chefoes[reg] ||= { resolvidos: 0, acertos: 0, seguidas: 0, recorde: 0 });
        c.resolvidos += 1;
        if (r.ok) {
          c.acertos += 1;
          c.seguidas += 1;
          c.recorde = Math.max(c.recorde, c.seguidas);
        } else c.seguidas = 0;
      });
      const seguidas = ler().chefoes[reg].seguidas;
      if (r.ok) ganhar("calculo");
      if (seguidas >= 10) darBadge(`dez-seguidos-${m.meta.id}`);
      bip(r.ok ? "ok" : "erro");
      registrar({ tipo: "calculo", id: m.meta.id, ok: r.ok });
      anunciar(r.ok ? "Acertou." : `Errou. O certo era ${r.esperado}.`);
      eco.innerHTML = `<div class="resposta ${r.ok ? "acerto" : "erro"}">
        <div class="veredito">${r.ok ? `Certo — ${esc(r.esperado)}` : `Era ${esc(r.esperado)}`}</div>
        ${solucaoHTML(r.solucao)}
        ${m.meta.id === "kdigo" ? gradeKdigo(r.solucao) : ""}
        <p class="fonte" style="margin-top:.5rem">Sequência atual: ${seguidas}${seguidas >= 10 ? " 🏅" : ""}</p>
        <div class="acoes"><button class="btn btn-forte" id="outro" type="button">Outro caso</button>
        <a class="btn" href="#/calculos">Voltar</a></div>
      </div>`;
      eco.querySelector("#outro").addEventListener("click", () => {
        caso = m.gerar();
        pratica(corpo);
      });
      eco.querySelector("#outro").focus();
    };

    for (const b of corpo.querySelectorAll("[data-alt]")) {
      b.addEventListener("click", () => {
        for (const x of corpo.querySelectorAll("[data-alt]")) x.disabled = true;
        julgar(b.dataset.alt);
      });
    }
    const btn = corpo.querySelector("#conferir");
    if (btn) {
      const entrada = corpo.querySelector("#resp");
      btn.addEventListener("click", () => julgar(entrada.value));
      entrada.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") julgar(entrada.value);
      });
    }
  }

  function livre(corpo) {
    corpo.innerHTML = `<div class="cartao">
      <div class="campos">${m.campos.map((cp) => campo(cp, m.exemplo.dados[cp.id])).join("")}</div>
      <div class="acoes"><button class="btn btn-forte" id="calc" type="button">Calcular</button></div>
      <div id="saida"></div>
      ${caixaFonte(m.meta.fonte)}
    </div>`;
    const rodar = () => {
      const dados = {};
      for (const el of corpo.querySelectorAll("[data-campo]")) {
        dados[el.dataset.campo] = el.type === "number" ? Number(el.value) : el.value;
      }
      const faltando = m.campos.some((cp) => cp.tipo !== "select" && !isFinite(dados[cp.id]));
      if (faltando) {
        corpo.querySelector("#saida").innerHTML = `<p class="fonte">Preencha os campos numéricos.</p>`;
        return;
      }
      const sol = m.resolver(dados);
      corpo.querySelector("#saida").innerHTML = solucaoHTML(sol) + (m.meta.id === "kdigo" ? gradeKdigo(sol) : "");
    };
    corpo.querySelector("#calc").addEventListener("click", rodar);
    rodar();
  }

  pintar();
}

function rotuloValor(cp, v) {
  if (cp.tipo === "select") {
    const achado = cp.opcoes.find(([val]) => String(val) === String(v));
    return achado ? achado[1].replace(/\s*\(\d\)$/, "") : "—";
  }
  return String(v).replace(".", ",");
}

/** O quadro de prognóstico do slide 47, com a célula do caso destacada. */
function gradeKdigo(sol) {
  const linhas = kdigo.FAIXAS_G.map((g) => {
    const cels = kdigo.FAIXAS_A.map((a, i) => {
      const cor = kdigo.RISCO[g.id][i];
      const aqui = sol.g === g.id && sol.a === a.id;
      return `<td data-risco="${cor}" class="${aqui ? "aqui" : ""}">${aqui ? "aqui" : ""}</td>`;
    }).join("");
    return `<tr><th>${g.id}</th><th style="font-weight:400">${g.rot}</th>${cels}</tr>`;
  }).join("");
  return `<div style="overflow-x:auto;margin-top:.8rem">
    <table class="grade-kdigo"><caption class="fonte" style="text-align:left;padding-bottom:.3rem">Prognóstico KDIGO 2012 — verde baixo · amarelo moderado · laranja alto · vermelho muito alto</caption>
    <thead><tr><th>G</th><th>TFG</th>${kdigo.FAIXAS_A.map((a) => `<th>${a.id}<br><span style="font-weight:400">${a.rot}</span></th>`).join("")}</tr></thead>
    <tbody>${linhas}</tbody></table></div>`;
}
