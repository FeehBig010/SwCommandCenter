# CONTEXT.md — Clã D8stino - Euro · Siege & Guild Command Center

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
- **Backend Dependency:** None (100% Client-side execution, zero external AI API or server DB dependencies, full privacy compliance).

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
