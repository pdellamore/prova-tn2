/* Peso seco por desconto percentual, slide 25 da Avaliação Nutricional
   (os mesmos percentuais reaparecem no slide 10 da Terapia Nutricional). */

export const meta = {
  id: "pesoseco",
  titulo: "Peso seco",
  descricao: "Descontar ascite e edema do peso aferido e dizer o peso seco.",
  prioridade: "E",
  orgao: "figado",
  modulo: "B6",
  fonte: { arquivo: "TN2_Avaliacao_Nutricional_Hepatopatias", pagina: 25 },
};

export const campos = [
  { id: "peso", rot: "Peso aferido (kg)", passo: "0.1" },
  {
    id: "ascite",
    rot: "Ascite",
    tipo: "select",
    opcoes: [["0", "ausente (0%)"], ["5", "leve (−5%)"], ["10", "moderada (−10%)"], ["15", "severa (−15%)"]],
  },
  {
    id: "edema",
    rot: "Edema bilateral",
    tipo: "select",
    opcoes: [["0", "ausente (0%)"], ["5", "presente (−5%)"]],
  },
];

export function resolver({ peso, ascite, edema }) {
  const p = Number(peso) || 0;
  const a = Number(ascite) || 0;
  const ed = Number(edema) || 0;
  const pct = a + ed;
  const seco = p * (1 - pct / 100);
  const n = (x) => x.toFixed(1).replace(".", ",");
  const passos = [
    `Peso aferido: <b>${n(p)} kg</b>.`,
    a ? `Ascite: desconto de <b>${a}%</b>.` : `Sem ascite: nenhum desconto por esse motivo.`,
    ed ? `Edema bilateral: desconto de <b>${ed}%</b>.` : `Sem edema bilateral: nenhum desconto por esse motivo.`,
    `Desconto total = ${a}% + ${ed}% = <b>${pct}%</b>.`,
    `Peso seco = ${n(p)} × (1 − ${pct}/100) = <b>${n(seco)} kg</b>.`,
    `Os percentuais do slide: <b>ascite leve −5%, moderada −10%, severa −15%</b> e <b>edema bilateral −5%</b>. São os <b>recomendados pelas diretrizes</b>; o outro sistema, em quilos, é o do desconto absoluto.`,
  ];
  return { valor: seco, resposta: n(seco), rotulo: `${n(seco)} kg`, detalhe: `desconto total de ${pct}%`, pct, passos };
}

export function gerar() {
  return {
    peso: Number((55 + Math.random() * 50).toFixed(1)),
    ascite: ["0", "5", "10", "15", "10", "15"][Math.floor(Math.random() * 6)],
    edema: Math.random() < 0.45 ? "5" : "0",
  };
}

export function conferir(dados, resposta) {
  const certa = resolver(dados);
  const dito = Number(String(resposta).replace(",", ".").replace(/[^\d.-]/g, ""));
  // meio quilo de folga: a conta é de cabeça
  return { ok: isFinite(dito) && Math.abs(dito - certa.valor) <= 0.5, esperado: certa.rotulo, solucao: certa };
}

export const exemplo = {
  dados: { peso: 82, ascite: "10", edema: "5" },
  nota: "Responda em quilos, com uma casa decimal. Meio quilo de diferença passa.",
};
