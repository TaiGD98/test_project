# 6. Changelog

Every published version stays playable at its own URL. The [landing page](https://taigd98.github.io/test_project/) lists them all.

## latest (main) <Badge type="tip" text="Live" />

- **Core game:** tap fighters out of a full hangar grid (walls and other fighters block the path to the top), up to 5 in the flight zone; fighters line up under an enemy of their colour and fire straight up, then fly off when out of ammo.
- **Enemies:** small, medium and large enemies (3 / 6 / 9 hp) and a multi-part boss in the final stage. Enemies at the front shield those behind; destroyed boss parts burn out.
- **Enemy fire and zone HP** (built, switched off for now): enemies shoot every 3 s and each boss part has its own weapon; bullets that land cost flight-zone HP (40 down to 20 per enemy, by level) and vanish if their shooter dies.
- **Stage progress:** a row of dots in the HUD (BOSS badge for the boss stage) replaces the stage banner.
- **Art:** glossy space-shooter style: nebula and parallax stars, painted metallic ships per colour with engine flames, neon plasma and glowing enemy shots, additive explosions, a boss built as one warplane whose sections are its coloured parts, single-tone fighters, sci-fi panels and the Russo One font.
- **Levels:** 35 levels: 1–5 from 2 colours / 4 fighters to 8 colours / 32 fighters, then 6–10 built around the elevator (6 is a tutorial). Stages, win and lose screens.
- **Mystery and Frozen fighters:** mystery fighters hide their colour until they have a way out (from level 11); frozen fighters thaw after a number of launches, with falling shards and a shatter (from level 21). Both have tutorial cards.
- **Idle animation:** fighters that can launch bob in place with engines burning.
- **Levels 11–35:** mystery, mystery + elevator, frozen, and two-obstacle blocks; 30 and 35 use all three obstacles.
- **Elevator:** a new hangar obstacle that rolls its queued fighters out into the cell it faces whenever that cell is cleared; level 6 introduces it with a tutorial overlay.
- **Fighter Force:** the game has a name. The home screen is just the title and a Play button that continues from the first uncleared level.
- **Bosses:** three spaceship designs (raptor, mantis, dreadnought); each part is a coloured section of the ship.
- **Game Design Document:** overview, core loop, rules with exact numbers, and a new Levels & balance chapter.

[Play latest](https://taigd98.github.io/test_project/demo/)

## Document history

| Date | Change |
|---|---|
| 2026-10-12 | GDD created |
| 2026-10-13 | Wrote the GDD for the hangar shooter; added Levels & balance |
| 2026-10-13 | Added aiming, shielding, enemy fire, zone HP and boss weapons; compact full hangars |
| 2026-10-13 | Level 5: +500 zone HP (zoneHpBonus) |
| 2026-10-14 | New art direction (overview 1.5) |
| 2026-10-14 | Mystery and Frozen obstacles, idle animation, levels 11–35, multi-step tutorials |
| 2026-10-14 | Elevator and levels 6–10, three boss designs, home screen, game named Fighter Force |
| 2026-10-14 | Enemy fire and zone HP off; stage progress dots; straight bullets; boss as one aircraft; single-tone fighters |
