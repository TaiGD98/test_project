# 2. Core loop

## 2.1 Moment to moment <Badge type="tip" text="Live" />

```
Read the stage ──► Pick a fighter ──► It taxis out and joins the flight zone
      ▲                                              │
      │                                              ▼
 Next stage flies in ◄── Stage cleared ◄── Fighters shoot matching colours
                                                     │
                                       Empty fighters fly off, freeing slots
```

1. **Read** the front line: which enemies are unshielded (fully bright), their colours and hit points, and which boss parts are hurting the zone most.
2. **Pick** a bright (unblocked) fighter on the board whose colour the front line needs. Dimmed fighters are boxed in.
3. The fighter **taxis** along its path out of the top of the board and takes a slot in the flight zone.
4. It **lines up** under the frontmost enemy of its colour and **fires straight up** until it runs dry or there is nothing of its colour it can reach.
5. A fighter that has fired its last bullet **flies off the top of the screen**, freeing its slot.
6. When every enemy in the stage is down, the **next stage** flies in. Clearing the last stage wins the level.

Two pressures pull against each other:

- **Space.** Only 5 fighters fly at once. A fighter whose colour isn't reachable right now (not in the stage, or shielded behind other enemies) just patrols and takes up a slot. Fill all 5 slots with idle fighters and the level is lost.
- **Time.** Every enemy and boss part fires at the flight zone. The longer a stage lasts, the more zone HP it costs, so hesitating, or launching fighters that can't shoot yet, is punished. On bosses, killing the parts with the nastiest weapons first saves HP.

## 2.2 Level loop <Badge type="tip" text="Live" />

Level select → play → **Level cleared!** (Next level / Replay / Levels) or **Flight zone destroyed** / **Out of space** / **No moves left** (Retry / Levels). Cleared levels get a ✓ on the level select screen (stored in the browser's local storage).

## 2.3 Long-term loop <Badge type="warning" text="Coming soon" />

Not in the prototype. Candidates are listed in the [roadmap](./roadmap): star ratings by taps or time, unlockable level packs, and a power-up economy.
