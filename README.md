# CONTEXT.md — Clã D8stino - Euro · Siege & Guild Command Center

**Atualizações do Jogo:** notícias oficiais da Hive em `#/updates`, com coleta
automática, categorias, miniaturas e cache. [Integração e operação](docs/GAME_UPDATES.md).

## 1. Project Overview & Product Vision
**Clã D8stino - Euro · Siege & Guild Command Center** is a private, client-side web application built for the **Clã D8stino - Euro** Guild in *Summoners War*.
It empowers guild leaders and members to plan, optimize, and execute team builds across multiple game modes (Siege, World Guild Battle, Arena, and Cairos Dungeons) against an imported SWEX (Summoners War Exporter) JSON account file.

### Key Value Proposition
Unlike existing single-monster optimizers, this tool performs **joint multi-team optimization** (up to 10 teams simultaneously) without duplicating runes, supports **selective speed tuning per monster**, and provides a **Guild Hub** where leadership templates can be evaluated against any member's personal rune inventory with precise deficit reporting.

---

## 2. Tech Stack & Architecture
- **Frontend Framework:** React 19, React DOM, Lucide React icons, Vite 6.
- **Languages:** JavaScript (ES Modules, JSX, HTML5, CSS3).
- **Theme & Branding:** Navy/gold guild pirate identity, local Inter font, responsive layout.
- **Calculation Engine:** Multithreaded JavaScript heuristic search executing inside a dedicated **Web Worker** (`optimizer.worker.js`).
- **Data Persistence:** Local browser storage via **IndexedDB** (`storage.js`) and JSON plan import/export.
- **Backend:** Computation and SWEX parsing remain client-side. An optional persistent Node.js service serves local SWARFARM artwork and runs its weekly node-cron update; static hosting supports the artwork snapshot from the latest build.

---

## 3. Complete Feature Specifications (V2 Scope)

### Module A: Multi-Mode Team Builder & Individual Stat Panels
- **Game Mode Selector:**
  - **1 Slot (Solo):** Single-monster optimization for newly acquired or standalone units.
  - **3 Slots (Siege / WGB):** 3v3 team compositions.
  - **4 Slots (Arena Offense / Defense):** 4v4 team compositions with Arena leader skills.
  - **5 Slots (Cairos Dungeons):** 5-monster PVE speed teams focused on damage and debuff sequencing.
- **Individual Monster Control Panel:**
  - Monster instance selection from imported inventory.
  - Mandatory Rune Sets (e.g., Violent/Will, Despair/Revenge).
  - Main Stats constraints for Slots 2, 4, and 6 (e.g., SPD / HP% / HP%).
  - Granular minimum stat targets: HP, DEF, SPD, CR, CD, RES, ACC (Additional `+` or Total values).

### Module B: Selective Auto Speed Sync & Combat Turn Order
- **Selective Speed Sync Checkbox ("Lock Speed Sync"):**
  - Individual toggle per monster position.
  - When checked, the optimizer tightly calculates speed bounds to ensure seamless turn-order encadement (e.g., Stripper 1st -> Defense Breaker 2nd).
  - When unchecked, the monster retains a flexible speed range (e.g., a slow nuker like Trevor).
- **Real Combat Turn Order Engine:**
  - Integrates **Guild Tower SPD Bonus (%)** and **Leader Skill SPD Bonus (%)** into combat speed calculations to prevent enemy interruption (*interruption/cutting*).

### Module C: Advanced Optimization Engines
- **Joint Multi-Team Rune Allocation:**
  - Optimizes up to 10 three-monster teams simultaneously against a single account's rune pool without overlapping equipped runes.
- **Grind & Gem Simulator:**
  - Toggle switch ("Consider Max Grinds/Gems") to simulate build feasibility assuming maximum upgrade stones before spending resources.
- **Artifact Real Damage Calculation:**
  - Parses artifact subproperties (e.g., *Added Damage based on SPD/HP/ATK/DEF*, *S3 CD%*) and skill multipliers to estimate actual in-game damage output.

### Module D: Guild Hub & Auto-Matching Templates
- **Leadership Template Management:**
  - Guild leaders post recommended defense/attack compositions with required builds, sets, and minimum target metrics.
- **Public Guild Feed:**
  - Members browse recommended teams for current Siege / WGB targets.
- **"Test on My JSON" (Auto-Matching):**
  - Members click a single button to execute the optimizer against their personal SWEX JSON.
  - The system highlights the best matching rune builds and displays exact stat deficits (e.g., *"Deficit: -14 SPD, -1,500 HP to reach Leadership standard"*).

### Module E: Account Analytics & Snapshots
- **Account Snapshots:**
  - Saves historical account snapshots in IndexedDB to track efficiency gains over time.
- **Unequipped High-Efficiency Rune Panel:**
  - Identifies top-tier unequipped runes sitting idle in the user's inventory.

---

## 4. System File Structure & Core Responsibilities
```text
.
├── README.md                   # Overview, installation and build scripts
├── CONTEXT.md                  # Comprehensive V2 product spec and roadmap
├── package.json / package-lock.json
├── index.html                  # Main entry point and guild metadata
├── vite.config.js              # Vite dev and build setup
├── public/                     # Guild crest, Inter font, license files
├── src/
│   ├── main.jsx                # React app mount point
│   ├── App.jsx                 # Main layout, tabs, state management & worker lifecycle
│   ├── styles.css              # Custom CSS rules for guild theme and responsive design
│   ├── components/
│   │   ├── TeamEditor.jsx      # Multi-mode team builder, monster selector & stat panels
│   │   ├── GuildHub.jsx        # Guild feed, leadership templates & "Test on My JSON"
│   │   ├── Results.jsx         # Optimization outputs, stat deficits & rune slot specs
│   │   ├── Analytics.jsx       # Snapshots, grind simulator & unequipped rune finder
│   │   └── Inventory.jsx       # Searchable monster and rune inventory tables
│   └── core/
│       ├── data.js             # SWEX JSON parser, normalization & presets
│       ├── catalog.json        # SWEX Monster ID to name mapping
│       ├── optimizer.js        # Core heuristic search algorithms, turn order & damage logic
│       ├── optimizer.worker.js # Web Worker execution boundary
│       └── storage.js          # IndexedDB persistence & JSON import/export helpers
└── tests/
    └── optimizer.test.mjs      # Unit tests for parser, calculations & allocation

5. Prioritized Execution Roadmap
Phase 1: Foundation & UX (Multi-Mode & Panels)
[x] Implement mode switcher (1, 3, 4, 5 slots) in TeamEditor.jsx.

[x] Add individual stat target UI panels per monster slot.

[x] Add "Lock Speed Sync" checkbox per monster card.

Phase 2: Engine Upgrades (Speed Sync & Calculations)
[x] Update src/core/optimizer.js to process selective combat speed sync and first-rotation enemy cutting checks.

[x] Add Guild Tower and Leader Skill SPD calculation formula to combat engine.

[x] Add "Consider Max Grinds/Gems" toggle into search heuristics (regular six-star legendary stones, at most one enchanted substat per rune).

Phase 3: Guild Hub & Template Matching
[x] Create GuildHub.jsx component with local template creation/editing for leaders.

[x] Build "Test on My JSON" auto-matcher with joint allocation and explicit deficit reporting.

[x] Implement local/JSON template import and export for guild sharing (manual file sharing; no authenticated server feed).

Phase 4: Analytics & Artifacts
[ ] Implement artifact subproperty damage calculation.

[ ] Build IndexedDB snapshot history and idle high-efficiency rune detector.


## Visual team cards

Use **Exportar card (PNG)** on a completed team or Guild Hub composition to download `[TeamName]-SW-CommandCenter.png`. The image includes monster thumbnails, rune sets, slot 2/4/6 mains, minimum targets and speed-sync badges in a padded, high-resolution layout. Missing external thumbnails fall back to initials; the rest of the card still exports. Only included visible monsters appear, and no account IDs or rune inventory are shared in the PNG.


## Piratas e Marés Sombrias

The interface uses an ocean/oak/brass theme with locally hosted Google Fonts Cinzel and Oswald (licenses included). Each monster target supports typing or dragging the paired helm slider; both update the same optimizer goal. Slider limits are suggestions and expand to preserve larger typed/imported targets. Rune details use an interactive six-slot ship helm, and considered artifacts appear in treasure-chest slots. Motion respects reduced-motion preferences.

## Imagens locais e serviço de atualização

Os retratos agora priorizam o clone público do SWARFARM. `npm run dev` e `npm run build` preparam esse clone automaticamente. Instale Node.js 22+ e Git antes de executar.

```sh
npm run assets:setup   # clona e prepara o índice local
npm run assets:update  # git pull imediato e atualização do índice
npm run build
npm start              # site + cron: terça às 23:59, America/Sao_Paulo
```

O cron exige um processo Node permanentemente ativo e armazenamento persistente; um host puramente estático entrega apenas as imagens do último build. [Configuração, fonte, logs e operação](docs/ASSETS.md).

## Calculadora Livre · presets do SWEX

A calculadora inicia com os slots vazios em toda nova abertura, inclusive após
importar uma conta. Rascunhos antigos não são apagados do armazenamento nem
carregados automaticamente. Durante a mesma abertura, trocar de área mantém a
montagem temporária de cada área.

Use **Presets do JSON** para pesquisar por nome do time ou monstro e carregar
um preset pelas miniaturas da composição. A área ativa é filtrada automaticamente;
**Área dos presets → Todas as áreas** mantém o acesso às outras categorias.
A lista renderiza somente uma janela de resultados, com retratos carregados
conforme aparecem. No Otimizador, o mesmo seletor fica no cabeçalho e lista
ataques e defesas apenas da área/contexto ativo, sem substituir ajustes existentes. Siege, Arena Regular/Interserver, RTA, Cairos,
Dimensional, Rift/R5 e ToA mantêm seus slots nativos, inclusive posições vazias.
A verificação usa uma cópia da ficha, do líder e dos equipamentos da conta; o
preset original e os outros módulos permanecem intactos.

**Simular sincronia** aplica as metas automáticas apenas à cópia da calculadora.
**Voltar aos valores do JSON** recarrega o preset original. A conferência inicial
preserva as velocidades reais, em vez de ajustar os seguidores automaticamente.
As torres do JSON são usadas nessa conferência; a montagem manual e a simulação
continuam usando as regras existentes de torres máximas.

A seleção de RTA respeita a atribuição de runas de World Arena. Quando o JSON
contém menos de seis runas para um monstro, a interface identifica o equipamento
incompleto. Para manter uma montagem temporária antes de sair da calculadora,
exporte a imagem ou utilize **Construir Time** nos modos compatíveis.

Validação específica: `node --test tests/quick-presets.test.mjs`. O comando
`npm run test:browser` inclui abertura vazia, seleção de todas as áreas,
verificação/simulação, integridade do JSON e layout mobile.

### Balança de builds · busca conjunta

Na Calculadora Livre, os cards mostram a ficha **Base + Bônus**, os seis slots de
runas reais, os artefatos equipados e os conjuntos. Ao selecionar um monstro da
conta, a cópia exata do inventário é carregada. As montagens continuam temporárias;
a página inicial e os presets salvos não são alterados.

- **Prioridades e mínimos**: marque atributos e ajuste os pesos de 1 a 5. TC não
  é exigida quando não selecionada. Um mínimo pode ser obrigatório ou apenas uma
  preferência. Escolha também conjuntos e atributos principais dos slots 2/4/6
  como obrigatórios ou preferidos.
- **Escolher runas**: fixe uma peça por ID em qualquer um dos seis slots. A trava
  indica uma exigência para a próxima busca; a ficha só muda ao visualizar uma
  alternativa. Liberar a peça remove a exigência. Filtros e paginação mantêm
  todas as peças disponíveis acessíveis, respeitando bloqueios e reservas.
- **Ordem de ação**: use as setas para ordenar os monstros sem mover a liderança.
  Cada ligação aceita **Exigir sincronia** ou **Mais próximo possível**. É possível
  exigir apenas o primeiro par e aproximar o restante, ou aproximar todo o time.
- **Buscar builds no JSON**: utiliza o Worker existente para gerar candidatos e
  alocar peças para o time inteiro, sem reutilizar runas. Considera as reservas,
  times prioritários e bloqueios locais configurados. A pool de atribuições RTA
  permanece separada do equipamento principal.
- **Atual / Alternativas A–C**: visualize até três resultados distintos nos mesmos
  cards. Indicadores nos atributos mostram metas não atendidas. Se as exigências
  não forem alcançadas, o resultado é uma **Aproximação**, sem habilitar Aplicar.
  Uma nova busca pode também não encontrar melhora: a build atual permanece.
- **Aplicar alternativa**: revalida todas as peças, metas e ticks no Worker. Aplica
  somente à montagem temporária da calculadora; não equipa nada no jogo nem
  altera o JSON. Mudanças de regra/inventário invalidam os resultados anteriores.
  **Restaurar preset original** permite recuperar a composição importada.

A avaliação usa a primeira rotação real do motor de ticks e as habilidades
**garantidas conhecidas**. O buff SPD da Adriana e de sua equivalente Water Pure
Vanilla Cookie é aplicado após sua ação, sem inventar boost ATB. Eventos manuais
podem especificar outras ações, alvos ou condições. Sem defesa informada, existe
uma referência explícita de inimigo com a SPD do abridor menos 1. Sincronia
nesse cenário **não garante ausência de corte contra qualquer defesa**. O líder
é preservado independentemente da ordem de ação.

A busca é heurística e limitada por candidatos/combinações, não uma garantia de
máximo global. O progresso corresponde ao trabalho executado, sem atrasos
artificiais, e a busca pode ser cancelada. Artefatos permanecem equipados; não há
reatribuição de artefatos nem projeção de grinds/gemas. **Ajustes manuais**, a
simulação anterior, o Card Técnico e as exportações continuam disponíveis.

Validação: `node --test tests/team-balance.test.mjs` e
`node tests/browser/team-balance.mjs` (com Vite de testes em `E2E_BASE_URL`).
`npm run test:browser` executa também as regressões de densidade, presets e demais
áreas. Os cenários usam exclusivamente contas fictícias e armazenamento isolado.

### Central de Siege: confrontos pessoais

A entrada **Ataques e Counters** começa pela defesa inimiga. Cadastre três monstros e seu líder, depois use **Vincular meu time** para escolher um preset de ataque ou montar a composição manualmente. Estratégia e ordem de foco são opcionais; salvar não registra uma vitória. Defesas inimigas ficam no armazenamento local `siegeTargets`, separado das próprias defesas e dos modelos da guilda. Confrontos existentes são indexados sem alterar seus registros.

**Meu acervo de ataques** abre os editores existentes. **Minhas Defesas** reúne as próprias defesas e o planejador simultâneo. O **Espaço da Guilda** mantém seus controles e permissões. O vínculo com um preset guarda uma cópia independente e uma referência local; não altera a build original nem compartilha automaticamente. A timeline pessoal aparece sob demanda em **Ver foco e ticks deste ataque**.

A busca **Localizar defesa** reúne automaticamente o acervo pessoal e os modelos/counters já disponíveis na guilda atual, identificando a origem. Composições equivalentes são agrupadas preservando o líder. Registros da guilda continuam somente leitura nesse fluxo; **Ver detalhes** abre o contexto original com suas permissões. O ataque aparece compacto; **Ver atributos e conjuntos** e a timeline são abertos sob demanda.

Em confrontos pessoais, **Editar defesa** corrige monstros e líder e mantém as offenses vinculadas. Reordenar os mesmos alvos preserva a ordem de foco por identidade/ocorrência. Ao mudar a identidade da defesa, os vínculos recebem novos identificadores e os resultados antigos não são reaproveitados para a composição nova. Registros compartilhados não são modificados. **Adicionar/Editar comentário** permite salvar ou cancelar a estratégia diretamente no card, sem alterar builds ou resultados.

A lista de counters mostra somente o trio de avatares por ataque. Clique no trio (ou use Enter/Espaço pelo teclado) para abrir comentários, ficha e ações. Cada counter fica fechado inicialmente; recolhê-lo também fecha sua timeline. As edições em andamento são preservadas enquanto o painel é recolhido.

Nos counters de Siege, **Usar um preset definido** preenche a offense a partir dos seus times. **Cadastrar ataque que ganha deles** permite selecionar qualquer monstro do catálogo, mesmo sem tê-lo no JSON. Esse cadastro não exige equipamento nem confirma uma vitória. O SWEX permanece intacto.

A defesa exibe uma coroa no monstro líder. A família Magic Order Swordsinger recebeu nomes, atributos e líderes dos IDs exatos 29701–29705 / 29711–29715 a partir do espelho público da API SWARFARM (`Millet0217/summonerswar-tool/swarfarm/monsters_raw.json`; proveniência em `monster-metadata.json`). Defesas manuais antigas que usavam um nome desperto no ID não desperto são corrigidas ao carregar; IDs de unidades SWEX não são convertidos. Fiona desperta (29715) tem líder de 28% SPD para Guilda; 29705 é a forma não desperta e não possui essa habilidade.

A lista de counters se adapta à quantidade: até três ataques aparecem diretamente, com avatares maiores. A partir de quatro, a navegação mostra três por página e indica a faixa e o total. Trocar de página recolhe a timeline ativa, preservando comentários ainda em edição nos counters.

### Seleção visual de monstros

Os campos compartilhados de busca têm um botão de grade **Explorar monstros por ícones**. O catálogo abre com todos os monstros disponíveis no campo e permite combinar múltiplas estrelas naturais e elementos, pesquisar por nome/família e alternar entre grade e lista. Selecionar um retrato preenche somente o campo que abriu o painel, inclusive no cadastro de ataques sem os monstros na conta. Escape fecha o catálogo e devolve o foco. O pop-up ocupa quase toda a tela e usa rolagem contínua, sem paginação. Somente as linhas próximas à área visível são renderizadas, com retratos carregados sob demanda; todos os resultados permanecem acessíveis.

As estrelas naturais vêm de uma referência pública da API SWARFARM, com fonte e hash em `src/core/monster-natural-stars.json`. Elas não usam a graduação atual de seis estrelas da unidade nem aumentam com o despertar secundário. IDs sem classificação conhecida continuam pesquisáveis por nome, sem receber uma raridade presumida.

Na grade visual, os retratos têm 56px e os nomes aparecem ao passar o mouse; a visualização em lista mantém nomes e informações visíveis. Busca e filtros permanecem disponíveis enquanto somente a área de resultados rola. Home/End e as setas permitem percorrer todo o catálogo pelo teclado.
