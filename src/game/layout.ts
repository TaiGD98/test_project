// Screen layout and timings, in world pixels on the 780 x 1688 canvas.
// The GDD (docs/gdd/rules.md) quotes these numbers.

export const WIDTH = 780;
export const HEIGHT = 1688;

export const LAYOUT = {
    /** HUD strip at the top. */
    hudHeight: 150,
    /** Enemy area: from the HUD down to the flight zone. */
    enemyTop: 170,
    enemyBottom: 860,
    /** Flight zone band where fighters patrol. */
    zoneTop: 880,
    zoneBottom: 1060,
    zoneY: 985,
    zoneMinX: 70,
    zoneMaxX: 710,
    /** Board (grid) area. */
    boardTop: 1095,
    boardBottom: 1660,
    boardMaxWidth: 720,
    maxCell: 112
} as const;

export const TIMING = {
    /** Seconds between two shots of one fighter. */
    fireInterval: 0.11,
    /** Bullet speed in px/s (straight up). */
    bulletSpeed: 1900,
    /** Speed a fighter moves at to line up under its target (px/s). */
    alignSpeed: 1100,
    /** A fighter fires once it is within this many px of its aim point. */
    alignTolerance: 6,
    /** Enemy bullet speed in px/s. */
    enemyBulletSpeed: 460,
    /** Delay between bullets of a boss 'burst' volley (s). */
    burstGap: 0.12,
    /** Fan angle between neighbouring bullets of a 'spread' volley (degrees). */
    spreadAngle: 14,
    /** Fighter patrol speed range in px/s. */
    patrolSpeedMin: 150,
    patrolSpeedMax: 230,
    /** Milliseconds per grid cell when a fighter taxis out of the board. */
    taxiPerCell: 70,
    /** Pause between a stage being cleared and the next one flying in (ms). */
    stageDelay: 700,
    /** How long the game must be idle before a stuck board counts as lost (ms). */
    stuckDelay: 600
} as const;

/** Display width (and height) of each regular enemy size. */
export const ENEMY_WIDTH = { small: 74, medium: 100, large: 128 } as const;

/** Boss armour part size. */
export const PART_SIZE = { w: 120, h: 96 } as const;

/** Two targets shield each other only if they overlap horizontally by more than this (px). */
export const BLOCK_OVERLAP = 8;

export const FIGHTER_ZONE_SIZE = 92;

export const PALETTE = {
    background: 0x05060f,
    enemyArea: 0x20202c,
    zone: 0x2a2a3a,
    zoneLine: 0x4b4b66,
    cell: 0x2b2b3b,
    wall: 0x55556e,
    wallEdge: 0x77779a,
    text: '#ffffff',
    textDim: '#a9c4e8',
    danger: '#ff6b6b'
} as const;
