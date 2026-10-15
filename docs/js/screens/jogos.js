/* Mini-jogos. Quatro formatos, todos sobre o mesmo conteúdo dos slides:
   decidir verdadeiro/falso contra o relógio, escolher o número certo entre
   valores próximos, ligar as colunas das tabelas e conduzir um caso passo a
   passo. Nenhum deles cria conteúdo: tudo vem dos JSON de data/. */

import { ler, mudar } from "../store.js";
import { ganhar, darBadge } from "../xp.js";
import { registrar } from "../metrics.js";
import { esc, rico, selo, caixaFonte, atencao, anunciar, bip } from "../ui.js";

const JOGOS = {
  vf: {
    id: "vf",
    nome: "Pegadinha ou não?",
    chamada: "Afirmações tiradas do “Cuidado na prova”. Verdadeiro ou falso, contra o relógio.",
    orgao: "figado",
  },
  numero: {
    id: "numero",
    nome: "Qual é o número?",
    chamada: "Cortes, g/kg, mEq e mg. As alternativas erradas são números que existem em outro lugar dos slides.",
    orgao: "rim",
  },
  ligar: {
    id: "ligar",
    nome: "Ligar colunas",
    chamada: "As tabelas comparativas, embaralhadas. Toque de um lado e depois do outro.",
    orgao: "rim",
  },
  caso: {
    id: "caso",
    nome: "Monte o caso",
    chamada: "Casos curtos, só com dados dos slides, decididos passo a passo.",
    orgao: "figado",
  },
};

const RODADA_VF = 12;
const RODADA_NUM = 10;
const SEGUNDOS_VF = 12;

export async function desenhar(raiz, { c, args }) {
  const qual = args[0];
  if (qual === "vf") return jogoVF(raiz, c);
  if (qual === "numero") return jogoNumero(raiz, c);
  if (qual === "ligar") return jogoLigar(raiz, c, args[1]);
  if (qual === "caso") return jogoCaso(raiz, c, args[1]);
  return indice(raiz, c);
}

/* ─── índice ─────────────────────────────────────────────────────────── */

function placar(id, e = ler()) {
  return e.chefoes["jogo:" + id] || { rodadas: 0, acertos: 0, itens: 0, recorde: 0 };
}

function indice(raiz, c) {
  const e = ler();
  const tamanhos = { vf: c.vf.length, numero: c.numeros.length, ligar: c.ligar.length, caso: c.casos.length };
  const unidade = { vf: "afirmações", numero: "números", ligar: "tabelas", caso: "casos" };
  raiz.dataset.orgao = "figado";
  raiz.innerHTML = `<section>
    <h1>Mini-jogos</h1>
    <p style="color:var(--tinta-fraca)">Rodadas curtas, para quando não der para sentar e estudar uma lição inteira. Tudo o que aparece aqui sai dos slides.</p>
    <div class="pilha">
      ${Object.values(JOGOS)
        .map((j) => {
          const p = placar(j.id, e);
          const pct = p.itens ? Math.round((p.acertos / p.itens) * 100) : null;
          return `<a class="cartao" href="#/jogos/${esc(j.id)}" style="text-decoration:none;color:inherit;display:block" data-orgao="${esc(j.orgao)}">
            <div class="linha-entre">
              <h2 style="margin:0">${esc(j.nome)}</h2>
              <span class="fonte">${tamanhos[j.id]} ${unidade[j.id]}</span>
            </div>
            <p style="margin:.3rem 0 0;color:var(--tinta-fraca);font-size:.93rem">${esc(j.chamada)}</p>
            ${p.rodadas ? `<p class="fonte" style="margin:.4rem 0 0">${p.rodadas} ${p.rodadas === 1 ? "rodada" : "rodadas"} · ${pct}% de acerto${p.recorde ? ` · recorde ${p.recorde}` : ""}</p>` : ""}
          </a>`;
        })
        .join("")}
    </div>
  </section>`;
}

/* ─── peças comuns ───────────────────────────────────────────────────── */

function embaralhar(lista) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Sorteia `n` itens dando preferência aos essenciais e aos que ela errou. */
export function sortear(lista, n, errados = new Set()) {
  const peso = (x) => (errados.has(x.id) ? 0 : x.prioridade === "E" ? 1 : x.prioridade === "I" ? 2 : 3);
  const ordenada = embaralhar(lista).sort((a, b) => peso(a) - peso(b));
  return embaralhar(ordenada.slice(0, n));
}

function gravarRodada(id, acertos, itens) {
  mudar((e) => {
    const p = (e.chefoes["jogo:" + id] ||= { rodadas: 0, acertos: 0, itens: 0, recorde: 0 });
    p.rodadas += 1;
    p.acertos += acertos;
    p.itens += itens;
    p.recorde = Math.max(p.recorde || 0, acertos);
  });
  registrar({ tipo: "jogo", id, acertos, itens });
}

function cabecalho(j, extra = "") {
  return `<p class="olho"><a href="#/jogos" style="color:inherit;text-decoration:none">← Mini-jogos</a></p>
    <div class="chefao-topo"><h1 style="margin:0">${esc(j.nome)}</h1>${extra}</div>`;
}

function fimDeRodada(alvo, j, acertos, total, refazer, errados) {
  const pct = Math.round((acertos / total) * 100);
  alvo.innerHTML = `<div class="cartao">
    <div class="resultado"><span class="numerao">${acertos}/${total}</span>
      <p style="margin:.2rem 0 0">${pct}% de acerto nesta rodada</p></div>
    ${
      errados.length
        ? `<p class="olho" style="margin-top:1rem">O que escapou</p>
           <ul class="erros-jogo">${errados.map((x) => `<li>${rico(x)}</li>`).join("")}</ul>`
        : `<p style="margin-top:1rem">Rodada limpa.</p>`
    }
    <div class="acoes"><button class="btn btn-forte" id="denovo" type="button">Outra rodada</button>
    <a class="btn" href="#/jogos">Voltar aos jogos</a></div>
  </div>`;
  alvo.querySelector("#denovo").addEventListener("click", refazer);
  alvo.querySelector("#denovo").focus();
  anunciar(`Fim da rodada: ${acertos} de ${total}.`);
}

/* ─── Pegadinha ou não? ──────────────────────────────────────────────── */

function jogoVF(raiz, c) {
  const j = JOGOS.vf;
  raiz.dataset.orgao = j.orgao;

  const comecar = () => {
    const e = ler();
    const errou = new Set(Object.entries(e.vf).filter(([, v]) => v && v.errou).map(([k]) => k));
    const rodada = sortear(c.vf, Math.min(RODADA_VF, c.vf.length), errou);
    let i = 0;
    let acertos = 0;
    const escaparam = [];
    let relogio = null;

    raiz.innerHTML = `${cabecalho(j, `<span class="relogio" id="rel">${SEGUNDOS_VF}</span>`)}
      <div class="barra" style="margin:.6rem 0 1rem"><i id="prog" style="width:0%"></i></div>
      <div id="corpo"></div>`;
    const corpo = raiz.querySelector("#corpo");
    const rel = raiz.querySelector("#rel");
    const prog = raiz.querySelector("#prog");

    const pararRelogio = () => {
      if (relogio) clearInterval(relogio);
      relogio = null;
    };

    const proximo = () => {
      pararRelogio();
      i += 1;
      if (i >= rodada.length) {
        gravarRodada(j.id, acertos, rodada.length);
        ganhar("checagem_certa", Math.max(0.5, acertos / rodada.length));
        if (acertos === rodada.length) darBadge("pegadinha-limpa");
        rel.hidden = true;
        fimDeRodada(corpo, j, acertos, rodada.length, comecar, escaparam);
        return;
      }
      pintar();
    };

    const responder = (resposta, item) => {
      pararRelogio();
      const ok = resposta === item.verdadeiro;
      if (ok) acertos += 1;
      else escaparam.push(`**${item.afirmacao}** — ${item.verdadeiro ? "era verdadeira" : "era falsa"}.`);
      mudar((st) => {
        st.vf[item.id] = { errou: !ok, em: Date.now() };
      });
      bip(ok ? "ok" : "erro");
      registrar({ tipo: "vf", id: item.id, ok });
      const amb = item.ambiguidade ? c.ambiguidades[item.ambiguidade] : null;
      corpo.querySelector("#eco").innerHTML = `<div class="resposta ${ok ? "acerto" : "erro"}">
        <div class="veredito">${ok ? "Isso" : `Era ${item.verdadeiro ? "verdadeiro" : "falso"}`}</div>
        <p style="margin:.4rem 0 0">${rico(item.explicacao)}</p>
        ${amb ? atencao(amb) : ""}
        ${caixaFonte(item.fonte)}
        <div class="acoes"><button class="btn btn-forte" id="seguir" type="button">${i + 1 >= rodada.length ? "Ver o resultado" : "Próxima"}</button></div>
      </div>`;
      for (const b of corpo.querySelectorAll("[data-vf]")) b.disabled = true;
      const seguir = corpo.querySelector("#seguir");
      seguir.addEventListener("click", proximo);
      seguir.focus();
      anunciar(ok ? "Certo." : "Errado.");
    };

    const pintar = () => {
      const item = rodada[i];
      prog.style.width = `${(i / rodada.length) * 100}%`;
      corpo.innerHTML = `<div class="cartao">
        <p class="olho">${i + 1} de ${rodada.length} ${selo(item.prioridade)}</p>
        <p class="afirmacao">${rico(item.afirmacao)}</p>
        <div class="acoes" style="margin:.8rem 0 0">
          <button class="btn btn-forte btn-vf" type="button" data-vf="v">Verdadeiro</button>
          <button class="btn btn-forte btn-vf" type="button" data-vf="f">Falso</button>
        </div>
        <div id="eco"></div>
      </div>`;
      for (const b of corpo.querySelectorAll("[data-vf]")) {
        b.addEventListener("click", () => responder(b.dataset.vf === "v", item));
      }
      let resta = SEGUNDOS_VF;
      rel.hidden = false;
      rel.textContent = resta;
      rel.classList.remove("apertado");
      relogio = setInterval(() => {
        resta -= 1;
        rel.textContent = Math.max(0, resta);
        rel.classList.toggle("apertado", resta <= 4);
        if (resta <= 0) {
          // o tempo acabou: conta como erro, mas a explicação aparece do mesmo jeito
          responder(!item.verdadeiro, item);
        }
      }, 1000);
    };

    pintar();
    return () => pararRelogio();
  };

  return comecar();
}

/* ─── Qual é o número? ───────────────────────────────────────────────── */

function jogoNumero(raiz, c) {
  const j = JOGOS.numero;
  raiz.dataset.orgao = j.orgao;

  const comecar = () => {
    const rodada = sortear(c.numeros, Math.min(RODADA_NUM, c.numeros.length));
    let i = 0;
    let acertos = 0;
    const escaparam = [];

    raiz.innerHTML = `${cabecalho(j)}
      <div class="barra" style="margin:.6rem 0 1rem"><i id="prog" style="width:0%"></i></div>
      <div id="corpo"></div>`;
    const corpo = raiz.querySelector("#corpo");
    const prog = raiz.querySelector("#prog");

    const proximo = () => {
      i += 1;
      if (i >= rodada.length) {
        gravarRodada(j.id, acertos, rodada.length);
        ganhar("checagem_certa", Math.max(0.5, acertos / rodada.length));
        if (acertos === rodada.length) darBadge("numeros-na-ponta");
        fimDeRodada(corpo, j, acertos, rodada.length, comecar, escaparam);
        return;
      }
      pintar();
    };

    const pintar = () => {
      const item = rodada[i];
      const opcoes = embaralhar([item.resposta, ...item.distratores]);
      prog.style.width = `${(i / rodada.length) * 100}%`;
      corpo.innerHTML = `<div class="cartao">
        <p class="olho">${i + 1} de ${rodada.length} ${selo(item.prioridade)}</p>
        <p style="font-weight:600;font-size:1.05rem">${rico(item.pergunta)}</p>
        <ul class="alternativas">${opcoes
          .map(
            (o, k) => `<li><button class="alt" type="button" data-opcao="${esc(o)}">
              <span class="alt-letra">${"ABCD"[k]}</span><span>${rico(o)}</span></button></li>`,
          )
          .join("")}</ul>
        <div id="eco"></div>
      </div>`;
      for (const b of corpo.querySelectorAll("[data-opcao]")) {
        b.addEventListener("click", () => {
          const ok = b.dataset.opcao === item.resposta;
          if (ok) acertos += 1;
          else escaparam.push(`**${item.pergunta}:** ${item.resposta}.`);
          for (const x of corpo.querySelectorAll("[data-opcao]")) {
            x.disabled = true;
            if (x.dataset.opcao === item.resposta) x.classList.add("certa");
            else if (x === b) x.classList.add("errada");
          }
          bip(ok ? "ok" : "erro");
          registrar({ tipo: "numero", id: item.id, ok });
          const amb = item.ambiguidade ? c.ambiguidades[item.ambiguidade] : null;
          corpo.querySelector("#eco").innerHTML = `<div class="resposta ${ok ? "acerto" : "erro"}">
            <div class="veredito">${ok ? "Isso" : `Era ${esc(item.resposta)}`}</div>
            <p style="margin:.4rem 0 0">${rico(item.explicacao)}</p>
            ${amb ? atencao(amb) : ""}
            ${caixaFonte(item.fonte)}
            <div class="acoes"><button class="btn btn-forte" id="seguir" type="button">${i + 1 >= rodada.length ? "Ver o resultado" : "Próximo"}</button></div>
          </div>`;
          const seguir = corpo.querySelector("#seguir");
          seguir.addEventListener("click", proximo);
          seguir.focus();
          anunciar(ok ? "Certo." : `Errado. Era ${item.resposta}.`);
        });
      }
    };

    pintar();
  };

  comecar();
}

/* ─── Ligar colunas ──────────────────────────────────────────────────── */

function jogoLigar(raiz, c, id) {
  const j = JOGOS.ligar;
  raiz.dataset.orgao = j.orgao;
  const tabela = c.ligar.find((t) => t.id === id);
  if (!tabela) return listaLigar(raiz, c);

  raiz.dataset.orgao = tabela.trilha;

  const comecar = () => {
    const esquerda = embaralhar(tabela.pares.map((p, k) => ({ k, txt: p.esquerda })));
    const direita = embaralhar(tabela.pares.map((p, k) => ({ k, txt: p.direita })));
    const feitos = new Set();
    let erros = 0;
    let marcado = null;

    raiz.innerHTML = `<p class="olho"><a href="#/jogos/ligar" style="color:inherit;text-decoration:none">← Ligar colunas</a></p>
      <h1>${esc(tabela.titulo)} ${selo(tabela.prioridade)}</h1>
      <p style="color:var(--tinta-fraca);font-size:.93rem">Toque num item da esquerda e depois no par dele à direita.</p>
      <div class="barra" style="margin:.6rem 0 1rem"><i id="prog" style="width:0%"></i></div>
      <div id="corpo"></div>`;
    const corpo = raiz.querySelector("#corpo");
    const prog = raiz.querySelector("#prog");

    const pintar = () => {
      prog.style.width = `${(feitos.size / tabela.pares.length) * 100}%`;
      if (feitos.size === tabela.pares.length) {
        const acertos = tabela.pares.length;
        gravarRodada(j.id, Math.max(0, acertos - erros), acertos);
        ganhar("calculo", Math.max(0.4, 1 - erros / (acertos * 2)));
        if (!erros) darBadge("ligou-de-primeira");
        corpo.innerHTML = `<div class="cartao">
          <div class="resultado"><span class="numerao">${acertos} pares</span>
            <p style="margin:.2rem 0 0">${erros ? `${erros} ${erros === 1 ? "tentativa errada" : "tentativas erradas"} pelo caminho` : "sem nenhum erro"}</p></div>
          <table class="tabela" style="margin-top:1rem"><tbody>
            ${tabela.pares.map((p) => `<tr><td>${rico(p.esquerda)}</td><td>${rico(p.direita)}</td></tr>`).join("")}
          </tbody></table>
          ${tabela.nota ? `<p class="fonte" style="margin-top:.6rem">${rico(tabela.nota)}</p>` : ""}
          ${caixaFonte(tabela.fonte)}
          <p class="fonte" style="margin-top:.4rem">Uma tabela reúne pares que podem estar em páginas diferentes da mesma aula; a fonte marca a principal.</p>
          <div class="acoes"><button class="btn btn-forte" id="denovo" type="button">Embaralhar de novo</button>
          <a class="btn" href="#/jogos/ligar">Outra tabela</a></div>
        </div>`;
        corpo.querySelector("#denovo").addEventListener("click", comecar);
        corpo.querySelector("#denovo").focus();
        anunciar("Tabela completa.");
        return;
      }
      corpo.innerHTML = `<div class="cartao"><div class="ligar">
        <ul class="ligar-col">${esquerda
          .map(
            (x) => `<li><button class="ligar-item${feitos.has(x.k) ? " feito" : ""}${marcado === x.k ? " marcado" : ""}"
              type="button" data-lado="e" data-k="${x.k}" ${feitos.has(x.k) ? "disabled" : ""}>${rico(x.txt)}</button></li>`,
          )
          .join("")}</ul>
        <ul class="ligar-col">${direita
          .map(
            (x) => `<li><button class="ligar-item${feitos.has(x.k) ? " feito" : ""}"
              type="button" data-lado="d" data-k="${x.k}" ${feitos.has(x.k) ? "disabled" : ""}>${rico(x.txt)}</button></li>`,
          )
          .join("")}</ul>
      </div>
      <p class="fonte" style="margin-top:.7rem">${feitos.size} de ${tabela.pares.length} ligados${erros ? ` · ${erros} ${erros === 1 ? "erro" : "erros"}` : ""}</p>
      </div>`;

      for (const b of corpo.querySelectorAll("[data-k]")) {
        b.addEventListener("click", () => {
          const k = Number(b.dataset.k);
          if (b.dataset.lado === "e") {
            marcado = marcado === k ? null : k;
            pintar();
            return;
          }
          if (marcado === null) {
            anunciar("Escolha primeiro um item da esquerda.");
            return;
          }
          if (marcado === k) {
            feitos.add(k);
            marcado = null;
            bip("ok");
            pintar();
          } else {
            erros += 1;
            marcado = null;
            bip("erro");
            b.classList.add("errada");
            anunciar("Não é esse par.");
            setTimeout(pintar, 420);
          }
        });
      }
    };

    pintar();
  };

  comecar();
}

function listaLigar(raiz, c) {
  raiz.dataset.orgao = "rim";
  raiz.innerHTML = `${cabecalho(JOGOS.ligar)}
    <p style="color:var(--tinta-fraca)">${esc(JOGOS.ligar.chamada)}</p>
    <div class="pilha">
      ${c.ligar
        .map(
          (t) => `<a class="cartao" href="#/jogos/ligar/${esc(t.id)}" style="text-decoration:none;color:inherit;display:block" data-orgao="${esc(t.trilha)}">
            <div class="linha-entre"><h2 style="margin:0;font-size:1.05rem">${esc(t.titulo)} ${selo(t.prioridade)}</h2>
            <span class="fonte">${t.pares.length} pares</span></div>
          </a>`,
        )
        .join("")}
    </div>`;
}

/* ─── Monte o caso ───────────────────────────────────────────────────── */

function jogoCaso(raiz, c, id) {
  const j = JOGOS.caso;
  const caso = c.casos.find((x) => x.id === id);
  if (!caso) return listaCasos(raiz, c);

  raiz.dataset.orgao = caso.trilha;
  let i = 0;
  let acertos = 0;
  const escaparam = [];

  raiz.innerHTML = `<p class="olho"><a href="#/jogos/caso" style="color:inherit;text-decoration:none">← Monte o caso</a></p>
    <h1>${esc(caso.titulo)} ${selo(caso.prioridade)}</h1>
    <div class="cartao" style="border-style:dashed"><p style="margin:0">${rico(caso.abertura)}</p></div>
    <div class="barra" style="margin:.8rem 0 1rem"><i id="prog" style="width:0%"></i></div>
    <div id="corpo"></div>`;
  const corpo = raiz.querySelector("#corpo");
  const prog = raiz.querySelector("#prog");

  const terminar = () => {
    gravarRodada(j.id, acertos, caso.passos.length);
    ganhar("questao_certa", Math.max(0.4, acertos / caso.passos.length));
    if (acertos === caso.passos.length) darBadge("caso-redondo");
    corpo.innerHTML = `<div class="cartao">
      <div class="resultado"><span class="numerao">${acertos}/${caso.passos.length}</span>
        <p style="margin:.2rem 0 0">passos certos neste caso</p></div>
      ${escaparam.length ? `<p class="olho" style="margin-top:1rem">O que escapou</p><ul class="erros-jogo">${escaparam.map((x) => `<li>${rico(x)}</li>`).join("")}</ul>` : `<p style="margin-top:1rem">Caso redondo.</p>`}
      <p style="margin-top:.8rem">${rico(caso.fecho)}</p>
      ${caixaFonte(caso.fonte)}
      <div class="acoes"><a class="btn btn-forte" href="#/jogos/caso">Outro caso</a>
      <a class="btn" href="#/jogos">Voltar aos jogos</a></div>
    </div>`;
    anunciar(`Caso terminado: ${acertos} de ${caso.passos.length}.`);
  };

  const pintar = () => {
    const passo = caso.passos[i];
    prog.style.width = `${(i / caso.passos.length) * 100}%`;
    corpo.innerHTML = `<div class="cartao">
      <p class="olho">Passo ${i + 1} de ${caso.passos.length}</p>
      <p style="font-weight:600">${rico(passo.pergunta)}</p>
      <ul class="alternativas">${passo.opcoes
        .map(
          (o, k) => `<li><button class="alt" type="button" data-i="${k}">
            <span class="alt-letra">${"ABCDE"[k]}</span><span>${rico(o)}</span></button></li>`,
        )
        .join("")}</ul>
      <div id="eco"></div>
    </div>`;
    for (const b of corpo.querySelectorAll("[data-i]")) {
      b.addEventListener("click", () => {
        const escolha = Number(b.dataset.i);
        const ok = escolha === passo.correta;
        if (ok) acertos += 1;
        else escaparam.push(`**${passo.pergunta}** — ${passo.opcoes[passo.correta]}.`);
        for (const x of corpo.querySelectorAll("[data-i]")) {
          x.disabled = true;
          if (Number(x.dataset.i) === passo.correta) x.classList.add("certa");
          else if (x === b) x.classList.add("errada");
        }
        bip(ok ? "ok" : "erro");
        registrar({ tipo: "caso", id: caso.id, passo: i, ok });
        corpo.querySelector("#eco").innerHTML = `<div class="resposta ${ok ? "acerto" : "erro"}">
          <div class="veredito">${ok ? "Isso" : `Era ${"ABCDE"[passo.correta]}`}</div>
          <p style="margin:.4rem 0 0">${rico(passo.justificativa)}</p>
          <div class="acoes"><button class="btn btn-forte" id="seguir" type="button">${i + 1 >= caso.passos.length ? "Fechar o caso" : "Próximo passo"}</button></div>
        </div>`;
        const seguir = corpo.querySelector("#seguir");
        seguir.addEventListener("click", () => {
          i += 1;
          if (i >= caso.passos.length) terminar();
          else pintar();
        });
        seguir.focus();
        anunciar(ok ? "Certo." : "Errado.");
      });
    }
  };

  pintar();
}

function listaCasos(raiz, c) {
  const e = ler();
  raiz.dataset.orgao = "figado";
  raiz.innerHTML = `${cabecalho(JOGOS.caso)}
    <p style="color:var(--tinta-fraca)">${esc(JOGOS.caso.chamada)}</p>
    <div class="pilha">
      ${c.casos
        .map(
          (x) => `<a class="cartao" href="#/jogos/caso/${esc(x.id)}" style="text-decoration:none;color:inherit;display:block" data-orgao="${esc(x.trilha)}">
            <div class="linha-entre"><h2 style="margin:0;font-size:1.05rem">${esc(x.titulo)} ${selo(x.prioridade)}</h2>
            <span class="fonte">${x.passos.length} passos</span></div>
            <p style="margin:.3rem 0 0;color:var(--tinta-fraca);font-size:.9rem">${esc(x.modulo)}</p>
          </a>`,
        )
        .join("")}
    </div>`;
}
