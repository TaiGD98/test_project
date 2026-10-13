import * as Phaser from 'phaser';
import { COLORS, RULES, type Attack, type ColorKey } from './rules';
import { ENEMY_WIDTH, FIGHTER_ZONE_SIZE } from './layout';
import type { TargetSpec } from './logic';
import { FONT } from './ui';

function numberText(scene: Phaser.Scene, y: number, value: number, size: number) {
    return scene.add
        .text(0, y, String(value), { fontFamily: FONT, fontSize: `${size}px`, color: '#ffffff', stroke: '#000000', strokeThickness: size / 5 })
        .setOrigin(0.5);
}

function darken(hex: number, f: number) {
    const c = Phaser.Display.Color.IntegerToColor(hex);
    return Phaser.Display.Color.GetColor(c.red * f, c.green * f, c.blue * f);
}

export type FighterState = 'board' | 'launching' | 'zone' | 'leaving';

export class Fighter extends Phaser.GameObjects.Container {
    readonly color: ColorKey;
    ammo: number;
    state: FighterState = 'board';
    row: number;
    col: number;
    readonly sprite: Phaser.GameObjects.Image;
    private readonly ammoText: Phaser.GameObjects.Text;
    /** Patrol direction (+1 right, -1 left) and speed while it has nothing to shoot. */
    dir = 1;
    speed = 0;
    cooldown = 0;
    bobPhase = Math.random() * Math.PI * 2;
    /** Current target and where under it the fighter lines up. */
    target: Target | null = null;
    aimOffset = 0;

    constructor(scene: Phaser.Scene, x: number, y: number, row: number, col: number, color: ColorKey, ammo: number) {
        super(scene, x, y);
        this.color = color;
        this.ammo = ammo;
        this.row = row;
        this.col = col;
        this.sprite = scene.add.image(0, 0, 'fighter').setTint(COLORS[color].hex);
        this.sprite.setDisplaySize(FIGHTER_ZONE_SIZE, FIGHTER_ZONE_SIZE);
        this.ammoText = numberText(scene, 8, ammo, 30);
        this.add([this.sprite, this.ammoText]);
        scene.add.existing(this);
    }

    /** Nose position in world space, where bullets spawn. */
    get noseY() {
        return this.y - (FIGHTER_ZONE_SIZE / 2) * this.scale;
    }

    spendShot() {
        this.ammo--;
        this.ammoText.setText(String(this.ammo));
    }

    /** Blocked fighters on the board are dimmed so the player can see what is tappable. */
    setTappable(tappable: boolean) {
        this.sprite.setAlpha(tappable ? 1 : 0.45);
        this.ammoText.setAlpha(tappable ? 1 : 0.6);
        return this;
    }
}

/** Anything a fighter can shoot and that shoots back: a regular enemy or one boss part. */
export interface Target {
    readonly color: ColorKey;
    /** Layout position (before sway) used for line of sight; see layoutStage(). */
    readonly spec: TargetSpec;
    readonly attack: Attack;
    hp: number;
    /** Bullets already in flight towards this target. */
    pending: number;
    /** Seconds until this target's next volley. */
    fireTimer: number;
    worldX(): number;
    worldY(): number;
    /** Applies one bullet. Returns true when this hit destroyed the target. */
    hit(): boolean;
}

const REGULAR_ATTACK: Attack = { interval: RULES.enemyFireInterval, pattern: 'single', bullets: 1 };

export class EnemyShip extends Phaser.GameObjects.Container implements Target {
    readonly color: ColorKey;
    readonly spec: TargetSpec;
    readonly attack = REGULAR_ATTACK;
    hp: number;
    pending = 0;
    fireTimer: number;
    private readonly sprite: Phaser.GameObjects.Image;
    private readonly hpText: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, spec: TargetSpec) {
        super(scene, spec.x, spec.y);
        this.spec = spec;
        this.color = spec.color;
        this.hp = spec.hp;
        // Stagger first shots so a formation doesn't fire in unison.
        this.fireTimer = Phaser.Math.FloatBetween(0.5, RULES.enemyFireInterval);
        const w = ENEMY_WIDTH[spec.size!];
        this.sprite = scene.add.image(0, 0, 'enemy').setTint(COLORS[spec.color].hex).setDisplaySize(w, w);
        this.hpText = numberText(scene, -w * 0.12, this.hp, 22 + w * 0.08);
        this.add([this.sprite, this.hpText]);
        scene.add.existing(this);
    }

    worldX() {
        return this.x;
    }

    worldY() {
        return this.y;
    }

    hit() {
        this.hp--;
        this.pending--;
        this.hpText.setText(String(this.hp));
        this.scene.tweens.add({ targets: this.sprite, alpha: 0.5, duration: 40, yoyo: true });
        return this.hp === 0;
    }

    /** Shielded enemies are drawn slightly darker so the player can see what is in the line of fire. */
    setShielded(shielded: boolean) {
        this.sprite.setAlpha(shielded ? 0.6 : 1);
    }
}

export class BossPart extends Phaser.GameObjects.Container implements Target {
    readonly color: ColorKey;
    readonly spec: TargetSpec;
    readonly attack: Attack;
    hp: number;
    pending = 0;
    fireTimer: number;
    private readonly boss: Boss;
    private readonly sprite: Phaser.GameObjects.Image;
    private readonly hpText: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, boss: Boss, spec: TargetSpec) {
        super(scene, spec.x - boss.baseX, spec.y - boss.baseY);
        this.boss = boss;
        this.spec = spec;
        this.color = spec.color;
        this.hp = spec.hp;
        this.attack = spec.attack!;
        this.fireTimer = Phaser.Math.FloatBetween(1, this.attack.interval + 1);
        this.sprite = scene.add.image(0, 0, 'part').setTint(COLORS[spec.color].hex);
        this.hpText = numberText(scene, 0, spec.hp, 34);
        this.add([this.sprite, this.hpText]);
    }

    worldX() {
        return this.boss.x + this.x;
    }

    worldY() {
        return this.boss.y + this.y;
    }

    hit() {
        this.hp--;
        this.pending--;
        this.hpText.setText(String(this.hp));
        if (this.hp === 0) {
            // Destroyed parts stay on the hull, burnt out, and stop firing.
            this.sprite.setTint(darken(COLORS[this.color].hex, 0.28)).setAlpha(1);
            this.hpText.setVisible(false);
            return true;
        }
        this.scene.tweens.add({ targets: this.sprite, alpha: 0.6, duration: 40, yoyo: true });
        return false;
    }

    setShielded(shielded: boolean) {
        if (this.hp > 0) this.sprite.setAlpha(shielded ? 0.6 : 1);
    }
}

export class Boss extends Phaser.GameObjects.Container {
    readonly parts: BossPart[];
    readonly bossName: string;
    readonly baseX: number;
    readonly baseY: number;

    constructor(scene: Phaser.Scene, x: number, y: number, name: string, specs: TargetSpec[]) {
        super(scene, x, y);
        this.bossName = name;
        this.baseX = x;
        this.baseY = y;
        const span = Math.max(...specs.map((s) => Math.abs(s.x - x))) + 60;

        // Grey hull wide enough to carry every part.
        const outline = [
            [0, 230], [70, 150], [span, 40], [span, -40], [130, -110], [60, -210], [-60, -210], [-130, -110], [-span, -40], [-span, 40], [-70, 150]
        ].map(([px, py]) => new Phaser.Math.Vector2(px, py));
        const hull = scene.add.graphics();
        hull.fillStyle(0x3a3f4f);
        hull.fillPoints(outline, true);
        hull.lineStyle(6, 0x5d6478);
        hull.strokePoints(outline, true);
        this.add(hull);

        this.parts = specs.map((s) => new BossPart(scene, this, s));
        this.add(this.parts);
        scene.add.existing(this);
    }

    get dead() {
        return this.parts.every((p) => p.hp === 0);
    }
}
