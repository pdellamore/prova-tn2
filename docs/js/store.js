/* Progresso em localStorage. Tudo em try/catch: com armazenamento bloqueado
   o site continua funcionando, só não lembra entre recarregamentos.
   (Mesma ideia do safeStorage do projeto learning-platform.) */

const CHAVE = "tn2:estado";
const COPIA = "tn2:estado:copia";
const QUANDO = "tn2:estado:em";
const VERSAO = 1;

function memoria() {
  const dados = new Map();
  return {
    getItem: (k) => (dados.has(k) ? dados.get(k) : null),
    setItem: (k, v) => void dados.set(k, v),
    removeItem: (k) => void dados.delete(k),
    efemero: true,
  };
}

function abrir() {
  try {
    const sonda = "tn2:sonda";
    window.localStorage.setItem(sonda, "1");
    window.localStorage.removeItem(sonda);
    return window.localStorage;
  } catch {
    return memoria();
  }
}

const deposito = abrir();

/** true quando o navegador recusou o armazenamento (aba privada, dados bloqueados). */
export const semArmazenamento = deposito.efemero === true;

export function estadoNovo() {
  return {
    v: VERSAO,
    criadoEm: Date.now(),
    xp: 0,
    tempoPorDia: {},
    licoes: {},
    cards: {},
    questoes: {},
    vf: {},
    badges: [],
    missoes: {},
    chefoes: {},
    feynman: {},
    prefs: { som: false, pomodoro: [25, 5], diaManual: null, cortarC: false, ultimoExport: 0 },
  };
}

function migrar(bruto) {
  const base = estadoNovo();
  if (!bruto || typeof bruto !== "object") return base;
  const e = { ...base, ...bruto };
  e.prefs = { ...base.prefs, ...(bruto.prefs || {}) };
  for (const campo of ["licoes", "cards", "questoes", "vf", "missoes", "chefoes", "feynman", "tempoPorDia"]) {
    if (!e[campo] || typeof e[campo] !== "object" || Array.isArray(e[campo])) e[campo] = {};
  }
  if (!Array.isArray(e.badges)) e.badges = [];
  if (typeof e.xp !== "number" || !isFinite(e.xp)) e.xp = 0;
  e.v = VERSAO;
  return e;
}

/** Lê uma chave e devolve o objeto, ou null se estiver faltando ou corrompida. */
function lerChave(k) {
  try {
    const cru = deposito.getItem(k);
    if (!cru) return null;
    const obj = JSON.parse(cru);
    return obj && typeof obj === "object" ? obj : null;
  } catch {
    return null;
  }
}

/** Entre duas versões do progresso, fica com a que tem mais trabalho feito. */
function peso(e) {
  if (!e) return -1;
  const n = (o) => (o && typeof o === "object" ? Object.keys(o).length : 0);
  return (Number(e.xp) || 0) + n(e.licoes) + n(e.cards) + n(e.questoes);
}

let recuperado = false;

let estado = (() => {
  const principal = lerChave(CHAVE);
  const copia = lerChave(COPIA);
  // A cópia só entra em cena se a principal sumiu, corrompeu ou ficou para trás.
  if (peso(copia) > peso(principal)) {
    recuperado = principal !== null || copia !== null;
    return migrar(copia);
  }
  return migrar(principal);
})();

/** true quando o progresso veio da cópia de segurança, não da chave principal. */
export const veioDaCopia = recuperado;

const ouvintes = new Set();

export function ler() {
  return estado;
}

/** Aplica uma mutação e persiste. O callback recebe o estado para alterar no lugar. */
export function mudar(fn) {
  try {
    fn(estado);
  } catch (erro) {
    console.error("mudança de estado falhou", erro);
    return estado;
  }
  gravar();
  for (const fn2 of ouvintes) {
    try {
      fn2(estado);
    } catch {
      /* um ouvinte quebrado não derruba os outros */
    }
  }
  return estado;
}

export function aoMudar(fn) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

let falhou = false;
let gravadoEm = 0;
let gravacoes = 0;
const avisados = new Set();

/** Estado do armazenamento, para a tela de ajustes mostrar a verdade. */
export function saude() {
  return {
    efemero: semArmazenamento,
    falhou,
    gravadoEm,
    veioDaCopia: recuperado,
    bytes: (() => {
      try {
        return (deposito.getItem(CHAVE) || "").length;
      } catch {
        return 0;
      }
    })(),
  };
}

/** Avisa a interface quando o progresso deixa de ser salvo. */
export function aoFalharGravacao(fn) {
  avisados.add(fn);
  return () => avisados.delete(fn);
}

function gravar(forcarCopia) {
  const texto = (() => {
    try {
      return JSON.stringify(estado);
    } catch {
      return null;
    }
  })();
  if (texto === null) return marcarFalha();

  try {
    deposito.setItem(CHAVE, texto);
    // Confere que foi mesmo para o disco: Safari em modo restrito aceita o
    // setItem e devolve vazio na leitura seguinte.
    if (deposito.getItem(CHAVE) !== texto) return marcarFalha();
  } catch {
    return marcarFalha();
  }

  // Cópia de segurança a cada 5 gravações: se a principal corromper no meio de
  // uma escrita, o que se perde é um punhado de cliques, não a semana inteira.
  gravacoes += 1;
  if (forcarCopia || gravacoes % 5 === 1) {
    try {
      deposito.setItem(COPIA, texto);
      deposito.setItem(QUANDO, String(Date.now()));
    } catch {
      /* sem espaço para a cópia: a principal já está salva, segue o jogo */
    }
  }

  gravadoEm = Date.now();
  if (falhou) {
    falhou = false;
    for (const fn of avisados) {
      try {
        fn(saude());
      } catch {
        /* idem */
      }
    }
  }
}

function marcarFalha() {
  if (falhou) return;
  falhou = true;
  for (const fn of avisados) {
    try {
      fn(saude());
    } catch {
      /* um ouvinte quebrado não derruba os outros */
    }
  }
}

// Se o progresso veio da cópia, a chave principal está corrompida ou atrasada.
// Reescreve na hora, para a próxima visita não depender de novo da cópia.
if (recuperado) gravar(true);

export function exportar() {
  return JSON.stringify({ app: "plantao-tn2", exportadoEm: new Date().toISOString(), estado }, null, 2);
}

/** Importa um JSON exportado antes. Devolve {ok, msg}. */
export function importar(texto) {
  let obj;
  try {
    obj = JSON.parse(texto);
  } catch {
    return { ok: false, msg: "Arquivo não é um JSON válido." };
  }
  const bruto = obj && obj.estado ? obj.estado : obj;
  if (!bruto || typeof bruto !== "object") return { ok: false, msg: "Arquivo sem dados de progresso." };
  estado = migrar(bruto);
  gravar(true);
  for (const fn of ouvintes) {
    try {
      fn(estado);
    } catch {
      /* idem */
    }
  }
  return { ok: true, msg: "Progresso importado." };
}

export function zerar() {
  estado = estadoNovo();
  try {
    deposito.removeItem(COPIA);
    deposito.removeItem(QUANDO);
  } catch {
    /* se não dá para apagar a cópia, a gravação abaixo ao menos a sobrescreve */
  }
  gravar(true);
  for (const fn of ouvintes) {
    try {
      fn(estado);
    } catch {
      /* idem */
    }
  }
}

/* ── tema ── */

export function tema() {
  const explicito = document.documentElement.dataset.tema;
  if (explicito) return explicito;
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro";
  } catch {
    return "claro";
  }
}

export function alternarTema() {
  const proximo = tema() === "escuro" ? "claro" : "escuro";
  document.documentElement.dataset.tema = proximo;
  try {
    localStorage.setItem("tn2:tema", proximo);
  } catch {
    /* sem armazenamento o tema vale só para esta visita */
  }
  return proximo;
}
