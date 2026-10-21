# Development Context

Last reviewed: **2026-10-21**. Version: **0.1.0**. Source root: `/workspace/sites/d8stino-siege`.

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
| Team editor | Up to ten teams, three positions each; naming, priorities, instance selection, reordering, exclusion, attack/defense labels and imported defense compositions. |
| Specifications | Required/preferred sets, slot 2/4/6 mains, eight minimum targets, additional/total basis, balanced/HP/SPD/CR/ATK-based damage objectives and the user's initial preset. |
| Calculations | Base HP from `con × 15`, current main/innate/substat/grind values, personal stat-set bonuses and optional fixed equipped-artifact mains. |
| Joint allocation | Candidate generation followed by joint beam search, rune/unit uniqueness, weighted priorities and additional candidate searches when allocations conflict. |
| Search controls | Three depths, minimum rune level, equipped-rune/game-lock options, saved-build reservations, worker progress, cancellation and errors. |
| Results | Met/approximate/conflict outcomes, per-stat deficits, rune identification details and result JSON export. Bounded-search failure is not presented as proof of impossibility. |
| Persistence | IndexedDB account, teams, options, saved builds and identity; save/open/delete builds, reserve/release runes, import/export goal plans and local-data deletion UI. |
| Inventory | Monster/rune search, rune-set filter and incremental row display. |
| Interface | Optimizer, inventory, saved-build and identity views; responsive/mobile navigation; editable guild name/accent/emblem; locally hosted assets. |

## Architecture and Data Contracts

- `App.jsx` owns navigation, state, persistence and the worker. No router/global-state library is used; substantial orchestration remains in this component.
- `data.js` normalizes raw exports to `{ version, id, name, guild, importedAt, units, runes, artifacts, siege }`. Only normalized data enters the optimizer.
- Teams contain `{ id, name, mode, priority, order, configs }`. A config references an actual `unitId` plus enabled state, sets, mains, goals, basis and objective.
- `optimize(account, teams, options, onProgress, reservedIds)` returns `met`, `approximate`, `no_assignment` or `conflict`, plus builds, failures, elapsed time and candidate count. Missing/duplicate/invalid units throw errors.
- Search prioritizes weighted normalized target deficits, then utility and optional sheet-SPD ordering. Candidate pools/beams are bounded; conflicting allocations trigger candidate expansion. This is not an exact solver.
- Artifact calculation uses `unit.artifactIds`. Imported `siege[].equipment` is currently not consumed by calculations.
- IndexedDB: database `d8stino-siege-v1`, store `data`, keys `account`, `teams`, `options`, `saved`, `brand`. Saved builds carry `accountId`; editable teams/options have one current global entry. No migrations exist.
- Goal-plan format: `{ type: 'd8stino-plan', version: 1, teams }`. Result export is a different format and has no import path. Plan import may fall back to monster-name matching; verify duplicate instances.

## Validation Status

- **Re-run for this documentation review:** `npm test` — **7 passing tests**; `npm run build` — passes.
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
6. **Add combat-aware planning.** Leader/tower/invoker/team-set bonuses, artifact subproperties, passives, buffs, ATB/tick-based turn order and upgrade/gem/grind simulations, each backed by validated rules/tests.
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
- `origin` targets the private GitHub repository `https://github.com/FeehBig010/SwCommandCenter.git`; the delivery branch is `main`. The existing initial commit is preserved. `/workspace/SwCommandCenter` is a separate checkout that may lag behind; fetch/update it before using it instead of this source directory.
