/* Painel de progresso e estimativa de prontidão. */

import { ler } from "../store.js";
import { nivelDe, streak } from "../xp.js";
import { contagemHoje } from "../srs.js";
import { cardsDoModulo } from "../content.js";
import { diaISO } from "../clock.js";
import { ultima, contaComoErro } from "./questoes.js";
import { esc, selo } from "../ui.js";

const PESO = { E: 3, I: 2, C: 1 };

/** Prontidão = 45% cobertura ponderada + 35% acerto recente + 20% caderno de erros vazio. */
export function prontidao(c, e = ler()) {
  const mods = c.modulos.filter((m) => m.disponivel);
  const pesoTotal = mods.reduce((s, m) => s + PESO[m.prioridade], 0) || 1;
  const cobertos = mods.reduce((s, m) => s + (e.licoes[m.id]?.concluida ? PESO[m.prioridade] : 0), 0);
  const cobertura = cobertos / pesoTotal;

  const tentadas = c.questoes.map((q) => ultima(q.id, e)).filter(Boolean);
  const recentes = tentadas.slice(-20);
  const acerto = recentes.length ? recentes.filter((t) => t.certa && t.confianca !== "chute").length / recentes.length : 0;

  const emAberto = c.questoes.filter((q) => contaComoErro(ultima(q.id, e))).length;
  const limpo = tentadas.length ? 1 - emAberto / Math.max(tentadas.length, 1) : 0;

  const nota = Math.round((0.45 * cobertura + 0.35 * acerto + 0.2 * limpo) * 100);
  return { nota, cobertura, acerto, limpo, emAberto, amostra: recentes.length };
}

/** Acerto por módulo, para achar os temas mais fracos. */
export function porModulo(c, e = ler()) {
  return c.modulos
    .filter((m) => m.disponivel)
    .map((m) => {
      const qs = c.questoes.filter((q) => q.modulo === m.id);
      const tent = qs.map((q) => ultima(q.id, e)).filter(Boolean);
      const certas = tent.filter((t) => t.certa && t.confianca !== "chute").length;
      const cards = c.flashcards.filter((f) => f.modulo === m.id);
      const dominados = cards.filter((f) => (e.cards[f.id]?.caixa ?? 0) >= 3).length;
      return {
        ...m,
        respondidas: tent.length,
        total: qs.length,
        pct: tent.length ? Math.round((certas / tent.length) * 100) : null,
        licao: !!e.licoes[m.id]?.concluida,
        cards: cards.length,
        dominados,
      };
    });
}

/** Acerto por tema (rim × fígado). */
export function porTema(c, e = ler()) {
  const linha = (tema) => {
    const qs = c.questoes.filter((q) => q.tema === tema);
    const tent = qs.map((q) => ultima(q.id, e)).filter(Boolean);
    const certas = tent.filter((t) => t.certa && t.confianca !== "chute").length;
    return {
      tema,
      respondidas: tent.length,
      total: qs.length,
      pct: tent.length ? Math.round((certas / tent.length) * 100) : null,
    };
  };
  return [linha("rim"), linha("figado")];
}

/** Acerto por subtema, do pior para o melhor. Só entram os subtemas já respondidos. */
export function porSubtema(c, e = ler()) {
  const mapa = new Map();
  for (const q of c.questoes) {
    const t = ultima(q.id, e);
    if (!t) continue;
    const chave = q.subtema;
    const linha = mapa.get(chave) || { subtema: chave, tema: q.tema, modulo: q.modulo, respondidas: 0, certas: 0 };
    linha.respondidas += 1;
    if (t.certa && t.confianca !== "chute") linha.certas += 1;
    mapa.set(chave, linha);
  }
  return [...mapa.values()]
    .map((l) => ({ ...l, pct: Math.round((l.certas / l.respondidas) * 100) }))
    .sort((a, b) => a.pct - b.pct || b.respondidas - a.respondidas);
}

export async function desenhar(raiz, { c }) {
  const e = ler();
  const n = nivelDe(e.xp);
  const pr = prontidao(c, e);
  const mods = porModulo(c, e);
  const liberados = mods.map((m) => m.id);
  const cont = contagemHoje(cardsDoModulo(c, liberados));
  const falsos = c.questoes.filter((q) => {
    const t = ultima(q.id, e);
    return t && t.certa && t.confianca === "chute";
  });
  const comCerteza = c.questoes.filter((q) => {
    const t = ultima(q.id, e);
    return t && !t.certa && t.confianca === "certeza";
  });
  const fracos = mods.filter((m) => m.pct !== null && m.pct < 70).sort((a, b) => a.pct - b.pct);
  const temas = porTema(c, e);
  const subtemas = porSubtema(c, e);
  const dias = Object.entries(e.tempoPorDia).sort(([a], [b]) => a.localeCompare(b));
  const totalSeg = dias.reduce((s, [, v]) => s + v, 0);

  raiz.dataset.orgao = "rim";
  raiz.innerHTML = `<section>
    <h1>Painel</h1>

    <div class="cartao">
      <div class="linha-entre">
        <div><p class="olho">Nível</p><div style="font-family:var(--serif);font-size:1.5rem;font-weight:600">${esc(n.nome)}</div></div>
        <div style="text-align:right"><p class="olho">Experiência</p><div class="num" style="font-size:1.5rem;font-weight:600">${e.xp} XP</div></div>
      </div>
      <div class="barra" style="margin-top:.6rem"><i style="width:${n.pct}%"></i></div>
      <p class="fonte" style="margin:.4rem 0 0">${n.proximo ? `Faltam ${n.faltam} XP para ${esc(n.proximo.nome)}.` : "Nível máximo."}</p>
    </div>

    <div class="medidores" style="margin-top:.75rem">
      <div class="medidor"><div class="rot">Prontidão</div><div class="val">${pr.nota}%</div><div class="obs">estimativa</div></div>
      <div class="medidor"><div class="rot">Sequência</div><div class="val">${streak()}</div><div class="obs">dias</div></div>
      <div class="medidor"><div class="rot">Vencem hoje</div><div class="val">${cont.vencidos}</div><div class="obs">${cont.dominados} dominados</div></div>
      <div class="medidor"><div class="rot">Tempo</div><div class="val">${Math.round(totalSeg / 60)}<span style="font-size:1rem">min</span></div><div class="obs">no total</div></div>
    </div>

    <div class="cartao" style="margin-top:.75rem">
      <p class="olho">Como a prontidão é calculada</p>
      <ul style="margin:.3rem 0 0;font-size:.9rem">
        <li><b>45%</b> cobertura das lições, pesando ${selo("E")} 3, ${selo("I")} 2, ${selo("C")} 1 → <b>${Math.round(pr.cobertura * 100)}%</b></li>
        <li><b>35%</b> acerto nas últimas ${pr.amostra || 0} questões respondidas (chute não conta como acerto) → <b>${Math.round(pr.acerto * 100)}%</b></li>
        <li><b>20%</b> caderno de erros vazio → <b>${Math.round(pr.limpo * 100)}%</b> (${pr.emAberto} em aberto)</li>
      </ul>
      <p class="fonte" style="margin-top:.5rem">É uma conta simples sobre o que você fez no site, não uma previsão de nota.</p>
    </div>

    ${
      fracos.length
        ? `<div class="secao-titulo"><h2>Mais fracos</h2></div>
           <div class="pilha">${fracos
             .slice(0, 4)
             .map(
               (m) => `<div class="cartao" data-orgao="${esc(m.trilha)}">
                 <div class="linha-entre"><b>${esc(m.id)}. ${esc(m.titulo)} ${selo(m.prioridade)}</b><span class="num">${m.pct}%</span></div>
                 <div class="barra" style="margin:.5rem 0"><i style="width:${m.pct}%"></i></div>
                 <div class="acoes" style="margin:0"><a class="btn btn-pequeno btn-forte" href="#/questoes/${esc(m.id)}">Treinar isso agora</a>
                 <a class="btn btn-pequeno" href="#/flashcards/${esc(m.id)}">Cards do módulo</a></div>
               </div>`,
             )
             .join("")}</div>`
        : ""
    }

    <div class="secao-titulo"><h2>Por módulo</h2><span class="conta">${mods.filter((m) => m.licao).length}/${mods.length} lições</span></div>
    <div class="cartao" style="padding:.4rem .6rem">
      <table>
        <thead><tr><th>Módulo</th><th style="text-align:center">Lição</th><th style="text-align:center">Acerto</th><th style="text-align:center">Cards</th></tr></thead>
        <tbody>${mods
          .map(
            (m) => `<tr>
              <td><a href="#/licao/${esc(m.id)}" style="text-decoration:none;color:inherit"><b>${esc(m.id)}</b> ${esc(m.titulo)}</a> ${selo(m.prioridade)}</td>
              <td style="text-align:center">${m.licao ? "✓" : "—"}</td>
              <td style="text-align:center" class="num">${m.pct === null ? "—" : m.pct + "%"}</td>
              <td style="text-align:center" class="num">${m.dominados}/${m.cards}</td>
            </tr>`,
          )
          .join("")}</tbody>
      </table>
    </div>

    <div class="secao-titulo"><h2>Rim × fígado</h2></div>
    <div class="cartao">
      <div class="medidores">
        ${temas
          .map(
            (t) => `<div class="medidor" data-orgao="${t.tema === "rim" ? "rim" : "figado"}">
              <div class="rot">${t.tema === "rim" ? "Rim" : "Fígado"}</div>
              <div class="val">${t.pct === null ? "—" : t.pct + "%"}</div>
              <div class="obs">${t.respondidas} de ${t.total} questões</div></div>`,
          )
          .join("")}
      </div>
      <p class="fonte" style="margin:.6rem 0 0">A prova cobre as duas metades. Se uma delas estiver bem atrás da outra, é por ali que rende mais estudar.</p>
    </div>

    <div class="secao-titulo"><h2>Por subtema</h2><span class="conta">${subtemas.length} ${subtemas.length === 1 ? "subtema" : "subtemas"}</span></div>
    <div class="cartao" style="padding:.4rem .6rem">
      ${
        subtemas.length
          ? `<table>
              <thead><tr><th>Subtema</th><th style="text-align:center">Respondidas</th><th style="text-align:center">Acerto</th></tr></thead>
              <tbody>${subtemas
                .map(
                  (s2) => `<tr>
                    <td><a href="#/questoes/${esc(s2.modulo)}" style="text-decoration:none;color:inherit">${esc(s2.subtema)}</a>
                      <span class="fonte">${s2.tema === "rim" ? "rim" : "fígado"}</span></td>
                    <td style="text-align:center" class="num">${s2.respondidas}</td>
                    <td style="text-align:center" class="num">${s2.pct}%</td>
                  </tr>`,
                )
                .join("")}</tbody>
            </table>`
          : `<p class="fonte" style="margin:.4rem 0">Responda algumas questões para o acerto por subtema aparecer aqui.</p>`
      }
    </div>

    <div class="secao-titulo"><h2>Acertos falsos e erros com certeza</h2></div>
    <div class="cartao">
      <div class="medidores">
        <div class="medidor"><div class="rot">Acertou no chute</div><div class="val">${falsos.length}</div><div class="obs">volta como erro</div></div>
        <div class="medidor"><div class="rot">Errou com certeza</div><div class="val">${comCerteza.length}</div><div class="obs">o mais perigoso</div></div>
      </div>
      ${
        comCerteza.length
          ? `<p class="olho" style="margin-top:.8rem">Onde você errou achando que sabia</p>
             <ul style="margin:0;font-size:.9rem">${comCerteza
               .slice(0, 6)
               .map((q) => `<li>${esc(q.subtema)} — <a href="#/questoes/${esc(q.modulo)}">${esc(q.modulo)}</a></li>`)
               .join("")}</ul>`
          : `<p class="fonte" style="margin:.6rem 0 0">Nada marcado como certeza e errado até agora.</p>`
      }
      <div class="acoes"><a class="btn" href="#/erros">Abrir o caderno de erros</a></div>
    </div>

    <div class="secao-titulo"><h2>Tempo por dia</h2></div>
    <div class="cartao">
      ${
        dias.length
          ? `<table><tbody>${dias
              .map(
                ([d, seg]) =>
                  `<tr><td>${esc(formatarDia(d))}</td><td class="num" style="text-align:right">${Math.round(seg / 60)} min</td></tr>`,
              )
              .join("")}</tbody></table>`
          : `<p class="fonte" style="margin:0">Ainda sem tempo registrado.</p>`
      }
      <p class="fonte" style="margin:.5rem 0 0">Conta só enquanto a aba está aberta e visível.</p>
    </div>

    <p class="rodape"><a href="#/atencao">Pontos de atenção nos slides</a> · <a href="#/config">Exportar, importar ou zerar o progresso</a></p>
  </section>`;
}

function formatarDia(iso) {
  const [a, m, d] = iso.split("-");
  const nomes = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const dia = nomes[new Date(Number(a), Number(m) - 1, Number(d)).getDay()];
  return `${dia} ${d}/${m}${iso === diaISO() ? " · hoje" : ""}`;
}
