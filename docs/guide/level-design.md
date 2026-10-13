# Level design

Levels are JSON files in `src/levels/`, named `level-NN.json`. The game loads every file matching that pattern in name order, so adding a file adds a level to the level select screen.

## Format

```json
{
  "id": 3,
  "name": "Boss Debut",
  "hpPerEnemy": 30,
  "grid": [
    "GRYY",
    "BRGR",
    "YBBG"
  ],
  "ammo": { "2,1": 12 },
  "stages": [
    { "enemies": [
      { "size": "large", "color": "R", "count": 2 },
      { "size": "medium", "color": "B", "count": 3 }
    ] },
    { "boss": { "name": "Iron Hawk", "parts": [
      { "color": "B", "hp": 36 },
      { "color": "R", "hp": 18, "attack": { "interval": 2, "pattern": "aimed", "bullets": 3 } }
    ] } }
  ]
}
```

| Field | Meaning |
|---|---|
| `hpPerEnemy` | Flight-zone HP per enemy, 20 (hardest) to 40 (easiest). Zone HP = hpPerEnemy × enemies, a boss counting as 10. |
| `zoneHpBonus` | Optional. Flat HP added to the zone on top of the formula. |
| `grid` | Rows top to bottom; row 0 touches the flight zone and is the exit edge. `#` wall, a colour letter is a fighter. **No empty cells.** Rows and columns may differ by at most 1, with fewer walls than the shorter side. |
| `ammo` | Optional. Overrides a fighter's ammo, keyed `"row,col"` (0-based). Default is 18. |
| `stages[].enemies` | Groups of regular enemies: `size` is `small` (3 hp), `medium` (6) or `large` (9); `count` defaults to 1. They are packed into rows in list order: **the first groups end up at the back**, the last at the front, and front enemies shield the ones behind them. |
| `stages[].boss` | Last stage only. `parts` is a list of 2–8 armour parts, each with a colour and hit points. Parts fill the boss slots in order (left wing, right wing, core, nose, left engine, right engine, left gun pod, right gun pod; see [Rules 3.4](../gdd/rules#boss)), which sets their position, what shields them and their default weapon. Optional `attack` overrides the weapon: `interval` (s), `pattern` (`single`, `spread`, `burst` or `aimed`), `bullets` per volley. Can be combined with `enemies` as escorts. |

Colour letters: `R` red, `B` blue, `G` green, `Y` yellow, `P` purple, `O` orange, `C` cyan, `K` pink.

## Workflow

1. Copy an existing level, give it the next number, and edit it.
2. Check it:
   ```bash
   npm run validate:levels
   ```
   Fix any `FAIL` line: usually a colour whose ammo and hit points don't match. Add `-- --solution` to see a winning tap order.
3. Play it directly: `npm run dev`, then open http://localhost:8080/?level=N.
4. Add it to the table in [Levels & balance](../gdd/levels) in the GDD.

## Tuning difficulty

- **Zone HP**: lower `hpPerEnemy` for harder levels. Check by playing: the checker can't see time.
- **Shielding**: put the colours that are scarce early at the front of a stage, or bury a needed colour behind a wall of another colour.
- **Bury the colours stage 1 needs** under colours that come later. Every idle fighter launched to dig through takes a slot.
- **More colours per stage** means more fighters in the zone at once, so less spare room.
- **Split a colour's hit points across stages** so its fighters can't be used up early.
- Walls (you get fewer than the grid's shorter side) create pockets that open in only one order.
- Use the random win rate to compare levels: aim for a steady drop from level to level.
