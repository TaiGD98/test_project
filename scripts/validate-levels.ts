// Checks every src/levels/*.json: well formed, compact full hangar, ammo == hp per colour, and winnable.
// Run: npm run validate:levels   (Node's built-in TypeScript stripping, no build step)
// Add --solution to print a winning tap order (row,col) for each level.
// See scripts/lib/solver.ts for what "winnable" assumes.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { enemyCount, validateLevel, zoneHp, type LevelData } from '../src/game/logic.ts';
import { randomWinRate, solve } from './lib/solver.ts';

const dir = new URL('../src/levels/', import.meta.url).pathname;
const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();

let failed = false;
for (const f of files) {
    const level = JSON.parse(readFileSync(join(dir, f), 'utf8')) as LevelData;
    const errors = validateLevel(level);
    if (errors.length) {
        failed = true;
        console.log(`FAIL  ${f}  ${level.name}`);
        for (const e of errors) console.log(`        ${e}`);
        continue;
    }
    const { path, nodes } = solve(level);
    if (!path) {
        failed = true;
        console.log(`FAIL  ${f}  ${level.name}: no winning tap order found (${nodes} states searched)`);
        continue;
    }
    const all = level.grid.join('').replace(/[^RBGYPOCK]/g, '') + Object.values(level.elevators ?? {}).join('');
    const fighters = all.length;
    const colors = new Set(all).size;
    const obstacles = [
        Object.keys(level.elevators ?? {}).length && 'E' + Object.keys(level.elevators ?? {}).length,
        level.mystery?.length && 'M' + level.mystery.length,
        Object.keys(level.frozen ?? {}).length && 'F' + Object.keys(level.frozen ?? {}).length
    ].filter(Boolean).join(' ');
    const size = `${level.grid[0].length}x${level.grid.length}`;
    const boss = level.stages.at(-1)?.boss ? ' + boss' : '       ';
    console.log(
        `OK    ${f}  ${level.name.padEnd(15)} ${size.padEnd(4)} ${String(fighters).padStart(2)} fighters ${colors} colours ${obstacles.padEnd(9)} ` +
            `${level.stages.length} stages${boss}  zone hp ${String(zoneHp(level)).padStart(4)} (${level.hpPerEnemy} x ${enemyCount(level)}${level.zoneHpBonus ? ` + ${level.zoneHpBonus}` : ''})  ` +
            `random win ${(randomWinRate(level) * 100).toFixed(1)}%`
    );
    if (process.argv.includes('--solution')) console.log('        taps (row,col): ' + path.map((m) => `${m.row},${m.col}`).join(' '));
}
process.exit(failed ? 1 : 0);
