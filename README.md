# Clã D8stino - Euro · Siege

## Project Overview

A private Summoners War planning tool for **Clã D8stino - Euro**, starting with Siege. Import a SWEX account JSON, specify builds and stat targets, and optimize **multiple teams together** against one account's inventory. Competing teams must receive compatible builds without duplicated runes. The user manually equips the results in the game.

Version **0.1.0** is a browser-only application with a Portuguese interface, local persistence, and a navy/gold pirate identity. Guild accounts, automatic cross-device synchronization, and dedicated Arena/RTA/PvE modules are not implemented. Read [CONTEXT.md](CONTEXT.md) before resuming development.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Languages | JavaScript ES modules, JSX, CSS, HTML, JSON |
| UI | React 19, React DOM, Lucide React icons, locally hosted Inter font |
| Tooling | Vite 6, React Vite plugin, npm and `package-lock.json` |
| Optimization | Custom JavaScript heuristic search in a dedicated Web Worker |
| Storage | Browser IndexedDB; JSON plan/result downloads |
| Tests | Node's built-in `node:test` and `node:assert/strict` |
| Browser checks | Playwright dependency; session QA scripts are currently outside the repository |
| Hosting preparation | Static `dist/` output and an existing OpenAI Sites manifest |

There is no application backend, server database, AI API dependency, or in-app authentication. Private hosted access must be enforced by the hosting platform. Deployment has not been verified.

## Folder Structure

```text
.
├── README.md                     # Overview, setup and structure
├── CONTEXT.md                    # Current behavior, priorities and known issues
├── package.json / package-lock.json
├── index.html                    # HTML entry point and metadata
├── vite.config.js                # React build/dev-server configuration
├── .openai/hosting.json           # Existing Site ID; static output is dist/
├── public/                       # Guild crest, Inter font and third-party licenses
├── src/
│   ├── main.jsx                  # React root and stylesheet import
│   ├── App.jsx                   # Navigation, imports, state and worker lifecycle
│   ├── styles.css                # Responsive layout and guild theme
│   ├── components/
│   │   ├── TeamEditor.jsx        # Team/monster selection and build specifications
│   │   ├── Results.jsx           # Stats, deficits and rune identification
│   │   └── Inventory.jsx         # Searchable monster/rune inventory
│   └── core/
│       ├── data.js               # SWEX normalization, constants and presets
│       ├── catalog.json          # Monster ID-to-name mapping
│       ├── optimizer.js          # Calculations, candidates and joint allocation
│       ├── optimizer.worker.js   # Progress/result/error message boundary
│       └── storage.js            # IndexedDB helpers and JSON downloads
├── tests/optimizer.test.mjs       # Seven importer/calculation/allocation tests
└── dist/                         # Generated production assets; ignored by Git
```

The source root in this environment is `/workspace/sites/d8stino-siege`. Its GitHub remote is the private repository `FeehBig010/SwCommandCenter`, branch `main`. The separate `/workspace/SwCommandCenter` directory is another checkout and may need updating.

## Run and Verify

Use **Node 24** (tested) and npm. The code uses native JSON import attributes and modern browser APIs.

```bash
npm ci
npm run dev -- --port 4173 --strictPort
npm test
npm run build
```

The dev script binds to `0.0.0.0`; use localhost for local testing and do not expose it publicly. No API keys or environment variables are needed. Serve through localhost or HTTPS for browser API support. There is no committed E2E runner, lint configuration, or TypeScript check yet.

## Main Workflow

1. Import the original SWEX JSON through **Importar JSON** or drag/drop.
2. Configure up to ten three-position teams: actual monster instances, sets, slot 2/4/6 mains, minimum targets and secondary objectives.
3. Run **Otimizar todos os times**. Expand results to inspect deficits and identify runes by slot, set, main/substats, ID and current owner.
4. Save builds and reserve runes for later searches. Account options also load imported defense compositions and import/export goal plans.

The initial preset is Molly / Vritra / Solveig. Molly and Solveig require Violent, SPD/HP%/HP%, **+28,001 HP** and **+700 DEF**; Solveig additionally favors critical rate. Vritra prefers Despair/Revenge. Missing units must be selected or excluded explicitly.

## Calculation and Privacy Boundaries

- Uses current rune values, innate stats, existing grinds and implemented personal stat-set bonuses. Optionally counts the main stats of artifacts already equipped on the unit.
- HP/ATK/DEF/SPD targets can be additional or total; CR/CD/RES/ACC targets are always total. Numerical targets permit labeled approximations; mandatory sets and slot mains are hard constraints.
- Search is heuristic, not exhaustive: it does not prove global optimality or impossibility. Turn order is a sheet-SPD preference, not combat simulation.
- Intangible, artifact redistribution/subproperties, leader/tower/team bonuses, passives, ATB and hypothetical upgrades are not implemented.
- The import whitelist drops session keys and authentication/social data. Inventories and builds stay in IndexedDB. Never commit or bundle personal SWEX exports.

## References and Licenses

Functional references: SWLens public guides, Lucksack Optimizer and SWGT. Implementation and algorithms are independent. Monster names derive from `Xzandro/sw-exporter/app/mapping.js` under Apache 2.0 (`public/SWEX-LICENSE.txt`). Inter's license is in `public/Inter-LICENSE.txt`. The crest was generated from the user's supplied pirate reference.
