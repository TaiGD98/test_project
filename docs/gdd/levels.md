# 4. Levels & balance

## 4.1 Balance rule {#balance-rule} <Badge type="tip" text="Live" />

> For every colour, the **total ammo of that colour's fighters** must equal the **total hit points of that colour's enemies and boss parts** across all stages.

With the default 18 ammo per fighter, each colour's enemies add up to a multiple of 18. Handy combinations for one 18-ammo fighter:

| Enemies | Hit points |
|---|---|
| 2 large | 9 + 9 |
| 3 medium | 6 + 6 + 6 |
| 6 small | 3 × 6 |
| 1 large + 1 medium + 1 small | 9 + 6 + 3 |
| 2 medium + 2 small | 6 + 6 + 3 + 3 |
| A boss part | 18 or 36 |

Balance makes a level *possible* but not *easy*: the order of taps still decides whether the 5-slot flight zone jams.

## 4.2 Level checker {#checker} <Badge type="tip" text="Live" />

`npm run validate:levels` (it also runs at the start of every `npm run build`) checks each `src/levels/level-*.json`:

1. **Well formed**: known cell letters, every stage fits on screen, every stage has enemies, a boss (2–8 parts) only in the last stage, `hpPerEnemy` between 20 and 40.
2. **Compact, full hangar**: no empty cells, rows and columns differ by at most 1, fewer walls than the shorter side (elevators don't count as walls). Every elevator faces a fighter cell, has a queue, and no two face the same cell. Mystery and frozen entries point at fighter cells and never overlap.
3. **Balanced**: ammo equals hit points for every colour.
4. **Winnable**: a solver searches tap orders, modelling a patient player who lets the flight zone finish shooting before each tap. It uses the game's own stage layout, so it respects shielding (front targets first), target order, the oldest-first ammo rule, elevator refills and frozen counters (it knows mystery colours). The build fails if no winning order exists. The solver doesn't model time, so it can't see flight-zone HP; that is tuned by playtesting (see 4.4).
5. **Difficulty signal**: the *random win rate* is the share of 2,000 games of random legal taps that win. Lower means harder. It varies by about ±1 point between runs.

`node scripts/validate-levels.ts --solution` also prints a winning tap order (row,col) for each level.

## 4.3 Shipped levels <Badge type="tip" text="Live" />

Legend: `#` wall · `^` `v` `<` `>` elevator facing up / down / left / right · letters are fighters (**R**ed **B**lue **G**reen **Y**ellow **P**urple **O**range **C**yan **K** pink). The top row touches the flight zone and is the only row that can launch at the start.

| # | Name | Grid (cols × rows) | Fighters | Colours | Stages | hpPerEnemy | Zone HP | Random win rate |
|---|---|---|---|---|---|---|---|---|
| 1 | First Flight | 2 × 2 | 4 | 2 | 2 | 40 | 480 (12 enemies) | 100% |
| 2 | Wall Drills | 3 × 3, 1 wall | 8 | 3 | 3 | 35 | 770 (22) | ~90% |
| 3 | Boss Debut | 4 × 3 | 12 | 4 | 3 (boss) | 30 | 750 (15 + boss) | ~57% |
| 4 | Crossfire | 5 × 4 | 20 | 6 | 4 (boss) | 25 | 1075 (33 + boss) | ~23% |
| 5 | Armada | 6 × 6, 4 walls | 32 | 8 | 5 (boss) | 20 | 1640 (47 + boss, +500 bonus) | under 1% |
| 6 | Reinforcements | 3 × 3, 1 wall, 1 elevator | 9 | 2 | 2 | 40 | 1280 (32) | 100% (tutorial) |
| 7 | Supply Line | 4 × 4, 1 wall, 1 elevator | 17 | 3 | 3 (boss) | 35 | 1785 (41 + boss) | ~77% |
| 8 | Double Lift | 4 × 4, 2 elevators | 19 | 4 | 4 (boss) | 30 | 1470 (39 + boss) | ~57% |
| 9 | Rush Hour | 5 × 5, 1 wall, 2 elevators | 28 | 5 | 5 (boss) | 25 | 1725 (59 + boss) | ~27% |
| 10 | Endless Hangar | 6 × 5, 1 wall, 3 elevators | 36 | 8 | 6 (boss) | 20 | 1560 (68 + boss) | ~0% (solver-proven winnable) |

Levels 6–10 start a second difficulty ramp around the elevator: level 6 is a tutorial, 7 and 8 step up moderately, 9 and 10 are hard. Fighter counts include the ones waiting in elevators.

### Levels 11–35

Each block opens easy and ends hard; a new obstacle starts its block with a tutorial level.

| Levels | Theme |
|---|---|
| 11–15 | Mystery fighters (11 is the tutorial) |
| 16–20 | Mystery + elevators |
| 21–25 | Frozen fighters (21 is the tutorial) |
| 26–35 | Two obstacles each; **30 and 35 use all three** and are the peaks |

| # | Name | Grid (cols × rows) | Fighters | Colours | Obstacles | Stages | hpPerEnemy | Random win rate |
|---|---|---|---|---|---|---|---|---|
| 11 | Fog of War (tutorial) | 3 × 3 | 9 | 2 | 3 mystery | 2 | 40 | 100% |
| 12 | Blind Spot | 4 × 4, 1 wall | 15 | 3 | 4 mystery | 4 (boss: Shade Hawk, raptor) | 35 | ~81% |
| 13 | Masquerade | 4 × 4 | 16 | 4 | 6 mystery | 3 (boss: Veil Mantis, mantis) | 30 | ~49% |
| 14 | Smoke Screen | 5 × 5, 1 wall | 24 | 5 | 8 mystery | 4 (boss: Eclipse Ring, dreadnought) | 25 | ~20% |
| 15 | Dark Hangar | 6 × 6, 2 walls | 34 | 7 | 12 mystery | 6 (boss: Night Raptor, raptor) | 20 | under 1% |
| 16 | Hidden Supply | 4 × 4 | 18 | 3 | 1 elevator, 3 mystery | 4 (boss: Hive Warden, mantis) | 40 | ~88% |
| 17 | Shadow Lift | 4 × 4, 1 wall | 17 | 4 | 1 elevator, 4 mystery | 3 (boss: Gloom Saucer, dreadnought) | 35 | ~64% |
| 18 | Smoke and Mirrors | 5 × 4 | 24 | 4 | 2 elevators, 5 mystery | 5 (boss: Mirage, raptor) | 30 | ~38% |
| 19 | Ghost Convoy | 5 × 5, 1 wall | 29 | 5 | 2 elevators, 7 mystery | 6 (boss: Phantom Queen, mantis) | 25 | ~13% |
| 20 | Blackout | 6 × 6, 2 walls | 41 | 8 | 3 elevators, 10 mystery | 7 (boss: Black Star, dreadnought) | 20 | ~0% |
| 21 | Cold Start (tutorial) | 3 × 3 | 9 | 2 | frozen 3 | 2 | 40 | 100% |
| 22 | Permafrost | 4 × 4 | 16 | 3 | frozen 3/4 | 3 (boss: Frost Talon, raptor) | 35 | ~75% |
| 23 | Ice Field | 4 × 4, 1 wall | 15 | 4 | frozen 2/4/5 | 3 (boss: Rime Mantis, mantis) | 30 | ~53% |
| 24 | Deep Freeze | 5 × 5, 1 wall | 24 | 5 | frozen 3/5/6 | 4 (boss: Glacier, dreadnought) | 25 | ~19% |
| 25 | Absolute Zero | 6 × 6, 2 walls | 34 | 7 | frozen 3/4/6/8 | 6 (boss: Zero Point, raptor) | 20 | ~0% |
| 26 | Frost Fog | 4 × 4 | 16 | 4 | 4 mystery, frozen 3/5 | 3 (boss: Hoarfrost, mantis) | 35 | ~63% |
| 27 | Cold Storage | 4 × 4, 1 wall | 17 | 4 | 1 elevator, frozen 3/4 | 4 (boss: Cryo Vault, dreadnought) | 35 | ~48% |
| 28 | Night Shift | 5 × 4 | 24 | 4 | 2 elevators, 5 mystery | 5 (boss: Nightwing, raptor) | 30 | ~31% |
| 29 | Ice Lift | 5 × 5, 1 wall | 29 | 4 | 2 elevators, frozen 4/6 | 6 (boss: Frost Hive, mantis) | 30 | ~22% |
| 30 | Triple Threat | 5 × 5 | 29 | 5 | 2 elevators, 5 mystery, frozen 3/5 | 5 (boss: Tri-Core, dreadnought) | 25 | ~10% |
| 31 | Glacier Lift | 5 × 5, 1 wall | 29 | 5 | 2 elevators, frozen 4/6 | 6 (boss: Ice Empress, mantis) | 25 | ~15% |
| 32 | Whiteout | 5 × 5, 1 wall | 24 | 6 | 7 mystery, frozen 3/4/6 | 4 (boss: Blizzard, raptor) | 25 | ~8% |
| 33 | Dark Elevators | 6 × 5, 1 wall | 34 | 6 | 2 elevators, 8 mystery | 6 (boss: Umbra, dreadnought) | 20 | under 1% |
| 34 | Frozen Shadows | 6 × 6, 2 walls | 34 | 7 | 9 mystery, frozen 3/5/7 | 6 (boss: Shiver, raptor) | 20 | ~0% |
| 35 | Final Front | 6 × 6, 1 wall | 42 | 8 | 3 elevators, 8 mystery, frozen 4/6/8 | 7 (boss: Omega Swarm, mantis) | 20 | ~0% |

These levels were generated by the same search, which also places walls, elevators, mystery and frozen fighters at random and builds each stage from the colour counts. Random win rates of ~0% mean random tapping never won in 2,000 tries; the solver still proves each one winnable. Full layouts are in `src/levels/level-NN.json`.

The grids were found by a search that shuffles each level's fighters into the compact grid (and, for levels 6–10, into the elevator queues, with stages built from the colour counts), keeps only layouts the solver can win, and picks the one whose random win rate is closest to that level's difficulty target.

### Level 1: First Flight

```
RB
BR
```

Teaches tapping: the back row can only launch once the front row has gone. Never more than 4 fighters, so the flight zone can't jam.

| Stage | Enemies (back row first) |
|---|---|
| 1 | Red: 3 small + 1 large · Blue: 3 medium |
| 2 | Red: 3 medium · Blue: 2 large |

### Level 2: Wall Drills

```
GBG
RBR
BR#
```

Stage 1 wants only red, but the top row is green and blue. Digging through it takes slots, and launching too many blues and greens early can fill the zone.

| Stage | Enemies |
|---|---|
| 1 | Red: 2 large + 3 medium (36) |
| 2 | Green: 2 large + 3 medium (36) · Blue: 3 small + 1 large (18) |
| 3 | Red: large + medium + small (18) · Blue: 3 medium + 2 large (36) |

### Level 3: Boss Debut

```
GRYY
BRGR
YBBG
```

The first boss, with 4 parts: the nose (red) shields the core (yellow), so the nose has to fall first.

| Stage | Enemies |
|---|---|
| 1 | Red: 2 large (18) · Blue: 3 medium (18) |
| 2 | Green: large + medium + small · Yellow: 3 medium · Red: 2 medium + 2 small (18 each) |
| 3 | **Boss "Iron Hawk"**: wings Blue 36 and Green 36 · core Yellow 36 · nose Red 18 |

### Level 4: Crossfire

```
RROGB
OBYPG
PGYRY
PBBRO
```

Six colours in a full 5 × 4 hangar. Stages 2 and 3 stack two or three rows of enemies, so front rows of the wrong colour hold back the colours behind them.

| Stage | Enemies |
|---|---|
| 1 | Red: 2 large · Blue: 3 medium · Green: large + medium + small (18 each) |
| 2 | Yellow: 2 large · Purple: 3 medium · Orange: 6 small · Red: large + medium + small (18 each) |
| 3 | Blue: 2 large · Green: 3 medium · Yellow: 2 medium + 2 small · Orange: 2 large (18 each) |
| 4 | **Boss "Twin Talon"**: wings Red 36 and Blue 36 · core Green 18 · nose Yellow 18 · engines Purple 36 and Orange 18 |

### Level 5: Armada

```
KCRGBB
OY#PPC
BOOGP#
GC#RRY
YRGYK#
KCKBPO
```

Eight colours, 32 fighters (4 per colour, 72 ammo per colour, 576 in total) and the lowest zone HP per enemy. Random tapping almost never wins.

| Stage | Enemies |
|---|---|
| 1 | Red: 2 large · Blue: 3 medium · Green: 2 large · Yellow: large + medium + small (18 each) |
| 2 | Purple: 2 large · Orange: 3 medium · Cyan: 2 large · Pink: 2 medium + 2 small (18 each) |
| 3 | Red · Blue · Orange · Cyan: 2 large each · Purple · Green: 3 medium each (18 each) |
| 4 | Yellow: 2 large · Pink: 2 large · Red: 3 medium · Blue: large + medium + small · Green: 2 large (18 each) |
| 5 | **Boss "Dread Armada"** (all 8 slots): wings Red 18 and Blue 18 · core Green 18 · nose Yellow 36 · engines Purple 36 and Orange 36 · gun pods Cyan 36 and Pink 36 |

### Level 6: Reinforcements (elevator tutorial)

```
RRB
RBB
#^R      elevator (row 3) holds: R, B
```

Two colours, nothing to plan around: the point is to see the elevator refill the middle cell twice. The tutorial overlay explains it before the first stage.

### Level 7: Supply Line

```
RBRG
GRGB
RR^G     elevator holds: R, B, G
#BBB
```

Three colours and one elevator feeding the middle of the board, so the column above it keeps refilling. Boss: **Mantis Queen** (mantis, 3 parts: Blue 36, Green 36, Red 18).

### Level 8: Double Lift

```
GGRR
B>YG     elevator (row 2) faces right, holds: Y, R
YGYB
RB^B     elevator (row 4) faces up, holds: B, R, G
```

Two elevators that refill cells the player needs to dig through. Boss: **Razorwing** (raptor, 4 parts: Yellow 18, Red 36, Green 36, Blue 18).

### Level 9: Rush Hour

```
YGPGR
B<GBY    elevator faces left, holds: P, R, Y
BGBYB
PBRvR    elevator faces down, holds: G, Y, R
#RPGP
```

Five colours, four regular stages with stacked rows, and elevators that refill cells away from the exit. Boss: **Star Bastion** (dreadnought, 5 parts, mostly 36 hp).

### Level 10: Endless Hangar

```
PGRKYG
O^KP>R   elevators face up (holds R, Y, Y) and right (holds R, Y, G, O)
KRBCGP
#BC<CK   elevator faces left, holds: O, G, Y
BBCOBP
```

Eight colours, three elevators (one feeding the exit row), five regular stages and an 8-part boss: **Void Leviathan** (mantis). Random tapping never won in 2,000 tries; the solver finds a winning order.

## 4.4 Flight-zone HP tuning {#hp-tuning}

> Enemy fire and zone HP are switched off for now; these numbers apply once they're back on.

Measured on level 5 by a script that plays the solver's tap order. The numbers below were taken at zone HP 1140, before the +500 bonus (10 HP per enemy bullet):

| Player model | Time | Enemy bullets landed | Zone HP left |
|---|---|---|---|
| Taps the next fighter the moment a slot is free | 53 s | 59 | ~48% (now ~64% of 1640) |
| Waits for every volley to finish before each tap | 111 s | 256 | 0%: destroyed after ~114 hits (now ~164) |

A real player sits between the two. Level 5 has a `zoneHpBonus` of 500 on top of the formula to give players more room. To make a level more forgiving, raise its `hpPerEnemy` or add a `zoneHpBonus`; to change all levels at once, change `enemyBulletDamage` in `src/game/rules.ts`.

## 4.5 Making a level

See the developer guide's [Level design](../guide/level-design) page for the JSON format and workflow.
