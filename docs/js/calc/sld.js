/* Classificação da esteatose: MASLD, MetALD ou ALD, pelos slides 8, 9 e 11 da
   aula de MASLD. As faixas de álcool são as do slide 11; os fatores
   cardiometabólicos, as do slide 9. */

export const meta = {
  id: "sld",
  titulo: "MASLD, MetALD ou ALD",
  descricao: "Classificar a esteatose pelo álcool e pelos fatores cardiometabólicos.",
  prioridade: "E",
  orgao: "figado",
  modulo: "B5",
  fonte: { arquivo: "TN2_MASLD", pagina: 11 },
};

/** Faixa de MetALD em gramas por semana, pelo slide 11. */
export const FAIXA = { M: [140, 350], H: [210, 420] };

export const campos = [
  { id: "sexo", rot: "Sexo", tipo: "select", opcoes: [["M", "mulher"], ["H", "homem"]] },
  { id: "alcool", rot: "Álcool (g por semana)", passo: "10" },
  {
    id: "fatores",
    rot: "Fatores cardiometabólicos",
    tipo: "select",
    opcoes: [["0", "nenhum"], ["1", "1 fator"], ["2", "2 fatores"], ["3", "3 ou mais fatores"]],
  },
];

export const CLASSES = {
  MASLD: "MASLD",
  MetALD: "MetALD",
  ALD: "ALD",
  OUTRAS: "Outras causas de esteatose",
};

export function resolver({ sexo, alcool, fatores }) {
  const s = sexo === "H" ? "H" : "M";
  const g = Number(alcool) || 0;
  const nf = Number(fatores) || 0;
  const [piso, teto] = FAIXA[s];
  const rotSexo = s === "H" ? "homens" : "mulheres";

  let classe;
  if (g > teto) classe = CLASSES.ALD;
  else if (g >= piso) classe = nf >= 1 ? CLASSES.MetALD : CLASSES.ALD;
  else classe = nf >= 1 ? CLASSES.MASLD : CLASSES.OUTRAS;

  const passos = [
    `Faixa de MetALD para <b>${rotSexo}</b>: <b>${piso} a ${teto} g por semana</b>.`,
    `Consumo informado: <b>${g} g/semana</b> — ${g > teto ? "<b>acima</b> do teto" : g >= piso ? "<b>dentro</b> da faixa" : "<b>abaixo</b> do piso"}.`,
    `Fatores cardiometabólicos: <b>${nf}</b> — a definição de MASLD exige <b>ao menos 1</b>.`,
    classe === CLASSES.ALD && g > teto
      ? `Passando do teto da faixa, a classificação é <b>ALD</b>.`
      : classe === CLASSES.ALD
        ? `Dentro da faixa de consumo, mas <b>sem fator cardiometabólico</b> não há a parte “Met” — resta <b>ALD</b>.`
        : classe === CLASSES.MetALD
          ? `Dentro da faixa e com fator cardiometabólico: <b>MetALD</b>.`
          : classe === CLASSES.MASLD
            ? `Abaixo do piso e com fator cardiometabólico: <b>MASLD</b>.`
            : `Abaixo do piso e <b>sem nenhum fator cardiometabólico</b>: não preenche MASLD — cai em <b>outras causas</b>.`,
    `Lembre que o slide avisa: a distinção se baseia no <b>consumo autorrelatado, frequentemente subestimado</b>.`,
  ];

  return { valor: classe, resposta: classe, rotulo: classe, detalhe: `${g} g/semana · ${nf} ${nf === 1 ? "fator" : "fatores"}`, classe, passos };
}

export function alternativas() {
  return [CLASSES.MASLD, CLASSES.MetALD, CLASSES.ALD, CLASSES.OUTRAS];
}

export function gerar() {
  const sexo = Math.random() < 0.5 ? "M" : "H";
  const [piso, teto] = FAIXA[sexo];
  const faixa = Math.floor(Math.random() * 3);
  const alcool =
    faixa === 0
      ? Math.round((Math.random() * (piso - 10)) / 10) * 10
      : faixa === 1
        ? Math.round((piso + Math.random() * (teto - piso)) / 10) * 10
        : Math.round((teto + 20 + Math.random() * 300) / 10) * 10;
  const fatores = String(Math.random() < 0.15 ? 0 : 1 + Math.floor(Math.random() * 3));
  return { sexo, alcool, fatores };
}

export function conferir(dados, resposta) {
  const certa = resolver(dados);
  return { ok: String(resposta).trim() === certa.resposta, esperado: certa.rotulo, solucao: certa };
}

export const exemplo = {
  dados: { sexo: "H", alcool: 280, fatores: "2" },
  nota: "As faixas diárias dão no mesmo: mulheres 20 a 50 g/dia, homens 30 a 60 g/dia.",
};
