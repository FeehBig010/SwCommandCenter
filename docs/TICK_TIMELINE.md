# Raw tick timeline

`simulateCombat(..., {captureReadiness:true})` exposes `firstReady`: the first
observed tick at which each unit's attack bar reaches its threshold, independently
of the serialized action queue. Natural gauge gain, explicit events and passive
bar gains are observed before they are consumed. A crossing followed by a reduction
in the same action remains recorded. Initial full bars use Tick 0. Forced actions
below the threshold are explicitly tagged as forced, rather than reported as full
bars. Units eliminated before readiness have no invented tick.

`firstTurns` retains its original meaning and ordering. Allocation, optimizer
constraints and audit speed checks continue to use the action simulation.
Readiness capture is opt-in so repeated optimization simulations avoid collecting
visual telemetry. The manual UI omits its synthetic comparison enemy; explicitly
configured enemies remain in the timeline.

`tickTimeline` groups units by their measured readiness tick. Combat SPD uses the
first action's effective speed (including applied buffs); hovering exposes the
separate action tick. Tick blocks have equal temporal width, including empty
intervals. Long empty spans retain their full grid-column span with a compact DOM.
The shared component is used in Speed Tune, the Free Calculator and PvE.

The visual panel reports timing and attributes only. It does not issue a
synchronization verdict, color a sequence as safe/unsafe, or label an enemy action
as a cut. Optimizer controls elsewhere keep their independent business rules.
