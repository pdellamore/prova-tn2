/* Service worker simples: cache-first para a casca, network-first para os JSON
   de conteúdo (assim uma correção no conteúdo aparece sem esperar o cache expirar).
   Se algo falhar, o site continua funcionando online. */

const VERSAO = "tn2-v4";
const CASCA = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/icone.svg",
  "./assets/icone-180.png",
  "./assets/icone-192.png",
  "./assets/icone-512.png",
  "./assets/fonts/fraunces-latin.woff2",
  "./assets/fonts/fraunces-latin-ext.woff2",
  "./css/tokens.css",
  "./css/base.css",
  "./css/app.css",
  "./js/app.js",
  "./js/store.js",
  "./js/srs.js",
  "./js/xp.js",
  "./js/clock.js",
  "./js/ui.js",
  "./js/content.js",
  "./js/metrics.js",
  "./js/screens/hoje.js",
  "./js/screens/trilha.js",
  "./js/screens/licao.js",
  "./js/screens/questoes.js",
  "./js/screens/flashcards.js",
  "./js/screens/calculos.js",
  "./js/screens/chefao.js",
  "./js/screens/jogos.js",
  "./js/screens/painel.js",
  "./js/screens/erros.js",
  "./js/screens/config.js",
  "./js/calc/kdigo.js",
  "./js/calc/cockcroft.js",
  "./js/calc/mst.js",
  "./js/calc/childpugh.js",
  "./js/calc/pesoseco.js",
  "./js/calc/pesoajustado.js",
  "./js/calc/liquidoshd.js",
  "./js/calc/sld.js",
];

/* O conteúdo também entra no cache já na instalação: sem isto, uma tela que ela
   ainda não abriu fica indisponível offline. Continua network-first no uso, então
   uma correção publicada aparece assim que houver rede. */
const CONTEUDO = [
  "./data/modulos.json",
  "./data/cronograma.json",
  "./data/flashcards.json",
  "./data/questoes.json",
  "./data/ambiguidades.json",
  "./data/badges.json",
  "./data/chefoes.json",
  "./data/vf.json",
  "./data/numeros.json",
  "./data/ligar.json",
  "./data/casos.json",
];

/** As lições saem de modulos.json, para não haver lista a manter aqui. */
async function licoes() {
  try {
    const res = await fetch("./data/modulos.json", { cache: "no-store" });
    const mods = await res.json();
    const lista = Array.isArray(mods) ? mods : mods.modulos || [];
    return lista.filter((m) => m && m.id && !m.chega).map((m) => `./data/licoes/${m.id}.json`);
  } catch {
    return [];
  }
}

self.addEventListener("install", (ev) => {
  ev.waitUntil(
    caches
      .open(VERSAO)
      .then(async (c) => {
        await c.addAll(CASCA);
        const tudo = CONTEUDO.concat(await licoes());
        // Um arquivo que falte não pode impedir a instalação do resto.
        await Promise.all(tudo.map((u) => c.add(u).catch(() => {})));
      })
      .then(() => self.skipWaiting())
      .catch(() => {
        /* um arquivo que não entrou no cache não impede a instalação */
      }),
  );
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (ev) => {
  const req = ev.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;

  const ehConteudo = req.url.includes("/data/");

  if (ehConteudo) {
    ev.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(VERSAO).then((c) => c.put(req, copia));
          return res;
        })
        .catch(() => caches.match(req)),
    );
    return;
  }

  ev.respondWith(
    caches.match(req).then(
      (achado) =>
        achado ||
        fetch(req)
          .then((res) => {
            if (res.ok) {
              const copia = res.clone();
              caches.open(VERSAO).then((c) => c.put(req, copia));
            }
            return res;
          })
          .catch(() => caches.match("./index.html")),
    ),
  );
});
