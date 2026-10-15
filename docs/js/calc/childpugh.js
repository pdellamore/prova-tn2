/* Escore Child-Pugh, quadro do slide 45 da Fisiopatologia (repetido no slide 5
   da Avaliação Nutricional). Cinco fatores, cada um valendo 1, 2 ou 3 pontos. */

export const meta = {
  id: "childpugh",
  titulo: "Child-Pugh",
  descricao: "Somar os cinco fatores e dizer a classe e a mortalidade em 1 ano.",
  prioridade: "E",
  orgao: "figado",
  modulo: "B4",
  fonte: { arquivo: "TN2_Fisiopatologia_Doencas_Hepaticas", pagina: 45 },
  ambiguidade: "child-c",
};

export const campos = [
  {
    id: "bilirrubina",
    rot: "Bilirrubina sérica (mg/dL)",
    tipo: "select",
    opcoes: [["1", "< 2,0 (1)"], ["2", "2,0 a 3,0 (2)"], ["3", "> 3,0 (3)"]],
  },
  {
    id: "albumina",
    rot: "Albumina sérica (g/dL)",
    tipo: "select",
    opcoes: [["1", "> 3,5 (1)"], ["2", "3,0 a 3,5 (2)"], ["3", "< 3,0 (3)"]],
  },
  {
    id: "ascite",
    rot: "Ascite",
    tipo: "select",
    opcoes: [["1", "ausente (1)"], ["2", "fácil controle (2)"], ["3", "difícil controle (3)"]],
  },
  {
    id: "encefalopatia",
    rot: "Encefalopatia",
    tipo: "select",
    opcoes: [["1", "nenhuma (1)"], ["2", "grau I ou II (2)"], ["3", "grau III e IV (3)"]],
  },
  {
    id: "protrombina",
    rot: "Tempo de protrombina",
    tipo: "select",
    opcoes: [["1", "0 a 4 seg · INR < 1,7 (1)"], ["2", "4,1 a 6 seg · INR 1,7 a 2,3 (2)"], ["3", "> 6 seg · INR > 2,3 (3)"]],
  },
];

/** Classe pela grafia do slide: A = 5–6, B = 7–9, C = > 10. O 10 fica de fora. */
export function classe(total) {
  if (total <= 6) return { letra: "A", mortalidade: "< 5%" };
  if (total <= 9) return { letra: "B", mortalidade: "20%" };
  return { letra: "C", mortalidade: "55%" };
}

export function resolver(d) {
  const itens = campos.map((cp) => [cp.rot, Number(d[cp.id]) || 1]);
  const total = itens.reduce((s, [, v]) => s + v, 0);
  const c = classe(total);
  const passos = [
    ...itens.map(([rot, v]) => `${rot}: <b>${v}</b> ${v === 1 ? "ponto" : "pontos"}.`),
    `Soma = ${itens.map(([, v]) => v).join(" + ")} = <b>${total}</b>.`,
    `Faixas do slide: <b>A = 5 a 6 (mortalidade em 1 ano &lt; 5%)</b> · <b>B = 7 a 9 (20%)</b> · <b>C = &gt; 10 (55%)</b>.`,
    `Classe <b>${c.letra}</b>, mortalidade em 1 ano de <b>${c.mortalidade}</b>.`,
    total === 10
      ? `Atenção: com <b>exatamente 10 pontos</b>, o slide não fecha a faixa — ele grafa a classe C como “&gt; 10”. Este material lê o 10 como <b>Child C</b>.`
      : `Lembre da inversão: <b>mais albumina, menos ponto</b>; com a bilirrubina é o contrário.`,
  ];
  return {
    valor: total,
    resposta: String(total),
    rotulo: `${total} ${total === 1 ? "ponto" : "pontos"} · Child ${c.letra}`,
    detalhe: `mortalidade em 1 ano de ${c.mortalidade}`,
    classe: c.letra,
    passos,
  };
}

export function gerar() {
  let d;
  do {
    d = {};
    for (const cp of campos) d[cp.id] = String(1 + Math.floor(Math.random() * 3));
  } while (resolver(d).valor === 10); // o 10 é a faixa que o slide deixa de fora
  return d;
}

export function conferir(dados, resposta) {
  const certa = resolver(dados);
  const dito = String(resposta).trim().toUpperCase().replace(/\s|PONTOS?/g, "");
  return { ok: dito === certa.resposta, esperado: certa.rotulo, solucao: certa };
}

export const exemplo = {
  dados: { bilirrubina: "2", albumina: "3", ascite: "3", encefalopatia: "2", protrombina: "2" },
  nota: "Responda com o total de pontos. Dois dos cinco itens (ascite e encefalopatia) são clínicos e subjetivos — é essa a crítica que o MELD resolve.",
};
