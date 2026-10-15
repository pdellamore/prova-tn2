# Prova TN II — material de estudo

Projeto de estudo para a prova **objetiva** de Terapia Nutricional II (UFCSPA), **segunda, 19/10/2026**.
Responder sempre em português.

## Regra principal
O conteúdo vem **exclusivamente dos slides** em `slides/` (texto extraído em `slides-texto/`, com marcadores `=== pN ===` por página). Não acrescentar informação de fora. Se algo estiver incompleto ou contraditório nos slides, **sinalizar** em vez de completar. O pedido original completo está em `prompt-original.txt`.

## Estrutura
- `entregas/` — PDFs finais: `Resumo_Prova_TN2.pdf` (resumo priorizado + tabelas + cuidado na prova + checklist + cronograma + ambiguidades), `Revisao_Ultrarrapida_TN2.pdf`, `Questoes_Gabarito_TN2.pdf` (20 questões, 1–8 rim, 9–20 fígado).
- `fontes/` — Markdown que gera cada PDF (`resumo.md`, `revisao.md`, `questoes.md`). **Editar aqui**, depois regenerar.
- `scripts/build.py` — converte Markdown → PDF (Chromium via Playwright).
- `slides/` — PDFs originais das 5 aulas. Muitos slides são só imagem (tabelas KDIGO, cetoácidos, critérios de desnutrição, MetALD, ascite etc.); para esses, olhar o PDF, pois o texto extraído fica vazio.
- `slides-texto/` — texto extraído dos slides.

## Convenções dos fontes
- Prioridade: `[E]` essencial, `[I]` importante, `[C]` complementar (viram selos coloridos).
- Caixas de alerta: `<div class="cuidado" markdown="1"> ... </div>`; notas: `class="nota"`.
- Em `questoes.md`, cada questão fica em `<div class="q" markdown="1">`; a linha antes de cada alternativa termina com dois espaços (quebra de linha). Gabarito comentado no final, após `<div class="quebra"></div>`.

## Regenerar os PDFs
```bash
pip install markdown playwright && python3 -m playwright install chromium
python3 scripts/build.py fontes/resumo.md   entregas/Resumo_Prova_TN2.pdf          "Resumo Priorizado — TN II"
python3 scripts/build.py fontes/revisao.md  entregas/Revisao_Ultrarrapida_TN2.pdf  "Revisão Ultrarrápida — TN II"
python3 scripts/build.py fontes/questoes.md entregas/Questoes_Gabarito_TN2.pdf     "Questões e Gabarito — TN II"
```
(O script também grava um `.html` ao lado de cada PDF. A **Inter** fica em `scripts/fonts/` e é embutida em base64 no HTML, então o PDF sai igual em qualquer máquina, sem depender da fonte instalada no sistema.)

## Pontos já conhecidos de conflito nos slides
Proteína na DRC (KDOQI 0,55–0,60 × KDIGO 2024 0,8 g/kg); proteína na DP (BRASPEN 1,0–1,2 × KDOQI 1,2–1,3); lipídios no conservador (25–50% × < 30% VET); Child C "> 10" (lido como ≥ 10); retriagem na cirrose (6 meses × 1×/ano); **sódio na DRC com três alvos** (< 1,5 g na p. 43, < 2 g na p. 89, 2.000 mg na p. 104); **ASG renal deixa 40 pontos exatos sem classe**; **os slides 73–81 (Dietoterapia) estão sob o divisor "Tratamento Conservador" (p. 72) mas descrevem a tríade da síndrome nefrótica** — o slide não diz a qual condição pertencem; **cetoanálogos com duas doses** (0,28–0,43 g/kg nas pp. 82–83 × 0,3–0,4 g/kg na p. 99); **cálcio na nefrolitíase** (a frase da p. 166 admite "evitar a restrição" ou "restringir"; a tabela da p. 167 favorece a primeira leitura). Lista completa na seção 7 de `fontes/resumo.md`.

Já corrigido e **não** é ambiguidade: no slide 33, a coluna "Principais" da etiologia da DRC tem **três** caixas — DM, HAS e **glomerulonefrites**.
