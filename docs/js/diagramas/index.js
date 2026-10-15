/* Diagramas em SVG para os quatro mecanismos centrais (codificação dupla:
   o mesmo conteúdo do bloco, visto como caminho em vez de lista).

   Nada aqui acrescenta informação: cada caixa é uma expressão que está no
   slide indicado em "fonte". O SVG é desenhado por código a partir das listas
   abaixo, em coluna única, para caber na largura do celular. */

import { esc } from "../ui.js";

const L = 300; // largura do viewBox
const MARGEM = 10;
const ALT_CAIXA = 46;
const ESPACO = 26; // espaço da seta entre caixas

/** Quebra o texto em linhas de no máximo `max` caracteres, sem cortar palavra. */
function linhas(txt, max) {
  const palavras = txt.split(" ");
  const saida = [];
  let atual = "";
  for (const p of palavras) {
    if (!atual) atual = p;
    else if ((atual + " " + p).length <= max) atual += " " + p;
    else {
      saida.push(atual);
      atual = p;
    }
  }
  if (atual) saida.push(atual);
  return saida;
}

function caixa(x, y, w, txt, { forte = false, pequena = false } = {}) {
  const max = pequena ? 18 : 30;
  const ls = linhas(txt, max);
  const tamanho = pequena ? 10.5 : 12;
  const alt = Math.max(pequena ? 34 : ALT_CAIXA, ls.length * (tamanho + 3) + 18);
  const y0 = y + alt / 2 - ((ls.length - 1) * (tamanho + 3)) / 2;
  const texto = ls
    .map((l, i) => `<tspan x="${x + w / 2}" y="${y0 + i * (tamanho + 3)}">${esc(l)}</tspan>`)
    .join("");
  return {
    alt,
    svg: `<g><rect class="dg-caixa${forte ? " dg-forte" : ""}" x="${x}" y="${y}" width="${w}" height="${alt}" rx="10"></rect>
      <text class="dg-txt" style="font-size:${tamanho}px" text-anchor="middle">${texto}</text></g>`,
  };
}

function seta(x, y, altura) {
  return `<g class="dg-seta"><line x1="${x}" y1="${y}" x2="${x}" y2="${y + altura - 7}"></line>
    <path d="M ${x - 4} ${y + altura - 8} L ${x} ${y + altura} L ${x + 4} ${y + altura - 8} Z"></path></g>`;
}

/** Cadeia vertical de caixas ligadas por setas. */
function fluxo(passos, y0) {
  let y = y0;
  let svg = "";
  passos.forEach((p, i) => {
    const c = caixa(MARGEM, y, L - MARGEM * 2, p.txt, { forte: !!p.forte });
    svg += c.svg;
    y += c.alt;
    if (i < passos.length - 1) {
      svg += seta(L / 2, y, ESPACO);
      y += ESPACO;
    }
  });
  return { svg, y };
}

/** Leque de consequências: duas colunas de caixas menores abaixo de um tronco. */
function ramos(itens, y0) {
  const larg = (L - MARGEM * 2 - 16) / 2;
  let svg = `<g class="dg-seta"><line x1="${L / 2}" y1="${y0}" x2="${L / 2}" y2="${y0 + 12}"></line>
    <line x1="${MARGEM + larg / 2}" y1="${y0 + 12}" x2="${L - MARGEM - larg / 2}" y2="${y0 + 12}"></line></g>`;
  let y = y0 + 12;
  const alturas = [];
  itens.forEach((it, i) => {
    const col = i % 2;
    const x = MARGEM + col * (larg + 16);
    if (col === 0) {
      svg += `<g class="dg-seta"><line x1="${MARGEM + larg / 2}" y1="${y}" x2="${MARGEM + larg / 2}" y2="${y + 14}"></line></g>`;
      if (itens[i + 1])
        svg += `<g class="dg-seta"><line x1="${L - MARGEM - larg / 2}" y1="${y}" x2="${L - MARGEM - larg / 2}" y2="${y + 14}"></line></g>`;
    }
    const c = caixa(x, y + 14, larg, it, { pequena: true });
    svg += c.svg;
    alturas.push(c.alt);
    if (col === 1 || i === itens.length - 1) {
      const passo = 14 + Math.max(...alturas.slice(-2));
      y += passo;
      if (itens[i + 1]) {
        svg += `<g class="dg-seta"><line x1="${MARGEM + larg / 2}" y1="${y}" x2="${L - MARGEM - larg / 2}" y2="${y}"></line></g>`;
      }
    }
  });
  return { svg, y };
}

export const DIAGRAMAS = {
  "progressao-hepatica": {
    titulo: "Do fígado saudável à cirrose",
    legenda: "Até a fibrose, o tecido ainda pode voltar atrás; a cirrose é o estágio em que os nódulos já impedem as funções.",
    fonte: { arquivo: "TN2_Fisiopatologia_Doencas_Hepaticas", pagina: 40 },
    passos: [
      { txt: "Fígado saudável" },
      { txt: "Esteatose (síndrome metabólica, álcool)" },
      { txt: "Hepatite / inflamação (vírus, medicamentos, autoimunes)" },
      { txt: "Fibrose / cicatrização" },
      { txt: "Cirrose", forte: true },
    ],
  },
  "celulas-fibrose": {
    titulo: "Por que a cicatriz se forma",
    legenda: "É a mesma sequência vista pelas células: a tentativa de regenerar o tecido é o que produz a fibrose.",
    fonte: { arquivo: "TN2_Fisiopatologia_Doencas_Hepaticas", pagina: 39 },
    passos: [
      { txt: "Agressão contínua ao fígado" },
      { txt: "Células de Kupffer liberam citocinas inflamatórias" },
      { txt: "Células estreladas passam a produzir colágeno" },
      { txt: "Fibrose e nódulos impedem as funções do fígado", forte: true },
    ],
  },
  "hipertensao-portal": {
    titulo: "Hipertensão portal e suas consequências",
    legenda: "A chave das complicações da cirrose: a pressão que não passa pelo fígado encontra outra saída.",
    fonte: { arquivo: "TN2_Fisiopatologia_Doencas_Hepaticas", pagina: 54 },
    passos: [
      { txt: "Fibrose e nódulos “fecham” os sinusoides" },
      { txt: "Aumento da resistência ao fluxo para dentro do fígado" },
      { txt: "Pressão sustentada na veia porta", forte: true },
    ],
    ramos: [
      "Circulação colateral",
      "Varizes de esôfago e estômago",
      "Extravasamento e ascite",
      "Aumento de fígado e baço",
    ],
  },
  "sindrome-nefrotica": {
    titulo: "Fisiopatologia da síndrome nefrótica",
    legenda: "O caminho é curto e cai em prova. Guarde a ordem: a hipoalbuminemia vem antes do edema.",
    fonte: { arquivo: "Aula_NEFRO", pagina: 27 },
    passos: [
      { txt: "↑ permeabilidade da membrana basal glomerular" },
      { txt: "Proteinúria maciça" },
      { txt: "Hipoalbuminemia" },
      { txt: "↑ reabsorção de sódio" },
      { txt: "Edema", forte: true },
    ],
  },
  "amonia-bcaa": {
    titulo: "O caminho da amônia e dos BCAA",
    legenda: "Por isso a depleção muscular precipita encefalopatia: é o músculo que fixa a amônia livre.",
    fonte: { arquivo: "TN2_Terapia_Nutricional_Cirrose", pagina: 31 },
    passos: [
      { txt: "BCAA: leucina, isoleucina e valina" },
      { txt: "Metabolizados no músculo" },
      { txt: "Transformados em glutamato" },
      { txt: "Fixam a amônia livre" },
      { txt: "Eliminação na forma de glutamina", forte: true },
    ],
    nota: "Relação BCAA/aromáticos: 3,0 a 3,5 em pessoas saudáveis; abaixo de 1,0 na cirrose.",
  },
};

/** Devolve o HTML da figura com o SVG e a versão em texto (para leitor de tela e para quem prefere ler). */
export function diagrama(id) {
  const d = DIAGRAMAS[id];
  if (!d) return "";
  const r1 = fluxo(d.passos, MARGEM);
  let svg = r1.svg;
  let y = r1.y;
  if (d.ramos) {
    const r2 = ramos(d.ramos, y);
    svg += r2.svg;
    y = r2.y;
  }
  const alt = y + MARGEM;
  const texto = d.passos.map((p) => p.txt).join(" → ") + (d.ramos ? ` → ${d.ramos.join("; ")}` : "");
  return `<figure class="diagrama">
    <figcaption><span class="olho">Diagrama</span> ${esc(d.titulo)}</figcaption>
    <svg viewBox="0 0 ${L} ${alt}" role="img" aria-label="${esc(d.titulo)}: ${esc(texto)}">${svg}</svg>
    <p class="dg-legenda">${esc(d.legenda)}</p>
    ${d.nota ? `<p class="dg-legenda">${esc(d.nota)}</p>` : ""}
    <details class="dg-texto"><summary>Ver em texto</summary><p>${esc(texto)}</p></details>
  </figure>`;
}
