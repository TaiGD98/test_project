# Level design

Levels are JSON files in `src/levels/`, named `level-NN.json`. The game loads every file matching that pattern in name order, so adding a file adds a level to the game (Play continues from the first uncleared level; `?level=N` jumps to one).

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
  "elevators": { "1,2": "RB" },
  "mystery": ["2,0", "2,3"],
  "frozen": { "1,0": 3 },
  "stages": [
    { "enemies": [
      { "size": "large", "color": "R", "count": 2 },
      { "size": "medium", "color": "B", "count": 3 }
    ] },
    { "boss": { "name": "Iron Hawk", "design": "raptor", "parts": [
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
| `grid` | Rows top to bottom; row 0 touches the flight zone and is the exit edge. `#` wall, a colour letter is a fighter, `^` `v` `<` `>` an elevator facing up/down/left/right. **No empty cells.** Rows and columns may differ by at most 1, with fewer walls than the shorter side. |
| `elevators` | Required for each elevator in the grid, keyed `"row,col"`: the fighters inside, released in order (`"RB"` = red first, then blue). The elevator must face a fighter cell. |
| `mystery` | Optional list of `"row,col"` fighter cells drawn black with a "?" until they have a way out. Avoid the top row (they'd reveal at once). |
| `frozen` | Optional `"row,col"` → count. That fighter can't launch until that many fighters have been launched from anywhere. Can't overlap `mystery`. |
| `tutorial` | Optional. One card `{ "focus": "elevator" \| "mystery" \| "frozen", "text": "..." }`, or several: `{ "steps": [card, card], "onThaw": "..." }`. Each card dims the screen around the first cell of that kind; `{n}` in the text becomes the focused frozen fighter's count; `onThaw` is shown when the first ice breaks. |
| `ammo` | Optional. Overrides a fighter's ammo, keyed `"row,col"` (0-based). Default is 18. |
| `stages[].enemies` | Groups of regular enemies: `size` is `small` (3 hp), `medium` (6) or `large` (9); `count` defaults to 1. They are packed into rows in list order: **the first groups end up at the back**, the last at the front, and front enemies shield the ones behind them. |
| `stages[].boss` | Last stage only. `parts` is a list of 2–8 armour parts, each with a colour and hit points. Parts fill the boss slots in order (left wing, right wing, core, nose, left engine, right engine, left gun pod, right gun pod; see [Rules 3.4](../gdd/rules#boss)), which sets their position, what shields them and their default weapon. `design` picks the artwork: `raptor`, `mantis` or `dreadnought` (default `raptor`). Optional `attack` overrides the weapon: `interval` (s), `pattern` (`single`, `spread`, `burst` or `aimed`), `bullets` per volley. Can be combined with `enemies` as escorts. |

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
- **Mystery** fighters punish guessing: put them where the colour matters (behind fighters of a colour the stage doesn't need yet).
- **Frozen** fighters are timers: a frozen fighter in the top row plugs the exit until enough others have flown; a high count deep in the board is a late reward.
- **Elevators** keep refilling one cell. Pointing one at a cell in the way of others turns that cell into a plug the player must clear several times; pointing one at the exit row keeps feeding fighters straight to the top.
- Use the random win rate to compare levels: aim for a steady drop from level to level.
