// Game rules shared by the game and scripts/validate-levels.ts.
// The GDD (docs/gdd/rules.md) quotes these numbers; change them here first.

export const RULES = {
    /** Fighters that can be in the flight zone at once. */
    flightZoneCapacity: 5,
    /** Ammo a fighter carries unless the level overrides it. */
    defaultAmmo: 18,
    /** Hits each regular enemy size takes. */
    enemyHp: { small: 3, medium: 6, large: 9 },
    /**
     * Temporarily off: enemies don't shoot and the flight zone has no HP (no HP bar, can't be
     * destroyed). Set to true to bring both back; all the code is still in place.
     */
    enemyFire: false,
    /** Seconds between two shots of a regular enemy. */
    enemyFireInterval: 3,
    /** Flight-zone hp lost per enemy bullet that lands. */
    enemyBulletDamage: 10,
    /** Flight-zone hp = hpPerEnemy x enemies, where a boss counts as this many enemies. */
    bossEnemyEquivalent: 10,
    /** Allowed range for a level's hpPerEnemy: easiest levels use the max, hardest the min. */
    hpPerEnemy: { easy: 40, hard: 20 }
} as const;

export type EnemySize = keyof typeof RULES.enemyHp;

/** One letter per colour, as used in level grids. */
export const COLORS = {
    R: { name: 'Red', hex: 0xef4444 },
    B: { name: 'Blue', hex: 0x3b82f6 },
    G: { name: 'Green', hex: 0x22c55e },
    Y: { name: 'Yellow', hex: 0xfacc15 },
    P: { name: 'Purple', hex: 0xa855f7 },
    O: { name: 'Orange', hex: 0xf97316 },
    C: { name: 'Cyan', hex: 0x22d3ee },
    K: { name: 'Pink', hex: 0xf472b6 }
} as const;

export type ColorKey = keyof typeof COLORS;

export const COLOR_KEYS = Object.keys(COLORS) as ColorKey[];

export function isColorKey(ch: string): ch is ColorKey {
    return ch in COLORS;
}

export type AttackPattern = 'single' | 'spread' | 'burst' | 'aimed';

export interface Attack {
    /** Seconds between volleys. */
    interval: number;
    pattern: AttackPattern;
    /** Bullets per volley. */
    bullets: number;
}

/**
 * Boss part slots, filled in order: position relative to the boss centre and the default weapon.
 * Parts lower on screen are in front and shield the parts behind them.
 */
export const BOSS_SLOTS: { x: number; y: number; attack: Attack }[] = [
    { x: -180, y: 0, attack: { interval: 4, pattern: 'spread', bullets: 3 } }, // left wing
    { x: 180, y: 0, attack: { interval: 4, pattern: 'spread', bullets: 3 } }, // right wing
    { x: 0, y: -20, attack: { interval: 5, pattern: 'spread', bullets: 5 } }, // core
    { x: 0, y: 130, attack: { interval: 3.5, pattern: 'burst', bullets: 4 } }, // nose
    { x: -105, y: -140, attack: { interval: 1.5, pattern: 'single', bullets: 1 } }, // left engine
    { x: 105, y: -140, attack: { interval: 1.5, pattern: 'single', bullets: 1 } }, // right engine
    { x: -300, y: -70, attack: { interval: 2.5, pattern: 'aimed', bullets: 2 } }, // left gun pod
    { x: 300, y: -70, attack: { interval: 2.5, pattern: 'aimed', bullets: 2 } } // right gun pod
];
