// Pure game logic (no Phaser): level parsing, balance checks, stage layout, line of sight and exit paths.
// Imported by the game and by scripts/validate-levels.ts (run with Node's type stripping,
// hence the explicit .ts extensions and type-only syntax).

import { BOSS_SLOTS, RULES, isColorKey, type Attack, type ColorKey, type EnemySize } from './rules.ts';
import { BLOCK_OVERLAP, ENEMY_WIDTH, LAYOUT, PART_SIZE, WIDTH } from './layout.ts';

export interface EnemyGroup {
    size: EnemySize;
    color: ColorKey;
    /** How many enemies of this size and colour (default 1). */
    count?: number;
}

export interface BossPart {
    color: ColorKey;
    hp: number;
    /** Overrides the slot's default weapon. */
    attack?: Attack;
}

export interface StageData {
    /** Packed into rows in list order: the first groups end up at the back (top). */
    enemies?: EnemyGroup[];
    /** Only allowed in the last stage. */
    boss?: { name: string; parts: BossPart[] };
}

export interface LevelData {
    id: number;
    name: string;
    /**
     * Rows top to bottom; row 0 touches the flight zone. One char per cell:
     * '#' wall or a colour letter (R B G Y P O C K) for a fighter. No empty cells.
     */
    grid: string[];
    /** Optional ammo overrides keyed "row,col". */
    ammo?: Record<string, number>;
    /** Flight-zone hp per enemy (a boss counts as RULES.bossEnemyEquivalent enemies). */
    hpPerEnemy: number;
    /** Optional flat hp added on top of the formula, for hand tuning. */
    zoneHpBonus?: number;
    stages: StageData[];
}

export type Cell =
    | { kind: 'empty' }
    | { kind: 'wall' }
    | { kind: 'fighter'; color: ColorKey; ammo: number };

export interface Pos {
    row: number;
    col: number;
}

export type ColorTotals = Partial<Record<ColorKey, number>>;

export function parseGrid(level: LevelData): Cell[][] {
    return level.grid.map((line, row) =>
        [...line].map((ch, col): Cell => {
            if (ch === '#') return { kind: 'wall' };
            if (isColorKey(ch)) return { kind: 'fighter', color: ch, ammo: level.ammo?.[`${row},${col}`] ?? RULES.defaultAmmo };
            return { kind: 'empty' };
        })
    );
}

function add(totals: ColorTotals, color: ColorKey, n: number) {
    totals[color] = (totals[color] ?? 0) + n;
}

/** Hit points per colour in one stage. */
export function stageHp(stage: StageData): ColorTotals {
    const hp: ColorTotals = {};
    for (const g of stage.enemies ?? []) add(hp, g.color, RULES.enemyHp[g.size] * (g.count ?? 1));
    for (const p of stage.boss?.parts ?? []) add(hp, p.color, p.hp);
    return hp;
}

export function ammoTotals(level: LevelData): ColorTotals {
    const ammo: ColorTotals = {};
    for (const row of parseGrid(level)) for (const c of row) if (c.kind === 'fighter') add(ammo, c.color, c.ammo);
    return ammo;
}

export function hpTotals(level: LevelData): ColorTotals {
    const hp: ColorTotals = {};
    for (const s of level.stages) for (const [c, n] of Object.entries(stageHp(s))) add(hp, c as ColorKey, n);
    return hp;
}

/** Number of enemies for the flight-zone hp formula: regular enemies + boss equivalents. */
export function enemyCount(level: LevelData) {
    let n = 0;
    for (const s of level.stages) {
        for (const g of s.enemies ?? []) n += g.count ?? 1;
        if (s.boss) n += RULES.bossEnemyEquivalent;
    }
    return n;
}

export function zoneHp(level: LevelData) {
    return level.hpPerEnemy * enemyCount(level) + (level.zoneHpBonus ?? 0);
}

/** Returns a list of problems; empty means the level is well formed and balanced. */
export function validateLevel(level: LevelData): string[] {
    const errors: string[] = [];
    const rows = level.grid.length;
    const cols = level.grid[0]?.length ?? 0;
    if (!cols) errors.push('grid is empty');
    let walls = 0;
    level.grid.forEach((line, row) => {
        if (line.length !== cols) errors.push(`grid row ${row} has ${line.length} cells, expected ${cols}`);
        for (const ch of line) {
            if (ch === '#') walls++;
            else if (ch === '.') errors.push(`grid row ${row} has an empty cell; every cell must hold a fighter or a wall`);
            else if (!isColorKey(ch)) errors.push(`grid row ${row} has unknown cell '${ch}'`);
        }
    });
    // Compact hangar: as square as possible and never a whole row or column of padding.
    if (Math.abs(rows - cols) > 1) errors.push(`grid is ${cols}x${rows}; rows and columns may differ by at most 1`);
    if (cols && walls >= Math.min(rows, cols)) errors.push(`grid has ${walls} walls; use a smaller grid (fewer than ${Math.min(rows, cols)} walls)`);
    const { easy, hard } = RULES.hpPerEnemy;
    if (!(level.hpPerEnemy >= hard && level.hpPerEnemy <= easy)) errors.push(`hpPerEnemy must be between ${hard} and ${easy}`);
    if (!level.stages.length) errors.push('level has no stages');
    level.stages.forEach((s, i) => {
        if (s.boss && i !== level.stages.length - 1) errors.push(`stage ${i + 1} has a boss; bosses only appear in the last stage`);
        if (s.boss && (s.boss.parts.length < 2 || s.boss.parts.length > BOSS_SLOTS.length))
            errors.push(`stage ${i + 1}: a boss needs 2-${BOSS_SLOTS.length} parts`);
        if (!Object.keys(stageHp(s)).length) errors.push(`stage ${i + 1} has no enemies`);
    });
    const ammo = ammoTotals(level);
    const hp = hpTotals(level);
    for (const c of new Set([...Object.keys(ammo), ...Object.keys(hp)]) as Set<ColorKey>) {
        if ((ammo[c] ?? 0) !== (hp[c] ?? 0)) errors.push(`colour ${c}: fighters carry ${ammo[c] ?? 0} ammo but enemies have ${hp[c] ?? 0} hp`);
    }
    return errors;
}

// ------------------------------------------------------------------ stage layout

export interface TargetSpec {
    kind: 'enemy' | 'part';
    color: ColorKey;
    hp: number;
    /** Centre and size in world px, before the formation's sideways sway. */
    x: number;
    y: number;
    w: number;
    h: number;
    size?: EnemySize;
    /** Boss parts: the slot they occupy and their weapon. */
    slot?: number;
    attack?: Attack;
}

export interface StageLayout {
    targets: TargetSpec[];
    boss?: { name: string; x: number; y: number };
}

/** Where every enemy and boss part of a stage sits. Shared by the game and the level checker. */
export function layoutStage(stage: StageData): StageLayout {
    const list: { size: EnemySize; color: ColorKey }[] = [];
    for (const g of stage.enemies ?? []) for (let n = 0; n < (g.count ?? 1); n++) list.push({ size: g.size, color: g.color });

    // Pack enemies into centred rows.
    const gap = 18;
    const rows: (typeof list)[] = [[]];
    let rowW = 0;
    for (const e of list) {
        const w = ENEMY_WIDTH[e.size];
        if (rowW + w > WIDTH - 60 && rows[rows.length - 1].length) {
            rows.push([]);
            rowW = 0;
        }
        rows[rows.length - 1].push(e);
        rowW += w + gap;
    }
    const rowH = (r: typeof list) => Math.max(0, ...r.map((e) => ENEMY_WIDTH[e.size])) + 26;
    const formationH = rows.reduce((h, r) => h + (r.length ? rowH(r) : 0), 0);
    const bossH = stage.boss ? 460 : 0;
    let y = (LAYOUT.enemyTop + LAYOUT.enemyBottom) / 2 - (formationH + bossH) / 2;

    const targets: TargetSpec[] = [];
    for (const r of rows) {
        if (!r.length) continue;
        const h = rowH(r);
        let x = WIDTH / 2 - r.reduce((s, e) => s + ENEMY_WIDTH[e.size] + gap, -gap) / 2;
        for (const e of r) {
            const w = ENEMY_WIDTH[e.size];
            targets.push({ kind: 'enemy', color: e.color, hp: RULES.enemyHp[e.size], x: x + w / 2, y: y + h / 2, w, h: w, size: e.size });
            x += w + gap;
        }
        y += h;
    }

    if (!stage.boss) return { targets };
    const boss = { name: stage.boss.name, x: WIDTH / 2, y: y + 210 };
    stage.boss.parts.forEach((p, i) => {
        const s = BOSS_SLOTS[i];
        targets.push({
            kind: 'part', color: p.color, hp: p.hp, x: boss.x + s.x, y: boss.y + s.y,
            w: PART_SIZE.w, h: PART_SIZE.h, slot: i, attack: p.attack ?? s.attack
        });
    });
    return { targets, boss };
}

type Box = { x: number; y: number; w: number; hp: number };

/** A target is shielded while a living target sits in front of it (lower on screen) and overlaps it sideways. */
export function isShielded(t: Box, all: readonly Box[]) {
    return all.some((o) => o !== t && o.hp > 0 && o.y > t.y + 1 && Math.abs(o.x - t.x) < (o.w + t.w) / 2 - BLOCK_OVERLAP);
}

/** Fighters shoot the frontmost target first, then left to right. */
export function byPriority(a: { x: number; y: number }, b: { x: number; y: number }) {
    return b.y - a.y || a.x - b.x;
}

// ------------------------------------------------------------------ board

/**
 * Shortest path from a fighter to the top edge of the board, through empty cells only
 * (walls and other fighters block). Includes the start cell and ends on row 0.
 * Returns null when the fighter is boxed in.
 */
export function findExitPath(grid: Cell[][], start: Pos): Pos[] | null {
    const rows = grid.length;
    const cols = grid[0].length;
    const prev = new Map<number, number>();
    const key = (p: Pos) => p.row * cols + p.col;
    const queue: Pos[] = [start];
    prev.set(key(start), -1);
    while (queue.length) {
        const p = queue.shift()!;
        if (p.row === 0) {
            const path: Pos[] = [];
            for (let k = key(p); k !== -1; k = prev.get(k)!) path.unshift({ row: Math.floor(k / cols), col: k % cols });
            return path;
        }
        for (const [dr, dc] of [[-1, 0], [0, -1], [0, 1], [1, 0]]) {
            const n = { row: p.row + dr, col: p.col + dc };
            if (n.row < 0 || n.row >= rows || n.col < 0 || n.col >= cols) continue;
            if (prev.has(key(n)) || grid[n.row][n.col].kind !== 'empty') continue;
            prev.set(key(n), key(p));
            queue.push(n);
        }
    }
    return null;
}
