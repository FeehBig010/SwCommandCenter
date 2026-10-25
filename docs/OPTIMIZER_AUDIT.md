# Advanced optimizer and inventory audit

The advanced optimizer runs in `optimizer.worker.js`. `optimizeAdvanced` dispatches
by verified origin: an unchanged SWEX preset is audited; a manually assembled
team searches for new builds using loose runes only. Equipped rune references
are excluded even if an export accidentally reports owner zero. The Free
Calculator transfers goals and resolves distinct account instances (including
verified Collab equivalents); its manual sheets never become real equipment.

## Imported presets

`importedPreset` checks source account, deck ID, mode and composition. The audit
starts from the saved preset equipment/current local loadout with six valid
slots. It preserves every main-stat type/value and completed rune set. It keeps
current HP/DEF/ATK/CR/CD/RES/ACC floors, and SPD when sync is enabled. It respects
reservations, local locks, the game-lock option and the filtered defense policy.
Only loose inventory may supply replacements. The original JSON is immutable.

The search makes at most three improvement passes and 50,000 evaluated swaps.
It is conservative and heuristic, not an exhaustive proof of the optimum.
Incomplete, unsupported or overlapping loadouts report failures; overlapping
presets can be audited individually.

## Speed and automatic combat context

The per-team checkbox controls the complete hard timing filter, including
first-rotation ticks, automatic ATB skills, speed buffs and cascades. With sync
off, legacy lock/tick-order flags are ignored and construction prioritizes raw
EHP/damage utility. Explicit numerical stat goals still apply.

All Glory structures and guild HP/ATK/DEF flags use maximum bonuses; guild flags
have no SPD bonus. The actual leader skill is read from the saved leader position
(or slot one), with its area/element scope. Enemy sheet inputs use max towers and
the enemy's actual leader; an explicitly entered *combat* SPD already contains
these bonuses and is not increased a second time. An unknown defense is never
inferred to be safe. Without an explicit enemy, ATB openers use opener minus one
combat SPD as a reference. Random effects remain conditional.

## Grinds and gems

A separate plan simulates only compatible SWEX craft items, sharing quantities
across the entire selected batch. Main/innate stats, set, Ancient status, grade,
revealed subs and the one-enchant rule are checked by `simulateRuneCraft`.
The plan has a 20,000-evaluation bound and uses maximum possible rolls; actual
rolls are random. Projected gains apply to the original loadouts and are **not
added to replacement builds**. No stones are consumed or real stats overwritten.

## Areas and Collab identities

Advanced Siege accepts three-slot local teams and presets identified as Siege
from `defense_deck_list` or `guildsiege_defense_deck_unit_list`. Arena requires
four slots and keeps Regular/Interserver separate. Other source presets remain
available in their original modules.

`collab-equivalents.json` contains 63 exact IDs verified against SWARFARM's
checked-out bestiary fixture: same element, awakening, skill group and every base
stat. `CollabMapping.js` centralizes canonical base/leader/ATB/skill references.
Advanced portraits show the original equivalent; other portrait consumers keep
the exact master-ID/CDN resolver and silhouette fallback. Unknown equivalents
(including newer families not in that fixture) are never guessed. Account
instance IDs, original SWEX base stats and elemental variants are preserved.
