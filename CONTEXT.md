# Development Context

Last reviewed: **2026-10-21**. Version: **0.1.0**. Source root: `/workspace/SwCommandCenter`.

## Product Requirements to Preserve

- Build a **private** tool for Clã D8stino - Euro. UI and user communication are Portuguese.
- Optimize **all selected teams together**, because they compete for one account's runes. Independent results that reuse equipment do not satisfy the requirement.
- Start with Siege; later add separate Arena, RTA and PvE plans and equipment rules. Never pool different guild members' inventories.
- Users supply SWEX data and specifications, then manually apply builds in the game. Automatic in-game equipping is not requested.
- Use SWLens-inspired workflows and the guild's pirate/navy/gold identity. Complete authenticated reference flows and proprietary algorithms have not been obtained.

## Completed Features

| Area | Implemented behavior |
| --- | --- |
| Import | File picker/drag-drop, 50 MB UI limit, core SWEX validation, units/runes/artifact mains/Siege defense references, rune deduplication and game rune-lock flags. |
| Privacy | Explicit field whitelist; no raw JSON upload or preservation of session/authentication/social fields. Personal exports are outside the source tree. |
| Team editor | Up to ten teams, with 1/3/4/5 positions for Solo/Siege-WGB/Arena/Cairos; naming, priorities, instance selection, reordering, exclusion, attack/defense labels and imported defense compositions. |
| Specifications | Required/preferred sets, slot 2/4/6 mains, eight minimum targets, additional/total basis, balanced/HP/SPD/CR/ATK-based damage objectives and the user's initial preset. |
| Calculations | Base HP from `con × 15`, current main/innate/substat/grind values, personal stat-set bonuses and optional fixed equipped-artifact mains. |
| Joint allocation | Candidate generation followed by joint beam search, rune/unit uniqueness, weighted priorities and additional candidate searches when allocations conflict. |
| Search controls | Three depths, minimum rune level, equipped-rune/game-lock options, saved-build reservations, worker progress, cancellation and errors. |
| Results | Met/approximate/conflict outcomes, per-stat deficits, rune identification details and result JSON export. Bounded-search failure is not presented as proof of impossibility. |
| Persistence | IndexedDB account, teams, options, saved builds and identity; save/open/delete builds, reserve/release runes, import/export goal plans and local-data deletion UI. |
| Inventory | Monster/rune search, rune-set filter and incremental row display. |
| Guild Hub | Local three-monster leadership templates, create/edit/delete, portable JSON import/export, exact monster-instance matching, worker-based joint optimization and per-monster deficit reports. |
| Interface | Optimizer, inventory, saved-build and identity views; responsive/mobile navigation; editable guild name/accent/emblem; locally hosted assets. |

## Architecture and Data Contracts

- `App.jsx` owns navigation, state, persistence and the worker. No router/global-state library is used; substantial orchestration remains in this component.
- `data.js` normalizes raw exports to `{ version, id, name, guild, importedAt, units, runes, artifacts, siege }`. Only normalized data enters the optimizer.
- Teams contain `{ id, name, mode, priority, order, configs }`. A config references an actual `unitId` plus enabled state, sets, mains, goals, basis and objective.
- `optimize(account, teams, options, onProgress, reservedIds)` returns `met`, `approximate`, `no_assignment` or `conflict`, plus builds, failures, elapsed time and candidate count. Missing/duplicate/invalid units throw errors.
- Search prioritizes weighted normalized target deficits, then utility and optional combat-SPD ordering. Candidate pools/beams are bounded; conflicting allocations trigger candidate expansion. This is not an exact solver.
- Artifact calculation uses `unit.artifactIds`. Imported `siege[].equipment` is currently not consumed by calculations.
- IndexedDB: database `d8stino-siege-v1`, store `data`, keys `account`, `teams`, `options`, `saved`, `brand`, `guildTemplates`. Saved builds carry `accountId`; editable teams/options have one current global entry. No migrations exist.
- Goal-plan format: `{ type: 'd8stino-plan', version: 1, teams }`. Result export is a different format and has no import path. Plan import may fall back to monster-name matching; verify duplicate instances.

## Validation Status

- **Re-run for this documentation review:** `npm test` — **33 passing tests**; `npm run build` — passes (Phase 3).
- Tests cover stat/grind summation, import deduplication/privacy, rune uniqueness, missing/duplicate units, sets/mains/locks/reservations, unmet targets and conflicting allocations. They do not validate every game mechanic.
- Earlier session Playwright/Chromium QA checked desktop **1536×1024** and mobile **390×844**. Import → exclude missing Vritra → optimize → inspect runes → save/reserve → inventory search → reload/mobile navigation passed, with no page errors or mobile horizontal overflow observed. Browser QA was not repeated for these documentation-only edits.
- The supplied export normalized to **761 units / 3,762 unique runes**. A two-unit test met Molly/Solveig HP/DEF goals without rune reuse. A separate five-defense test allocated **15 units / 90 distinct runes** in approximately **3.3 seconds** in this environment. The latter used default goals, not fifteen constrained competitive builds.
- Session-only scripts/evidence are under `/workspace/work/`: `browser-check.mjs`, `multiteam-check.mjs`, `test-real.mjs` and screenshots. Their paths are environment-specific; no portable committed E2E suite exists. Do not copy personal exports into test fixtures.

## Pending / Next Steps

1. **Fix state/snapshot correctness.** Address the issues below and add regression tests for clearing data, worker completion, changing reservations and reopening saved results. Version result inputs against immutable account snapshots.
2. **Finish Siege equipment semantics.** Define regular versus Siege loadouts, attack/defense plans and reservations. Consume imported equipment snapshots instead of only their monster lists.
3. **Validate and extend optimization.** Check rounding against independent game fixtures; benchmark constrained multi-team allocations. Add optional hard numerical targets/max caps, Intangible and artifact allocation, keeping heuristic status honest.
4. **Complete private delivery.** Verify the GitHub source push and deploy with the existing Site identity. Verify owner-private access. Obtain member identities and invitation authorization before enabling guild access; never make the site public as a shortcut.
5. **Implement authenticated guild persistence.** Backend storage, per-member permissions, shared templates, account history and cross-device synchronization. IndexedDB alone cannot provide these features.
6. **Extend combat-aware planning.** Phase 2 implements tower/leader SPD, a first-rotation tick model and regular gem/grind projections. Remaining: invoker/team-set bonuses, artifact subproperties, passives, buffs, skill-driven ATB effects, Ancient stones and stone inventory constraints; validate game-specific behavior against independent combat fixtures.
7. **Extend modules and guild tools.** Counters/defense library, tower planning/history and separate Arena/RTA/PvE areas. Capture authorized screen references for closer visual alignment.
8. **Improve maintainability.** Commit sanitized E2E tests and CI, split the large App component, format source/CSS, add schema validation and storage migrations; assess TypeScript. The current deterministic solver needs no AI API key.

## Known Bugs / Blockers

The following code-review findings are **not fixed by this documentation update**. No compile failure was found.

| Priority | Finding / impact | Location |
| --- | --- | --- |
| High | Clearing local data during a search does not terminate the worker. Its completion can restore a result after `account` becomes null, leading to an `account.units` dereference when the optimizer view opens. Saved-build navigation can also mutate plans during a search. | `App.jsx` clear/startSearch handlers; `Results.jsx` |
| High | Freshness signature covers teams/options/import time, but excludes reserved rune IDs. Changing reservations can leave an old result considered current despite using newly reserved equipment. | `App.jsx` signature/save/reservation handling |
| High | Siege equipment snapshots are imported but unused. Defense import copies unit selections only; artifact contributions and owner labels derive from regular equipment and can differ from Siege loadouts. | `data.js`; `App.jsx` importDefenses; `optimizer.js` artifactBonus |
| Medium | Attack/defense is only a label, not a distinct policy. Selected teams share one allocation; saved reservations apply across the account. | `TeamEditor.jsx`; `App.jsx`; `optimizer.js` |
| Medium | Saved results render against the current inventory/base stats, without immutable account snapshots. Re-import can change/remove referenced data. Reopening deliberately marks results stale, but historical rendering needs hardening. | `App.jsx` saved-build open; `Results.jsx` |
| Medium | Candidate expansion appends unsorted alternatives, while allocation accepts at most 35 compatible candidates per state. Benchmark this search-quality limitation; greater depth does not prove optimality. | `optimizer.js` joint search |
| Medium | Nested input structures and restored IndexedDB records are only partially validated. Unexpected/corrupt shapes may throw; there is no React error boundary or storage recovery/migration layer. | `data.js`; `storage.js`; `App.jsx` |
| Data dependency | Vritra is absent from the supplied export. The preset intentionally blocks execution until that position is excluded, replaced or supplied by a newer JSON. | Initial preset and missing-unit validation |
| Delivery | Site registration exists, but no successful Sites version/deployment was verified. The GitHub source destination is FeehBig010/SwCommandCenter, branch main; verify the latest push separately from site deployment. | Git state and hosting manifest |
| Environment | Installed Sites workflow helpers were unavailable; a manual session push helper was drafted but not executed. Direct SWLens screenshot download returned proxy 403; complete authenticated reference flows were not captured. | Session tools; `/workspace/work/prepare-site-source.py` |

## Hosting and Repository Handoff

- Preserve `.openai/hosting.json`: project ID **`appgprj_6ad8bc01704c819195d13999211bae90`**, static directory **`dist`**. Do not register a replacement Site.
- Last inspected access was custom/owner-private; external visitor invites were supported. Recheck live access before publication or membership changes.
- Expected URL: `https://cla-d8stino-siege.darkseid010.chatgpt.site`. This is a registered address, **not proof of deployment**.
- Previous short-lived source credentials expired. Obtain fresh ones when needed; never persist tokens in docs/source or expose them in command arguments.
- `origin` targets the private GitHub repository `https://github.com/FeehBig010/SwCommandCenter.git`; the delivery branch is `main`. The existing initial commit is preserved. `/workspace/SwCommandCenter` is the current checkout; fetch before starting further work.


## Phase 1: Foundation & UX — 2026-10-21

- Implemented per-team `gameMode` (`solo`, `siege`, `arena`, `cairos`), separate from the existing attack/defense `mode` label. Cards render exactly 1/3/4/5 slots. New teams inherit the last team's game mode.
- `changeGameMode` / `restoreTeam` in `data.js` retain trimmed cards in `inactiveConfigs`; these do not participate in validation, counts or allocation. IndexedDB and JSON plan export/import preserve them. Legacy plans default to Siege.
- All eight minimum stat fields are visible, including ATK. Existing mandatory/preferred sets, slot 2/4/6 mains, account-instance selector and bonus/total controls remain available.
- Per-card `lockSpeedSync` defaults to false and persists with plans. The optimizer requires strictly descending total sheet SPD between enabled marked cards in visual order; unmarked cards are excluded from that constraint. Existing team-wide soft ordering is still optional. Search capacity is now 50 monsters (10 teams × 5 slots).
- This is sheet-SPD ordering only: combat speed bounds, towers, leaders, ATB and prevention of enemy cutting remain Phase 2 work. Game mode currently controls team size, not mode-specific combat rules.
- `npm test`: 10 passing; `npm run build`: passing. New regression cases cover mode resizing/preservation, selective SPD pair constraints and joint allocation with locked/unlocked cards.
- The remote update fetched at the start of this work put the V2 roadmap in `README.md` (headed CONTEXT.md); the original `CONTEXT.md` remained unchanged remotely. Both were read; Phase 1 follows the explicit user request and that roadmap.
- Phase 1 browser QA: Playwright/Chromium at `http://localhost:4173`, desktop 1536×1024 and mobile 390×844. Verified all four slot counts, final-slot movement boundary, monster/sets/main-stat/HP/speed-lock edits, resize preservation, reload, JSON roundtrip including hidden slots, and add/remove with mode inheritance. No runtime errors or Vite overlay; mobile has no horizontal overflow. Existing `/favicon.ico` request returns 404. Browser plugin unavailable; used installed Playwright. Temporary evidence: `/tmp/phase1-browser.mjs`, `/tmp/phase1-desktop.png`, `/tmp/phase1-mobile.png`.


## Phase 2: Combat Engine Upgrades & Grinds Simulator — Complete, 2026-10-21

- [x] Tower/leader SPD inputs per team, preserved by IndexedDB and goal-plan import/export. Inputs are explicit percentages applicable to every active member; no automatic leader/element eligibility is inferred.
- [x] Sheet SPD and combat SPD are separate. Sheet goals retain their existing meaning. Combat SPD recombines fractional base-SPD bonuses from Swift, tower and leader before one ceiling: `ceil(baseSPD × (1 + Swift% + tower% + leader%) + flat rune SPD)`. Swift is 25% per completed set. The previously rounded sheet Swift contribution is removed before recombining. Example: base 101, Swift, tower 15%, leader 24% → sheet 127, combat 166 (not 167).
- [x] Selective speed sync now uses combat SPD. Equal allied combat speeds follow visual card order; unlocked/excluded cards do not become mandatory links. Optional soft ordering also uses combat SPD. Legacy callers supplying only sheet stats retain Phase 1's strict comparison.
- [x] Optional enemy **combat** SPD input enables a bounded first-rotation simulation: every tick adds `combatSPD × 0.07` percent ATB to all actors, including after an action. Highest ATB above the 100% threshold acts and resets to zero; other actors retain overflow. Ties use speed, then allied visual position; an exact enemy tie is conservatively rejected. All enabled allies, including unlocked cards, participate. Every marked card must take its first turn before the enemy. Partial assignments remain expandable.
- [x] Optional max gems/grinds search enumerates legal alternatives for **regular six-star runes**, rather than adding every possible gem simultaneously. Normal legendary caps: gems HP 580, ATK/DEF 40, HP%/ATK%/DEF% 13, SPD 10, CR 9, CD 10, RES/ACC 11; grinds HP 550, ATK/DEF 30, HP%/ATK%/DEF% 10, SPD 5. Existing grinds are replaced by the maximum, never added twice or reduced; nongrindable stats receive no new grind.
- [x] At most one substat index is enchanted. An existing enchanted index is the only index that can be re-gemmed; replacement resets the old grind. Main/innate/other-substat duplicates and slot-1 DEF / slot-3 ATK exclusions are enforced. Gem swaps require four revealed subs and +12 or higher. Native stats are not re-gemmed in place; an already enchanted same-stat roll may be improved up to its cap. Above-cap existing rolls are retained, never manufactured by gems. Ancient/unknown-grade runes are left unchanged; new SWEX imports retain the Ancient flag.
- [x] Variant identities include the upgrade plan, while allocation/reservations continue to use physical rune IDs. Builds export chosen projected substats in `upgrades`; imported inventory is immutable. Results identify the projection and show both sheet/combat SPD plus the exact rune changes alongside current inventory values.

Validation: `npm test` **24/24 pass**, zero skipped/failed; `npm run build` passes. Added synthetic regression cases for fractional rounding, equal speeds, ATB threshold boundaries/overflow, cutting/partial chains, gem restrictions/re-gemming, replacement grinds, Ancient import, immutable inventory, projection export, and joint rune uniqueness under simulation.

Browser smoke QA: Browser plugin unavailable; used installed Playwright/Chromium. Synthetic SWEX → plan import → tower/leader/enemy inputs → simulation → worker optimization → projected results → reload persistence passed at desktop 1536×1024 and mobile 390×844, with no page errors, Vite overlay or horizontal mobile overflow. Temporary script/screenshots are `/tmp/phase2-browser.cjs`, `/tmp/phase2-desktop.png`, `/tmp/phase2-mobile.png`.

Scope: this completes the Phase 2 roadmap's explicit model, not a full battle simulator. No passive, buff, skill-driven ATB boost/reduction, extra-turn, team-set, Ancient-stone, future rune-level roll or stone-stock simulation is claimed. Enemy SPD must already include its applicable bonuses; exact enemy ties deliberately use a conservative assumption. Tests verify the documented model with synthetic fixtures; independent in-game combat validation and constrained real-account benchmarks remain follow-up work. Candidate/variant beams are bounded and cannot prove global feasibility or optimality. Re-import older stored accounts if Ancient classification was lost by the previous normalizer.


## Phase 3: Guild Hub & Template Matching — Complete (local sharing), 2026-10-21

- Added `src/components/GuildHub.jsx` and the **Hub da guilda** navigation entry. Leaders can create, edit and delete three-monster Siege/WGB templates from the full local catalog, including required sets (up to six pieces, with repeated two-piece sets), slot 2/4/6 mains, eight minimum metrics, total/additional basis, selective speed sync and tower/leader/enemy SPD inputs. Members can inspect requirements before testing.
- Templates persist in IndexedDB under `guildTemplates`; clearing local data removes them. This is a local recommendation library shared by file, with no authenticated leadership roles, server feed, cloud synchronization or messaging integration. Users manually share the exported file through Discord/WhatsApp.
- Portable format: `{ type: 'd8stino-guild-templates', version: 1, templates: [...] }`. A strict whitelist includes monster master IDs and requirements, never account instance IDs, inventory, account exports or matching results. Import validates the entire file before merging, assigns fresh template IDs, and enforces exactly three monsters, valid sets/mains, finite nonnegative metrics, 100 templates and a 1 MB file limit.
- **Testar no meu JSON** binds exact master IDs to distinct copies from the current imported account (highest-level copy initially, editable by the member). Missing monsters/copies are reported rather than substituted by name. All three builds are optimized jointly in a cancellable worker, respecting the current search filters and saved-rune reservations. Matching always uses actual rune values, not hypothetical gem/grind projections.
- Results show explicit per-monster target deficits such as `−14 SPD · −1.500 HP`, with rune details and result export. Failed hard set/main/assignment searches report their reasons without inventing numerical deficits. Searches remain bounded heuristics and do not prove inventory-wide impossibility. Account/template/filter/reservation changes invalidate results and cancel in-flight matching; leaving the Hub terminates its worker.
- Restored full TeamEditor cards with all eight targets, searchable account/catalog selectors, legal per-slot mains, multi-set checkboxes with stacking counts, and a clearly highlighted speed-sync control. Responsive grids enforce useful card widths and wrap rather than clipping/collapsing fields. Existing one/four/five-slot behavior is retained.
- Dynamic thumbnails resolve master IDs via `src/core/monster-images.json` (2,295 public filenames) to **`https://swarfarm.com/static/herders/images/monsters/<filename>`**. The correct upstream path is `herders`, not `herbest`. A public SWARFARM GitHub asset URL is the secondary source; failed/unknown images end in the clean letter-circle fallback through `onError`. No account data is sent to image hosts; referrers are suppressed.
- Filename metadata source: [SWARFARM bestiary fixture](https://github.com/swarfarm/swarfarm/blob/d68ee42efa554238b6f38471e3a9e7b33031bf62/bestiary/fixtures/bestiary_data.json), revision `d68ee42efa554238b6f38471e3a9e7b33031bf62`. Monster artwork belongs to Com2uS; SWARFARM supplies public asset metadata/hosting. Unknown or newly added monsters remain functional with the letter fallback.

Validation: `npm test` **33/33 pass**, zero skipped/failed; `npm run build` passes. New tests cover private template roundtrips, malformed files/requirements, repeated monsters/distinct copies, immutable drafts, exact target deficits, joint rune reservations/uniqueness, met targets and correct thumbnail filenames. `npm test` now discovers both `tests/*.test.mjs` suites.

Browser QA: Browser plugin unavailable; used installed Playwright/Chromium at desktop 1536×1024 and mobile 390×844. Verified all card controls/catalog choices; template create/edit/reload persistence; worker matching with exact synthetic deficits; successful targets; no-assignment and missing-monster reports; portable export/import and invalid-file rejection; no mobile overflow, Vite overlay or page runtime errors. The SWARFARM origin is blocked by this environment's network policy; the actual public secondary PNG was fetched successfully. Thumbnail rendering was additionally verified with that PNG fulfilled at the expected CDN route, and both image hosts were deliberately failed to test the final letter-circle fallback. Live SWARFARM-origin delivery was not verified. Temporary evidence: `/tmp/phase3-browser.cjs`, `/tmp/phase3-templates.json`, `/tmp/phase3-cards-desktop.png`, `/tmp/phase3-cards-mobile.png`, `/tmp/phase3-guild-deficits.png`, `/tmp/phase3-guild-mobile.png`, `/tmp/phase3-thumbnail-card.png`.
