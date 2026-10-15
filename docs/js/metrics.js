/* Registro de eventos para o painel. Nunca interrompe a sessão. */

const CHAVE = "tn2:eventos";
const MAX = 800;

export function lerEventos() {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE) || "[]");
    return Array.isArray(bruto) ? bruto : [];
  } catch {
    return [];
  }
}

export function registrar(evento) {
  try {
    const lista = lerEventos();
    lista.push({ ...evento, em: Date.now() });
    localStorage.setItem(CHAVE, JSON.stringify(lista.slice(-MAX)));
  } catch {
    /* métricas são enfeite: se falhar, o estudo segue */
  }
}
