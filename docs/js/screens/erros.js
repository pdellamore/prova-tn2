/* Caderno de erros: tudo que você errou, ou acertou no chute, agrupado por tema. */

import { ler } from "../store.js";
import { ultima, contaComoErro } from "./questoes.js";
import { esc, selo } from "../ui.js";

export async function desenhar(raiz, { c }) {
  const e = ler();
  const errados = c.questoes.filter((q) => contaComoErro(ultima(q.id, e)));
  raiz.dataset.orgao = "rim";

  if (!errados.length) {
    raiz.innerHTML = `<section><h1>Meus erros</h1>
      <div class="vazio"><span class="numerao">✓</span>
      <p>Caderno vazio. Ou você ainda não respondeu questões, ou zerou tudo.</p>
      <a class="btn btn-forte" href="#/hoje">Voltar para Hoje</a></div></section>`;
    return;
  }

  const grupos = new Map();
  for (const q of errados) {
    const chave = `${q.modulo} — ${c.moduloPorId[q.modulo]?.titulo || q.tema}`;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(q);
  }

  raiz.innerHTML = `<section>
    <h1>Meus erros</h1>
    <p style="color:var(--tinta-fraca)">${errados.length} ${errados.length === 1 ? "questão" : "questões"} em aberto. Conta como erro também o que você acertou marcando <b>chute</b>.</p>
    <div class="acoes" style="margin-bottom:1rem">
      <a class="btn btn-forte btn-largo" href="#/questoes/erros">Refazer só os erros</a>
    </div>
    ${[...grupos.entries()]
      .map(
        ([chave, qs]) => `<div class="cartao" data-orgao="${esc(c.moduloPorId[qs[0].modulo]?.trilha || "rim")}">
          <div class="linha-entre" style="margin-bottom:.4rem">
            <b>${esc(chave)}</b><span class="fonte">${qs.length}</span>
          </div>
          <ul style="margin:0;padding-left:1.1rem;font-size:.92rem">
            ${qs
              .map((q) => {
                const t = ultima(q.id, e);
                const tag = t.certa ? "acertou no chute" : t.confianca === "certeza" ? "errou com certeza" : "errou";
                return `<li>${selo(q.prioridade)} ${esc(q.subtema)} <span class="fonte">(${tag})</span></li>`;
              })
              .join("")}
          </ul>
          <div class="acoes" style="margin-top:.6rem"><a class="btn btn-pequeno" href="#/questoes/${esc(qs[0].modulo)}">Refazer o módulo</a></div>
        </div>`,
      )
      .join("")}
  </section>`;
}
