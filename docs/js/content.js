/* Carrega o conteúdo dos JSON em data/. O código não conhece o conteúdo:
   para corrigir um número, edite o JSON e recarregue. */

const cache = new Map();

async function carregar(caminho) {
  if (cache.has(caminho)) return cache.get(caminho);
  const p = fetch(`data/${caminho}`, { cache: "no-cache" }).then(async (r) => {
    if (!r.ok) throw new Error(`não consegui ler data/${caminho} (${r.status})`);
    return r.json();
  });
  cache.set(caminho, p);
  return p;
}

let base = null;

export async function conteudo() {
  if (base) return base;
  const [modulos, cronograma, flashcards, questoes, badges, ambiguidades, chefoes] = await Promise.all([
    carregar("modulos.json"),
    carregar("cronograma.json"),
    carregar("flashcards.json"),
    carregar("questoes.json"),
    carregar("badges.json"),
    carregar("ambiguidades.json"),
    carregar("chefoes.json"),
  ]);
  const porId = (lista) => Object.fromEntries(lista.map((x) => [x.id, x]));
  base = {
    modulos,
    cronograma,
    flashcards,
    questoes,
    badges,
    chefoes,
    ambiguidades: porId(ambiguidades),
    moduloPorId: porId(modulos),
    questaoPorId: porId(questoes),
    cardPorId: porId(flashcards),
  };
  return base;
}

export async function licao(id) {
  return carregar(`licoes/${id}.json`);
}

export function cardsDoModulo(c, modulos) {
  const set = new Set(modulos);
  return c.flashcards.filter((f) => set.has(f.modulo));
}

export function questoesDoModulo(c, modulos) {
  const set = new Set(modulos);
  return c.questoes.filter((q) => set.has(q.modulo));
}

/** Módulos liberados até o dia escolhido do cronograma (os outros aparecem, mas marcados). */
export function modulosAte(c, diaIdx) {
  const libera = new Set();
  c.cronograma.forEach((d, i) => {
    if (i <= diaIdx) (d.modulos || []).forEach((m) => libera.add(m));
  });
  return libera;
}
