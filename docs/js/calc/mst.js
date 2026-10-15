/* Escore MST (Malnutrition Screening Tool), quadro 3 do slide 59.
   Triagem na DRC: pelo menos mensalmente (Recomendação 1, slide 58). */

export const meta = {
  id: "mst",
  titulo: "Escore MST",
  descricao: "Somar os pontos da triagem e dizer se há risco de desnutrição.",
  prioridade: "E",
  orgao: "rim",
  modulo: "A4",
  fonte: { arquivo: "Aula_NEFRO", pagina: 59 },
};

export const campos = [
  {
    id: "perdeu",
    rot: "1) Perda recente e não intencional de peso?",
    tipo: "select",
    opcoes: [["nao", "Não (0)"], ["naosabe", "Não sabe (2)"], ["sim", "Sim → responder o quanto"]],
  },
  {
    id: "quanto",
    rot: "2) Se sim, quanto (kg)?",
    tipo: "select",
    opcoes: [["0", "—"], ["1", "1 a 5 kg (1)"], ["2", "6 a 10 kg (2)"], ["3", "11 a 15 kg (3)"], ["4", "> 15 kg (4)"], ["ns", "Não sabe (2)"]],
  },
  {
    id: "apetite",
    rot: "3) Come mal por redução do apetite?",
    tipo: "select",
    opcoes: [["nao", "Não (0)"], ["sim", "Sim (1)"]],
  },
];

export function resolver({ perdeu, quanto, apetite }) {
  let p1 = 0;
  if (perdeu === "naosabe") p1 = 2;
  let p2 = 0;
  if (perdeu === "sim") p2 = quanto === "ns" ? 2 : Number(quanto) || 0;
  const p3 = apetite === "sim" ? 1 : 0;
  const total = p1 + p2 + p3;
  const risco = total >= 2;
  const passos = [
    `Pergunta 1 — ${perdeu === "nao" ? "não perdeu peso: <b>0</b>" : perdeu === "naosabe" ? "não sabe: <b>2</b>" : "perdeu peso: vai para a pergunta 2"}.`,
    `Pergunta 2 — ${perdeu === "sim" ? `${rotuloQuanto(quanto)}: <b>${p2}</b>` : "não se aplica: <b>0</b>"}.`,
    `Pergunta 3 — apetite ${apetite === "sim" ? "reduzido: <b>1</b>" : "preservado: <b>0</b>"}.`,
    `Soma = ${p1} + ${p2} + ${p3} = <b>${total}</b>.`,
    `Interpretação do slide: <b>≥ 2 = risco de desnutrição</b> → ${risco ? "<b>há</b> risco" : "sem risco"}.`,
    `O MST é <b>triagem</b> (pelo menos mensal). Quem dá o <b>diagnóstico</b> é a ASG.`,
  ];
  return { valor: total, resposta: String(total), rotulo: `${total} ${total === 1 ? "ponto" : "pontos"}`, detalhe: risco ? "risco de desnutrição" : "sem risco de desnutrição", risco, passos };
}

function rotuloQuanto(q) {
  return { 1: "1 a 5 kg", 2: "6 a 10 kg", 3: "11 a 15 kg", 4: "mais de 15 kg", ns: "não sabe quanto", 0: "sem quantidade" }[q] || "sem quantidade";
}

export function gerar() {
  const perdeu = ["nao", "naosabe", "sim", "sim", "sim"][Math.floor(Math.random() * 5)];
  const quanto = perdeu === "sim" ? ["1", "2", "3", "4", "ns"][Math.floor(Math.random() * 5)] : "0";
  const apetite = Math.random() < 0.5 ? "sim" : "nao";
  return { perdeu, quanto, apetite };
}

export function conferir(dados, resposta) {
  const certa = resolver(dados);
  return { ok: String(resposta).trim() === certa.resposta, esperado: certa.rotulo, solucao: certa };
}

export const exemplo = {
  dados: { perdeu: "sim", quanto: "2", apetite: "sim" },
  nota: "Perdeu 8 kg e come mal: 2 + 1 = 3 pontos, já é risco.",
};
