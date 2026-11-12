# Quick Tick Targets Implementation Plan
> For agentic workers: use superpowers:subagent-driven-development with TDD and independent review.

Goal: add optional per-monster tick-driven speed alongside existing SPD controls.
Architecture: small pure tick inverse helpers integrated with existing quick-calculator transitions and quickPreview simulation; compact selector/result in existing cards. No new dependencies.
Tech Stack: React/CSS, Node tests, Playwright.
Spec: docs/superpowers/specs/2026-11-12-quick-tick-design.md (approved conversational contract; implementation choices documented there).

## Global Constraints
Keep SPD slider/number input and current defaults. Tick mode is per config, additional and explicit. Keep simulation and results consistent, distinguish ready tick from action tick and team safety. Preserve JSON/equipment/presets/auth/data/routes and prior tooltip fix. No dependency installation, remote push/deploy or destructive operations. Fictitious test contexts only.

## Review Focus
1. Explicit tick target on follower must survive automatic tuning; unpinned followers preserve current behavior.
2. Leader/Swift/artifact changes recalculate rune requirement without double counting.
3. Multiple tick targets, boosts and impossible ordering show actual verified tick and conflicts.
4. Empty slots, invalid input, clear/reselection/preset restore/area changes never leak stale targets or equipment.
5. Responsive UI preserves slider, labels, keyboard usability, and avoids expensive repeated inverse work in render.

## Task 1 — Integrated optional tick mode
Files: src/core/quick-calculator.js (or focused new helper if warranted), src/components/QuickCalculator.jsx, scoped QuickCalculator.css/QuickBalance.css as needed, tests/quick-tick-targets.test.mjs, tests/browser/quick-tick-targets.mjs, scripts/run-browser-tests.mjs, docs/COMBAT.md if useful.
Public behavior: tick selector in each chosen monster card; default remains SPD. In tick mode display required +rune SPD and combat SPD together, plus observed readiness/action where relevant. Existing slider remains available; editing it deliberately switches that monster back to SPD. Disabled until monster selected. Auto-update selected target on relevant changes. Use explicit reasonable tick range and speed-search bounds and explain bounds when unsolved.
- [x] Read quick simulation, timeline and auto-sync integration; choose smallest compatible helper API and document it in report.
- [x] Write meaningful failing Node tests for inverse/minimality, bonuses, boost, follower pinning, multiple targets, invalid/unreachable target, no mutation and manual-mode compatibility. Observe RED before production edits.
- [x] Implement bounded deterministic inverse using existing full scenario simulation, not monotonic binary search across nonmonotonic tick/boost boundaries. Avoid nested exhaustive auto-tuners per candidate. Verify all final targets against final same team; signal conflicts honestly.
- [x] Add compact accessible UI alongside retained slider; switching modes, clearing and preset loading keep predictable values. Minimal scoped style only.
- [x] Add real browser test, observe relevant UI RED, then GREEN; test opener tick6 and follower tick with auto-sync, manual slider switch-back, preset/empty/clear, desktop and mobile no overflow, no console errors. Register script without dropping existing ones.
- [x] Run full npm test (serial equivalent if resources require), quick-auto-sync, quick-density, quick-presets and new browser test; direct Vite build to external artifacts avoids asset-updater prebuild. Inspect desktop/mobile screenshots. Report command exit codes and limitations.
- [x] Self-review and local scoped commit. No changes to original checkout or earlier branch.
