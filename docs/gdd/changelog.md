# 6. Changelog

Every published version stays playable at its own URL. The [landing page](https://taigd98.github.io/test_project/) lists them all.

## latest (main) <Badge type="tip" text="Live" />

- **Core game:** tap fighters out of a full hangar grid (walls and other fighters block the path to the top), up to 5 in the flight zone; fighters line up under an enemy of their colour and fire straight up, then fly off when out of ammo.
- **Enemies:** small, medium and large enemies (3 / 6 / 9 hp) and a multi-part boss in the final stage. Enemies at the front shield those behind; destroyed boss parts burn out.
- **Enemy fire and zone HP:** enemies shoot every 3 s and each boss part has its own weapon; bullets that land cost flight-zone HP (40 down to 20 per enemy, by level) and vanish if their shooter dies.
- **Levels:** 5 sample levels from 2 colours / 4 fighters to 8 colours / 32 fighters, with stages, win and lose screens, and a level select screen that marks cleared levels.
- **Game Design Document:** overview, core loop, rules with exact numbers, and a new Levels & balance chapter.

[Play latest](https://taigd98.github.io/test_project/demo/)

## Document history

| Date | Change |
|---|---|
| 2026-10-12 | GDD created |
| 2026-10-13 | Wrote the GDD for the hangar shooter; added Levels & balance |
| 2026-10-13 | Added aiming, shielding, enemy fire, zone HP and boss weapons; compact full hangars |
| 2026-10-13 | Level 5: +500 zone HP (zoneHpBonus) |
