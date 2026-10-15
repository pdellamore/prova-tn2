/* Datas e contagem regressiva.
   A contagem vem da diferença de relógio, não do acúmulo de setInterval:
   aba em segundo plano não atrasa o cronômetro. (padrão do learning-platform) */

export const DIA_MS = 86400000;

/** Data no formato AAAA-MM-DD no fuso do aparelho. */
export function diaISO(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function diaAnterior(iso, n = 1) {
  const [a, m, d] = iso.split("-").map(Number);
  return diaISO(new Date(a, m - 1, d - n));
}

/** Momento em que o estudo acaba: manhã da prova. Nada é agendado depois disso. */
export const LIMITE = new Date(2026, 9, 19, 7, 0, 0).getTime();

export function formatarRelogio(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Contagem regressiva. Devolve uma função para cancelar.
 * aoTique recebe os ms restantes; aoFim dispara uma única vez.
 */
export function contagem(totalMs, aoTique, aoFim) {
  const inicio = Date.now();
  let acabou = false;
  const tique = () => {
    const resta = Math.min(totalMs, Math.max(0, totalMs - (Date.now() - inicio)));
    aoTique(resta);
    if (resta > 0 || acabou) return;
    acabou = true;
    parar();
    if (aoFim) aoFim();
  };
  const t = setInterval(tique, 250);
  const parar = () => {
    clearInterval(t);
    document.removeEventListener("visibilitychange", tique);
  };
  document.addEventListener("visibilitychange", tique);
  tique();
  return parar;
}

/** Relógio de tempo estudado: soma segundos no dia corrente enquanto a aba está visível. */
export function cronometroDeEstudo(aoSomar) {
  let ultimo = Date.now();
  const passo = () => {
    const agora = Date.now();
    const delta = Math.round((agora - ultimo) / 1000);
    ultimo = agora;
    if (document.visibilityState === "visible" && delta > 0 && delta < 120) aoSomar(delta);
  };
  const t = setInterval(passo, 15000);
  document.addEventListener("visibilitychange", passo);
  return () => {
    clearInterval(t);
    document.removeEventListener("visibilitychange", passo);
  };
}
