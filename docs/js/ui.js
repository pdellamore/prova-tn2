/* Peças de interface reaproveitadas por todas as telas. */

export function esc(t) {
  return String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/** Converte o mini-markdown dos JSON: **negrito**, *itálico* e `código`. */
export function rico(t) {
  return esc(t)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

export function selo(p) {
  const nome = { E: "essencial", I: "importante", C: "complementar" }[p] || "";
  return `<span class="selo selo-${esc(p)}" title="${nome}" aria-label="Prioridade: ${nome}">${esc(p)}</span>`;
}

export function fonteTxt(f) {
  if (!f) return "";
  return `${f.arquivo} · slide ${f.pagina}`;
}

export function caixaFonte(f) {
  return `<p class="fonte">Fonte: ${esc(fonteTxt(f))}</p>`;
}

export function cuidado(itens, titulo = "⚠ Cuidado na prova") {
  if (!itens || !itens.length) return "";
  return `<div class="cuidado"><div class="cuidado-titulo">${esc(titulo)}</div><ul>${itens
    .map((i) => `<li>${rico(i)}</li>`)
    .join("")}</ul></div>`;
}

export function apoio(a) {
  if (!a) return "";
  const rotulo = a.tipo === "analogia" ? "Analogia (apoio de memória)" : "Mnemônico (apoio de memória)";
  return `<div class="apoio"><div class="apoio-titulo">${rotulo}</div>${rico(a.texto)}</div>`;
}

/** Caixa de ponto contraditório nos slides — nunca escolhe um lado. */
export function atencao(amb) {
  if (!amb) return "";
  return `<div class="atencao"><div class="atencao-titulo">⚠ Ponto de atenção nos slides</div>
    <div>${rico(amb.resumo)}</div>
    <div class="lados">${(amb.lados || []).map((l) => `<div class="lado">${rico(l)}</div>`).join("")}</div>
    <p class="fonte" style="margin:.4rem 0 0">${esc((amb.fontes || []).map(fonteTxt).join(" · "))}</p>
    <p class="fonte" style="margin:.2rem 0 0">${esc(amb.nota || "Os slides não fecham este ponto. Se cair na prova, siga o que o próprio enunciado citar.")}</p></div>`;
}

/** Versão recolhida, para o verso do flashcard: o aviso não pode roubar a tela do card. */
export function atencaoDobra(amb) {
  if (!amb) return "";
  return `<details class="atencao atencao-dobra"><summary>⚠ Este card tem um ponto de atenção nos slides</summary>
    <div style="margin-top:.5rem">${rico(amb.resumo)}</div>
    <div class="lados">${(amb.lados || []).map((l) => `<div class="lado">${rico(l)}</div>`).join("")}</div>
    <p class="fonte" style="margin:.4rem 0 0">${esc(amb.nota || "")}</p></details>`;
}

export function anunciar(texto) {
  const el = document.getElementById("anuncio");
  if (el) el.textContent = texto;
}

let somLigado = false;
export function configurarSom(ligado) {
  somLigado = !!ligado;
}

let audio = null;
/** Estalo curto. Som é enfeite: se o navegador não deixar, segue em silêncio. */
export function bip(tipo = "ok") {
  if (!somLigado) return;
  try {
    audio ??= new AudioContext();
    void audio.resume();
    const o = audio.createOscillator();
    const g = audio.createGain();
    const t = audio.currentTime;
    o.type = "triangle";
    o.frequency.setValueAtTime(tipo === "ok" ? 880 : 320, t);
    o.frequency.exponentialRampToValueAtTime(tipo === "ok" ? 1320 : 220, t + 0.12);
    g.gain.setValueAtTime(0.09, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g).connect(audio.destination);
    o.start(t);
    o.stop(t + 0.17);
  } catch {
    /* sem áudio, sem problema */
  }
}

export function mostrarXP(pontos, subiu) {
  // só um selo por vez: dois sobrepostos viram um borrão ilegível
  document.querySelector(".xp-pop")?.remove();
  const d = document.createElement("div");
  d.className = "xp-pop";
  d.textContent = subiu ? `+${pontos} XP · ${subiu.nome}!` : `+${pontos} XP`;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1500);
  anunciar(subiu ? `Ganhou ${pontos} de experiência. Novo nível: ${subiu.nome}.` : `Ganhou ${pontos} de experiência.`);
}

export const ICONE = {
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path d="M4 12.5l5 5L20 7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  seta: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};
