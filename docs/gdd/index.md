# Game Design Document

**Fighter Force** · Game Design Document · tracks build `latest` (see [Changelog](./changelog))

This document describes what Fighter Force is, how it plays, and why it is built the way it is. Every number in it (timings, formulas, sizes, colours) comes from the current code. If the two disagree, the code is right and this document has a bug.

## How to read this document

Each feature carries a status:

| Badge | Meaning |
|---|---|
| <Badge type="tip" text="Live" /> | In the current build and playable at [the demo](https://taigd98.github.io/test_project/demo/). |
| <Badge type="warning" text="Coming soon" /> | Designed or planned, **not in the game yet**. Details may change before it ships. |

Coordinates and sizes are in **world pixels** on the 780 × 1688 game canvas (2× a 390 × 844 pt phone screen).

## Contents

| Part | Chapters |
|---|---|
| **I. Vision** | [1. Overview](./overview) |
| **II. Gameplay** | [2. Core loop](./core-loop) · [3. Rules & mechanics](./rules) · [4. Levels & balance](./levels) |
| **III. Production** | [5. Roadmap & open questions](./roadmap) · [6. Changelog](./changelog) |

## One-paragraph summary

A portrait puzzle shooter. The bottom of the screen is a hangar grid of colour-coded fighters and walls; the top is an enemy armada that arrives in stages, ending in a multi-part boss. Tapping a fighter that has a clear path out of the hangar sends it to the flight zone (5 fighters at most), where it lines up under the frontmost enemy of its own colour and fires straight up until its 18 bullets are spent. Enemies at the front shield those behind, and every enemy fires back at the flight zone, which has limited HP. Each colour's ammo exactly equals that colour's enemy hit points, so every level is winnable. The challenge is launching fighters quickly and in an order that never fills the flight zone with fighters that have nothing to shoot.
