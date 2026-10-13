# 1. Overview

| | |
|---|---|
| **Title** | Prototype Test |
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
| HUD | 0–150 | Level name, stage counter, back and restart buttons |
| Enemy area | 150–880 | The current stage's enemies or boss |
| Flight zone | 880–1060 | Launched fighters line up and shoot; shows `Flight zone n/5` and the zone's HP bar |
| Hangar board | 1095–1660 | The full grid of fighters and walls the player taps |
