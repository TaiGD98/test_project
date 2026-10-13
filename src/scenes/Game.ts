import * as Phaser from 'phaser';
import { Boss, BossPart, EnemyShip, Fighter, type Target } from '../game/entities';
import { ENEMY_WIDTH, FIGHTER_ZONE_SIZE, HEIGHT, LAYOUT, PALETTE, TIMING, WIDTH } from '../game/layout';
import { LEVELS, markCleared } from '../game/levels';
import { byPriority, findExitPath, isShielded, layoutStage, parseGrid, zoneHp, type Cell, type LevelData } from '../game/logic';
import { COLORS, RULES, type ColorKey } from '../game/rules';
import { button, label } from '../game/ui';

const DEPTH = { board: 0, enemies: 20, bullets: 30, zone: 40, launching: 45, fx: 50, hud: 100, panel: 1000 };

interface Bullet {
    img: Phaser.GameObjects.Image;
    target: Target;
}

interface EnemyBullet {
    img: Phaser.GameObjects.Image;
    owner: Target;
    vx: number;
    vy: number;
}

export class Game extends Phaser.Scene {
    private index = 0;
    private level!: LevelData;
    private grid: Cell[][] = [];
    private board: (Fighter | null)[][] = [];
    private zone: Fighter[] = [];
    private launching = 0;
    private targets: Target[] = [];
    /** Living targets not shielded by anything in front of them, in firing priority order. */
    private visible: Target[] = [];
    private enemies: EnemyShip[] = [];
    private boss: Boss | null = null;
    private stage = 0;
    private stageActive = false;
    private bullets: Bullet[] = [];
    private enemyBullets: EnemyBullet[] = [];
    private hp = 0;
    private maxHp = 0;
    private ended = false;
    private idleMs = 0;
    private cell = 0;
    private boardX = 0;
    private boardY = 0;
    private zoneText!: Phaser.GameObjects.Text;
    private hpText!: Phaser.GameObjects.Text;
    private hpBar!: Phaser.GameObjects.Graphics;
    private zoneFlash!: Phaser.GameObjects.Rectangle;
    private stageText!: Phaser.GameObjects.Text;
    private toastText!: Phaser.GameObjects.Text;

    constructor() {
        super('Game');
    }

    init(data: { index?: number }) {
        // Scenes are reused on restart, so reset every field here.
        this.index = Phaser.Math.Clamp(data.index ?? 0, 0, LEVELS.length - 1);
        this.level = LEVELS[this.index];
        this.grid = parseGrid(this.level);
        this.board = [];
        this.zone = [];
        this.launching = 0;
        this.targets = [];
        this.visible = [];
        this.enemies = [];
        this.boss = null;
        this.stage = 0;
        this.stageActive = false;
        this.bullets = [];
        this.enemyBullets = [];
        this.hp = this.maxHp = zoneHp(this.level);
        this.ended = false;
        this.idleMs = 0;
    }

    create() {
        this.drawBackground();
        this.drawHud();
        this.buildBoard();
        this.startStage(0);
    }

    // ---------------------------------------------------------------- layout

    private drawBackground() {
        const g = this.add.graphics().setDepth(DEPTH.board);
        g.fillStyle(PALETTE.enemyArea);
        g.fillRect(0, LAYOUT.hudHeight, WIDTH, LAYOUT.zoneTop - LAYOUT.hudHeight);
        g.fillStyle(PALETTE.zone);
        g.fillRect(0, LAYOUT.zoneTop, WIDTH, LAYOUT.zoneBottom - LAYOUT.zoneTop);
        g.lineStyle(3, PALETTE.zoneLine);
        for (const y of [LAYOUT.zoneTop, LAYOUT.zoneBottom]) {
            for (let x = 0; x < WIDTH; x += 36) g.lineBetween(x, y, x + 20, y);
        }
        this.zoneFlash = this.add
            .rectangle(WIDTH / 2, (LAYOUT.zoneTop + LAYOUT.zoneBottom) / 2, WIDTH, LAYOUT.zoneBottom - LAYOUT.zoneTop, 0xff3b3b, 1)
            .setDepth(DEPTH.board)
            .setAlpha(0);
        const style = { fontFamily: 'Arial Black, Arial', fontSize: '24px', color: PALETTE.textDim };
        this.zoneText = this.add.text(24, LAYOUT.zoneTop + 24, '', style).setOrigin(0, 0.5).setDepth(DEPTH.hud);
        this.hpText = this.add.text(WIDTH - 24, LAYOUT.zoneTop + 24, '', style).setOrigin(1, 0.5).setDepth(DEPTH.hud);
        this.hpBar = this.add.graphics().setDepth(DEPTH.hud);
        this.updateZoneText();
        this.updateHp();
        this.toastText = label(this, WIDTH / 2, LAYOUT.zoneTop - 40, '', 30, PALETTE.danger).setDepth(DEPTH.hud).setAlpha(0);
    }

    private drawHud() {
        const g = this.add.graphics().setDepth(DEPTH.hud);
        g.fillStyle(0x15151d);
        g.fillRect(0, 0, WIDTH, LAYOUT.hudHeight);
        label(this, WIDTH / 2, 55, `Level ${this.level.id} · ${this.level.name}`, 34).setDepth(DEPTH.hud);
        this.stageText = label(this, WIDTH / 2, 108, '', 26, PALETTE.textDim).setDepth(DEPTH.hud);
        button(this, 70, 75, 100, 84, '‹', () => this.scene.start('Menu'), 0x34344c, 48).setDepth(DEPTH.hud);
        button(this, WIDTH - 70, 75, 100, 84, '↻', () => this.scene.restart({ index: this.index }), 0x34344c, 44).setDepth(DEPTH.hud);
    }

    private cellCenter(row: number, col: number) {
        return { x: this.boardX + (col + 0.5) * this.cell, y: this.boardY + (row + 0.5) * this.cell };
    }

    private buildBoard() {
        const rows = this.grid.length;
        const cols = this.grid[0].length;
        this.cell = Math.floor(Math.min(LAYOUT.boardMaxWidth / cols, (LAYOUT.boardBottom - LAYOUT.boardTop) / rows, LAYOUT.maxCell));
        this.boardX = (WIDTH - cols * this.cell) / 2;
        this.boardY = LAYOUT.boardTop;

        const g = this.add.graphics().setDepth(DEPTH.board);
        // Exit edge: fighters leave the board upwards.
        g.fillStyle(PALETTE.zoneLine, 0.6);
        g.fillRect(this.boardX, this.boardY - 10, cols * this.cell, 4);

        const pad = Math.max(2, this.cell * 0.04);
        const r = this.cell * 0.14;
        this.grid.forEach((line, row) => {
            this.board.push([]);
            line.forEach((c, col) => {
                const x = this.boardX + col * this.cell;
                const y = this.boardY + row * this.cell;
                // Every cell gets a floor tile so vacated cells read as empty space.
                g.fillStyle(PALETTE.cell);
                g.fillRoundedRect(x + pad, y + pad, this.cell - pad * 2, this.cell - pad * 2, r);
                if (c.kind === 'wall') {
                    g.fillStyle(PALETTE.wall);
                    g.fillRoundedRect(x + pad, y + pad, this.cell - pad * 2, this.cell - pad * 2, r);
                    g.lineStyle(3, PALETTE.wallEdge);
                    g.strokeRoundedRect(x + pad, y + pad, this.cell - pad * 2, this.cell - pad * 2, r);
                    g.lineBetween(x + this.cell * 0.3, y + this.cell * 0.3, x + this.cell * 0.7, y + this.cell * 0.7);
                    g.lineBetween(x + this.cell * 0.7, y + this.cell * 0.3, x + this.cell * 0.3, y + this.cell * 0.7);
                }
                if (c.kind !== 'fighter') {
                    this.board[row].push(null);
                    return;
                }
                const p = this.cellCenter(row, col);
                const f = new Fighter(this, p.x, p.y, row, col, c.color, c.ammo);
                f.setScale((this.cell * 0.84) / FIGHTER_ZONE_SIZE).setDepth(DEPTH.board + 1);
                f.sprite.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.tapFighter(f));
                this.board[row].push(f);
            });
        });
        this.refreshTappable();
    }

    private refreshTappable() {
        for (const line of this.board) for (const f of line) if (f) f.setTappable(!!findExitPath(this.grid, f));
    }

    private updateZoneText() {
        const used = this.zone.length + this.launching;
        this.zoneText.setText(`Flight zone ${used}/${RULES.flightZoneCapacity}`);
        this.zoneText.setColor(used >= RULES.flightZoneCapacity ? PALETTE.danger : PALETTE.textDim);
    }

    private updateHp() {
        const w = 200;
        const x = WIDTH - 24 - w;
        const y = LAYOUT.zoneTop + 46;
        const f = this.hp / this.maxHp;
        this.hpBar.clear();
        this.hpBar.fillStyle(0x15151d);
        this.hpBar.fillRoundedRect(x, y, w, 14, 7);
        this.hpBar.fillStyle(f > 0.5 ? 0x4ade80 : f > 0.25 ? 0xfacc15 : 0xef4444);
        if (f > 0) this.hpBar.fillRoundedRect(x, y, Math.max(14, w * f), 14, 7);
        this.hpText.setText(`HP ${this.hp}/${this.maxHp}`);
    }

    private toast(msg: string) {
        this.tweens.killTweensOf(this.toastText);
        this.toastText.setText(msg).setAlpha(1);
        this.tweens.add({ targets: this.toastText, alpha: 0, delay: 900, duration: 400 });
    }

    // ---------------------------------------------------------------- fighters

    private tapFighter(f: Fighter) {
        if (this.ended || f.state !== 'board') return;
        const path = findExitPath(this.grid, f);
        const nudge = () => this.tweens.add({ targets: f, x: f.x + 8, duration: 45, yoyo: true, repeat: 2 });
        if (!path) {
            nudge();
            this.toast('No way out: clear a path to the top');
            return;
        }
        if (this.zone.length + this.launching >= RULES.flightZoneCapacity) {
            nudge();
            this.toast('Flight zone full');
            this.tweens.add({ targets: this.zoneText, scale: 1.25, duration: 90, yoyo: true });
            return;
        }

        this.grid[f.row][f.col] = { kind: 'empty' };
        this.board[f.row][f.col] = null;
        f.state = 'launching';
        f.sprite.disableInteractive();
        f.setTappable(true).setDepth(DEPTH.launching);
        this.launching++;
        this.updateZoneText();
        this.refreshTappable();

        const steps = path.slice(1).map((p) => this.cellCenter(p.row, p.col));
        const last = steps.at(-1) ?? { x: f.x, y: f.y };
        steps.push({ x: last.x, y: this.boardY - this.cell * 0.5 });
        let prev = { x: f.x, y: f.y };
        const taxi = steps.map((p) => {
            const angle = Phaser.Math.RadToDeg(Math.atan2(p.y - prev.y, p.x - prev.x)) + 90;
            prev = p;
            return { x: p.x, y: p.y, angle, duration: TIMING.taxiPerCell, ease: 'Linear' };
        });
        this.tweens.chain({
            targets: f,
            tweens: [
                ...taxi,
                {
                    x: Phaser.Math.Clamp(last.x, LAYOUT.zoneMinX, LAYOUT.zoneMaxX),
                    y: LAYOUT.zoneY,
                    angle: 0,
                    scale: 1,
                    duration: 280,
                    ease: 'Quad.easeOut'
                }
            ],
            onComplete: () => {
                this.launching--;
                f.state = 'zone';
                f.dir = Math.random() < 0.5 ? -1 : 1;
                f.speed = Phaser.Math.Between(TIMING.patrolSpeedMin, TIMING.patrolSpeedMax);
                f.setDepth(DEPTH.zone);
                this.zone.push(f);
                this.updateZoneText();
            }
        });
    }

    private leave(f: Fighter) {
        this.zone = this.zone.filter((z) => z !== f);
        f.state = 'leaving';
        f.target = null;
        this.updateZoneText();
        this.tweens.add({
            targets: f,
            y: -120,
            duration: ((f.y + 120) / 1300) * 1000,
            ease: 'Quad.easeIn',
            delay: 120,
            onComplete: () => f.destroy()
        });
    }

    // ---------------------------------------------------------------- stages

    private startStage(i: number) {
        this.stage = i;
        this.stageActive = false;
        const data = this.level.stages[i];
        this.stageText.setText(`Stage ${i + 1}/${this.level.stages.length}`);
        const layout = layoutStage(data);

        let delay = 0;
        for (const spec of layout.targets.filter((t) => t.kind === 'enemy')) {
            const ship = new EnemyShip(this, spec).setDepth(DEPTH.enemies);
            ship.y -= 800;
            this.tweens.add({ targets: ship, y: spec.y, delay, duration: 650, ease: 'Cubic.easeOut' });
            delay += 35;
            this.enemies.push(ship);
            this.targets.push(ship);
        }
        if (layout.boss) {
            const parts = layout.targets.filter((t) => t.kind === 'part');
            const boss = new Boss(this, layout.boss.x, layout.boss.y, layout.boss.name, parts).setDepth(DEPTH.enemies);
            boss.y -= 900;
            this.tweens.add({ targets: boss, y: boss.baseY, delay, duration: 1100, ease: 'Cubic.easeOut' });
            delay += 450;
            this.boss = boss;
            this.targets.push(...boss.parts);
        }
        this.refreshShields();

        this.banner(data.boss ? `BOSS\n${data.boss.name}` : `Stage ${i + 1}`, !!data.boss);
        this.time.delayedCall(delay + 700, () => {
            if (!this.ended) this.stageActive = true;
        });
    }

    /** Recomputes line of sight. Shielded targets are dimmed; fighters can only shoot the rest. */
    private refreshShields() {
        const boxes = this.targets.map((t) => ({ x: t.spec.x, y: t.spec.y, w: t.spec.w, hp: t.hp }));
        this.visible = this.targets
            .filter((t, i) => t.hp > 0 && !isShielded(boxes[i], boxes))
            .sort((a, b) => byPriority(a.spec, b.spec));
        for (const t of this.targets) if (t.hp > 0) (t as EnemyShip | BossPart).setShielded(!this.visible.includes(t));
    }

    private banner(text: string, boss: boolean) {
        const b = label(this, WIDTH / 2, 520, text, boss ? 72 : 64, boss ? '#ff6b6b' : '#ffffff')
            .setAlign('center')
            .setDepth(DEPTH.fx)
            .setScale(0.6)
            .setAlpha(0);
        this.tweens.chain({
            targets: b,
            tweens: [
                { alpha: 1, scale: 1, duration: 260, ease: 'Back.easeOut' },
                { alpha: 0, duration: 350, delay: boss ? 900 : 500 }
            ],
            onComplete: () => b.destroy()
        });
    }

    private checkStageClear() {
        if (!this.stageActive || this.targets.some((t) => t.hp > 0)) return;
        this.stageActive = false;
        // Give the boss explosion time to play out.
        this.time.delayedCall(this.boss ? TIMING.stageDelay * 2 : TIMING.stageDelay, () => {
            if (this.ended) return;
            this.targets = [];
            this.visible = [];
            this.enemies = [];
            if (this.stage + 1 < this.level.stages.length) this.startStage(this.stage + 1);
            else this.win();
        });
    }

    // ---------------------------------------------------------------- combat

    update(time: number, delta: number) {
        const dt = delta / 1000;
        const sway = Math.sin(time / 900) * 22;
        for (const e of this.enemies) if (e.active) e.x = e.spec.x + sway;
        if (this.boss?.active) this.boss.x = this.boss.baseX + sway;

        const canShoot = this.updateFighters(time, dt);
        this.updateBullets(dt);
        if (this.stageActive && !this.ended) this.updateEnemyFire(dt);
        this.updateEnemyBullets(dt);
        this.checkStuck(delta, canShoot);
    }

    /**
     * Each colour's unshielded hp goes to fighters in arrival order, so the oldest fighter empties
     * first and frees its slot (scripts/lib/solver.ts models the same rule). A fighter with a claim
     * lines up under the frontmost target of its colour and fires straight up; the rest patrol.
     * Returns whether any fighter has something to shoot.
     */
    private updateFighters(time: number, dt: number) {
        const avail = new Map<ColorKey, number>();
        if (this.stageActive && !this.ended) {
            for (const t of this.visible) avail.set(t.color, (avail.get(t.color) ?? 0) + t.hp - t.pending);
        }
        let canShoot = false;
        for (const f of [...this.zone]) {
            f.cooldown = Math.max(0, f.cooldown - dt);
            f.y = LAYOUT.zoneY + Math.sin(time / 280 + f.bobPhase) * 6;
            const claim = Math.min(f.ammo, avail.get(f.color) ?? 0);
            const target = claim > 0 ? this.visible.find((t) => t.color === f.color && t.hp - t.pending > 0) : undefined;
            if (!target) {
                f.target = null;
                f.x += f.dir * f.speed * dt;
                if (f.x > LAYOUT.zoneMaxX) (f.x = LAYOUT.zoneMaxX), (f.dir = -1);
                if (f.x < LAYOUT.zoneMinX) (f.x = LAYOUT.zoneMinX), (f.dir = 1);
                continue;
            }
            canShoot = true;
            avail.set(f.color, (avail.get(f.color) ?? 0) - claim);
            if (f.target !== target) {
                f.target = target;
                f.aimOffset = Phaser.Math.FloatBetween(-0.22, 0.22) * target.spec.w;
            }
            const aimX = Phaser.Math.Clamp(target.worldX() + f.aimOffset, LAYOUT.zoneMinX, LAYOUT.zoneMaxX);
            const dx = aimX - f.x;
            f.x += Math.sign(dx) * Math.min(Math.abs(dx), TIMING.alignSpeed * dt);
            if (dx !== 0) f.dir = Math.sign(dx);
            if (Math.abs(aimX - f.x) <= TIMING.alignTolerance && f.cooldown === 0) this.fire(f, target);
        }
        return canShoot;
    }

    private fire(f: Fighter, target: Target) {
        target.pending++;
        f.spendShot();
        f.cooldown = TIMING.fireInterval;
        const img = this.add.image(f.x, f.noseY, 'bullet').setTint(COLORS[f.color].hex).setDepth(DEPTH.bullets);
        this.bullets.push({ img, target });
        if (f.ammo === 0) this.leave(f);
    }

    /** Bullets fly straight up and only steer into the target's centre in the last stretch. */
    private updateBullets(dt: number) {
        const step = TIMING.bulletSpeed * dt;
        this.bullets = this.bullets.filter((b) => {
            const tx = b.target.worldX();
            const ty = b.target.worldY();
            if (b.img.y - ty > TIMING.bulletHomingRange) {
                b.img.y -= step;
                return true;
            }
            const dx = tx - b.img.x;
            const dy = ty - b.img.y;
            const d = Math.hypot(dx, dy);
            if (d <= step + 12) {
                b.img.destroy();
                if (b.target.hit()) this.onDestroyed(b.target);
                return false;
            }
            b.img.x += (dx / d) * step;
            b.img.y += (dy / d) * step;
            b.img.rotation = Math.atan2(dy, dx) + Math.PI / 2;
            return true;
        });
        this.checkStageClear();
    }

    private onDestroyed(t: Target) {
        const color = COLORS[t.color].hex;
        if (t instanceof EnemyShip) {
            this.explosion(t.x, t.y, color, ENEMY_WIDTH[t.spec.size!] / 100);
            this.tweens.add({ targets: t, scale: 1.4, alpha: 0, duration: 180, onComplete: () => t.destroy() });
        } else if (t instanceof BossPart) {
            this.explosion(t.worldX(), t.worldY(), color, 1.5);
            this.cameras.main.shake(180, 0.006);
            const boss = this.boss;
            if (boss?.dead) {
                for (let i = 0; i < 8; i++) {
                    this.time.delayedCall(i * 110, () =>
                        this.explosion(boss.x + Phaser.Math.Between(-260, 260), boss.y + Phaser.Math.Between(-180, 180), 0xffd166, 1.8)
                    );
                }
                this.cameras.main.shake(700, 0.012);
                this.tweens.add({ targets: boss, alpha: 0, delay: 600, duration: 500, onComplete: () => boss.destroy() });
            }
        }
        this.refreshShields();
    }

    // ---------------------------------------------------------------- enemy fire

    private updateEnemyFire(dt: number) {
        for (const t of this.targets) {
            if (t.hp <= 0) continue;
            t.fireTimer -= dt;
            if (t.fireTimer > 0) continue;
            t.fireTimer += t.attack.interval;
            this.volley(t);
        }
    }

    private volley(t: Target) {
        const { pattern, bullets } = t.attack;
        const muzzle = () => ({ x: t.worldX(), y: t.worldY() + t.spec.h * 0.4 });
        const fan = (i: number) => (i - (bullets - 1) / 2) * TIMING.spreadAngle;
        if (pattern === 'single') this.spawnEnemyBullet(t, muzzle(), 0);
        else if (pattern === 'spread') for (let i = 0; i < bullets; i++) this.spawnEnemyBullet(t, muzzle(), fan(i));
        else if (pattern === 'burst') {
            for (let i = 0; i < bullets; i++) {
                this.time.delayedCall(i * TIMING.burstGap * 1000, () => {
                    if (t.hp > 0 && this.stageActive && !this.ended) this.spawnEnemyBullet(t, muzzle(), 0);
                });
            }
        } else {
            // Aimed: at a fighter in the zone (or a random spot in it), slightly fanned.
            const m = muzzle();
            const f = this.zone.length ? Phaser.Utils.Array.GetRandom(this.zone) : null;
            const tx = f ? f.x : Phaser.Math.Between(LAYOUT.zoneMinX, LAYOUT.zoneMaxX);
            const base = Phaser.Math.RadToDeg(Math.atan2(tx - m.x, LAYOUT.zoneY - m.y));
            for (let i = 0; i < bullets; i++) this.spawnEnemyBullet(t, m, base + fan(i) * 0.5);
        }
    }

    /** angle: degrees from straight down, positive towards +x. */
    private spawnEnemyBullet(owner: Target, at: { x: number; y: number }, angle: number) {
        const a = Phaser.Math.DegToRad(angle);
        const img = this.add.image(at.x, at.y, 'ebullet').setTint(COLORS[owner.color].hex).setDepth(DEPTH.bullets);
        this.enemyBullets.push({ img, owner, vx: Math.sin(a) * TIMING.enemyBulletSpeed, vy: Math.cos(a) * TIMING.enemyBulletSpeed });
    }

    private updateEnemyBullets(dt: number) {
        const hitY = LAYOUT.zoneTop + 30;
        this.enemyBullets = this.enemyBullets.filter((b) => {
            // A bullet vanishes when the enemy (or boss part) that fired it is destroyed.
            if (b.owner.hp <= 0 || this.ended) {
                const img = b.img;
                this.tweens.add({ targets: img, scale: 0, alpha: 0, duration: 120, onComplete: () => img.destroy() });
                return false;
            }
            b.img.x += b.vx * dt;
            b.img.y += b.vy * dt;
            if (b.img.x < -30 || b.img.x > WIDTH + 30) {
                b.img.destroy();
                return false;
            }
            if (b.img.y >= hitY) {
                this.explosion(b.img.x, hitY, 0xff6b6b, 0.5);
                b.img.destroy();
                this.damageZone();
                return false;
            }
            return true;
        });
    }

    private damageZone() {
        if (this.ended) return;
        this.hp = Math.max(0, this.hp - RULES.enemyBulletDamage);
        this.updateHp();
        this.tweens.killTweensOf(this.zoneFlash);
        this.zoneFlash.setAlpha(0.35);
        this.tweens.add({ targets: this.zoneFlash, alpha: 0, duration: 250 });
        if (this.hp === 0) {
            this.cameras.main.shake(400, 0.01);
            this.lose('Flight zone destroyed', 'Enemy fire broke through.\nClear stages faster.');
        }
    }

    private explosion(x: number, y: number, color: number, scale: number) {
        const flash = this.add.image(x, y, 'spark').setDepth(DEPTH.fx).setScale(scale * 3).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: flash, scale: scale * 7, alpha: 0, duration: 260, onComplete: () => flash.destroy() });
        const p = this.add
            .particles(x, y, 'spark', {
                speed: { min: 80, max: 380 * scale },
                scale: { start: 0.9 * Math.min(scale, 1.4), end: 0 },
                lifespan: { min: 280, max: 650 },
                tint: color,
                blendMode: Phaser.BlendModes.ADD,
                emitting: false
            })
            .setDepth(DEPTH.fx);
        p.explode(Math.max(4, Math.round(16 * scale)));
        this.time.delayedCall(900, () => p.destroy());
    }

    // ---------------------------------------------------------------- end of level

    private checkStuck(delta: number, canShoot: boolean) {
        if (this.ended || !this.stageActive || canShoot || this.launching > 0 || this.bullets.length > 0) {
            this.idleMs = 0;
            return;
        }
        const full = this.zone.length >= RULES.flightZoneCapacity;
        const anyTappable = this.board.some((line) => line.some((f) => f && findExitPath(this.grid, f)));
        if (!full && anyTappable) {
            this.idleMs = 0;
            return;
        }
        this.idleMs += delta;
        if (this.idleMs < TIMING.stuckDelay) return;
        if (full) this.lose('Out of space', 'The flight zone is full of fighters\nwith nothing to shoot.');
        else this.lose('No moves left', 'No fighter can reach the top of the board.');
    }

    private win() {
        this.ended = true;
        markCleared(this.level.id);
        const hasNext = this.index + 1 < LEVELS.length;
        this.panel('Level cleared!', `Flight zone hp left: ${this.hp}/${this.maxHp}`, [
            hasNext ? { text: 'Next level', fill: 0x2f9e5b, onClick: () => this.scene.start('Game', { index: this.index + 1 }) } : null,
            { text: 'Replay', fill: 0x3b3b55, onClick: () => this.scene.restart({ index: this.index }) },
            { text: 'Levels', fill: 0x3b3b55, onClick: () => this.scene.start('Menu') }
        ]);
    }

    private lose(title: string, subtitle: string) {
        this.ended = true;
        this.panel(title, subtitle, [
            { text: 'Retry', fill: 0xc0533a, onClick: () => this.scene.restart({ index: this.index }) },
            { text: 'Levels', fill: 0x3b3b55, onClick: () => this.scene.start('Menu') }
        ]);
    }

    private panel(title: string, subtitle: string, buttons: ({ text: string; fill: number; onClick: () => void } | null)[]) {
        const shade = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x000000, 0.65).setDepth(DEPTH.panel).setInteractive();
        shade.setAlpha(0);
        this.tweens.add({ targets: shade, alpha: 1, duration: 250 });
        const list = buttons.filter((b) => b !== null);
        const h = 330 + list.length * 120;
        const top = HEIGHT / 2 - h / 2;
        const g = this.add.graphics().setDepth(DEPTH.panel);
        g.fillStyle(0x24243a);
        g.fillRoundedRect(90, top, WIDTH - 180, h, 32);
        g.lineStyle(4, 0xffffff, 0.12);
        g.strokeRoundedRect(90, top, WIDTH - 180, h, 32);
        label(this, WIDTH / 2, top + 90, title, title.length > 16 ? 46 : 56).setDepth(DEPTH.panel);
        label(this, WIDTH / 2, top + 190, subtitle, 28, PALETTE.textDim).setAlign('center').setDepth(DEPTH.panel);
        list.forEach((b, i) => button(this, WIDTH / 2, top + 320 + i * 120, 420, 96, b.text, b.onClick, b.fill, 36).setDepth(DEPTH.panel));
    }
}
