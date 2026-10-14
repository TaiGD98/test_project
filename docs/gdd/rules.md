# 3. Rules & mechanics

All numbers on this page come from `src/game/rules.ts` (game rules) and `src/game/layout.ts` (screen and timings). Change them there first, then here.

## 3.1 The board (hangar) <Badge type="tip" text="Live" />

- A rectangular grid; **each level sets its own size**.
- At the start of a level **every cell holds a fighter or a wall**: no empty cells.
- The hangar is as compact as possible: rows and columns differ by at most 1, and there are fewer walls than the grid's shorter side (otherwise a smaller grid would fit). The level checker enforces both rules.
- Cells are square: `min(720 / columns, 565 / rows, 112)` px, and the board is centred horizontally under the flight zone.
- **Walls** cannot be tapped and never move. They only block paths.
- **Obstacles:** elevators (from level 6, [3.6](#elevator)), mystery fighters (from level 11, [3.7](#mystery)) and frozen fighters (from level 21, [3.8](#frozen)).

## 3.2 Fighters <Badge type="tip" text="Live" />

| Property | Value |
|---|---|
| Colour | One of 8: Red, Blue, Green, Yellow, Purple, Orange, Cyan, Pink |
| Ammo | **18** by default; a level can override it per cell |
| Bullet colour | Same as the fighter |
| Damage | 1 hit point per bullet |

### Launching

The player taps a fighter. It can launch only when there is a **path out of the top edge of the board** that passes through **empty cells only**: other fighters and walls block it. Paths move up, down, left and right (no diagonals), and the game uses the shortest one. Because the hangar starts full, only the top row can launch at first, and every launch opens space for the fighters behind it.

- Fighters that can launch right now **idle**: they bob gently in place (5 px, 0.7 s each way) with their engines burning, like in the flight zone. Blocked fighters are dimmed to 45% opacity, still, with engines off.
- Tapping a blocked fighter: it shakes and the toast *"No way out: clear a path to the top"* appears.
- Tapping when the flight zone is full: it shakes, the toast *"Flight zone full"* appears and the capacity text pulses.
- On launch the fighter's cell becomes empty at once (it can unblock others straight away). It taxis along the path at **70 ms per cell**, then climbs to the flight zone in 280 ms.

## 3.3 Flight zone <Badge type="tip" text="Live" />

- Holds at most **5 fighters**, counting fighters still taxiing. There are no visible slots: only the text `n/5` at the zone's top left, which turns red at 5/5.
- Fighters with nothing to shoot patrol left and right between x = 70 and x = 710 at a random speed of **150–230 px/s**, bouncing at the edges. They never leave the zone to attack.

### Flight zone HP <Badge type="danger" text="Off for now" />

> **Switched off** (`RULES.enemyFire = false` in `src/game/rules.ts`): enemies don't shoot, the flight zone has no HP and no HP bar is shown. Everything below is kept for when it comes back.

The flight zone is what the player protects. It has a pool of HP shown as `HP n/max` with a bar (green, then yellow below 50%, red below 25%).

> **Zone HP = hpPerEnemy × enemies in the level**, where a boss counts as **10** enemies.

`hpPerEnemy` is set per level: **40** on the easiest level, down to **20** on the hardest (the checker only allows 20–40). A level can also add a flat `zoneHpBonus` on top for hand tuning. Each enemy bullet that reaches the flight zone takes **10 HP** and flashes the zone red. At 0 HP the level is lost.

### Shooting

- A fighter only shoots enemies **of its own colour** that are **not shielded** (see 3.4). With no such enemy it keeps patrolling without firing.
- **Line up, then fire.** A fighter with a target first moves under it at **1100 px/s** (aiming at a random point within the middle 44% of the target's width), and fires only once it is within 6 px of that point.
- Bullets fly **straight up** at **1900 px/s** and never turn. A bullet hits when it reaches the front quarter of its target. Because the fighter lines up first and the formation drifts only a few px during a bullet's flight, every bullet lands on the target it was fired at.
- Fire rate: one bullet every **0.11 s** per fighter.
- **Target order:** the frontmost unshielded target of the fighter's colour (lowest on screen), then left to right.
- **No wasted bullets.** A fighter only fires if the target still has hit points that bullets already in the air won't cover. Among fighters of the same colour, the one that arrived **first** gets first claim on the hit points it can reach, so it empties and frees its slot first. A later fighter only fires at whatever the earlier ones can't cover.
- When a fighter fires its last bullet it **flies off the top of the screen** and its slot is free immediately.

## 3.4 Enemies <Badge type="tip" text="Live" />

### Front first: shielding

A target (enemy or boss part) is **shielded** while a living target sits **in front of it** (lower on screen) and overlaps it sideways by more than 8 px. Shielded targets can't be shot, even by a fighter of the right colour, and are drawn at 60% opacity. The ones in front have to go down first. This applies to boss parts too.

### Regular enemies

| Size | Hit points | Display width |
|---|---|---|
| Small | **3** | 74 px |
| Medium | **6** | 100 px |
| Large | **9** | 128 px |

- Each enemy has one colour and shows its remaining hit points.
- A stage's enemies are packed into centred rows in the order the level lists them: the first groups end up at the back (top), the last at the front.
- They fly in from the top over 650 ms and sway together ±22 px.
- **They shoot back** <Badge type="danger" text="Off for now" />: one bullet straight down every **3 s** (the first shot comes at a random time within the first 0.5–3 s, so a formation doesn't fire in unison). Enemy bullets travel at **460 px/s**.
- At 0 hit points an enemy explodes in its colour.

### Boss

- Appears **only in the last stage** of a level (the level checker rejects a boss anywhere else).
- **One complete spaceship** whose sections are its parts (**2–8**): two wings, the central hull with a glowing reactor, the nose, two engines and two outer gun pods. Unused sections are simply not built; the rest of the hull is dark metal. Each part has its own colour, a large pool of hit points (18–36 in the shipped levels) and **its own weapon** (weapons are off for now with enemy fire).
- Three designs share those sections, so the rules are identical whichever one a level uses (`boss.design` in the level file):

| Design | Look | Used in |
|---|---|---|
| `raptor` | Angular warship: forward-swept blade wings, split-jaw prow, thruster blocks, spike cannons | Levels 3, 8 |
| `mantis` | Insectoid hive ship: hooked claw arms, an orb body with a segmented tail, a stinger prow, round engine pods | Levels 4, 7, 10 |
| `dreadnought` | Battle saucer: a ring split into armoured sectors around a reactor dome, satellite gun turrets | Levels 5, 9 |

- Parts fill the slots below in order. The slot sets the part's position and default weapon (a level can override the weapon):

| Slot | Position (from boss centre) | Weapon | Every | Bullets |
|---|---|---|---|---|
| 1. Left wing | −180, 0 | Spread (fan, 14° apart) | 4 s | 3 |
| 2. Right wing | +180, 0 | Spread | 4 s | 3 |
| 3. Core | 0, −20 | Spread | 5 s | 5 |
| 4. Nose | 0, +130 | Burst (straight down, 0.12 s apart) | 3.5 s | 4 |
| 5. Left engine | −105, −140 | Single | 1.5 s | 1 |
| 6. Right engine | +105, −140 | Single | 1.5 s | 1 |
| 7. Left gun pod | −300, −70 | Aimed at a fighter | 2.5 s | 2 |
| 8. Right gun pod | +300, −70 | Aimed at a fighter | 2.5 s | 2 |

- Shielding makes the order strategic: the nose shields the core, and the wings and core shield the engines. The gun pods are never shielded, so the fast aimed guns can be silenced first.
- When a part reaches 0 it explodes, the screen shakes, the part **stops firing** and stays on the hull **burnt out** (darkened to 28% of its colour).
- When every part is destroyed the boss dies: a chain of 8 explosions, a longer screen shake, then it fades out.

### Enemy bullets <Badge type="danger" text="Off for now" />

- An enemy bullet that reaches the flight zone costs zone HP (see 3.3). Bullets that leave the screen sideways do nothing.
- **If the enemy or boss part that fired a bullet is destroyed, its bullets still in the air vanish.**
- Enemy bullets don't hit fighters, and fighters' bullets don't hit enemy bullets.

## 3.5 Stages <Badge type="tip" text="Live" />

- A level is a sequence of stages. Each stage has a fixed set of enemies; the last stage may be a boss (optionally with escorts).
- No banner announces a stage. Progress shows as a small row in the HUD under the level name: **one dot per stage** on a line. Cleared stages and the current one are lit (the current dot also has a glow ring), later ones are dark. A boss stage is a **BOSS** badge instead of a dot, lit red when reached.
- Fighters start shooting (and enemies start firing, when enemy fire is on) once the whole stage has flown in.
- When every enemy in the stage is destroyed, the next stage flies in after **0.7 s** (1.4 s after a boss).

## 3.6 Elevator {#elevator} <Badge type="tip" text="Live" />

First appears in **level 6**.

- Takes **one cell** of the hangar and **faces one direction** (up, down, left or right), shown by a glowing chevron on the side it opens to.
- It holds a **fixed queue of fighters**, set in the level file. The number left is shown on the elevator, with a dim preview of the next fighter inside.
- Whenever the cell it faces becomes empty (its fighter launched), the elevator **rolls its next fighter out into that cell** (0.26 s). The new fighter can be tapped once it has arrived. This repeats until the queue is empty.
- The elevator itself works like a wall: it can't be tapped, never moves, and blocks paths, even after it is empty.
- Its fighters carry 18 ammo like any other and count towards the [balance rule](./levels#balance-rule).
- Level rules: an elevator must face a fighter cell inside the grid, and two elevators can't face the same cell.

Level 6 introduces it with a tutorial card (see [3.9](#tutorials)).

## 3.7 Mystery fighter {#mystery} <Badge type="tip" text="Live" />

First appears in **level 11**.

- Drawn as a **black silhouette with a "?"**: its colour is hidden.
- The moment it **has a way out** (a clear path to the top), it reveals its colour with a flash and becomes a normal fighter for good.
- Until then it behaves like any blocked fighter: it occupies its cell and blocks paths.
- Mystery fighters are never placed in the top row, where they would reveal at once.
- The level checker's solver knows the hidden colours, so every level is still provably winnable; the player has to discover them.

## 3.8 Frozen fighter {#frozen} <Badge type="tip" text="Live" />

First appears in **level 21**.

- Encased in translucent ice with a **counter** (the fighter's colour shows through).
- **Every fighter launched from anywhere on the grid lowers every counter by 1.** At 0 the ice shatters and it becomes a normal fighter.
- While frozen it **can't be launched** (tapping it shakes it and shows *"Frozen: launch N more fighters"*) and it blocks paths like any fighter.
- Each time the counter drops, the number pops and shards of ice fall off; the block gets thinner. At 0 the block bursts into shards with a flash.
- A fighter can't be both mystery and frozen.

## 3.9 Tutorials {#tutorials} <Badge type="tip" text="Live" />

A level can open with tutorial cards. Each card dims the screen except the first cell of one kind (elevator, mystery or frozen fighter), outlines it with a pulsing ring and an arrow, and shows a short text. Tap to go to the next card; after the last one the first stage flies in.

| Level | Cards |
|---|---|
| 6 | Elevator: *"More fighters roll out of here whenever the cell it faces is clear"* |
| 11 | Mystery: *"Mystery fighters hide their colour until they have a way out"* |
| 21 | Frozen: (1) *"This fighter is frozen solid. It can't take off yet"*, (2) *"Launch 3 fighters from anywhere and the ice will break"* (the number is the real counter), then (3) when the ice first breaks during play: *"The ice broke! Send it up once it has a way out"* |

## 3.10 Winning and losing <Badge type="tip" text="Live" />

| Result | Condition |
|---|---|
| **Level cleared!** | The last stage is destroyed. The panel shows the zone HP left. |
| **Flight zone destroyed** | Zone HP reaches 0. Can't happen while enemy fire is off. |
| **Out of space** | The flight zone is full (5/5), no fighter in it has anything to shoot, and nothing is in the air. |
| **No moves left** | The flight zone has free slots but no fighter on the board can launch (none has a way out, or the only ones that do are frozen), and nothing can shoot. |

"Out of space" and "No moves left" are only declared after the game has been in that state for **0.6 s**, so a slot that is about to free up never counts as a loss.

Because each colour's ammo equals that colour's enemy hit points (see [Levels & balance](./levels#balance-rule)), a fighter never ends a level with ammo left over, and the board is always empty when a level is won. With enemy fire on, zone HP turns this into a race: every second a stage stays alive, its enemies keep firing.
