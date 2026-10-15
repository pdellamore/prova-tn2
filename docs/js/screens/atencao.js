/* Lista de todos os pontos em que os slides se contradizem.
   Na véspera da prova, é a tela para passar os olhos: aqui ela vê de uma vez
   tudo o que não tem resposta única nos slides, em vez de topar com cada caixa
   no meio de uma lição. */

import { esc, rico, atencao } from "../ui.js";

/** Em quais módulos cada ambiguidade aparece, para dar o caminho de volta. */
export function ondeAparece(c) {
  const mapa = new Map();
  const anotar = (id, modulo) => {
    if (!id || !modulo) return;
    (mapa.get(id) || mapa.set(id, new Set()).get(id)).add(modulo);
  };
  for (const q of c.questoes) anotar(q.ambiguidade, q.modulo);
  for (const f of c.flashcards) anotar(f.ambiguidade, f.modulo);
  return mapa;
}

export async function desenhar(raiz, { c }) {
  const lista = Object.values(c.ambiguidades);
  const onde = ondeAparece(c);

  raiz.dataset.orgao = "rim";
  raiz.innerHTML = `<section>
    <h1>Pontos de atenção</h1>
    <p style="color:var(--tinta-fraca)">São os ${lista.length} pontos em que os slides da disciplina
    <b>não fecham</b>: trazem dois números ou duas leituras para a mesma coisa. O site não escolhe
    um lado — mostra os dois e diz de qual slide cada um veio.</p>

    <div class="cartao">
      <p style="margin:0;font-size:.93rem">Se um desses cair na prova, a saída é olhar o que o
      <b>próprio enunciado</b> citar: a diretriz (KDOQI, KDIGO, BRASPEN, EASL), o ano ou a tabela.
      Quando o enunciado não disser, qualquer um dos dois lados é defensável.</p>
    </div>

    <div class="pilha" style="margin-top:.75rem">
      ${lista
        .map((a) => {
          const mods = [...(onde.get(a.id) || [])].sort();
          return `<div class="cartao">
            <div class="linha-entre" style="margin-bottom:.3rem">
              <h2 style="margin:0;font-size:1.05rem">${esc(a.titulo)}</h2>
              ${mods.length ? `<span class="fonte">${esc(mods.join(" · "))}</span>` : ""}
            </div>
            ${atencao(a)}
            ${
              mods.length
                ? `<div class="acoes" style="margin:.5rem 0 0">${mods
                    .map((m) => `<a class="btn btn-pequeno" href="#/licao/${esc(m)}">Rever ${esc(m)}</a>`)
                    .join("")}</div>`
                : ""
            }
          </div>`;
        })
        .join("")}
    </div>

    <p class="rodape">${rico(
      "Tudo aqui saiu dos próprios slides. Onde eles divergem, a divergência é o conteúdo.",
    )}</p>
  </section>`;
}
