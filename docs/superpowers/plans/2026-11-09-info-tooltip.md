# InfoTooltip dismissal — Implementation Plan

> For agentic workers: use superpowers:subagent-driven-development and test-driven-development.

Goal: repair existing help dismissal without changing its presentation.
Architecture: retain the shared InfoTooltip({label, children}) component and coordinate its visible state with pointer/focus/click events. Change its scoped visibility selectors; minimal responsive positioning correction is allowed where existing tooltip text clips outside the mobile viewport, preserving desktop placement.
Tech Stack: React, existing CSS, Playwright, Node test runner. No dependencies.
Spec: approved audit pilot, /workspace/artifacts/superpowers-audit-20261109/RELATORIO_SUPERPOWERS.md section 5.

## Global Constraints
Preserve tooltip text, desktop placement, theme, data-export-ignore and aria-describedby. Clamp placement only where needed to prevent viewport clipping. Escape hides it while preserving trigger focus, even under stationary hover/focus. It stays dismissed until deliberate new interaction. Keyboard focus, hover, click/tap and leave/re-enter remain usable. If aria-expanded remains, it agrees with visibility. Do not change accounts, SWEX, calculations, presets, inventory, auth, persistence, routes or cloud. No remote push, deployment, migration or dependency installation. Use only fictitious browser contexts.

## Review Focus
1. Keyboard: focus opens, Escape closes without blur, next Tab advances normally.
2. Pointer: stationary hover cannot override Escape; leave/re-enter reopens; click toggles deliberately.
3. Touch: tap toggles, never stuck due to CSS focus-within.
4. Accessibility: valid description association, coherent expanded state if retained, visible focus.
5. Presentation: Office/War, desktop/mobile and reduced motion retain text/position and avoid overflow.

## Task 1 — Shared tooltip behavior and regression test
Files: src/components/InfoTooltip.jsx; only .technical-help visibility/responsive positioning in src/styles.css; tests/browser/info-tooltip.mjs (new); registration in scripts/run-browser-tests.mjs.
Interface remains InfoTooltip({label, children}); no new public props required.
- [x] Read current component/CSS and existing browser harness.
- [x] Write real browser regression tests using #/quick and trigger Regras da calculadora reativa. Default Chromium path can use CHROMIUM_PATH or installed Chromium. Block external network. Use isolated contexts and no account fixture.
- [x] Run tests on unchanged production and record correct assertion RED before editing production.
- [x] Implement minimal state/event/CSS repair, no visual redesign.
- [x] Run focused GREEN; capture desktop/mobile, both appearances and reduced motion; inspect screenshots.
- [x] Register script in existing runner without dropping existing scripts.
- [x] Run npm test, relevant quick-auto-sync / app-motion / premium-motion / home-portal / siege-library browser checks, and direct Vite production build to external artifact directory (avoids asset-updater prebuild).
- [x] Self-review and commit only scoped files; report evidence paths and any failures.

## Verification commands
npm test
E2E_BASE_URL=http://127.0.0.1:5297 node tests/browser/info-tooltip.mjs
node node_modules/vite/bin/vite.js build --outDir /workspace/artifacts/tooltip-pilot-20261109/dist

## Review and handoff
Independent task review checks spec and quality against the diff. Whole-branch review follows, then local handoff with fresh evidence. Preserve original checkout at its baseline checkpoint; pilot remains in its isolated worktree.
