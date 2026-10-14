import * as Phaser from 'phaser';
import { COLORS, RULES, type Attack, type ColorKey } from './rules';
import { ENEMY_WIDTH, FIGHTER_ZONE_SIZE } from './layout';
import type { BossDesign, TargetSpec } from './logic';
import { BOSS_DRAW_ORDER, bossTail, paintBossFrame, paintBossPart } from './art';
import { FONT } from './ui';

function numberText(scene: Phaser.Scene, y: number, value: number, size: number) {
    return scene.add
        .text(0, y, String(value), {
            fontFamily: FONT,
            fontSize: `${size}px`,
            color: '#ffffff',
            stroke: '#05060f',
            strokeThickness: size / 4,
            shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 4, fill: true, stroke: true }
        })
        .setOrigin(0.5);
}

/** Flickering engine flame (additive). Points down unless flipped. */
function engineFlame(scene: Phaser.Scene, x: number, y: number, key: string, scale: number, up = false) {
    const f = scene.add.image(x, y, key).setOrigin(0.5, 0).setScale(scale).setBlendMode(Phaser.BlendModes.ADD);
    if (up) f.setAngle(180);
    scene.tweens.add({ targets: f, scaleY: scale * 0.7, scaleX: scale * 0.85, duration: 70, yoyo: true, repeat: -1, delay: Math.random() * 70 });
    return f;
}

/** 'arriving': rolling out of an elevator into its cell (can't be tapped yet). */
export type FighterState = 'arriving' | 'board' | 'launching' | 'zone' | 'leaving';

export class Fighter extends Phaser.GameObjects.Container {
    readonly color: ColorKey;
    ammo: number;
    state: FighterState = 'board';
    row: number;
    col: number;
    readonly sprite: Phaser.GameObjects.Image;
    /** Sprite, flames and labels; bobs on its own so the container can move freely. */
    private readonly hull: Phaser.GameObjects.Container;
    private readonly ammoText: Phaser.GameObjects.Text;
    private readonly flames: Phaser.GameObjects.Image[];
    private idle: Phaser.Tweens.Tween | null = null;
    private airborne = false;
    /** Mystery: drawn black with a "?" until it first has a way out. */
    hidden: boolean;
    private mark: Phaser.GameObjects.Text | null = null;
    /** Frozen: launches still needed before it thaws (0 = free). */
    frozen: number;
    private ice: Phaser.GameObjects.Image | null = null;
    private iceText: Phaser.GameObjects.Text | null = null;
    /** Patrol direction (+1 right, -1 left) and speed while it has nothing to shoot. */
    dir = 1;
    speed = 0;
    cooldown = 0;
    bobPhase = Math.random() * Math.PI * 2;
    /** Current target and where under it the fighter lines up. */
    target: Target | null = null;
    aimOffset = 0;

    constructor(scene: Phaser.Scene, x: number, y: number, row: number, col: number, color: ColorKey, ammo: number, opts: { hidden?: boolean; frozen?: number } = {}) {
        super(scene, x, y);
        this.color = color;
        this.ammo = ammo;
        this.row = row;
        this.col = col;
        this.hidden = !!opts.hidden;
        this.frozen = opts.frozen ?? 0;
        this.sprite = scene.add.image(0, 0, this.hidden ? 'fighter-mystery' : `fighter-${color}`);
        this.sprite.setDisplaySize(FIGHTER_ZONE_SIZE, FIGHTER_ZONE_SIZE);
        // Texture is 128 px; nozzles sit at x 58/70, y 112 of it.
        const k = FIGHTER_ZONE_SIZE / 128;
        this.flames = [-6, 6].map((dx) => engineFlame(scene, dx * k, 48 * k, 'flame', 0.55).setTint(COLORS[color].hex).setVisible(false));
        // Ammo only matters once airborne, so the hangar shows just the planes.
        this.ammoText = numberText(scene, 14, ammo, 30).setVisible(false);
        this.hull = scene.add.container(0, 0, [...this.flames, this.sprite, this.ammoText]);
        this.add(this.hull);
        if (this.hidden) {
            this.mark = numberText(scene, 0, 0, 52).setText('?').setColor('#d9c8ff');
            this.hull.add(this.mark);
        }
        if (this.frozen) {
            this.ice = scene.add.image(0, 0, 'ice').setDisplaySize(FIGHTER_ZONE_SIZE * 1.12, FIGHTER_ZONE_SIZE * 1.12).setAlpha(0.72);
            this.iceText = numberText(scene, 0, this.frozen, 54).setColor('#e8fbff');
            this.add([this.ice, this.iceText]);
        }
        scene.add.existing(this);
    }

    /** Leaves the hangar: engines stay lit, the ammo count appears, the idle bob stops. */
    ignite() {
        this.airborne = true;
        this.stopIdle();
        for (const f of this.flames) f.setVisible(true);
        this.ammoText.setVisible(true);
    }

    /** Nose position in world space, where bullets spawn. */
    get noseY() {
        return this.y - (FIGHTER_ZONE_SIZE / 2) * this.scale;
    }

    spendShot() {
        this.ammo--;
        this.ammoText.setText(String(this.ammo));
    }

    /**
     * Tappable fighters idle: a gentle bob with engines burning. Blocked ones are dimmed and still.
     * A mystery fighter reveals its colour the first time it has a way out (`hasPath`).
     */
    setTappable(tappable: boolean, hasPath = tappable) {
        if (this.airborne) return this;
        if (this.hidden && hasPath) this.reveal();
        this.sprite.setAlpha(tappable ? 1 : 0.45);
        for (const f of this.flames) f.setVisible(tappable);
        if (tappable && !this.idle) {
            this.idle = this.scene.tweens.add({ targets: this.hull, y: -5, duration: 700, ease: 'Sine.easeInOut', yoyo: true, repeat: -1, delay: Math.random() * 400 });
        } else if (!tappable) this.stopIdle();
        return this;
    }

    private stopIdle() {
        this.idle?.stop();
        this.idle = null;
        this.hull.y = 0;
    }

    private reveal() {
        this.hidden = false;
        this.sprite.setTexture(`fighter-${this.color}`);
        const mark = this.mark!;
        this.mark = null;
        this.scene.tweens.add({ targets: mark, scale: 1.8, alpha: 0, duration: 260, onComplete: () => mark.destroy() });
        const flash = this.scene.add.image(0, 0, 'glow').setTint(COLORS[this.color].hex).setBlendMode(Phaser.BlendModes.ADD).setScale(0.4);
        this.add(flash);
        this.scene.tweens.add({ targets: flash, scale: 1.4, alpha: 0, duration: 380, onComplete: () => flash.destroy() });
        this.scene.tweens.add({ targets: this.sprite, scale: this.sprite.scale * 1.15, duration: 120, yoyo: true });
    }

    /** Lowers the ice counter: shards chip off each step, and the block shatters at 0. */
    setFrozen(n: number) {
        if (!this.ice || n === this.frozen) return;
        this.frozen = n;
        const shards = (count: number, spread: number) => {
            for (let i = 0; i < count; i++) {
                const sh = this.scene.add.image(Phaser.Math.Between(-30, 30), Phaser.Math.Between(-30, 20), 'shard').setScale(Phaser.Math.FloatBetween(0.8, 1.6));
                this.add(sh);
                this.scene.tweens.add({
                    targets: sh,
                    x: sh.x + Phaser.Math.Between(-spread, spread),
                    y: sh.y + Phaser.Math.Between(40, 40 + spread),
                    angle: Phaser.Math.Between(-240, 240),
                    alpha: 0,
                    duration: Phaser.Math.Between(450, 750),
                    ease: 'Quad.easeIn',
                    onComplete: () => sh.destroy()
                });
            }
        };
        if (n > 0) {
            this.iceText!.setText(String(n));
            this.scene.tweens.add({ targets: this.iceText, scale: 1.35, duration: 90, yoyo: true });
            this.scene.tweens.add({ targets: this.ice, x: 3, duration: 40, yoyo: true, repeat: 2 });
            this.ice.setAlpha(0.45 + 0.27 * Math.min(1, n / 4));
            shards(4, 40);
            return;
        }
        // Thawed: the block bursts apart.
        const ice = this.ice;
        const label = this.iceText!;
        this.ice = null;
        this.iceText = null;
        shards(14, 110);
        const flash = this.scene.add.image(0, 0, 'glow').setTint(0xbff3ff).setBlendMode(Phaser.BlendModes.ADD).setScale(0.5);
        this.add(flash);
        this.scene.tweens.add({ targets: flash, scale: 1.8, alpha: 0, duration: 420, onComplete: () => flash.destroy() });
        this.scene.tweens.add({ targets: [ice, label], scale: 1.5, alpha: 0, duration: 220, onComplete: () => (ice.destroy(), label.destroy()) });
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
        const key = spec.size === 'large' ? 'heavy' : 'drone';
        this.sprite = scene.add.image(0, 0, `${key}-${spec.color}`).setDisplaySize(w, w);
        // Engines on the back (top) of the ship, flames pointing up.
        const k = w / 128;
        const flames = [-10, 10].map((dx) => engineFlame(scene, dx * k, -40 * k, 'flame-enemy', 0.5 * k * 1.6, true));
        this.hpText = numberText(scene, -w * 0.08, this.hp, 22 + w * 0.08);
        this.add([...flames, this.sprite, this.hpText]);
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
    private readonly flames: Phaser.GameObjects.Image[] = [];

    constructor(scene: Phaser.Scene, boss: Boss, spec: TargetSpec) {
        super(scene, spec.x - boss.baseX, spec.y - boss.baseY);
        this.boss = boss;
        this.spec = spec;
        this.color = spec.color;
        this.hp = spec.hp;
        this.attack = spec.attack!;
        this.fireTimer = Phaser.Math.FloatBetween(1, this.attack.interval + 1);
        // This part's section of the airframe, in its colour, with guns showing its weapon.
        const piece = paintBossPart(scene, boss.design, spec.slot!, COLORS[spec.color].hex, this.attack.pattern);
        this.sprite = scene.add.image(piece.x - this.x, piece.y - this.y, piece.key);
        // Engines burn at the back; the flames go out when the engine is destroyed.
        if (spec.slot === 4 || spec.slot === 5) this.flames.push(engineFlame(scene, piece.topX - this.x, piece.top - this.y + 4, 'flame-enemy', 1.3, true));
        this.hpText = numberText(scene, 0, spec.hp, 34);
        this.add([...this.flames, this.sprite, this.hpText]);
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
            this.sprite.setTint(0x3a3a3a).setAlpha(1);
            for (const f of this.flames) f.setVisible(false);
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
    readonly design: BossDesign;
    readonly baseX: number;
    readonly baseY: number;

    constructor(scene: Phaser.Scene, x: number, y: number, name: string, design: BossDesign, specs: TargetSpec[]) {
        super(scene, x, y);
        this.bossName = name;
        this.design = design;
        this.baseX = x;
        this.baseY = y;
        // Dark hull for this design, with the main engine burning at the back.
        const [tx, ty] = bossTail(design);
        this.add([engineFlame(scene, tx, ty + 6, 'flame-enemy', 1.8, true), scene.add.image(0, 0, paintBossFrame(scene, design, specs.map((sp) => sp.slot!)))]);

        // Coloured sections, stacked back to front so they read as one aircraft.
        this.parts = specs.map((s) => new BossPart(scene, this, s));
        for (const slot of BOSS_DRAW_ORDER) {
            const p = this.parts.find((q) => q.spec.slot === slot);
            if (p) this.add(p);
        }
        scene.add.existing(this);
    }

    get dead() {
        return this.parts.every((p) => p.hp === 0);
    }
}
