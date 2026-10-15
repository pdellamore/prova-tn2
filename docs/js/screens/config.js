/* Ajustes, exportação e importação do progresso. */

import { ler, mudar, exportar, importar, zerar, semArmazenamento, saude } from "../store.js";
import { configurarSom, anunciar, esc } from "../ui.js";

export async function desenhar(raiz) {
  const e = ler();
  const h = saude();
  const quando = h.gravadoEm
    ? new Date(h.gravadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : null;
  raiz.dataset.orgao = "rim";
  raiz.innerHTML = `<section>
    <h1>Ajustes</h1>

    ${semArmazenamento ? `<div class="aviso-local">O navegador está bloqueando o armazenamento. Dá para estudar, mas nada é salvo entre recarregamentos — e a exportação só traz o que foi feito nesta visita.</div>` : ""}

    <div class="cartao">
      <p class="olho">Onde o progresso está salvo</p>
      <p style="font-size:.93rem">
        ${
          h.efemero
            ? "Neste momento <strong>nada está sendo salvo</strong> — o navegador recusou o armazenamento."
            : h.falhou
              ? "O navegador <strong>parou de aceitar gravações</strong>. Exporte agora."
              : `Salvo neste navegador${quando ? `, última gravação às <strong>${quando}</strong>` : ""}. Guardo também uma <strong>cópia de segurança</strong> automática.`
        }
      </p>
      <p class="fonte" style="margin-top:.35rem">
        O progresso <strong>não</strong> vai para a internet: ele vive só neste aparelho, neste navegador.
        Apagar os dados do site, usar aba anônima ou trocar de navegador começa do zero.
      </p>
    </div>

    <div class="cartao">
      <p class="olho">Trocar de aparelho ou fazer backup</p>
      <p style="font-size:.93rem">Exporte um arquivo e guarde onde quiser (e-mail, nuvem, WhatsApp para si mesma). Importar devolve tudo: XP, lições, cards e caderno de erros.</p>
      <div class="acoes">
        <button class="btn btn-forte" id="exportar" type="button">Exportar progresso</button>
        <button class="btn" id="escolher" type="button">Importar progresso</button>
        <input type="file" id="arquivo" accept="application/json,.json" hidden />
      </div>
      <p id="eco-import" class="fonte" style="margin-top:.5rem"></p>
    </div>

    <div class="cartao">
      <p class="olho">Som</p>
      <label style="display:flex;gap:.5rem;align-items:center;font-size:.95rem">
        <input type="checkbox" id="som" ${e.prefs.som ? "checked" : ""} />
        <span>Estalo curto ao acertar e errar (vem desligado)</span>
      </label>
    </div>

    <div class="cartao">
      <p class="olho">Pomodoro</p>
      <p style="font-size:.93rem;margin-bottom:.5rem">Ciclo de estudo e pausa, em minutos.</p>
      <div class="campos">
        <div class="campo"><label for="pom-estudo">Estudo</label><input id="pom-estudo" type="number" min="5" max="60" value="${e.prefs.pomodoro[0]}" /></div>
        <div class="campo"><label for="pom-pausa">Pausa</label><input id="pom-pausa" type="number" min="1" max="30" value="${e.prefs.pomodoro[1]}" /></div>
      </div>
      <div class="acoes"><button class="btn btn-pequeno" id="salvar-pom" type="button">Salvar</button></div>
    </div>

    <div class="cartao">
      <p class="olho">Recomeçar</p>
      <p style="font-size:.93rem">Apaga XP, lições, cards, questões e erros deste navegador. Não dá para desfazer.</p>
      <div class="acoes"><button class="btn" id="zerar" type="button">Zerar progresso</button></div>
      <p id="eco-zerar" class="fonte" style="margin-top:.4rem"></p>
    </div>
  </section>`;

  raiz.querySelector("#exportar").addEventListener("click", () => {
    try {
      const blob = new Blob([exportar()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `progresso-tn2-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      mudar((st) => {
        st.prefs.ultimoExport = Date.now();
      });
      anunciar("Arquivo de progresso gerado.");
    } catch {
      raiz.querySelector("#eco-import").textContent = "Não consegui gerar o arquivo neste navegador.";
    }
  });

  const arquivo = raiz.querySelector("#arquivo");
  raiz.querySelector("#escolher").addEventListener("click", () => arquivo.click());
  arquivo.addEventListener("change", async () => {
    const f = arquivo.files && arquivo.files[0];
    if (!f) return;
    const r = importar(await f.text());
    raiz.querySelector("#eco-import").textContent = r.msg;
    anunciar(r.msg);
    if (r.ok) setTimeout(() => desenhar(raiz), 400);
  });

  const som = raiz.querySelector("#som");
  som.addEventListener("change", () => {
    mudar((st) => {
      st.prefs.som = som.checked;
    });
    configurarSom(som.checked);
  });

  raiz.querySelector("#salvar-pom").addEventListener("click", () => {
    const a = Number(raiz.querySelector("#pom-estudo").value) || 25;
    const b = Number(raiz.querySelector("#pom-pausa").value) || 5;
    mudar((st) => {
      st.prefs.pomodoro = [a, b];
    });
    anunciar(`Pomodoro ${a} por ${b} salvo.`);
  });

  let confirmando = false;
  const bZerar = raiz.querySelector("#zerar");
  bZerar.addEventListener("click", () => {
    if (!confirmando) {
      confirmando = true;
      bZerar.textContent = "Tem certeza? Clique de novo";
      raiz.querySelector("#eco-zerar").textContent = "Exporte antes, se quiser guardar.";
      return;
    }
    zerar();
    anunciar("Progresso zerado.");
    desenhar(raiz);
  });
}
