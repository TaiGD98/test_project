import type { LevelData } from './logic';
import { validateLevel } from './logic';

// Every src/levels/level-*.json, sorted by file name.
const files = import.meta.glob<LevelData>('../levels/level-*.json', { eager: true, import: 'default' });

export const LEVELS: LevelData[] = Object.keys(files)
    .sort()
    .map((k) => files[k]);

// scripts/validate-levels.ts guards the build; this catches edits made while the dev server runs.
for (const level of LEVELS) {
    const errors = validateLevel(level);
    if (errors.length) console.error(`Level ${level.id} (${level.name}) is invalid:\n  ${errors.join('\n  ')}`);
}

const STORAGE_KEY = 'prototype-test:cleared';

export function clearedLevels(): Set<number> {
    try {
        return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as number[]);
    } catch {
        return new Set();
    }
}

export function markCleared(id: number) {
    try {
        const s = clearedLevels();
        s.add(id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...s]));
    } catch {
        // Storage unavailable (private mode): progress just isn't remembered.
    }
}
