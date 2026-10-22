# PvE command desk and proportional Speed Tune

## Implemented behavior

The expandable PvE navigation groups Cairos, Dimensional Hole, Rift and ToA. RTA is a separate read-only equipment-assignment screen; principal inventory and RTA assignments remain distinct. Area plans use 5/4/6/5 slots respectively. Rift/R5 is the user's own six-unit team, not the other raid participants. Each stage owns its plan; switching routes preserves the selected stage in the current session and the saved compositions in IndexedDB. Boss buttons use local official public SWARFARM monster icons, accessible tab names, arrow/Home/End navigation and reduced-motion-safe hover/active effects.

The compact progress ruler has three actionable steps. Setup scrolls to the top; Mode and Select Team smoothly scroll to actual visible controls/grids, give keyboard focus to the destination and respect the sticky-header offset. There are no disabled decorative future steps.

The calculator supports stable sorting by combat SPD, drag handles, keyboard left/right reordering, ordinal glow badges, a larger selected-leader crown and one-click reset. Reordering keeps leader/config identities and explicit scenario references. User-entered follower SPD is retained; AUTO remains opt-in after manual editing. StrictMode initial stat rendering now shows the actual value instead of leaving the canceled initial animation stuck at zero.

## Numerical model

`monsterDatabase.js` is the shared lookup for base metadata, leader skills and verified opener skills. Adriana (26811) and Water Pure Vanilla Cookie (26311) grant Arena ATK 44%, never SPD. Tiana (18913) in the first slot automatically uses the modeled first-turn S3: remove supported harmful/beneficial states from both teams, then boost living allies by 30%. Disabled turns cannot execute it, and an explicit first-turn boost event takes precedence. Tian Lang still reacts/suppresses gains in the simulation.

For the manual-sheet calculator, where all rune/set bonuses are already in the entered sheet:

```
B = baseSPD × (towerSPD + applicableGuildSPD + applicableSPDLeader) / 100
combatRaw = sheetSPD + B
minimumFollowerSheet = ceil(openerCombatRaw × 0.70 − followerB)
```

The result is clamped to the monster's base SPD. No early rounding is applied to the opener's raw combat speed before calculating this threshold. Guild SPD remains scoped to Siege/Guild battles; it is **0 in Arena**, including Tiana–Truffle–Zaiross–Adriana. Non-SPD leaders add zero to `B`. The existing actual-equipped optimizer retains its established Swift/base rounding path; the manual-sheet path does not add Swift a second time.

The green `100% Sincronizado · regra 70%` badge means only that this proportional threshold is met. Its red counterpart reports exact missing sheet SPD. This threshold is **not proof against every cut**. The integer-tick simulation still shows faster defenses, bar overflow, incapacitation, passives and conditional proc risks. Tests explicitly cover a team meeting the rule while a faster defense still cuts. Unknown skill branches and boss mechanics are not silently marked safe.

## Import and workshop

The parser reads `siege_deck`, `arena_deck`, `dungeon_deck` and `world_arena_deck` in addition to existing deck formats. Explicit source namespaces prevent contradictory labels from recategorizing Siege/Arena/RTA arrays; PvE subareas require recognized stage metadata. Unknown dungeon stages remain unselected, rather than leaking into an arbitrary boss. Rift supports six unit IDs, including portable/share/backup records and sixth-ally event references; enemy references retain their previous five-unit limit.

The existing treasure scan, protected single-slot comparisons, stock-aware Max Roll workbench, validated Ancient bounds and local lock lists remain. Browser testing exercised a real Worker allocation after a synthetic SWEX import, a separate RTA assignment, and an Ancient grind simulation. Unsupported Ancient flat/low-grade limits remain disabled as previously documented.

## Asset provenance and visual verification

Boss thumbnails and the additional Tiana-team portrait/skill fallbacks are copied from SWARFARM's public GitHub mirror; `public/game-icons/bosses/sources.json` records filenames. The fixture source/hash remains the one documented in CONTEXT.md. **Full-page wallpapers are original generated illustrations, not official Summoners War artworks.** No official wallpaper files were provided in this request. Separate ice, lava, lich, foundry, timekeeper crypt, cosmic, Rift and ToA scenes ship locally and load only when selected.

Concept reference: `/workspace/generated_images/exec-88fa602e-bd44-492d-8f0c-86d21a4baf2a.png`. Native target: 1536×1024. Browser plugin unavailable; Playwright with installed Chromium verified development and Vite production preview. The concept and latest implementation screenshots were opened with `view_image` for direct inspection.

| Comparison | Implementation / review |
| --- | --- |
| Header and density | 44 px top bar, compact three-step ruler, one-line desktop export actions; removed the old wide dungeon labels and generic description banner. |
| Navigation | Expandable PvE branch, separate World Arena entry; fixed hover-menu interception of the first boss after route navigation. |
| Team layout | Five parallel desktop Cairos cards; native 4/6/5 unit grids for other PvE areas; collapsed fine targets retain synchronized numeric/range inputs. |
| Typography and palette | Existing Cinzel headings / Inter controls, navy surfaces and old-gold frames; elemental glow on selected official boss portraits. |
| Art and imagery | Official local boss/monster icons with original full-page scenery and dark contrast overlay; no rasterized controls. |
| Interaction and responsive behavior | Boss tabs, proportional deficits, crown, smart sorting, native drag/drop, keyboard movement, reset, Worker search and Ancient stock bench; 1536/1440/1280/390/320 checks without horizontal overflow or app errors. |

Above-the-fold copy review: kept actual route/team names and user-requested controls. Intentional deviations from the generated concept: no invented global search/bells, fake seed stats or fabricated buffs; real imported units/sets/levels and existing account-sharing actions replace those concept placeholders. Equipment details remain an expandable per-monster sheet with the existing rune-swap drawer; no invented aggregate equipment totals. The supplied reference name `image_74f2ff` had no corresponding attached image, so compression follows the written brief and this generated reference.
