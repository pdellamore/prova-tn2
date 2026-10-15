/* XP, níveis, streak e conquistas. */

import { ler, mudar } from "./store.js";
import { diaISO, diaAnterior } from "./clock.js";
import { registrar } from "./metrics.js";

export const NIVEIS = [
  { nome: "Estagiária", xp: 0 },
  { nome: "R1", xp: 400 },
  { nome: "R2", xp: 1000 },
  { nome: "Nutri Clínica", xp: 2000 },
  { nome: "Preceptora", xp: 3500 },
];

export const PONTOS = {
  bloco: 10,
  checagem_certa: 8,
  checagem_errada: 3,
  questao_certa: 12,
  questao_errada: 4,
  card_certeza: 5,
  card_duvida: 3,
  card_erro: 2,
  calculo: 15,
  missao: 30,
  chefao: 100,
  feynman: 25,
};

export function nivelDe(xp) {
  let i = 0;
  for (let k = 0; k < NIVEIS.length; k++) if (xp >= NIVEIS[k].xp) i = k;
  const atual = NIVEIS[i];
  const prox = NIVEIS[i + 1] || null;
  const base = atual.xp;
  const alvo = prox ? prox.xp : atual.xp;
  const pct = prox ? Math.round(((xp - base) / (alvo - base)) * 100) : 100;
  return { indice: i + 1, nome: atual.nome, proximo: prox, pct: Math.max(0, Math.min(100, pct)), faltam: prox ? alvo - xp : 0 };
}

let aoGanhar = null;
/** A interface se inscreve aqui para mostrar o "+XP" subindo. */
export function quandoGanhar(fn) {
  aoGanhar = fn;
}

export function ganhar(tipo, mult = 1) {
  const pontos = Math.round((PONTOS[tipo] || 0) * mult);
  if (!pontos) return 0;
  const antes = nivelDe(ler().xp).indice;
  mudar((e) => {
    e.xp += pontos;
  });
  const depois = nivelDe(ler().xp);
  if (aoGanhar) aoGanhar(pontos, depois.indice > antes ? depois : null);
  registrar({ tipo: "xp", motivo: tipo, pontos });
  return pontos;
}

/** Dias seguidos com algum estudo, contando para trás a partir de hoje. */
export function streak(hoje = diaISO()) {
  const dias = ler().tempoPorDia || {};
  let n = 0;
  let d = hoje;
  if (!dias[d]) d = diaAnterior(d);
  while (dias[d]) {
    n += 1;
    d = diaAnterior(d);
  }
  return n;
}

export function somarTempo(segundos, dia = diaISO()) {
  mudar((e) => {
    e.tempoPorDia[dia] = (e.tempoPorDia[dia] || 0) + segundos;
  });
}

export function temBadge(id) {
  return ler().badges.includes(id);
}

export function darBadge(id) {
  if (temBadge(id)) return false;
  mudar((e) => {
    e.badges.push(id);
  });
  registrar({ tipo: "badge", id });
  return true;
}
