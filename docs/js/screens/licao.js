/* Lição: pré-teste curto, blocos de 3 a 5 min e, no fim de cada bloco,
   uma pergunta antes de liberar o resumo do bloco seguinte (recuperação ativa).
   Fecha com o campo "explique com suas palavras" (Feynman). */

import { ler, mudar } from "../store.js";
import { licao as carregarLicao } from "../content.js";
import { ganhar, darBadge } from "../xp.js";
import { registrar } from "../metrics.js";
import { esc, rico, selo, cuidado, apoio, atencao, caixaFonte, anunciar, bip } from "../ui.js";
import { blocoQuestao } from "./questoes.js";

export async function desenhar(raiz, { c, args }) {
  const id = args[0];
  const mod = c.moduloPorId[id];
  if (!mod) {
    raiz.innerHTML = `<div class="vazio"><p>Módulo não encontrado.</p><a class="btn" href="#/trilha">Voltar à trilha</a></div>`;
    return;
  }
  if (!mod.disponivel) {
    raiz.innerHTML = `<div class="cartao"><h1>${esc(mod.id)}. ${esc(mod.titulo)}</h1>
      <p>Esta lição ${esc(mod.chega)}.</p><a class="btn" href="#/trilha">Voltar à trilha</a></div>`;
    return;
  }

  const l = await carregarLicao(id);
  raiz.dataset.orgao = mod.trilha;

  const preteste = (l.preteste || []).map((qid) => c.questaoPorId[qid]).filter(Boolean);
  const jaComecou = !!ler().licoes[id]?.blocosVistos?.length;
  let fase = preteste.length && !jaComecou ? "preteste" : "blocos";
  let iBloco = 0;
  let iPre = 0;

  const esconderC = ler().prefs.cortarC;
  const blocos = (l.blocos || []).filter((b) => !(esconderC && b.prioridade === "C"));

  function cabeca(sub) {
    return `<p class="olho"><a href="#/trilha" style="color:inherit;text-decoration:none">← Trilha</a> · ${esc(mod.id)} ${selo(mod.prioridade)}</p>
      <h1>${esc(mod.titulo)}</h1>
      <p style="color:var(--tinta-fraca);margin-bottom:1rem">${esc(sub)}</p>`;
  }

  function pintarPreteste() {
    const q = preteste[iPre];
    raiz.innerHTML = `<section>${cabeca(`Pré-teste · ${iPre + 1} de ${preteste.length}`)}
      <div class="cartao">
        <p class="olho">Antes de ler</p>
        <p style="font-size:.92rem;color:var(--tinta-fraca);margin-bottom:.8rem">Errar aqui é esperado e ajuda: responder antes de estudar fixa mais do que só ler.</p>
        <div id="alvo-q"></div>
      </div></section>`;
    blocoQuestao(raiz.querySelector("#alvo-q"), q, c, {
      aoTerminar: () => {
        iPre += 1;
        if (iPre >= preteste.length) {
          fase = "blocos";
          anunciar("Pré-teste concluído. Começando a lição.");
          pintar();
        } else pintarPreteste();
      },
      rotuloSeguir: iPre + 1 >= preteste.length ? "Começar a lição" : "Próxima",
    });
  }

  function pintarBloco() {
    const b = blocos[iBloco];
    const amb = b.ambiguidade ? c.ambiguidades[b.ambiguidade] : null;
    raiz.innerHTML = `<section>${cabeca(`Bloco ${iBloco + 1} de ${blocos.length} · ${mod.duracao_min} min no total`)}
      <div class="progresso-blocos" aria-hidden="true">
        ${blocos.map((_, i) => `<i class="${i === iBloco ? "ativo" : i < iBloco ? "passado" : ""}"></i>`).join("")}
      </div>
      <div class="cartao">
        <h2>${esc(b.titulo)} ${b.prioridade ? selo(b.prioridade) : ""}</h2>
        <ul class="bloco-pontos">${(b.pontos || []).map((p) => `<li>${rico(p)}</li>`).join("")}</ul>
        ${b.tabela ? tabela(b.tabela) : ""}
        ${cuidado(b.cuidado)}
        ${atencao(amb)}
        ${apoio(b.apoio)}
        ${caixaFonte(b.fonte)}
      </div>
      <div class="cartao" id="caixa-check">
        <p class="olho">Antes de seguir</p>
        <div id="alvo-check"></div>
      </div>
    </section>`;

    const alvo = raiz.querySelector("#alvo-check");
    if (!b.checagem) {
      alvo.innerHTML = `<button class="btn btn-forte btn-largo" id="seguir" type="button">Próximo bloco</button>`;
      alvo.querySelector("#seguir").addEventListener("click", avancar);
      return;
    }
    checagem(alvo, b, avancar);
  }

  function checagem(alvo, b, aoSeguir) {
    const q = b.checagem;
    const ultimo = iBloco + 1 >= blocos.length;
    alvo.innerHTML = `<p style="font-weight:600;margin-bottom:.2rem">${rico(q.pergunta)}</p>
      <ul class="alternativas">
        ${q.alternativas.map((a, i) => `<li><button class="alt" type="button" data-i="${i}">
          <span class="alt-letra">${"ABCDE"[i]}</span><span>${rico(a)}</span></button></li>`).join("")}
      </ul>
      <div id="eco"></div>`;

    const botoes = [...alvo.querySelectorAll(".alt")];
    botoes.forEach((btn) =>
      btn.addEventListener("click", () => {
        const i = Number(btn.dataset.i);
        const certa = i === q.correta;
        botoes.forEach((x, j) => {
          x.disabled = true;
          if (j === q.correta) x.classList.add("certa");
          else if (j === i) x.classList.add("errada");
        });
        ganhar(certa ? "checagem_certa" : "checagem_errada");
        bip(certa ? "ok" : "erro");
        registrar({ tipo: "checagem", modulo: id, bloco: b.id, certa });
        anunciar(certa ? "Acertou." : "Errou.");
        alvo.querySelector("#eco").innerHTML = `<div class="resposta ${certa ? "acerto" : "erro"}">
          <div class="veredito">${certa ? "Isso." : "Não é essa."}</div>
          <div>${rico(q.justificativa)}</div>
          ${q.fonte ? caixaFonte(q.fonte) : ""}
          <div class="acoes"><button class="btn btn-forte" id="seguir" type="button">${ultimo ? "Fechar a lição" : "Próximo bloco"}</button></div>
        </div>`;
        alvo.querySelector("#seguir").addEventListener("click", aoSeguir);
        alvo.querySelector("#seguir").focus();
      }),
    );
  }

  function avancar() {
    mudar((e) => {
      const reg = (e.licoes[id] ||= { blocosVistos: [] });
      const b = blocos[iBloco];
      if (b && !reg.blocosVistos.includes(b.id)) reg.blocosVistos.push(b.id);
    });
    ganhar("bloco");
    iBloco += 1;
    if (iBloco >= blocos.length) {
      mudar((e) => {
        e.licoes[id].concluida = Date.now();
      });
      registrar({ tipo: "licao_concluida", modulo: id });
      pintarFim();
    } else {
      pintarBloco();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function pintarFim() {
    const salvo = ler().feynman[id] || { texto: "", marcados: [] };
    const qtdQuestoes = c.questoes.filter((q) => q.modulo === id).length;
    raiz.innerHTML = `<section>${cabeca("Lição concluída")}
      <div class="cartao">
        <h2>Explique com suas palavras</h2>
        <p style="font-size:.92rem;color:var(--tinta-fraca)">Escreva como se fosse explicar para uma colega do primeiro ano. Ninguém corrige: você marca sozinha o que conseguiu dizer.</p>
        <textarea id="feyn" rows="6" style="width:100%;padding:.6rem;border:1.5px solid var(--linha);border-radius:var(--r-p);background:var(--papel)"
          placeholder="Nesta aula o essencial é…">${esc(salvo.texto)}</textarea>
        <p class="olho" style="margin-top:.8rem">Você mencionou…</p>
        <div id="checklist">
          ${(l.feynman || [])
            .map(
              (p, i) =>
                `<label style="display:flex;gap:.5rem;align-items:flex-start;margin-bottom:.4rem;font-size:.93rem">
                  <input type="checkbox" data-p="${i}" ${salvo.marcados.includes(i) ? "checked" : ""} style="margin-top:.3rem" />
                  <span>${rico(p)}</span></label>`,
            )
            .join("")}
        </div>
        <div class="acoes">
          <button class="btn btn-forte" id="salvar-feyn" type="button">Salvar</button>
          <a class="btn" href="#/questoes/${esc(id)}">Treinar as ${qtdQuestoes} questões deste módulo</a>
          <a class="btn" href="#/trilha">Voltar à trilha</a>
        </div>
      </div>
    </section>`;

    const txt = raiz.querySelector("#feyn");
    const guardar = () => {
      const marcados = [...raiz.querySelectorAll("#checklist input:checked")].map((i) => Number(i.dataset.p));
      mudar((e) => {
        e.feynman[id] = { texto: txt.value, marcados };
      });
    };
    raiz.querySelector("#salvar-feyn").addEventListener("click", () => {
      guardar();
      if (txt.value.trim().length > 40) {
        ganhar("feynman");
        darBadge("explicou-" + id);
      }
      anunciar("Explicação salva.");
    });
    txt.addEventListener("blur", guardar);
    for (const i of raiz.querySelectorAll("#checklist input")) i.addEventListener("change", guardar);
  }

  function pintar() {
    if (fase === "preteste") pintarPreteste();
    else if (iBloco < blocos.length) pintarBloco();
    else pintarFim();
  }

  pintar();
}

function tabela(t) {
  return `<div style="overflow-x:auto;margin:.8rem 0"><table>
    <thead><tr>${t.cabecalho.map((h) => `<th>${rico(h)}</th>`).join("")}</tr></thead>
    <tbody>${t.linhas.map((l) => `<tr>${l.map((cel) => `<td>${rico(cel)}</td>`).join("")}</tr>`).join("")}</tbody>
  </table></div>`;
}
