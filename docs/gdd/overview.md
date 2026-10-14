# 1. Overview

| | |
|---|---|
| **Title** | Fighter Force |
| **Genre** | Puzzle · colour-matching auto-shooter |
| **Platform** | Web (mobile portrait first) |
| **Engine** | Phaser 4, TypeScript, Vite |
| **Session** | 1–4 minutes per level |

## 1.1 Pitch <Badge type="tip" text="Live" />

A packed hangar of colour-coded fighter planes sits under an enemy armada. Tap a fighter to send it up to the flight zone, where it lines up under an enemy of **its own colour** and fires straight up. Enemies at the front shield the ones behind them, and every enemy shoots back at the flight zone, which has limited HP. Only fighters with a clear path out of the hangar can take off, and only 5 can fly at once. The puzzle is the **order**: launch the right colours for the front line in front of you, fast, and don't fill the sky with fighters that have nothing to shoot.

## 1.2 Design pillars

1. **Every tap is a decision.** The player never aims; all skill is in choosing which fighter to launch next, and launching it before enemy fire wears the flight zone down.
2. **Readable at a glance.** Colour, a number (ammo on fighters, hit points on enemies) and a dimmed/bright state tell the whole story.
3. **Always fair.** Every level is built so each colour's ammo exactly equals that colour's enemy hit points, and a solver proves every shipped level can be won (see [Levels & balance](./levels)).

## 1.3 Target player

Casual mobile puzzle players who enjoy sort, jam and unblock games (one-thumb play, short sessions), plus a light shooter fantasy for visual payoff.

## 1.4 Screen at a glance

The 780 × 1688 portrait canvas is split top to bottom:

| Area | y range (px) | What happens there |
|---|---|---|
| HUD | 0–150 | Level name, stage progress dots (BOSS badge), home and restart buttons |
| Enemy area | 150–880 | The current stage's enemies or boss |
| Flight zone | 880–1060 | Launched fighters line up and shoot; shows `n/5` (and the zone's HP bar when enemy fire is on) |
| Hangar board | 1095–1660 | The full grid of fighters, walls and elevators the player taps |

## 1.5 Art direction <Badge type="tip" text="Live" />

Glossy arcade space shooter, in the style of mobile "galaxy attack" games: dark space, metallic ships, neon light.

| Element | Look |
|---|---|
| Background | Deep navy-to-purple nebula with two star layers scrolling down at different speeds (18 and 55 px/s) for parallax |
| Fighters | Fighters that can launch idle with a gentle bob and burning engines. **One colour tone only**: fuselage, wings, canopy, guns and engine flame are all tints and shades of the fighter's colour (no grey, gold or blue). The ammo number only appears once the fighter is in the flight zone |
| Regular enemies | Bat-winged drones (small, medium) and spiked heavies (large): armour in the enemy's colour, dark metal body, glowing core, orange engine flames |
| Boss | One complete spaceship in one of three designs (raptor warship, mantis hive ship, dreadnought battle saucer), nose down. Each part is a section of the airframe painted in its colour (wings, central hull with reactor, nose, engines with flames, outer gun pods) on a dark metal hull. The guns on each section show its weapon (single, triple spread, long burst barrel, aimed twin barrels). Destroyed sections go dark and their engine flames go out |
| Bullets | Fighters fire neon plasma bolts in their colour, straight up; enemies would fire spinning glowing diamonds in theirs (enemy fire is off for now) |
| Effects | Additive light: muzzle flashes, hit sparks, explosions with a white core, coloured bloom, shockwave ring and sparks |
| Hangar and UI | Dark glass panels with chamfered corners and glowing cyan edges; landing-slot cells; walls are metal crates with hazard stripes; the flight zone is a cyan energy-shield band; stage progress is a row of dots with a BOSS badge in the HUD |
| Home screen | Just the title **FIGHTER FORCE** (with a cyan glow) over the hero fighter, and a **PLAY** button |
| Elevator | Metal lift shaft with a glowing chevron on the side it faces, its remaining count, and a dim preview of the next fighter |
| Mystery fighter | Near-black silhouette with a violet rim and a big "?"; reveals with a coloured flash |
| Frozen fighter | Translucent faceted ice block with cracks over the fighter and a large counter; shards fall at each count, and the block bursts at 0 |
| Font | Russo One (Google Fonts), falling back to Arial Black |

**Colour is still the gameplay read:** every ship, plate and bullet is painted in its gameplay colour, so the art never hides which fighter can hit what. All art is painted in code at start-up (`src/game/art.ts`) with the Canvas 2D API, so there are no image files to manage yet.
