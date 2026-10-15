/* Questões objetivas: escolher a alternativa → marcar a confiança → ver a resposta.
   Acertar marcando "chute" conta como erro (é o acerto falso do painel). */

import { ler, mudar } from "../store.js";
import { ganhar } from "../xp.js";
import { registrar } from "../metrics.js";
import { esc, rico, selo, caixaFonte, atencao, anunciar, bip } from "../ui.js";

const CONF = [
  { id: "certeza", rot: "Certeza", obs: "sei" },
  { id: "duvida", rot: "Dúvida", obs: "acho que sei" },
  { id: "chute", rot: "Chute", obs: "não sei" },
];

/** Última tentativa registrada. */
export function ultima(id, e = ler()) {
  const t = e.questoes[id]?.tentativas;
  return t && t.length ? t[t.length - 1] : null;
}

/** Erro "contável": errou, ou acertou marcando chute. */
export function contaComoErro(t) {
  return !!t && (!t.certa || t.confianca === "chute");
}

export function listaDeErros(c, e = ler()) {
  return c.questoes.filter((q) => contaComoErro(ultima(q.id, e)));
}

/**
 * Desenha uma questão dentro de `alvo`.
 * opts: { aoTerminar, rotuloSeguir, contexto }
 */
export function blocoQuestao(alvo, q, c, opts = {}) {
  const amb = q.ambiguidade ? c.ambiguidades[q.ambiguidade] : null;
  let escolha = null;

  alvo.innerHTML = `
    <p style="font-weight:600">${rico(q.enunciado)}</p>
    <ul class="alternativas">
      ${q.alternativas
        .map(
          (a, i) => `<li><button class="alt" type="button" data-i="${i}">
            <span class="alt-letra">${"ABCDE"[i]}</span><span>${rico(a)}</span></button></li>`,
        )
        .join("")}
    </ul>
    <div id="pos-escolha"></div>`;

  const botoes = [...alvo.querySelectorAll(".alt")];
  const pos = alvo.querySelector("#pos-escolha");

  botoes.forEach((b) =>
    b.addEventListener("click", () => {
      escolha = Number(b.dataset.i);
      botoes.forEach((x) => x.classList.toggle("marcada", Number(x.dataset.i) === escolha));
      pedirConfianca();
    }),
  );

  function pedirConfianca() {
    pos.innerHTML = `<p class="olho" style="margin-top:.9rem">Antes de ver a resposta: o quanto você tem certeza?</p>
      <div class="confianca">${CONF.map(
        (x) => `<button class="btn" type="button" data-c="${x.id}"><span>${x.rot}</span><small>${x.obs}</small></button>`,
      ).join("")}</div>`;
    for (const b of pos.querySelectorAll("[data-c]")) {
      b.addEventListener("click", () => revelar(b.dataset.c));
    }
    pos.querySelector("[data-c]")?.focus();
  }

  function revelar(confianca) {
    const certa = escolha === q.correta;
    const falso = certa && confianca === "chute";

    botoes.forEach((x, j) => {
      x.disabled = true;
      x.classList.remove("marcada");
      if (j === q.correta) x.classList.add("certa");
      else if (j === escolha) x.classList.add("errada");
    });

    mudar((e) => {
      const reg = (e.questoes[q.id] ||= { tentativas: [] });
      reg.tentativas.push({ em: Date.now(), escolha, certa, confianca });
    });
    ganhar(certa && !falso ? "questao_certa" : "questao_errada");
    bip(certa ? "ok" : "erro");
    registrar({ tipo: "questao", id: q.id, modulo: q.modulo, tema: q.tema, certa, confianca });
    anunciar(certa ? "Acertou." : "Errou. Veja a justificativa.");

    const erradas = Object.entries(q.porque_erradas || {})
      .map(([i, txt]) => `<li><b>${"ABCDE"[Number(i)]})</b> ${rico(txt)}</li>`)
      .join("");

    pos.innerHTML = `<div class="resposta ${certa ? "acerto" : "erro"}">
      <div class="veredito">${certa ? "Certo" : "Errado"} — gabarito ${"ABCDE"[q.correta]}</div>
      <div>${rico(q.justificativa)}</div>
      ${falso ? `<div class="falso-acerto">Acerto no chute: este item volta como se fosse erro.</div>` : ""}
      ${erradas ? `<p class="olho" style="margin:.7rem 0 .2rem">Por que as outras erram</p><ul class="porques">${erradas}</ul>` : ""}
      ${caixaFonte(q.fonte)}
      ${atencao(amb)}
      <div id="elab"></div>
      <div class="acoes"><button class="btn btn-forte" id="seguir" type="button">${esc(opts.rotuloSeguir || "Próxima")}</button></div>
    </div>`;

    if (q.elaboracao) elaborar(pos.querySelector("#elab"), q.elaboracao);
    const seguir = pos.querySelector("#seguir");
    seguir.addEventListener("click", () => opts.aoTerminar && opts.aoTerminar({ certa, falso }));
    seguir.focus();
  }
}

/** Pergunta "por quê?" — causa → consequência, depois da resposta. */
function elaborar(alvo, el) {
  alvo.innerHTML = `<p class="olho" style="margin:.8rem 0 .2rem">E por quê?</p>
    <p style="font-size:.93rem;margin-bottom:.4rem">${rico(el.pergunta)}</p>
    <ul class="alternativas">${el.opcoes
      .map((o, i) => `<li><button class="alt" type="button" data-e="${i}"><span class="alt-letra">${"ABCDE"[i]}</span><span>${rico(o)}</span></button></li>`)
      .join("")}</ul>
    <div id="eco-elab"></div>`;
  const bs = [...alvo.querySelectorAll("[data-e]")];
  bs.forEach((b) =>
    b.addEventListener("click", () => {
      const i = Number(b.dataset.e);
      bs.forEach((x, j) => {
        x.disabled = true;
        if (j === el.correta) x.classList.add("certa");
        else if (j === i) x.classList.add("errada");
      });
      alvo.querySelector("#eco-elab").innerHTML = `<p style="font-size:.9rem;margin-top:.5rem">${rico(el.justificativa)}</p>`;
      if (i === el.correta) ganhar("checagem_certa");
    }),
  );
}

/* ──────────── tela ──────────── */

export async function desenhar(raiz, { c, args }) {
  const alvo = args[0] || "";
  let lista;
  let titulo;
  let orgao = "rim";

  if (alvo.startsWith("preteste-")) {
    const trilha = alvo.slice(9);
    orgao = trilha;
    titulo = `Pré-teste do ${trilha === "rim" ? "Rim" : "Fígado"}`;
    lista = c.questoes.filter((q) => q.preteste && c.moduloPorId[q.modulo]?.trilha === trilha);
  } else if (alvo === "erros") {
    lista = listaDeErros(c);
    titulo = "Refazer só os erros";
  } else if (c.moduloPorId[alvo]) {
    const m = c.moduloPorId[alvo];
    orgao = m.trilha;
    titulo = `${m.id}. ${m.titulo}`;
    lista = c.questoes.filter((q) => q.modulo === alvo);
  } else {
    const liberados = c.modulos.filter((m) => m.disponivel).map((m) => m.id);
    lista = c.questoes.filter((q) => liberados.includes(q.modulo));
    titulo = "Todas as questões liberadas";
  }

  if (ler().prefs.cortarC) lista = lista.filter((q) => q.prioridade !== "C");

  raiz.dataset.orgao = orgao;
  if (!lista.length) {
    raiz.innerHTML = `<div class="vazio"><span class="numerao">0</span><p>Nenhuma questão aqui por enquanto.</p>
      <a class="btn" href="#/hoje">Voltar para Hoje</a></div>`;
    return;
  }

  let i = 0;
  let acertos = 0;

  function pintar() {
    if (i >= lista.length) return fim();
    const q = lista[i];
    raiz.innerHTML = `<section>
      <p class="olho">${esc(titulo)} · ${i + 1} de ${lista.length}</p>
      <div class="progresso-blocos" aria-hidden="true">${lista
        .map((_, k) => `<i class="${k === i ? "ativo" : k < i ? "passado" : ""}"></i>`)
        .join("")}</div>
      <div class="cartao">
        <div class="linha-entre" style="margin-bottom:.5rem">
          <span class="flex-chips">${selo(q.prioridade)} <span class="etiqueta etiqueta-${esc(c.moduloPorId[q.modulo]?.trilha || "rim")}">${esc(q.subtema)}</span></span>
          <span class="fonte">dificuldade ${"●".repeat(q.dificuldade)}${"○".repeat(3 - q.dificuldade)}</span>
        </div>
        <div id="alvo-q"></div>
      </div>
    </section>`;
    blocoQuestao(raiz.querySelector("#alvo-q"), q, c, {
      rotuloSeguir: i + 1 >= lista.length ? "Ver o resultado" : "Próxima",
      aoTerminar: ({ certa, falso }) => {
        if (certa && !falso) acertos += 1;
        i += 1;
        pintar();
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
    });
  }

  function fim() {
    const pct = Math.round((acertos / lista.length) * 100);
    raiz.innerHTML = `<section>
      <p class="olho">${esc(titulo)}</p>
      <div class="cartao" style="text-align:center">
        <span class="numerao" style="color:var(--orgao)">${pct}%</span>
        <p>${acertos} de ${lista.length} ${acertos === 1 ? "certa" : "certas"} (acerto no chute não conta).</p>
        <div class="acoes" style="justify-content:center">
          <a class="btn btn-forte" href="#/hoje">Voltar para Hoje</a>
          <a class="btn" href="#/erros">Ver meus erros</a>
        </div>
      </div></section>`;
    anunciar(`Resultado: ${acertos} de ${lista.length}.`);
  }

  pintar();
}
