Quero que você construa, neste projeto, um **site de estudo gamificado** para a prova objetiva de Terapia Nutricional II, que acontece na **segunda, 19/10/2026**. Quem vai estudar é a minha namorada, estudante de Nutrição. Ela vai usar principalmente pelo **celular**, de **quinta (15/10) a domingo (18/10)**, e faz uma revisão rápida na manhã da prova. O site precisa funcionar no **GitHub Pages**.

Antes de tudo, leia `CLAUDE.md`, `prompt-original.txt`, os três arquivos de `fontes/` e os textos de `slides-texto/`. Os PDFs de `entregas/` são o mesmo conteúdo já diagramado.

## 1. Regra inegociável: fonte do conteúdo

- Todo conteúdo de estudo (lições, flashcards, questões, desafios, mnemônicos) sai **exclusivamente** de `fontes/` e `slides-texto/`. Quando o texto extraído de um slide estiver vazio (slide em imagem), consulte o PDF em `slides/`.
- Nada de informação de fora (internet, livros, seu conhecimento prévio). Se algo estiver ambíguo ou contraditório, use o que já está mapeado na seção 7 de `fontes/resumo.md` e mostre isso no site como "⚠ Ponto de atenção nos slides". Não escolha um lado sem avisar.
- Todo item de conteúdo precisa ter um campo `fonte` com o arquivo e a página do slide (ex.: `Aula_NEFRO p. 82`), para eu poder auditar.
- Mnemônicos e analogias são permitidos como **apoio de memória**, mas devem ser marcados como tal e nunca introduzir fatos novos.

## 2. Stack e publicação

- Site **estático, sem backend e sem login**: HTML + CSS + JavaScript (ES modules). Pode usar Vite se achar melhor, mas a pasta final publicada tem que ser estática (ex.: `docs/` ou deploy via GitHub Actions). Explique no README qual dos dois escolheu e por quê.
- Conteúdo separado do código, em arquivos JSON dentro de `site/data/` (módulos, lições, flashcards, questões, desafios, cronograma). Assim eu ou você podemos corrigir conteúdo sem mexer na lógica.
- Progresso salvo em `localStorage`, com toda leitura e escrita dentro de `try/catch`. O site precisa funcionar mesmo se o armazenamento falhar. Inclua os botões **Exportar progresso** e **Importar progresso** (arquivo JSON), para ela trocar de aparelho se precisar.
- **Não publique os PDFs dos slides nem os textos extraídos no site.** O repositório pode ficar público, então o site só deve conter o material reescrito (resumos, questões, flashcards).
- Mobile-first, modo claro e escuro, acessível (contraste, foco visível, navegação por teclado, `prefers-reduced-motion`), tudo em português.
- Deve funcionar offline depois do primeiro acesso, se for simples de fazer (service worker opcional; se complicar, pule e avise).

## 3. Frameworks de aprendizagem que o sistema deve aplicar

Implemente de fato, não só cite:

1. **Recuperação ativa (testing effect):** cada lição termina com perguntas antes de mostrar o resumo do bloco seguinte. Use "pré-teste" curto no começo de cada módulo.
2. **Repetição espaçada comprimida em 5 dias:** algoritmo tipo Leitner/SM-2 simplificado e adaptado ao prazo (intervalos em horas e dias até segunda). Os cards errados voltam na mesma sessão e no dia seguinte. Mostre no painel quantos cards vencem hoje.
3. **Intercalação:** depois do primeiro contato com cada bloco, as sessões de revisão misturam rim e fígado.
4. **Elaboração / "por quê?":** depois de cada resposta, mostre a justificativa e, em alguns itens, peça para ela escolher **por que** a alternativa está certa (causa → consequência).
5. **Marcação de confiança:** antes de ver a resposta, ela marca "certeza / dúvida / chute". Item acertado no chute volta como se fosse erro. Mostre no painel os erros cometidos com certeza ("acertos falsos").
6. **Caderno de erros automático:** toda questão errada vai para uma tela "Meus erros", agrupada por tema, com botão "refazer só os erros".
7. **Exemplos resolvidos + prática guiada** para os cálculos que aparecem nos slides: Child-Pugh, peso ajustado (MASLD), peso seco por desconto de ascite/edema, Cockcroft-Gault, escore MST, prescrição de líquidos em HD, classificação KDIGO (G + A), classificação MASLD × MetALD × ALD. Primeiro um exemplo resolvido passo a passo, depois casos com números aleatórios gerados dentro das faixas dos slides.
8. **Codificação dupla:** diagramas simples em SVG (feitos por você, inline) para os mecanismos centrais: progressão esteatose → hepatite → fibrose → cirrose; hipertensão portal e suas consequências; fisiopatologia da síndrome nefrótica; caminho da amônia/BCAA na encefalopatia.
9. **Chunking com tabelas comparativas:** jogo de "ligar colunas" com as tabelas da seção 3 do resumo (proteína por situação, energia, sódio/líquidos, conceitos confundíveis).
10. **Técnica Feynman:** no fim de cada módulo, um campo de texto livre "explique com suas palavras", com uma checklist de pontos-chave que ela marca sozinha (autoavaliação, sem IA).

## 4. Gamificação

- **XP e níveis** com nomes temáticos (ex.: Estagiária → R1 → R2 → Nutri Clínica → Preceptora).
- **Sequência diária (streak)** e **missões do dia** ligadas ao cronograma.
- **Mapa/trilha** visual: uma trilha do Rim e outra do Fígado, com módulos que desbloqueiam conforme o progresso. Nunca bloqueie por completo: ela pode pular, mas o mapa mostra o que ficou para trás.
- **Chefões (boss battles):** um simulado cronometrado no fim de cada bloco (Rim, Fígado) e um **Chefão Final** no domingo, com 40 questões misturadas e tempo de prova.
- **Mini-jogos:**
  - **"Pegadinha ou não?":** afirmações tiradas da seção "Cuidado na prova", em que ela decide verdadeiro/falso contra o relógio.
  - **"Qual é o número?":** corrida de valores (cortes, g/kg, mEq, mg) com alternativas próximas.
  - **"Ligar colunas":** as tabelas comparativas.
  - **"Monte o caso":** casos clínicos curtos (só com dados dos slides) em que ela escolhe a conduta passo a passo.
- **Conquistas (badges)** por marcos reais de aprendizagem (ex.: "zerou o caderno de erros do Rim", "acertou 10 Child-Pugh seguidos"), não só por cliques.
- Feedback visual agradável (animações curtas, som opcional desligado por padrão), mas sem atrapalhar o foco.
- Um **timer Pomodoro** integrado às sessões (25/5, configurável).

## 5. Cronograma dentro do sistema

A tela inicial ("Hoje") mostra automaticamente o dia, com base na data do aparelho, e as missões daquele dia. Também deve ser possível escolher o dia manualmente.

| Dia | Foco | Missões mínimas |
|---|---|---|
| **Qui 15/10** | Rim I: fisiologia (rápida), síndrome nefrótica, DRC (critérios, KDIGO), avaliação nutricional, tratamento conservador (proteína, cetoácidos, minerais) | lições A1–A5, cálculos KDIGO/Cockcroft-Gault/MST, flashcards do dia, pré-teste do Rim |
| **Sex 16/10** | Rim II: hemodiálise, diálise peritoneal, transplante renal, litíase, IRA → **Chefão do Rim**. Início do Fígado: estrutura, exames, hepatites, cirrose | lições A6–A10 e B1–B4, Chefão do Rim, revisão espaçada do dia anterior |
| **Sáb 17/10** | Fígado II: MASLD, avaliação nutricional na cirrose, TN na cirrose (ascite, encefalopatia), transplante hepático → **Chefão do Fígado** | lições B5–B8, cálculos Child-Pugh/peso seco/peso ajustado, Chefão do Fígado, caderno de erros |
| **Dom 18/10** | Revisão intercalada, "Cuidado na prova", caderno de erros → **Chefão Final** (40 questões) | Pegadinha ou não?, Qual é o número?, refazer erros, Chefão Final, revisão ultrarrápida à noite |
| **Seg 19/10 (manhã)** | Só revisão relâmpago (15–20 min) | modo "Revisão relâmpago" com os itens essenciais e os mais errados por ela |

Use as prioridades de `fontes/resumo.md` (`[E]` essencial, `[I]` importante, `[C]` complementar). Se ela estiver atrasada, o sistema propõe cortar primeiro os itens complementares e mostra isso claramente.

## 6. Banco de conteúdo (mínimos)

- **Lições curtas** por módulo (A1–A10, B1–B8), em blocos de 3–5 minutos, com destaques de "⚠ Cuidado na prova".
- **≥ 200 flashcards** (frente/verso) cobrindo todos os números, cortes, critérios e definições do resumo.
- **≥ 150 questões objetivas** de 5 alternativas (A–E), nível universitário, com alternativas plausíveis. Cada uma precisa ter: gabarito, justificativa curta, motivo do erro das principais alternativas erradas, fonte (slide), tema, dificuldade e prioridade. Inclua as 20 questões já existentes em `fontes/questoes.md`.
- **≥ 60 afirmações** de verdadeiro/falso para o "Pegadinha ou não?".
- **≥ 12 casos clínicos** curtos para o "Monte o caso".
- Evite questões que dependam de um ponto contraditório dos slides, a não ser que o enunciado diga a diretriz (ex.: "segundo o KDOQI 2020").

## 7. Painel de progresso

Mostre: XP e nível, streak, % por módulo, acerto por tema (rim × fígado e por subtema), cards que vencem hoje, temas mais fracos com botão "treinar isso agora", acertos falsos (errou com certeza), tempo estudado por dia e uma estimativa simples de "prontidão para a prova", explicando como ela é calculada.

## 8. Qualidade e verificação (obrigatório antes de dizer que terminou)

1. **Script de validação do conteúdo** (`npm run validate` ou `python3 scripts/validate_content.py`) que confere em todos os JSON: IDs únicos; toda questão com 5 alternativas e exatamente 1 correta; justificativa e `fonte` preenchidas; toda `fonte` apontando para arquivo e página que existem em `slides-texto/`; nenhum campo vazio.
2. **Auditoria de fidelidade:** use um subagente independente para conferir uma amostra grande (no mínimo 30% das questões e flashcards e 100% dos números das tabelas) contra os slides. Corrija o que ele apontar e me mostre o relatório.
3. **Teste no navegador** com Playwright (o projeto já usou Playwright): abrir em viewport de celular (390×844) e de desktop, completar uma lição, responder questões, rodar um mini-jogo, recarregar a página e confirmar que o progresso persistiu, além de exportar e importar o progresso. Sem erros no console.
4. Teste com `localStorage` bloqueado: o site precisa continuar utilizável.
5. Tire screenshots das telas principais e me mostre.

## 9. Ordem de trabalho

Ela começa a estudar **amanhã**, então priorize assim:

1. Primeiro mostre um **plano curto** (arquitetura, estrutura de pastas, esquema dos JSON, direção visual) e espere meu ok.
2. **MVP utilizável hoje à noite:** tela Hoje com o cronograma, lições e questões de **quinta (Rim I)**, flashcards com repetição espaçada, XP e progresso salvo. Publicável no GitHub Pages.
3. Depois, por ordem: conteúdo de sexta → sábado → domingo, chefões, mini-jogos, painel completo, diagramas e polimento.
4. A cada etapa, rode a validação e o teste no navegador antes de seguir.

## 10. Design

Quero algo **bonito e motivador**, que dê vontade de abrir, mas limpo e legível para estudar por horas: tipografia boa, hierarquia clara, cores com significado (rim e fígado com identidades próprias; vermelho/amarelo/cinza para essencial/importante/complementar), microinterações sutis. Nada de visual genérico de template. Proponha uma direção visual no plano antes de implementar.

## 11. Entregáveis

- Código do site + JSON de conteúdo + scripts de validação e teste.
- `README.md` com: como rodar localmente, como publicar no GitHub Pages (passo a passo para quem nunca fez), como editar o conteúdo e como exportar/importar o progresso.
- No fim, um resumo do que foi feito, os números finais do banco de conteúdo e o link/instruções de deploy.
