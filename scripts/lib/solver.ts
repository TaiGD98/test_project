// Turn-based model of a level, used by validate-levels.ts.
//
// It models a patient player: after each tap, fighters in the flight zone shoot until nothing
// they can hit is left. Like the game, the oldest fighter of a colour spends its ammo first,
// fighters always shoot the frontmost visible target of their colour (then left to right),
// and shielded targets can't be hit. Time and flight-zone hp are not modelled.

import { RULES, type ColorKey } from '../../src/game/rules.ts';
import { byPriority, findExitPath, isShielded, layoutStage, parseGrid, type Cell, type LevelData, type TargetSpec } from '../../src/game/logic.ts';

export interface Move {
    row: number;
    col: number;
}

interface State {
    grid: Cell[][];
    zone: { color: ColorKey; ammo: number }[];
    stage: number;
    targets: TargetSpec[];
}

function loadStage(level: LevelData, s: State) {
    s.targets = s.stage < level.stages.length ? layoutStage(level.stages[s.stage]).targets : [];
}

function settle(level: LevelData, s: State) {
    for (;;) {
        let progress = false;
        for (const f of s.zone) {
            while (f.ammo > 0) {
                const t = s.targets
                    .filter((t) => t.hp > 0 && t.color === f.color && !isShielded(t, s.targets))
                    .sort(byPriority)[0];
                if (!t) break;
                const d = Math.min(f.ammo, t.hp);
                t.hp -= d;
                f.ammo -= d;
                progress = true;
            }
        }
        s.zone = s.zone.filter((f) => f.ammo > 0);
        if (s.stage < level.stages.length && s.targets.every((t) => t.hp === 0)) {
            s.stage++;
            loadStage(level, s);
            continue;
        }
        if (!progress) return;
    }
}

export function initial(level: LevelData): State {
    const s: State = { grid: parseGrid(level), zone: [], stage: 0, targets: [] };
    loadStage(level, s);
    settle(level, s);
    return s;
}

export function won(level: LevelData, s: State) {
    return s.stage >= level.stages.length;
}

export function moves(s: State): Move[] {
    const out: Move[] = [];
    if (s.zone.length >= RULES.flightZoneCapacity) return out;
    s.grid.forEach((line, row) =>
        line.forEach((c, col) => {
            if (c.kind === 'fighter' && findExitPath(s.grid, { row, col })) out.push({ row, col });
        })
    );
    return out;
}

export function apply(level: LevelData, s: State, m: Move): State {
    const grid = s.grid.map((r) => r.slice());
    const c = grid[m.row][m.col] as Extract<Cell, { kind: 'fighter' }>;
    grid[m.row][m.col] = { kind: 'empty' };
    const next: State = {
        grid,
        zone: [...s.zone.map((f) => ({ ...f })), { color: c.color, ammo: c.ammo }],
        stage: s.stage,
        targets: s.targets.map((t) => ({ ...t }))
    };
    settle(level, next);
    return next;
}

const key = (s: State) =>
    s.grid.map((r) => r.map((c) => (c.kind === 'fighter' ? c.color : '.')).join('')).join('/') +
    '|' + s.zone.map((f) => f.color + f.ammo).join(',') + '|' + s.stage + '|' + s.targets.map((t) => t.hp).join(',');

/** Depth-first search for a winning tap order. */
export function solve(level: LevelData, maxNodes = 2_000_000) {
    const seen = new Set<string>();
    let nodes = 0;
    const dfs = (s: State): Move[] | null => {
        if (won(level, s)) return [];
        const k = key(s);
        if (seen.has(k) || ++nodes > maxNodes) return null;
        seen.add(k);
        // Try fighters the current stage can use right now first.
        const useful = (m: Move) => {
            const color = (s.grid[m.row][m.col] as { color: ColorKey }).color;
            return s.targets.some((t) => t.hp > 0 && t.color === color && !isShielded(t, s.targets)) ? 0 : 1;
        };
        for (const m of moves(s).sort((a, b) => useful(a) - useful(b))) {
            const rest = dfs(apply(level, s, m));
            if (rest) return [m, ...rest];
        }
        return null;
    };
    return { path: dfs(initial(level)), nodes };
}

/** Share of games won by tapping random legal fighters: a rough difficulty signal (lower = harder). */
export function randomWinRate(level: LevelData, runs = 2000) {
    let wins = 0;
    for (let i = 0; i < runs; i++) {
        let s = initial(level);
        for (;;) {
            if (won(level, s)) { wins++; break; }
            const ms = moves(s);
            if (!ms.length) break;
            s = apply(level, s, ms[Math.floor(Math.random() * ms.length)]);
        }
    }
    return wins / runs;
}
