/* Cockcroft-Gault, como está no slide 50:
   DC = (140 − idade) × peso / (72 × creatinina sérica), × 0,85 se mulher. */

export const meta = {
  id: "cockcroft",
  titulo: "Cockcroft-Gault",
  descricao: "Estimar a depuração de creatinina — e não esquecer o 0,85 da mulher.",
  prioridade: "I",
  orgao: "rim",
  modulo: "A3",
  fonte: { arquivo: "Aula_NEFRO", pagina: 50 },
};

export const campos = [
  { id: "idade", rot: "Idade (anos)", tipo: "number", passo: "1" },
  { id: "peso", rot: "Peso (kg)", tipo: "number", passo: "0.1" },
  { id: "cr", rot: "Creatinina sérica (mg/dL)", tipo: "number", passo: "0.1" },
  { id: "sexo", rot: "Sexo", tipo: "select", opcoes: [["F", "Mulher"], ["M", "Homem"]] },
];

export function resolver({ idade, peso, cr, sexo }) {
  const numerador = (140 - idade) * peso;
  const denominador = 72 * cr;
  const bruto = numerador / denominador;
  const valor = sexo === "F" ? bruto * 0.85 : bruto;
  const passos = [
    `140 − ${idade} = <b>${140 - idade}</b>.`,
    `${140 - idade} × ${n(peso)} kg = <b>${n(numerador)}</b>.`,
    `72 × ${n(cr)} mg/dL = <b>${n(denominador)}</b>.`,
    `${n(numerador)} ÷ ${n(denominador)} = <b>${n(bruto, 1)}</b> mL/min.`,
    sexo === "F"
      ? `Mulher: multiplicar por <b>0,85</b> → ${n(bruto, 1)} × 0,85 = <b>${n(valor, 1)}</b> mL/min.`
      : `Homem: <b>não</b> multiplica por 0,85. Resultado = <b>${n(valor, 1)}</b> mL/min.`,
  ];
  return { valor, resposta: round1(valor), rotulo: `${n(valor, 1)} mL/min`, detalhe: "depuração de creatinina estimada", passos };
}

function round1(v) {
  return Math.round(v * 10) / 10;
}
function n(v, casas = 2) {
  const x = Math.round(v * 10 ** casas) / 10 ** casas;
  return String(x).replace(".", ",");
}

export function gerar() {
  const s = (a, b, p = 1) => Math.round((a + Math.random() * (b - a)) * p) / p;
  return {
    idade: s(20, 85),
    peso: s(45, 95),
    cr: s(0.8, 4.5, 10),
    sexo: Math.random() < 0.5 ? "F" : "M",
  };
}

/** Confere com tolerância de 5% — o que importa é o caminho, não a 2ª decimal. */
export function conferir(dados, resposta) {
  const certa = resolver(dados);
  const num = Number(String(resposta).replace(",", "."));
  const ok = isFinite(num) && Math.abs(num - certa.valor) <= Math.max(1, certa.valor * 0.05);
  return { ok, esperado: `${n(certa.valor, 1)} mL/min`, solucao: certa };
}

export const exemplo = {
  dados: { idade: 62, peso: 70, cr: 2.1, sexo: "F" },
  nota: "Troque o sexo para ver o 0,85 entrar e sair da conta.",
};
