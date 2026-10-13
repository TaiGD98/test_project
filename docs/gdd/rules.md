# 3. Rules & mechanics

All numbers on this page come from `src/game/rules.ts` (game rules) and `src/game/layout.ts` (screen and timings). Change them there first, then here.

## 3.1 The board (hangar) <Badge type="tip" text="Live" />

- A rectangular grid; **each level sets its own size**.
- At the start of a level **every cell holds a fighter or a wall**: no empty cells.
- The hangar is as compact as possible: rows and columns differ by at most 1, and there are fewer walls than the grid's shorter side (otherwise a smaller grid would fit). The level checker enforces both rules.
- Cells are square: `min(720 / columns, 565 / rows, 112)` px, and the board is centred horizontally under the flight zone.
- **Walls** cannot be tapped and never move. They only block paths.

## 3.2 Fighters <Badge type="tip" text="Live" />

| Property | Value |
|---|---|
| Colour | One of 8: Red, Blue, Green, Yellow, Purple, Orange, Cyan, Pink |
| Ammo | **18** by default; a level can override it per cell |
| Bullet colour | Same as the fighter |
| Damage | 1 hit point per bullet |

### Launching

The player taps a fighter. It can launch only when there is a **path out of the top edge of the board** that passes through **empty cells only**: other fighters and walls block it. Paths move up, down, left and right (no diagonals), and the game uses the shortest one. Because the hangar starts full, only the top row can launch at first, and every launch opens space for the fighters behind it.

- Fighters with a path are drawn bright. Blocked fighters are dimmed to 45% opacity.
- Tapping a blocked fighter: it shakes and the toast *"No way out: clear a path to the top"* appears.
- Tapping when the flight zone is full: it shakes, the toast *"Flight zone full"* appears and the capacity text pulses.
- On launch the fighter's cell becomes empty at once (it can unblock others straight away). It taxis along the path at **70 ms per cell**, then climbs to the flight zone in 280 ms.

## 3.3 Flight zone <Badge type="tip" text="Live" />

- Holds at most **5 fighters**, counting fighters still taxiing. There are no visible slots: only the text `Flight zone n/5`, which turns red at 5/5.
- Fighters with nothing to shoot patrol left and right between x = 70 and x = 710 at a random speed of **150–230 px/s**, bouncing at the edges. They never leave the zone to attack.

### Flight zone HP

The flight zone is what the player protects. It has a pool of HP shown as `HP n/max` with a bar (green, then yellow below 50%, red below 25%).

> **Zone HP = hpPerEnemy × enemies in the level**, where a boss counts as **10** enemies.

`hpPerEnemy` is set per level: **40** on the easiest level, down to **20** on the hardest (the checker only allows 20–40). A level can also add a flat `zoneHpBonus` on top for hand tuning. Each enemy bullet that reaches the flight zone takes **10 HP** and flashes the zone red. At 0 HP the level is lost.

### Shooting

- A fighter only shoots enemies **of its own colour** that are **not shielded** (see 3.4). With no such enemy it keeps patrolling without firing.
- **Line up, then fire.** A fighter with a target first moves under it at **1100 px/s** (aiming at a random point within the middle 44% of the target's width), and fires only once it is within 6 px of that point.
- Bullets fly **straight up** at **1900 px/s**. Once a bullet is within **90 px** of its target it steers into the target's centre, so it never misses.
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
- **They shoot back:** one bullet straight down every **3 s** (the first shot comes at a random time within the first 0.5–3 s, so a formation doesn't fire in unison). Enemy bullets travel at **460 px/s**.
- At 0 hit points an enemy explodes in its colour.

### Boss

- Appears **only in the last stage** of a level (the level checker rejects a boss anywhere else).
- A large grey hull carrying **2–8 armour parts**. Each part has its own colour, a large pool of hit points (18–36 in the shipped levels) and **its own weapon**.
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

### Enemy bullets

- An enemy bullet that reaches the flight zone costs zone HP (see 3.3). Bullets that leave the screen sideways do nothing.
- **If the enemy or boss part that fired a bullet is destroyed, its bullets still in the air vanish.**
- Enemy bullets don't hit fighters, and fighters' bullets don't hit enemy bullets.

## 3.5 Stages <Badge type="tip" text="Live" />

- A level is a sequence of stages. Each stage has a fixed set of enemies; the last stage may be a boss (optionally with escorts).
- The HUD shows `Stage n/total`. A banner announces each stage (`Stage n`, or `BOSS` + its name).
- Fighters start shooting, and enemies start firing, once the whole stage has flown in.
- When every enemy in the stage is destroyed, the next stage flies in after **0.7 s** (1.4 s after a boss).

## 3.6 Winning and losing <Badge type="tip" text="Live" />

| Result | Condition |
|---|---|
| **Level cleared!** | The last stage is destroyed. The panel shows the zone HP left. |
| **Flight zone destroyed** | Zone HP reaches 0. |
| **Out of space** | The flight zone is full (5/5), no fighter in it has anything to shoot, and nothing is in the air. |
| **No moves left** | The flight zone has free slots but no fighter on the board can reach the top, and nothing can shoot. |

"Out of space" and "No moves left" are only declared after the game has been in that state for **0.6 s**, so a slot that is about to free up never counts as a loss.

Because each colour's ammo equals that colour's enemy hit points (see [Levels & balance](./levels#balance-rule)), a fighter never ends a level with ammo left over, and the board is always empty when a level is won. Zone HP turns this into a race: every second a stage stays alive, its enemies keep firing.
