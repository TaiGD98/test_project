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

1. **Well formed**: known cell letters, every stage has enemies, a boss (2–8 parts) only in the last stage, `hpPerEnemy` between 20 and 40.
2. **Compact, full hangar**: no empty cells, rows and columns differ by at most 1, fewer walls than the shorter side.
3. **Balanced**: ammo equals hit points for every colour.
4. **Winnable**: a solver searches tap orders, modelling a patient player who lets the flight zone finish shooting before each tap. It uses the game's own stage layout, so it respects shielding (front targets first), target order and the oldest-first ammo rule. The build fails if no winning order exists. The solver doesn't model time, so it can't see flight-zone HP; that is tuned by playtesting (see 4.4).
5. **Difficulty signal**: the *random win rate* is the share of 2,000 games of random legal taps that win. Lower means harder. It varies by about ±1 point between runs.

`node scripts/validate-levels.ts --solution` also prints a winning tap order (row,col) for each level.

## 4.3 Shipped levels <Badge type="tip" text="Live" />

Legend: `#` wall · letters are fighters (**R**ed **B**lue **G**reen **Y**ellow **P**urple **O**range **C**yan **K** pink). The top row touches the flight zone and is the only row that can launch at the start.

| # | Name | Grid (cols × rows) | Fighters | Colours | Stages | hpPerEnemy | Zone HP | Random win rate |
|---|---|---|---|---|---|---|---|---|
| 1 | First Flight | 2 × 2 | 4 | 2 | 2 | 40 | 480 (12 enemies) | 100% |
| 2 | Wall Drills | 3 × 3, 1 wall | 8 | 3 | 3 | 35 | 770 (22) | ~90% |
| 3 | Boss Debut | 4 × 3 | 12 | 4 | 3 (boss) | 30 | 750 (15 + boss) | ~57% |
| 4 | Crossfire | 5 × 4 | 20 | 6 | 4 (boss) | 25 | 1075 (33 + boss) | ~23% |
| 5 | Armada | 6 × 6, 4 walls | 32 | 8 | 5 (boss) | 20 | 1640 (47 + boss, +500 bonus) | under 1% |

The grids were found by a search that shuffles each level's fighters into the compact grid, keeps only layouts the solver can win, and picks the one whose random win rate is closest to that level's difficulty target.

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

## 4.4 Flight-zone HP tuning {#hp-tuning}

Measured on level 5 by a script that plays the solver's tap order. The numbers below were taken at zone HP 1140, before the +500 bonus (10 HP per enemy bullet):

| Player model | Time | Enemy bullets landed | Zone HP left |
|---|---|---|---|
| Taps the next fighter the moment a slot is free | 53 s | 59 | ~48% (now ~64% of 1640) |
| Waits for every volley to finish before each tap | 111 s | 256 | 0%: destroyed after ~114 hits (now ~164) |

A real player sits between the two. Level 5 has a `zoneHpBonus` of 500 on top of the formula to give players more room. To make a level more forgiving, raise its `hpPerEnemy` or add a `zoneHpBonus`; to change all levels at once, change `enemyBulletDamage` in `src/game/rules.ts`.

## 4.5 Making a level

See the developer guide's [Level design](../guide/level-design) page for the JSON format and workflow.
