# 5. Roadmap & open questions

## 5.1 What exists today <Badge type="tip" text="Live" />

- Full, compact hangar grid (fighters and walls only) per level; fighters launch only through a clear path to the top
- Flight zone capped at 5 fighters, with HP that enemy fire wears down
- Fighters line up under their target and fire straight up (bullets home in only at the end), colour-matched, no wasted bullets; empty fighters fly off screen
- Front-first shielding for enemies and boss parts
- Regular enemies in 3 sizes (3 / 6 / 9 hp) that fire every 3 s, and a multi-part boss whose parts each have their own weapon and stop firing when destroyed
- Enemy bullets vanish when their shooter is destroyed
- Multi-stage levels, win and lose screens, level select with cleared marks
- 5 sample levels of rising difficulty (up to 8 colours and 32 fighters)
- Level checker: balance, structure and a solver that proves each level is winnable

## 5.2 Roadmap <Badge type="warning" text="Coming soon" />

Order of priority. Milestones are scope buckets, not dates.

### M2: Feel and feedback
| Item | Chapter |
|---|---|
| Sound effects and music | [Core loop](./core-loop) |
| Highlight the tap path before launch; preview which enemies a fighter will hit | [Rules](./rules) |
| Short tutorial overlay on level 1 | [Core loop](./core-loop) |

### M3: Depth
| Item | Chapter |
|---|---|
| Star rating per level (taps, time, or slots never full) | [Core loop](./core-loop) |
| New blockers: locked fighters, crates that break after N launches | [Rules](./rules) |
| Boss phases: new weapons or parts once half the parts are down | [Rules](./rules) |
| 20+ levels made with the checker | [Levels](./levels) |

## 5.3 Known issues {#known-issues}

| Issue | Impact | Planned fix |
|---|---|---|
| Fighters in the flight zone can overlap while patrolling or lining up under the same target | Cosmetic | Spread lanes or add separation |
| The level checker doesn't model time, so it can't prove a level survivable on zone HP | A level could be winnable but too punishing | HP is tuned by playtesting (see [Levels 4.4](./levels#hp-tuning)) |
| No undo; one wrong tap can doom a hard level | Level 5 is unforgiving | Consider an undo or "recall" power-up (M3) |

## 5.4 Open questions {#open-questions}

The prototype made these calls where the brief left room. Each is easy to change.

| Question | Options | Current lean |
|---|---|---|
| Which board edge is the exit? | Top only · any edge | **Top only**: the flight zone sits above the board, and it makes paths a real puzzle |
| Do walls block paths? | Yes · only fighters block | **Yes** |
| What does a fighter do with no matching enemy? | Patrol idle · return to the board | **Patrol idle**, occupying its slot (the main source of tension) |
| How much HP does one enemy bullet take? | 1 · 10 · scale with level | **10**: with 1, enemies would have to live ~2 minutes each to matter; 10 leaves a fast player about half the HP on the hardest level |
| Which enemies fire? | All · only unshielded ones | **All**, including shielded ones |
| Is shielding per column or per row? | Overlap-based (line of fire) · whole front row first | **Overlap-based**: matches straight bullets |
| Keep the instant "Out of space" loss now that the zone has HP? | Keep · let HP drain instead | **Keep**: a jammed zone can never recover, so making the player wait is pointless |
| Can bullets be wasted on overkill? | Yes · no | **No**: required so the balance rule guarantees a win |
| Where do empty fighters go? | Off the top · off the sides | **Off the top** |
