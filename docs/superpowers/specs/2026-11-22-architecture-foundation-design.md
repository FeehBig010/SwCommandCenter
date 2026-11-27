# Base de arquitetura e refatoração incremental — 22/11/2026

## Objetivo
Organizar o SW Command Center sem perder funcionalidades, dados, identidade visual nem comportamento já validado.

## Estado verificado
- React 19, Vite 6, Node >=22, JavaScript/JSX e testes nativos de Node.
- A pasta `src/core` reúne regras de jogo, importação SWEX, motor de runas e speed tuning; a interface React está distribuída entre `src/App.jsx`, `src/components`, `src/pages` e hooks.
- Existem testes de domínio, testes de navegador e workflow `.github/workflows/verify.yml`.
- `src/App.jsx` contém uma transformação pura de presets importados em listas para a interface (`deckLists`), hoje misturada ao estado e à renderização.

## Decisão técnica
Adotar refatoração progressiva por domínio, sem reescrita. Nesta primeira entrega, extrair somente a projeção pura das listas de presets, com testes cobrindo Arena Regular/Interserver/RTA, Siege, PvE e agrupamentos por origem. Documentar os limites dos módulos e a ordem recomendada dos demais trabalhos.

## Não objetivos da primeira entrega
Não alterar o otimizador ou o simulador de velocidade; não reestruturar os 142 componentes de uma vez; não migrar dados do Supabase; não instalar dependências, mudar telas ou publicar `main`.

## Regras de segurança
1. Trabalhar em branch isolada e publicar PR para revisão, sem merge automático desta reorganização.
2. Preservar contratos públicos, IDs e formatos dos snapshots SWEX, presets, slots, runas e artefatos.
3. Manter `npm test`, `npm run test:browser` e `npm run build` como barreiras de entrega.
4. Não assumir resultados dos testes até execução confirmada pela CI.
5. Não apagar arquivos, dados ou presets com base apenas em nomes ou tamanhos.

## Alternativas descartadas
- Reescrever o projeto do zero: risco alto de regressões, perda de nuances da mecânica do jogo e desperdício de testes existentes.
- Mover todos os arquivos em massa: cria mudanças difíceis de revisar e alto risco de quebrar imports.
- Refatoração por etapas (selecionada): escopo pequeno, testes e reversão simples.

## Critérios de aceitação do primeiro incremento
- `buildAccountDeckLists(presets)` retorna exatamente as mesmas propriedades e referências anteriormente produzidas por `App.jsx`.
- `App.jsx` usa o helper sem mudar props, agrupamentos ou persistência.
- Testes para mistura de modos, contextos de Arena, ordenação, origem e lista vazia.
- Documentação identifica pontos de extração seguintes sem declarar que estão corrigidos.
