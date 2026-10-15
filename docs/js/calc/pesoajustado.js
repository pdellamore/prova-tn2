/* Peso ajustado da MASLD, slide 43: (PA − PI) × 0,25 + PI.
   A proteína na perda de peso é 1,2 g/kg desse peso (slide 53). */

export const meta = {
  id: "pesoajustado",
  titulo: "Peso ajustado",
  descricao: "Calcular o peso ajustado da MASLD e a proteína de 1,2 g/kg.",
  prioridade: "E",
  orgao: "figado",
  modulo: "B5",
  fonte: { arquivo: "TN2_MASLD", pagina: 43 },
};

export const campos = [
  { id: "atual", rot: "Peso atual (kg)", passo: "0.1" },
  { id: "ideal", rot: "Peso ideal (kg)", passo: "0.1" },
];

export function resolver({ atual, ideal }) {
  const pa = Number(atual) || 0;
  const pi = Number(ideal) || 0;
  const ajustado = (pa - pi) * 0.25 + pi;
  const ptn = ajustado * 1.2;
  const n = (x) => x.toFixed(1).replace(".", ",");
  const passos = [
    `Fórmula do slide: <b>peso ajustado = (PA − PI) × 0,25 + PI</b>.`,
    `Diferença: ${n(pa)} − ${n(pi)} = <b>${n(pa - pi)} kg</b>.`,
    `Um quarto da diferença: ${n(pa - pi)} × 0,25 = <b>${n((pa - pi) * 0.25)} kg</b>.`,
    `Peso ajustado = ${n((pa - pi) * 0.25)} + ${n(pi)} = <b>${n(ajustado)} kg</b>.`,
    `Proteína na perda de peso: <b>1,2 g/kg de peso ajustado</b> = ${n(ajustado)} × 1,2 = <b>${n(ptn)} g/dia</b>.`,
    `Os dois erros esperados seriam usar o <b>peso atual</b> (${n(pa * 1.2)} g) ou o <b>peso ideal</b> (${n(pi * 1.2)} g).`,
  ];
  return { valor: ajustado, resposta: n(ajustado), rotulo: `${n(ajustado)} kg`, detalhe: `proteína de ${n(ptn)} g/dia (1,2 g/kg)`, proteina: ptn, passos };
}

export function gerar() {
  const ideal = Number((55 + Math.random() * 25).toFixed(1));
  return { atual: Number((ideal + 12 + Math.random() * 45).toFixed(1)), ideal };
}

export function conferir(dados, resposta) {
  const certa = resolver(dados);
  const dito = Number(String(resposta).replace(",", ".").replace(/[^\d.-]/g, ""));
  return { ok: isFinite(dito) && Math.abs(dito - certa.valor) <= 0.5, esperado: certa.rotulo, solucao: certa };
}

export const exemplo = {
  dados: { atual: 112, ideal: 80 },
  nota: "Responda o peso ajustado em quilos. Meio quilo de diferença passa.",
};
