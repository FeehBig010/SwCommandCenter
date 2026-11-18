# Premium Tactical V1 — revisão de implementação

Branch de entrega: `feature/swcc-premium-tactical-v1-review`. A branch remota de nome original contém trabalho divergente (`937e1df`); foi preservada sem force-push ou merge de código alheio. Base main `4c8e14c`, integração da Calculadora V2 `a65b980`. Nenhum merge na main/deploy foi executado. Vercel tem deploy automático desativado para as branches de implementação. Sem dependências novas ou migração de dados.

## Implementado

- Cinco destinos principais, ferramentas secundárias preservadas, Back/Forward real e preferência de recolhimento persistida. Drawer mobile não muda a preferência desktop. Administração continua condicionada às permissões existentes.
- Home com snapshot real da conta, contagens, data de importação, atalhos, continuidade e Ciri junto à importação. Login, nuvem, cupons e callbacks preservados.
- Siege com preparação direta e detalhes secundários expansíveis. Diário explícito de vitória/derrota/nota, separado dos relatos antigos. Resultados são por composição; versões anteriores continuam acessíveis.
- Calculadora V2 recuperada: SPD por slider ou tick, visual clássico alternável, habilidades conhecidas, ficha/combate distintos e diagnóstico limitado ao cenário simulado. Handoff com otimizador e retorno explícito de metas mantidos sem equipar runas.
- Tokens de superfícies, contraste, espaçamento e foco compartilhados. Office/War e demais funcionalidades mantidos.

## Arquivos

Shell: `src/App.jsx`, `src/main.jsx`, `src/components/Sidebar.jsx`, `PremiumTactical.css`, `src/core/app-navigation.js`, `src/hooks/useAppNavigation.js`.
Home: `EntryPortal.jsx/.css`, `src/core/home-summary.js`, `docs/PORTAL.md`.
Siege: `SiegeGuildRows.jsx`, `SiegeTactical.css`, `SiegeBattleJournal.jsx`, `src/core/siege-battle-journal.js`.
Calculadora: `QuickCalculator.jsx`, `src/core/calculator-scenario-status.js`; componentes V2 e handoff integrados da branch anterior. Spec/plano em `docs/superpowers/`.
Testes: helpers core correspondentes, quatro novos scripts `premium-*` e adaptação dos testes visuais antigos/runner para a navegação em cinco destinos.

## Revisão independente e correções

Revisão READ ONLY por subagente separado identificou: risco de sobrescrever formato futuro de diário, linhas inválidas causando erro, mobile alterando preferência desktop, rascunho de partida retido após troca de composição e leitura antecipada do diário por counter. Todos corrigidos com regressões RED→GREEN. Eventos inválidos continuam armazenados, mas não entram nas estatísticas; append é atômico e rejeita formatos desconhecidos. IDs malformados não bloqueiam eventos válidos. Diário carrega sob demanda e preserva partidas das composições anteriores.

## Validação

- `npm test`: 606/606 antes do último caso de preservação de composições; execução final do mesmo glob em série `node --test --test-concurrency=1 tests/*.test.mjs`: **607/607**, zero falhas/skips.
- Build Vite de produção: passou, 67s. Aviso preexistente de chunks >500 kB permanece.
- Playwright: navegação/Back/Forward/collapse/mobile, Home/importação/login/cupons, Siege/registro explícito/reload/contas/presets, formato desconhecido no IndexedDB, calculadora V2 e retorno de metas ao otimizador. Fixtures fictícias, navegador/contexto isolado, nenhum dado real apagado.
- Navegador 1440, 1920, 390 e casos 320px; Office/War, teclado/foco e reduced motion verificados. Capturas reais anexas.
- Busca de trade-offs: benchmark 1518 runas sintéticas em Web Worker, 333 distribuições, motor 2260ms, parede 2772ms, maior intervalo de UI 123ms. Houve falha inicial de limite de latência durante build/suíte simultâneos (1079ms); repetição isolada passou sem relaxar limite. Esperas de expansão agora usam aria-expanded real em vez de disputar requestAnimationFrame.

## Limites

- Diário novo é **local por conta/navegador**, sem sincronização com guilda/nuvem e sem inclusão automática no backup remoto existente. Histórico original de Guild Intelligence permanece disponível; não foi convertido.
- RTA e habilidades não modeladas continuam experimentais/limitadas. Diagnóstico não garante segurança contra adversários desconhecidos.
- Nenhuma matemática do motor/RI/optimizer foi redesenhada nesta etapa. A próxima etapa trata os requisitos funcionais adicionais da calculadora enviados depois.
- Sem execução de equipamentos dentro do jogo. Alterações de build são planos locais e metas explícitas.

## Capturas

- [Home 1440](assets/premium-tactical-v1/portal-1440.png)
- [Calculadora 1920](assets/premium-tactical-v1/calculadora-1920.png)
- [Siege 1440](assets/premium-tactical-v1/siege-1440.png)
- [Siege mobile 390](assets/premium-tactical-v1/siege-mobile-390.png)

### Fechamento das regressões de navegador

Todos os 27 scripts do runner passaram: dez no início da execução principal, trade-offs na repetição isolada, Siege→Home na retomada, optimizer-compact após correção de wrapping da toolbar em tablets, e os oito últimos scripts na execução final. Não se afirma uma única invocação verde: as retomadas estão registradas, sem remover cenários nem relaxar limites. Falha real de overflow a800px corrigida em CSS scoped; o teste original passou e o smoke de inventário1440/800/390/320 também passou.

Mais capturas: [Optimizer1440](assets/premium-tactical-v1/optimizer-1440.png), [Rune Intelligence1440](assets/premium-tactical-v1/rune-intelligence-1440.png).
