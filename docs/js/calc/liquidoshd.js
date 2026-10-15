/* Prescrição de líquidos na hemodiálise, slide 132 da aula de nefrologia:
   500 mL + o volume da diurese; no anúrico, no máximo 1.000 mL. */

export const meta = {
  id: "liquidoshd",
  titulo: "Líquidos na hemodiálise",
  descricao: "Prescrever o volume de líquidos a partir da diurese residual.",
  prioridade: "E",
  orgao: "rim",
  modulo: "A6",
  fonte: { arquivo: "Aula_NEFRO", pagina: 132 },
};

export const campos = [
  {
    id: "anurico",
    rot: "Situação",
    tipo: "select",
    opcoes: [["nao", "tem diurese residual"], ["sim", "anúrico"]],
  },
  { id: "diurese", rot: "Diurese de 24 h (mL)", passo: "10" },
];

export function resolver({ anurico, diurese }) {
  const d = anurico === "sim" ? 0 : Number(diurese) || 0;
  const total = anurico === "sim" ? 1000 : 500 + d;
  const n = (x) => x.toLocaleString("pt-BR");
  const passos =
    anurico === "sim"
      ? [
          `Paciente <b>anúrico</b>: não há diurese para somar.`,
          `Regra do slide: no anúrico, <b>no máximo 1.000 mL/dia</b>.`,
          `Prescrição = <b>1.000 mL/dia</b>.`,
          `Com diurese residual a conta seria outra: <b>500 mL + o volume da diurese</b>.`,
        ]
      : [
          `Diurese de 24 h: <b>${n(d)} mL</b>.`,
          `Regra do slide: <b>500 mL + o volume da diurese</b>.`,
          `Prescrição = 500 + ${n(d)} = <b>${n(total)} mL/dia</b>.`,
          `Se fosse <b>anúrico</b>, o teto seria <b>1.000 mL/dia</b>.`,
          `O ganho de peso interdialítico aceitável é de <b>3 a 5% do peso corporal</b>.`,
        ];
  return { valor: total, resposta: String(total), rotulo: `${n(total)} mL/dia`, detalhe: anurico === "sim" ? "teto do paciente anúrico" : `500 mL + ${n(d)} mL de diurese`, passos };
}

export function gerar() {
  const anurico = Math.random() < 0.3 ? "sim" : "nao";
  return { anurico, diurese: anurico === "sim" ? 0 : Math.round((200 + Math.random() * 1100) / 50) * 50 };
}

export function conferir(dados, resposta) {
  const certa = resolver(dados);
  const dito = Number(String(resposta).replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
  return { ok: isFinite(dito) && Math.abs(dito - certa.valor) <= 10, esperado: certa.rotulo, solucao: certa };
}

export const exemplo = {
  dados: { anurico: "nao", diurese: 700 },
  nota: "Responda em mililitros por dia, só o número.",
};
