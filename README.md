# Plantão TN II — site de estudo

Site de estudo gamificado para a prova objetiva de **Terapia Nutricional II** (UFCSPA),
segunda-feira, **19/10/2026**. Pensado para ser usado no celular, de quinta (15/10) a
domingo (18/10), com uma revisão relâmpago na manhã da prova.

Todo o conteúdo sai **exclusivamente dos slides da disciplina**. Cada lição, flashcard,
questão e cálculo traz o arquivo e a página do slide de onde veio, para dar para auditar.
Onde os slides se contradizem, o site mostra os dois lados em uma caixa
**"⚠ Ponto de atenção nos slides"** em vez de escolher um.

## O que já está pronto

| | |
|---|---|
| Lições | **as 18**: A1–A10 (rim) e B1–B8 (fígado), de fisiologia renal a transplante hepático |
| Questões | **154**, de 5 alternativas, com justificativa, motivo do erro de cada alternativa e fonte |
| Flashcards | **323**, com repetição espaçada comprimida nos 5 dias |
| Mini-jogos | **80** afirmações de verdadeiro ou falso, **66** rodadas de "qual é o número?", **12** tabelas de ligar colunas e **14** casos clínicos |
| Chefões | **3** simulados cronometrados: rim, fígado e o final, com rim e fígado misturados |
| Cálculos | **8**: KDIGO (G + A), Cockcroft-Gault, escore MST, Child-Pugh, peso seco na ascite, peso ajustado, líquidos na hemodiálise e classificação SLD/MASLD |
| Diagramas | **5** em SVG: progressão até a cirrose, formação da fibrose, hipertensão portal, síndrome nefrótica e o caminho da amônia/BCAA |
| Ambiguidades | **18** pontos em que os slides se contradizem, com os dois lados lado a lado — na caixa do item e todos juntos na tela **Pontos de atenção** |
| Telas | Hoje, Trilha, Lição, Questões, Flashcards, Cálculos, Jogos, Chefões, Pontos de atenção, Meus erros, Painel, Ajustes |

O conteúdo de cada dia vai sendo liberado pelo cronograma, mas a trilha mostra os 18 módulos
desde o começo e **nada é bloqueado de verdade** — dá para pular para qualquer lição.

### Auditoria de fidelidade

Cada item do site cita o arquivo e a página do slide de onde veio, e uma amostra de **38% das
questões e dos flashcards** (58 de 154 e 123 de 323), mais **100% dos números dos mini-jogos**
(os 66 valores e os 94 pares das tabelas), foi conferida item a item contra os slides por
revisores independentes — inclusive renderizando em imagem as páginas que são só figura. As
divergências encontradas foram de página e de redação, e estão corrigidas; nenhum gabarito,
número ou classificação estava errado. Três afirmações que não constavam dos slides foram
removidas, e duas contradições novas entre slides viraram caixa de "ponto de atenção".

## Como rodar no computador

O site é HTML, CSS e JavaScript puro: **não tem build**. Só precisa ser servido por
HTTP (abrir o `index.html` direto do disco não funciona, porque o navegador bloqueia a
leitura dos JSON de conteúdo).

```bash
cd docs
python3 -m http.server 8000
# abra http://localhost:8000
```

## Onde o site está publicado

**https://pdellamore.github.io/prova-tn2/** — repositório `pdellamore/prova-tn2`, servido da
pasta `/docs` do branch `main`.

Para republicar depois de mudar qualquer coisa:

```bash
git add -A && git commit -m "o que mudou" && git push
```

O GitHub Pages reconstrói sozinho em cerca de um minuto. Não há etapa de build: o que está em
`docs/` é exatamente o que vai para o ar.

## Como publicar em outro lugar (passo a passo)

1. Crie um repositório no GitHub (pode ser público — **os PDFs e os textos dos slides não
   vão para o site**, só o material reescrito).
2. No seu computador, dentro desta pasta:
   ```bash
   git init
   git add .
   git commit -m "site de estudo TN II"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git
   git push -u origin main
   ```
3. No GitHub, vá em **Settings** → **Pages** (menu da esquerda).
4. Em **Build and deployment** → **Source**, escolha **Deploy from a branch**.
5. Em **Branch**, escolha **main** e, na caixa ao lado, a pasta **/docs**. Clique em **Save**.
6. Espere um ou dois minutos e recarregue a página. O endereço aparece no topo, no formato
   `https://SEU-USUARIO.github.io/SEU-REPO/`.
7. Abra esse endereço no celular e use **Compartilhar → Adicionar à Tela de Início** (iPhone)
   ou **menu → Adicionar à tela inicial** (Android). Fica com ícone próprio e abre em tela cheia.

**Por que `/docs` e não GitHub Actions:** como não há etapa de build, a pasta publicada já é a
pasta do código. Servir direto de `/docs` evita um workflow que não faria nada além de copiar
arquivos, e todo caminho no site é relativo, então funciona em qualquer subpasta.

Depois do primeiro acesso, um *service worker* guarda o site no aparelho e ele **abre offline**.
As correções de conteúdo aparecem assim que houver internet de novo (os JSON são buscados na
rede primeiro, e o cache só serve de reserva).

## Como editar o conteúdo

O conteúdo fica separado do código, em `docs/data/`. Para corrigir um número, edite o JSON e
recarregue — nada precisa ser recompilado.

| Arquivo | O que tem |
|---|---|
| `modulos.json` | Os 18 módulos (A1–A10, B1–B8), prioridade, duração e se já está disponível |
| `cronograma.json` | Os 5 dias, o foco de cada um e as missões |
| `licoes/A1.json` … | Uma lição por arquivo: blocos, caixas de cuidado, tabelas e a pergunta de cada bloco |
| `flashcards.json` | Frente, verso, prioridade e fonte |
| `questoes.json` | Enunciado, 5 alternativas, gabarito, justificativa, motivo do erro de cada alternativa |
| `ambiguidades.json` | Os pontos em que os slides se contradizem, com os dois lados |
| `badges.json` | As conquistas |
| `chefoes.json` | Os três simulados: quantas questões, quantos minutos e o corte de aprovação |
| `vf.json` | As afirmações de verdadeiro ou falso, com o porquê de cada uma |
| `numeros.json` | Pergunta, número certo, três distratores e explicação |
| `ligar.json` | As tabelas de ligar colunas, em pares esquerda/direita |
| `casos.json` | Os casos clínicos, passo a passo, com as opções de cada passo |

Prioridade é sempre `E` (essencial), `I` (importante) ou `C` (complementar) — viram os selos
coloridos. O campo `fonte` é `{"arquivo": "Aula_NEFRO", "pagina": 82}`, onde `arquivo` é o nome
de um `.txt` de `slides-texto/`. Nos textos aceita-se `**negrito**`, `*itálico*` e `` `código` ``,
**menos nas alternativas** — negrito ali entregaria o gabarito, e o validador reclama.

Depois de editar, rode a validação:

```bash
python3 scripts/validate_content.py
```

Ela confere IDs únicos, 5 alternativas com exatamente 1 correta, justificativa e fonte
preenchidas, se a página citada existe de fato em `slides-texto/` e se algum termo do item
aparece naquela página. Slides que são só imagem viram **aviso** ("confira no PDF"), não erro.

## Como o progresso é salvo (e como não perder)

Não há conta nem servidor: o progresso (XP, lições, flashcards, questões, caderno de erros,
explicações da Feynman) fica **no próprio aparelho**, no armazenamento local do navegador,
sob as chaves `tn2:estado` e `tn2:estado:copia`. Ele nunca sai do celular.

O que o site faz para não perder nada:

- **Grava a cada ação** — responder uma questão, virar um card, terminar um bloco.
- **Confere se gravou mesmo.** Em modo restrito, alguns navegadores aceitam a gravação e
  devolvem vazio na leitura seguinte; o site relê o que escreveu e detecta isso.
- **Mantém uma cópia de segurança** paralela. Se a chave principal corromper, o site recupera
  da cópia no carregamento seguinte, reescreve a principal na hora e avisa no topo da tela.
- **Avisa na hora se parar de salvar** (cota cheia, modo restrito), com um aviso em vermelho
  pedindo para exportar antes de continuar — em vez de ela descobrir no dia seguinte.
- **Lembra de fazer backup** uma vez por dia na tela Hoje, depois que já há progresso.

### O que apaga o progresso

| Situação | Resultado |
|---|---|
| Fechar a aba, desligar o celular, ficar sem internet | **nada acontece**, continua salvo |
| Abrir em **aba anônima / privada** | não salva nada (o site avisa no topo) |
| "Limpar histórico e dados do site" no navegador | apaga tudo, inclusive a cópia |
| Trocar de navegador (Safari → Chrome) ou de celular | o outro começa do zero — use exportar/importar |
| No iPhone, usar ora pelo Safari ora pelo ícone da tela de início | podem ser **dois armazenamentos diferentes**, dependendo da versão do iOS |
| Abrir o link **dentro** do WhatsApp/Instagram | o navegador embutido pode descartar tudo ao fechar — o site avisa e pede para abrir no navegador |

Por causa das duas últimas linhas: **escolha um jeito de abrir e fique nele.** Se for usar o
ícone na tela de início, use sempre o ícone.

Uma observação do Safari no iPhone: ele apaga dados de sites que ficam **7 dias sem serem
abertos**. Como o estudo é de quinta a segunda, isso não chega a acontecer — mas é mais um
motivo para exportar um arquivo no fim de cada dia.

### Exportar e importar

1. **Ajustes → Exportar progresso** baixa um `.json` com tudo.
2. Mande o arquivo para onde quiser (e-mail, nuvem, WhatsApp para si mesma).
3. No outro aparelho: **Ajustes → Importar progresso** e escolha o arquivo. Volta tudo —
   XP, nível, lições feitas, agenda dos flashcards e caderno de erros.

## Testar no navegador

```bash
pip install playwright && python3 -m playwright install chromium
python3 scripts/test_browser.py           # roda tudo
python3 scripts/test_browser.py --fotos   # roda e grava as telas em capturas/
```

O teste sobe um servidor local e percorre o fluxo real em **390×844** (celular) e **1280×800**
(desktop): abre a tela Hoje, completa uma lição inteira, responde questões marcando a confiança,
revisa flashcards, resolve um caso de KDIGO, recarrega a página e confere que o progresso
persistiu, exporta e importa o progresso, e repete o essencial com o **localStorage bloqueado**.
Falha se houver qualquer erro no console.

Um segundo bloco percorre o **chefão** até o gabarito, os **quatro mini-jogos** até o resultado
(ligando as colunas pelos pares certos), as **cinco calculadoras novas** e confere que o
**diagrama em SVG** aparece na lição com rótulo para leitor de tela e versão em texto.

Há ainda um bloco de **resiliência do progresso**, que corrompe a chave principal de propósito
e confere que o site recupera da cópia, que ele avisa quando o navegador para de aceitar
gravações, e que "zerar progresso" não é desfeito pela cópia na visita seguinte.

Para testar exatamente como o GitHub Pages serve (dentro de uma subpasta):

```bash
mkdir -p /tmp/sub/meu-repo && cp -R docs/* /tmp/sub/meu-repo/
TN2_PUBLICO=/tmp/sub TN2_SUBPASTA=/meu-repo python3 scripts/test_browser.py
```

E para rodar a suíte inteira contra o site **já publicado**, que é o teste que mais vale
(HTTPS de verdade, service worker de verdade, subpasta de verdade):

```bash
TN2_BASE=https://pdellamore.github.io/prova-tn2 python3 scripts/test_browser.py
```

## Mapa do código

```
docs/                     ← é esta pasta que o GitHub Pages publica
  index.html              casca única; as telas são trocadas por hash (#/hoje, #/licao/A3…)
  sw.js                   service worker: casca em cache, conteúdo pela rede primeiro
  css/tokens.css          cores, tipografia e as identidades de rim e fígado
  css/base.css            reset, tipografia base, foco visível, prefers-reduced-motion
  css/app.css             componentes (cartões, trilha, alternativas, medidores…)
  js/app.js               rota, cabeçalho e cronômetro de tempo estudado
  js/store.js             estado em localStorage, sempre em try/catch, exportar/importar
  js/srs.js               repetição espaçada comprimida até a manhã da prova
  js/xp.js                XP, níveis, sequência diária e conquistas
  js/clock.js             datas e contagem regressiva por diferença de relógio
  js/content.js           carrega os JSON de data/
  js/ui.js                peças de interface e o mini-markdown do conteúdo
  js/screens/*.js         uma tela por arquivo
  js/calc/*.js            um cálculo por arquivo: resolver, gerar caso e conferir
  js/diagramas/index.js   os diagramas em SVG, desenhados por código a partir de listas
  data/                   o conteúdo (ver acima)
scripts/validate_content.py  validação do conteúdo contra os slides
scripts/test_browser.py      teste de navegador com Playwright
scripts/build.py             gera os PDFs de entregas/ a partir de fontes/ (material anterior)
```

As pastas `slides/`, `slides-texto/`, `fontes/` e `entregas/` **não** são publicadas: ficam
fora de `docs/`.

## De onde vieram as peças emprestadas

Alguns padrões vieram do projeto `learning-platform` (Dez), reescritos em JavaScript puro:
o `safeStorage` com sonda e reserva em memória (`js/store.js`), a contagem regressiva por
diferença de relógio em vez de acúmulo de `setInterval` (`js/clock.js`), o registro de eventos
que nunca interrompe a sessão (`js/metrics.js`), a troca de ícone do tema decidida em CSS
(`css/app.css`), a arquitetura de tokens com `prefers-color-scheme` e `[data-tema]`, a
matemática do SVG da trilha e a disciplina de manter o conteúdo em JSON validado por script.

## Decisões que valem saber

- **Sem build e sem framework.** São quatro dias até a prova: editar um JSON e recarregar vale
  mais do que uma pipeline. Também evita o problema de caminho que o GitHub Pages cria ao
  servir o site em uma subpasta.
- **A fonte de título é a Fraunces**, hospedada aqui mesmo (`docs/assets/fonts/`), para o site
  abrir offline e sem depender do Google Fonts. O texto corrido usa a fonte do sistema.
- **Nada é bloqueado de verdade.** A trilha mostra os 18 módulos desde o começo; o que ficou
  para trás aparece com a borda tracejada, mas dá para pular.
- **Acertar no chute conta como erro.** O card volta na mesma sessão e a questão vai para o
  caderno de erros. O painel mostra separadamente os "acertos falsos" e os erros marcados
  como certeza.
- **A prontidão é uma conta simples** sobre o que foi feito no site (45% cobertura ponderada
  pela prioridade, 35% acerto recente, 20% caderno de erros vazio), explicada na própria tela.
  Não é previsão de nota.
