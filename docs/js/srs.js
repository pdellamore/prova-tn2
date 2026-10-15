/* Repetição espaçada comprimida nos 5 dias até a prova (Leitner adaptado).
   A confiança marcada antes de ver a resposta vira a nota:
     0 = chute, ou errou        → volta na mesma sessão e no dia seguinte
     1 = dúvida (mesmo certa)   → volta em 4 h
     2 = certeza e acertou      → sobe de caixa
   Acerto marcado como chute conta como erro — é o "acerto falso". */

import { ler, mudar } from "./store.js";
import { LIMITE } from "./clock.js";

const H = 3600000;
/** Horas até a próxima revisão, por caixa alcançada. */
const INTERVALO_H = [0.17, 20, 8, 24, 48, 72];
export const CAIXA_MAX = INTERVALO_H.length - 1;

function limitar(ts) {
  return Math.min(ts, LIMITE);
}

export function estadoCard(id) {
  return ler().cards[id] || null;
}

/** Nota 0, 1 ou 2. Devolve o novo estado do card. */
export function revisar(id, nota) {
  const agora = Date.now();
  let resultado;
  mudar((e) => {
    const c = e.cards[id] || { caixa: 0, proximo: 0, acertos: 0, erros: 0, vistas: 0 };
    c.vistas += 1;
    c.ultima = agora;
    if (nota === 0) {
      c.erros += 1;
      c.caixa = 0;
      c.proximo = limitar(agora + INTERVALO_H[0] * H);
    } else if (nota === 1) {
      c.acertos += 1;
      c.caixa = Math.max(1, c.caixa);
      c.proximo = limitar(agora + 4 * H);
    } else {
      c.acertos += 1;
      c.caixa = Math.min(CAIXA_MAX, c.caixa + 1);
      c.proximo = limitar(agora + INTERVALO_H[c.caixa] * H);
    }
    e.cards[id] = c;
    resultado = c;
  });
  return resultado;
}

/** Cards já vistos cuja revisão venceu. */
export function vencidos(cards, agora = Date.now()) {
  return cards.filter((c) => {
    const s = ler().cards[c.id];
    return s && s.proximo <= agora;
  });
}

export function novos(cards) {
  const vistos = ler().cards;
  return cards.filter((c) => !vistos[c.id]);
}

/**
 * Fila de uma sessão: primeiro o que venceu, depois os novos.
 * `maxNovos` evita abrir 200 cards de uma vez.
 */
export function fila(cards, { maxNovos = 20, agora = Date.now() } = {}) {
  const pend = vencidos(cards, agora).sort((a, b) => ler().cards[a.id].proximo - ler().cards[b.id].proximo);
  const frescos = novos(cards).slice(0, maxNovos);
  return [...pend, ...frescos];
}

export function contagemHoje(cards, agora = Date.now()) {
  return {
    vencidos: vencidos(cards, agora).length,
    novos: novos(cards).length,
    dominados: cards.filter((c) => (ler().cards[c.id]?.caixa ?? 0) >= 3).length,
  };
}
