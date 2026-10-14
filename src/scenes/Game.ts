import * as Phaser from 'phaser';
import { Boss, BossPart, EnemyShip, Fighter, type Target } from '../game/entities';
import { ENEMY_WIDTH, FIGHTER_ZONE_SIZE, HEIGHT, LAYOUT, PALETTE, TIMING, WIDTH } from '../game/layout';
import { LEVELS, markCleared } from '../game/levels';
import { byPriority, canLaunch, findExitPath, isShielded, layoutStage, parseGrid, releaseElevator, thawStep, tutorialSteps, zoneHp, type Cell, type Dir, type LevelData, type Pos, type TutorialStep } from '../game/logic';
import { COLORS, RULES, type ColorKey } from '../game/rules';
import { addSpaceBackground } from '../game/art';
import { FONT, NEON, button, drawPanel, label } from '../game/ui';

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
    private progress!: Phaser.GameObjects.Graphics;
    private bossTag: Phaser.GameObjects.Text | null = null;
    private toastText!: Phaser.GameObjects.Text;
    private scrollStars: (dt: number) => void = () => {};
    /** Fighters rolling out of an elevator; the level can't be declared stuck meanwhile. */
    private arriving = 0;
    private thawHintShown = false;
    /** Elevator displays keyed "row,col": remaining count and a preview of the next fighter. */
    private lifts = new Map<string, { count: Phaser.GameObjects.Text; next: Phaser.GameObjects.Image }>();

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
        this.arriving = 0;
        this.thawHintShown = false;
        this.lifts = new Map();
    }

    create() {
        this.drawBackground();
        this.drawHud();
        this.buildBoard();
        if (this.level.tutorial) this.showTutorial(tutorialSteps(this.level.tutorial), () => this.startStage(0));
        else this.startStage(0);
    }

    // ---------------------------------------------------------------- layout

    private drawBackground() {
        this.scrollStars = addSpaceBackground(this);
        // Flight zone: an energy shield band with glowing edges.
        const g = this.add.graphics().setDepth(DEPTH.board);
        const zh = LAYOUT.zoneBottom - LAYOUT.zoneTop;
        g.fillGradientStyle(NEON, NEON, NEON, NEON, 0.02, 0.02, 0.12, 0.12);
        g.fillRect(0, LAYOUT.zoneTop, WIDTH, zh / 2);
        g.fillGradientStyle(NEON, NEON, NEON, NEON, 0.12, 0.12, 0.02, 0.02);
        g.fillRect(0, LAYOUT.zoneTop + zh / 2, WIDTH, zh / 2);
        for (const y of [LAYOUT.zoneTop, LAYOUT.zoneBottom]) {
            g.lineStyle(10, NEON, 0.12);
            g.lineBetween(0, y, WIDTH, y);
            g.lineStyle(3, NEON, 0.8);
            g.lineBetween(0, y, WIDTH, y);
        }
        g.fillStyle(NEON, 0.18);
        for (let x = 20; x < WIDTH; x += 40) for (let y = LAYOUT.zoneTop + 20; y < LAYOUT.zoneBottom; y += 40) g.fillCircle(x, y, 2);
        this.zoneFlash = this.add
            .rectangle(WIDTH / 2, (LAYOUT.zoneTop + LAYOUT.zoneBottom) / 2, WIDTH, zh, 0xff3b3b, 1)
            .setDepth(DEPTH.board)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setAlpha(0);
        const style = {
            fontFamily: FONT,
            fontSize: '24px',
            color: '#bfefff',
            stroke: '#05060f',
            strokeThickness: 5
        };
        this.zoneText = this.add.text(24, LAYOUT.zoneTop + 24, '', style).setOrigin(0, 0.5).setDepth(DEPTH.hud);
        this.hpText = this.add.text(WIDTH - 24, LAYOUT.zoneTop + 24, '', style).setOrigin(1, 0.5).setDepth(DEPTH.hud);
        this.hpBar = this.add.graphics().setDepth(DEPTH.hud);
        // Zone HP only exists while enemy fire is on (see RULES.enemyFire).
        this.hpText.setVisible(RULES.enemyFire);
        this.hpBar.setVisible(RULES.enemyFire);
        this.updateZoneText();
        this.updateHp();
        this.toastText = label(this, WIDTH / 2, LAYOUT.zoneTop - 40, '', 30, PALETTE.danger).setDepth(DEPTH.hud).setAlpha(0);
    }

    private drawHud() {
        const g = this.add.graphics().setDepth(DEPTH.hud);
        g.fillGradientStyle(0x0a0f22, 0x0a0f22, 0x0a0f22, 0x0a0f22, 0.95, 0.95, 0.55, 0.55);
        g.fillRect(0, 0, WIDTH, LAYOUT.hudHeight);
        g.lineStyle(8, NEON, 0.15);
        g.lineBetween(0, LAYOUT.hudHeight, WIDTH, LAYOUT.hudHeight);
        g.lineStyle(3, NEON, 0.8);
        g.lineBetween(0, LAYOUT.hudHeight, WIDTH, LAYOUT.hudHeight);
        label(this, WIDTH / 2, 55, `Level ${this.level.id} · ${this.level.name}`, 36).setDepth(DEPTH.hud);
        this.progress = this.add.graphics().setDepth(DEPTH.hud);
        if (this.level.stages.at(-1)?.boss) {
            this.bossTag = this.add
                .text(0, 110, 'BOSS', { fontFamily: FONT, fontSize: '20px', color: '#ff9a9a', stroke: '#05060f', strokeThickness: 4 })
                .setOrigin(0.5)
                .setDepth(DEPTH.hud);
        }
        button(this, 70, 75, 100, 84, '‹', () => this.scene.start('Menu'), undefined, 48).setDepth(DEPTH.hud);
        button(this, WIDTH - 70, 75, 100, 84, '↻', () => this.scene.restart({ index: this.index }), undefined, 44).setDepth(DEPTH.hud);
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

        // Hangar deck: a metal panel with a glowing edge; the top edge is the exit.
        const g = this.add.graphics().setDepth(DEPTH.board);
        const m = 18;
        drawPanel(g, this.boardX - m, this.boardY - m, cols * this.cell + m * 2, rows * this.cell + m * 2, 0x0c1224, NEON, 22);
        g.fillStyle(0xffd36b, 0.9);
        for (let x = this.boardX; x < this.boardX + cols * this.cell; x += 28) g.fillTriangle(x + 6, this.boardY - 6, x + 20, this.boardY - 6, x + 13, this.boardY - 13);

        this.grid.forEach((line, row) => {
            this.board.push([]);
            line.forEach((c, col) => {
                const p = this.cellCenter(row, col);
                // Every cell gets a landing slot so vacated cells read as empty space.
                this.add.image(p.x, p.y, 'slot').setDisplaySize(this.cell, this.cell).setDepth(DEPTH.board);
                if (c.kind === 'wall') this.add.image(p.x, p.y, 'crate').setDisplaySize(this.cell, this.cell).setDepth(DEPTH.board);
                if (c.kind === 'elevator') this.buildLift(row, col, c.dir);
                if (c.kind !== 'fighter') {
                    this.board[row].push(null);
                    return;
                }
                this.board[row].push(this.makeFighter(row, col, c.color, c.ammo, p.x, p.y, { hidden: c.hidden, frozen: c.frozen }));
            });
        });
        this.refreshTappable();
    }

    private makeFighter(row: number, col: number, color: ColorKey, ammo: number, x: number, y: number, opts: { hidden?: boolean; frozen?: number } = {}) {
        const f = new Fighter(this, x, y, row, col, color, ammo, opts);
        f.setScale((this.cell * 0.84) / FIGHTER_ZONE_SIZE).setDepth(DEPTH.board + 1);
        f.sprite.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.tapFighter(f));
        return f;
    }

    // ---------------------------------------------------------------- elevators

    private buildLift(row: number, col: number, dir: Dir) {
        const p = this.cellCenter(row, col);
        const angle = { up: 0, right: 90, down: 180, left: -90 }[dir];
        this.add.image(p.x, p.y, 'elevator').setDisplaySize(this.cell, this.cell).setAngle(angle).setDepth(DEPTH.board);
        const next = this.add.image(p.x, p.y, 'fighter-R').setDisplaySize(this.cell * 0.46, this.cell * 0.46).setAngle(angle).setDepth(DEPTH.board);
        const count = this.add
            .text(p.x + this.cell * 0.3, p.y + this.cell * 0.3, '', { fontFamily: FONT, fontSize: `${Math.round(this.cell * 0.26)}px`, color: '#ffffff', stroke: '#05060f', strokeThickness: 5 })
            .setOrigin(0.5)
            .setDepth(DEPTH.board + 2);
        this.lifts.set(`${row},${col}`, { count, next });
        this.updateLift(row, col);
    }

    /** Shows how many fighters are left inside and a dim preview of the next one. */
    private updateLift(row: number, col: number) {
        const cell = this.grid[row][col];
        const view = this.lifts.get(`${row},${col}`);
        if (!view || cell.kind !== 'elevator') return;
        view.count.setText(String(cell.queue.length)).setColor(cell.queue.length ? '#ffffff' : '#6f7f9f');
        if (cell.queue.length) view.next.setTexture(`fighter-${cell.queue[0].color}`).setVisible(true).setAlpha(0.55);
        else view.next.setVisible(false);
    }

    /** After a cell is vacated, an elevator facing it rolls its next fighter out into it. */
    private releaseInto(cell: Pos) {
        const out = releaseElevator(this.grid, cell);
        if (!out) return;
        const from = this.cellCenter(out.from.row, out.from.col);
        const to = this.cellCenter(cell.row, cell.col);
        const f = this.makeFighter(cell.row, cell.col, out.color, out.ammo, from.x, from.y);
        f.state = 'arriving';
        f.setScale(f.scale * 0.6).setAlpha(0);
        this.board[cell.row][cell.col] = f;
        this.arriving++;
        this.updateLift(out.from.row, out.from.col);
        this.tweens.add({
            targets: f,
            x: to.x,
            y: to.y,
            alpha: 1,
            scale: (this.cell * 0.84) / FIGHTER_ZONE_SIZE,
            duration: 260,
            ease: 'Back.easeOut',
            onComplete: () => {
                f.state = 'board';
                this.arriving--;
                this.refreshTappable();
            }
        });
    }

    /** Every launch counts down each frozen fighter; at 0 its ice shatters. */
    private thaw() {
        for (const c of thawStep(this.grid)) {
            this.board[c.row][c.col]?.setFrozen(c.frozen);
            const hint = this.level.tutorial && 'steps' in this.level.tutorial ? this.level.tutorial.onThaw : undefined;
            if (c.frozen === 0 && hint && !this.thawHintShown) {
                this.thawHintShown = true;
                this.time.delayedCall(450, () => this.toast(hint, '#bff3ff', 2600));
            }
        }
    }

    /**
     * First-play tutorial: one card per step. Each dims everything except the first cell of the
     * step's kind (elevator, mystery or frozen fighter) and shows its text; tap to go on.
     */
    private showTutorial(steps: TutorialStep[], done: () => void): void {
        const step = steps[0];
        if (!step) return done();
        const find = (c: Cell) =>
            step.focus === 'elevator' ? c.kind === 'elevator' : c.kind === 'fighter' && (step.focus === 'mystery' ? !!c.hidden : !!c.frozen);
        const row = this.grid.findIndex((line) => line.some(find));
        if (row < 0) return this.showTutorial(steps.slice(1), done);
        const at: Pos = { row, col: this.grid[row].findIndex(find) };
        const focused = this.grid[at.row][at.col];
        const text = step.text.replace('{n}', String(focused.kind === 'fighter' ? (focused.frozen ?? '') : ''));
        const p = this.cellCenter(at.row, at.col);
        const r = this.cell * 0.62;
        const shade = this.add.graphics().setDepth(DEPTH.panel);
        shade.fillStyle(0x000000, 0.78);
        // Four rects around a square hole over the focused cell.
        shade.fillRect(0, 0, WIDTH, p.y - r);
        shade.fillRect(0, p.y + r, WIDTH, HEIGHT - p.y - r);
        shade.fillRect(0, p.y - r, p.x - r, r * 2);
        shade.fillRect(p.x + r, p.y - r, WIDTH - p.x - r, r * 2);
        const ring = this.add.graphics().setDepth(DEPTH.panel);
        ring.lineStyle(6, NEON, 1);
        ring.strokeRoundedRect(p.x - r, p.y - r, r * 2, r * 2, 16);
        this.tweens.add({ targets: ring, alpha: 0.35, duration: 600, yoyo: true, repeat: -1 });
        const label1 = label(this, WIDTH / 2, LAYOUT.zoneTop + 30, text, 36).setAlign('center').setDepth(DEPTH.panel);
        const arrow = label(this, p.x, p.y - r - 46, '▼', 44, '#4fd8ff').setDepth(DEPTH.panel);
        this.tweens.add({ targets: arrow, y: arrow.y + 12, duration: 450, yoyo: true, repeat: -1 });
        const more = steps.length > 1 ? `Tap to continue (${steps.length - 1} more)` : 'Tap to continue';
        const hint = label(this, WIDTH / 2, LAYOUT.zoneTop + 140, more, 28, PALETTE.textDim).setDepth(DEPTH.panel);
        const hit = this.add.zone(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT).setInteractive().setDepth(DEPTH.panel);
        this.time.delayedCall(500, () =>
            hit.once('pointerup', () => {
                for (const o of [shade, ring, label1, arrow, hint, hit]) {
                    this.tweens.killTweensOf(o);
                    o.destroy();
                }
                this.showTutorial(steps.slice(1), done);
            })
        );
    }

    private refreshTappable() {
        for (const line of this.board) {
            for (const f of line) {
                if (!f || f.state !== 'board') continue;
                const hasPath = !!findExitPath(this.grid, f);
                f.setTappable(hasPath && !f.frozen, hasPath);
            }
        }
    }

    private updateZoneText() {
        const used = this.zone.length + this.launching;
        this.zoneText.setText(`${used}/${RULES.flightZoneCapacity}`);
        this.zoneText.setColor(used >= RULES.flightZoneCapacity ? PALETTE.danger : '#bfefff');
    }

    private updateHp() {
        const w = 220;
        const x = WIDTH - 24 - w;
        const y = LAYOUT.zoneTop + 46;
        const f = this.hp / this.maxHp;
        const color = f > 0.5 ? 0x4ade80 : f > 0.25 ? 0xfacc15 : 0xef4444;
        this.hpBar.clear();
        this.hpBar.fillStyle(0x05060f, 0.9);
        this.hpBar.fillRoundedRect(x - 3, y - 3, w + 6, 20, 9);
        if (f > 0) {
            this.hpBar.fillStyle(color, 0.25);
            this.hpBar.fillRoundedRect(x - 2, y - 4, Math.max(16, w * f) + 4, 22, 10);
            this.hpBar.fillStyle(color);
            this.hpBar.fillRoundedRect(x, y, Math.max(14, w * f), 14, 7);
            this.hpBar.fillStyle(0xffffff, 0.35);
            this.hpBar.fillRect(x + 6, y + 2, Math.max(0, w * f - 12), 3);
        }
        this.hpText.setText(`HP ${this.hp}/${this.maxHp}`);
    }

    private toast(msg: string, color: string = PALETTE.danger, hold = 900) {
        this.tweens.killTweensOf(this.toastText);
        this.toastText.setText(msg).setColor(color).setAlpha(1);
        this.tweens.add({ targets: this.toastText, alpha: 0, delay: hold, duration: 400 });
    }

    // ---------------------------------------------------------------- fighters

    private tapFighter(f: Fighter) {
        if (this.ended || f.state !== 'board') return;
        const path = findExitPath(this.grid, f);
        const nudge = () => this.tweens.add({ targets: f, x: f.x + 8, duration: 45, yoyo: true, repeat: 2 });
        if (f.frozen) {
            nudge();
            this.toast(`Frozen: launch ${f.frozen} more fighter${f.frozen > 1 ? 's' : ''}`);
            return;
        }
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
        this.releaseInto({ row: f.row, col: f.col });
        this.thaw();
        f.state = 'launching';
        f.sprite.disableInteractive();
        f.setTappable(true).setDepth(DEPTH.launching);
        f.ignite();
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
        this.drawProgress(i);
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
            const boss = new Boss(this, layout.boss.x, layout.boss.y, layout.boss.name, data.boss!.design ?? 'raptor', parts).setDepth(DEPTH.enemies);
            boss.y -= 900;
            this.tweens.add({ targets: boss, y: boss.baseY, delay, duration: 1100, ease: 'Cubic.easeOut' });
            delay += 450;
            this.boss = boss;
            this.targets.push(...boss.parts);
        }
        this.refreshShields();

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

    /**
     * Stage progress in the HUD: one dot per stage on a line. Cleared stages stay lit, the current
     * one glows; a boss stage is a "BOSS" badge instead of a dot.
     */
    private drawProgress(current: number) {
        const n = this.level.stages.length;
        const hasBoss = !!this.bossTag;
        // Centres spaced so the gap between neighbours is constant, whole row centred.
        const gap = 28;
        const widths = this.level.stages.map((_, i) => (hasBoss && i === n - 1 ? 74 : 18));
        const xs = [0];
        for (let i = 1; i < n; i++) xs.push(xs[i - 1] + (widths[i - 1] + widths[i]) / 2 + gap);
        const shift = WIDTH / 2 - (xs[n - 1] + widths[n - 1] / 2 - widths[0] / 2) / 2;
        for (let i = 0; i < n; i++) xs[i] += shift;
        const y = 110;
        const g = this.progress;
        g.clear();
        g.lineStyle(4, 0x23324f);
        g.lineBetween(xs[0], y, xs[n - 1], y);
        if (current > 0) {
            g.lineStyle(4, NEON, 0.9);
            g.lineBetween(xs[0], y, xs[current], y);
        }
        for (let i = 0; i < n; i++) {
            const lit = i <= current;
            if (hasBoss && i === n - 1) {
                const red = 0xff4d5e;
                if (i === current) {
                    g.fillStyle(red, 0.3);
                    g.fillRoundedRect(xs[i] - 44, y - 21, 88, 42, 21);
                }
                g.fillStyle(lit ? 0x5c1a22 : 0x111a2e);
                g.fillRoundedRect(xs[i] - 37, y - 15, 74, 30, 15);
                g.lineStyle(3, lit ? red : 0x3a4a6a);
                g.strokeRoundedRect(xs[i] - 37, y - 15, 74, 30, 15);
                this.bossTag!.setPosition(xs[i], y).setColor(lit ? '#ffffff' : '#6f7f9f');
                continue;
            }
            if (i === current) {
                g.fillStyle(NEON, 0.3);
                g.fillCircle(xs[i], y, 16);
            }
            g.fillStyle(lit ? NEON : 0x111a2e);
            g.fillCircle(xs[i], y, 9);
            g.lineStyle(3, lit ? 0xe6fbff : 0x3a4a6a);
            g.strokeCircle(xs[i], y, 9);
        }
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
        this.scrollStars(dt);
        const sway = Math.sin(time / 900) * 22;
        for (const e of this.enemies) if (e.active) e.x = e.spec.x + sway;
        if (this.boss?.active) this.boss.x = this.boss.baseX + sway;

        const canShoot = this.updateFighters(time, dt);
        this.updateBullets(dt);
        if (RULES.enemyFire && this.stageActive && !this.ended) this.updateEnemyFire(dt);
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
        const img = this.add.image(f.x, f.noseY, `plasma-${f.color}`).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.bullets);
        this.bullets.push({ img, target });
        this.flash(f.x, f.noseY, COLORS[f.color].hex, 0.5);
        if (f.ammo === 0) this.leave(f);
    }

    /**
     * Bullets fly straight up and hit when they reach the front quarter of their target. The
     * fighter lined up under the target before firing, and the formation drifts only a few px
     * during the flight, so a bullet always lands inside the target it was fired at.
     */
    private updateBullets(dt: number) {
        const step = TIMING.bulletSpeed * dt;
        this.bullets = this.bullets.filter((b) => {
            b.img.y -= step;
            if (b.img.y > b.target.worldY() + b.target.spec.h * 0.25) return true;
            b.img.destroy();
            this.flash(b.img.x, b.img.y, COLORS[b.target.color].hex, 0.7);
            if (b.target.hit()) this.onDestroyed(b.target);
            return false;
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
        const img = this.add.image(at.x, at.y, `eshot-${owner.color}`).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.bullets);
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
            b.img.rotation += 5 * dt;
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

    /** Small additive flash: muzzle flashes and bullet hits. */
    private flash(x: number, y: number, color: number, scale: number) {
        const f = this.add.image(x, y, 'glow').setTint(color).setBlendMode(Phaser.BlendModes.ADD).setScale(scale * 0.35).setDepth(DEPTH.fx);
        this.tweens.add({ targets: f, scale: scale * 0.6, alpha: 0, duration: 120, onComplete: () => f.destroy() });
    }

    private explosion(x: number, y: number, color: number, scale: number) {
        const add = Phaser.BlendModes.ADD;
        // Bright core, coloured bloom and a shockwave ring.
        const core = this.add.image(x, y, 'glow').setBlendMode(add).setScale(scale * 0.4).setAlpha(0.9).setDepth(DEPTH.fx);
        const bloom = this.add.image(x, y, 'glow').setTint(color).setBlendMode(add).setScale(scale * 0.6).setAlpha(0.6).setDepth(DEPTH.fx);
        const ring = this.add.image(x, y, 'ring').setTint(color).setBlendMode(add).setScale(scale * 0.25).setAlpha(0.8).setDepth(DEPTH.fx);
        this.tweens.add({ targets: core, scale: scale * 0.8, alpha: 0, duration: 200, onComplete: () => core.destroy() });
        this.tweens.add({ targets: bloom, scale: scale * 1.3, alpha: 0, duration: 380, ease: 'Quad.easeOut', onComplete: () => bloom.destroy() });
        this.tweens.add({ targets: ring, scale: scale * 1.4, alpha: 0, duration: 360, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
        const p = this.add
            .particles(x, y, 'spark', {
                speed: { min: 80, max: 420 * scale },
                scale: { start: 0.9 * Math.min(scale, 1.5), end: 0 },
                lifespan: { min: 300, max: 750 },
                tint: [color, 0xffffff, 0xffb347],
                blendMode: add,
                emitting: false
            })
            .setDepth(DEPTH.fx);
        p.explode(Math.max(6, Math.round(22 * scale)));
        this.time.delayedCall(1000, () => p.destroy());
    }

    // ---------------------------------------------------------------- end of level

    private checkStuck(delta: number, canShoot: boolean) {
        if (this.ended || !this.stageActive || canShoot || this.launching > 0 || this.arriving > 0 || this.bullets.length > 0) {
            this.idleMs = 0;
            return;
        }
        const full = this.zone.length >= RULES.flightZoneCapacity;
        const anyTappable = this.board.some((line) => line.some((f) => f && canLaunch(this.grid, f)));
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
        this.panel('Level cleared!', RULES.enemyFire ? `Flight zone hp left: ${this.hp}/${this.maxHp}` : 'Every stage cleared.', [
            hasNext ? { text: 'Next level', fill: 0x13502e, onClick: () => this.scene.start('Game', { index: this.index + 1 }) } : null,
            { text: 'Replay', fill: 0x16213a, onClick: () => this.scene.restart({ index: this.index }) },
            { text: 'Home', fill: 0x16213a, onClick: () => this.scene.start('Menu') }
        ]);
    }

    private lose(title: string, subtitle: string) {
        this.ended = true;
        this.panel(title, subtitle, [
            { text: 'Retry', fill: 0x5c1a22, onClick: () => this.scene.restart({ index: this.index }) },
            { text: 'Home', fill: 0x16213a, onClick: () => this.scene.start('Menu') }
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
        drawPanel(g, 90, top, WIDTH - 180, h, 0x0c1530, NEON, 32);
        label(this, WIDTH / 2, top + 90, title, title.length > 16 ? 46 : 56).setDepth(DEPTH.panel);
        label(this, WIDTH / 2, top + 190, subtitle, 28, PALETTE.textDim).setAlign('center').setDepth(DEPTH.panel);
        list.forEach((b, i) => button(this, WIDTH / 2, top + 320 + i * 120, 420, 96, b.text, b.onClick, b.fill, 36).setDepth(DEPTH.panel));
    }
}
