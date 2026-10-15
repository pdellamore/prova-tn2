/* Classificação KDIGO 2012: categoria de TFG (G) + categoria de albuminúria (A)
   e o prognóstico por cor, exatamente como no quadro do slide 47. */

export const meta = {
  id: "kdigo",
  titulo: "Classificação KDIGO (G + A)",
  descricao: "Estadiar a DRC pela TFG e pela albuminúria, e dizer se há critério de DRC.",
  prioridade: "E",
  orgao: "rim",
  modulo: "A3",
  fonte: { arquivo: "Aula_NEFRO", pagina: 47 },
};

export const FAIXAS_G = [
  { id: "G1", rot: "≥ 90", termo: "normal ou alta", min: 90, max: Infinity },
  { id: "G2", rot: "60–89", termo: "levemente diminuída", min: 60, max: 89.999 },
  { id: "G3a", rot: "45–59", termo: "leve a moderadamente diminuída", min: 45, max: 59.999 },
  { id: "G3b", rot: "30–44", termo: "moderada a gravemente diminuída", min: 30, max: 44.999 },
  { id: "G4", rot: "15–29", termo: "gravemente diminuída", min: 15, max: 29.999 },
  { id: "G5", rot: "< 15", termo: "falência renal", min: -Infinity, max: 14.999 },
];

export const FAIXAS_A = [
  { id: "A1", rot: "< 30", termo: "normal a levemente aumentada" },
  { id: "A2", rot: "30–300", termo: "moderadamente aumentada" },
  { id: "A3", rot: "> 300", termo: "gravemente aumentada" },
];

/** Linhas G × colunas A, como as cores do slide. */
export const RISCO = {
  G1: ["verde", "amarelo", "laranja"],
  G2: ["verde", "amarelo", "laranja"],
  G3a: ["amarelo", "laranja", "vermelho"],
  G3b: ["laranja", "vermelho", "vermelho"],
  G4: ["vermelho", "vermelho", "vermelho"],
  G5: ["vermelho", "vermelho", "vermelho"],
};

export const NOME_RISCO = {
  verde: "baixo risco",
  amarelo: "risco moderadamente aumentado",
  laranja: "alto risco",
  vermelho: "risco muito alto",
};

export function categoriaG(tfg) {
  return FAIXAS_G.find((f) => tfg >= f.min && tfg <= f.max) || FAIXAS_G[FAIXAS_G.length - 1];
}

export function categoriaA(acr) {
  if (acr < 30) return FAIXAS_A[0];
  if (acr <= 300) return FAIXAS_A[1];
  return FAIXAS_A[2];
}

export const campos = [
  { id: "tfg", rot: "TFG (mL/min/1,73 m²)", tipo: "number", passo: "1" },
  { id: "acr", rot: "Albuminúria (mg/g)", tipo: "number", passo: "1" },
  { id: "meses", rot: "Há quantos meses?", tipo: "number", passo: "1" },
];

export function resolver({ tfg, acr, meses }) {
  const g = categoriaG(tfg);
  const a = categoriaA(acr);
  const cronico = meses > 3;
  const temLesao = a.id !== "A1";
  const ehDRC = cronico && (tfg < 60 || temLesao);
  const cor = RISCO[g.id][FAIXAS_A.indexOf(a)];

  const passos = [
    `TFG = ${fmt(tfg)} mL/min/1,73 m² → cai na faixa ${g.rot} → <b>${g.id}</b> (${g.termo}).`,
    `Albuminúria = ${fmt(acr)} mg/g → faixa ${a.rot} → <b>${a.id}</b> (${a.termo}).`,
    `Alteração há ${fmt(meses)} ${meses === 1 ? "mês" : "meses"} → ${cronico ? "passa dos <b>3 meses</b> exigidos pelo KDIGO" : "<b>não</b> passa dos 3 meses, então ainda não fecha critério de DRC"}.`,
    ehDRC
      ? `Critério de DRC presente: ${tfg < 60 ? "TFG < 60 (G3a–G5)" : `marcador de lesão renal (${a.id})`} por mais de 3 meses.`
      : cronico
        ? `TFG ≥ 60 e albuminúria A1: <b>sem marcador de lesão, G1 e G2 não preenchem critério de DRC</b>.`
        : `Repetir depois de 3 meses para confirmar.`,
    `No quadro de prognóstico, ${g.id} × ${a.id} cai na cor <b>${cor}</b> = ${NOME_RISCO[cor]}.`,
  ];

  return {
    resposta: `${g.id} ${a.id}`,
    rotulo: ehDRC ? `DRC ${g.id} ${a.id}` : `${g.id} ${a.id}`,
    detalhe: `${NOME_RISCO[cor]}${ehDRC ? "" : " · ainda não é DRC"}`,
    g: g.id,
    a: a.id,
    cor,
    ehDRC,
    passos,
  };
}

function fmt(n) {
  return String(n).replace(".", ",");
}

function sorteio(min, max) {
  return Math.round(min + Math.random() * (max - min));
}

/** Caso novo dentro das faixas dos slides. */
export function gerar() {
  const faixa = FAIXAS_G[sorteio(0, FAIXAS_G.length - 1)];
  const tfg = faixa.id === "G1" ? sorteio(90, 120) : faixa.id === "G5" ? sorteio(5, 14) : sorteio(Math.ceil(faixa.min), Math.floor(faixa.max));
  const qualA = sorteio(0, 2);
  const acr = qualA === 0 ? sorteio(5, 29) : qualA === 1 ? sorteio(30, 300) : sorteio(301, 1200);
  const meses = Math.random() < 0.2 ? sorteio(1, 3) : sorteio(4, 24);
  return { tfg, acr, meses };
}

/** Alternativas plausíveis: a certa e vizinhas que confundem. */
export function alternativas(dados) {
  const certa = resolver(dados);
  const gi = FAIXAS_G.findIndex((f) => f.id === certa.g);
  const ai = FAIXAS_A.findIndex((f) => f.id === certa.a);
  const cand = new Set([`${certa.g} ${certa.a}`]);
  const viz = [
    [gi - 1, ai],
    [gi + 1, ai],
    [gi, ai - 1],
    [gi, ai + 1],
    [gi + 1, ai + 1],
    [gi - 1, ai - 1],
  ];
  for (const [x, y] of viz) {
    if (cand.size >= 5) break;
    if (FAIXAS_G[x] && FAIXAS_A[y]) cand.add(`${FAIXAS_G[x].id} ${FAIXAS_A[y].id}`);
  }
  return [...cand].sort(() => Math.random() - 0.5);
}

export function conferir(dados, resposta) {
  const certa = resolver(dados);
  return { ok: resposta === certa.resposta, esperado: certa.resposta, solucao: certa };
}

export const exemplo = {
  dados: { tfg: 52, acr: 150, meses: 4 },
  nota: "É o caso da questão 2 do caderno de questões.",
};
