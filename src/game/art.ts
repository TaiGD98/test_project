import * as Phaser from 'phaser';
import { BOSS_SLOTS, COLORS, COLOR_KEYS, type AttackPattern } from './rules';
import type { BossDesign } from './logic';
import { HEIGHT, WIDTH } from './layout';

// All art is painted at boot with the Canvas 2D API (gradients, glow via shadowBlur), so the
// prototype needs no image files. Ships are painted once per gameplay colour: metallic bodies
// with armour, cores and glow in that colour, so colour stays the main read.

type Ctx = CanvasRenderingContext2D;

function mix(hex: number, target: number, t: number) {
    const ch = (h: number, s: number) => (h >> s) & 255;
    const m = (s: number) => Math.round(ch(hex, s) + (ch(target, s) - ch(hex, s)) * t);
    return `rgb(${m(16)},${m(8)},${m(0)})`;
}
const light = (hex: number, t: number) => mix(hex, 0xffffff, t);
const dark = (hex: number, t: number) => mix(hex, 0x000000, t);
const css = (hex: number, a = 1) => `rgba(${(hex >> 16) & 255},${(hex >> 8) & 255},${hex & 255},${a})`;

function paint(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx) => void) {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const tex = scene.textures.createCanvas(key, w, h)!;
    const ctx = tex.getContext();
    draw(ctx);
    tex.refresh();
}

function poly(ctx: Ctx, pts: number[]) {
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
}

/** Draws a shape and its mirror image around x = cx. */
function mirrored(ctx: Ctx, cx: number, draw: () => void) {
    draw();
    ctx.save();
    ctx.translate(cx * 2, 0);
    ctx.scale(-1, 1);
    draw();
    ctx.restore();
}

function steel(ctx: Ctx, x0: number, x1: number) {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, '#3b4252');
    g.addColorStop(0.5, '#e8eef7');
    g.addColorStop(1, '#3b4252');
    return g;
}

function glowCircle(ctx: Ctx, x: number, y: number, r: number, color: number) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.35, light(color, 0.4));
    g.addColorStop(0.75, css(color, 0.9));
    g.addColorStop(1, css(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
}

// ------------------------------------------------------------------ ships

/** Player fighter, nose up, 128 x 128. Painted only in tints and shades of its own colour. */
function fighter(ctx: Ctx, c: number) {
    const cx = 64;
    const wing = [58, 44, 10, 84, 8, 102, 30, 100, 58, 84];
    const body = [64, 4, 75, 30, 79, 72, 72, 108, 56, 108, 49, 72, 53, 30];
    ctx.shadowColor = css(c, 0.9);
    ctx.shadowBlur = 14;
    mirrored(ctx, cx, () => {
        const g = ctx.createLinearGradient(0, 44, 0, 104);
        g.addColorStop(0, light(c, 0.35));
        g.addColorStop(0.55, css(c));
        g.addColorStop(1, dark(c, 0.45));
        ctx.fillStyle = g;
        poly(ctx, wing);
        ctx.fill();
    });
    ctx.shadowBlur = 0;
    mirrored(ctx, cx, () => {
        ctx.strokeStyle = dark(c, 0.6);
        ctx.lineWidth = 2;
        poly(ctx, wing);
        ctx.stroke();
        // Leading-edge highlight, a darker inner panel and the wingtip gun.
        ctx.strokeStyle = light(c, 0.65);
        ctx.beginPath();
        ctx.moveTo(54, 52);
        ctx.lineTo(14, 86);
        ctx.stroke();
        ctx.fillStyle = dark(c, 0.3);
        poly(ctx, [52, 66, 30, 84, 36, 96, 52, 84]);
        ctx.fill();
        const gun = ctx.createLinearGradient(12, 0, 20, 0);
        gun.addColorStop(0, dark(c, 0.5));
        gun.addColorStop(0.5, light(c, 0.5));
        gun.addColorStop(1, dark(c, 0.5));
        ctx.fillStyle = gun;
        ctx.fillRect(12, 70, 8, 30);
        ctx.fillStyle = light(c, 0.8);
        ctx.fillRect(13, 66, 6, 5);
    });
    // Fuselage: light tint of the colour, polished.
    const fus = ctx.createLinearGradient(48, 0, 80, 0);
    fus.addColorStop(0, dark(c, 0.35));
    fus.addColorStop(0.5, light(c, 0.55));
    fus.addColorStop(1, dark(c, 0.35));
    ctx.fillStyle = fus;
    poly(ctx, body);
    ctx.fill();
    ctx.strokeStyle = dark(c, 0.7);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = css(c);
    ctx.fillRect(62, 64, 4, 36);
    // Canopy: deep shade with a pale glint, still the same hue.
    const glass = ctx.createLinearGradient(56, 30, 72, 58);
    glass.addColorStop(0, light(c, 0.85));
    glass.addColorStop(0.45, css(c));
    glass.addColorStop(1, dark(c, 0.65));
    ctx.fillStyle = glass;
    ctx.beginPath();
    ctx.ellipse(64, 44, 7, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.ellipse(61, 38, 2, 6, -0.3, 0, Math.PI * 2);
    ctx.fill();
    mirrored(ctx, cx, () => {
        ctx.fillStyle = dark(c, 0.7);
        ctx.fillRect(55, 104, 7, 10);
        ctx.fillStyle = light(c, 0.6);
        ctx.fillRect(56, 111, 5, 3);
    });
}

/** Enemy drone (small and medium), nose down, 128 x 128. */
function drone(ctx: Ctx, c: number) {
    const cx = 64;
    ctx.shadowColor = css(c, 0.8);
    ctx.shadowBlur = 12;
    // Curved bat wings.
    mirrored(ctx, cx, () => {
        const g = ctx.createLinearGradient(8, 24, 56, 90);
        g.addColorStop(0, light(c, 0.35));
        g.addColorStop(0.55, css(c));
        g.addColorStop(1, dark(c, 0.55));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(56, 36);
        ctx.quadraticCurveTo(26, 14, 6, 26);
        ctx.quadraticCurveTo(10, 56, 18, 74);
        ctx.quadraticCurveTo(32, 64, 40, 70);
        ctx.quadraticCurveTo(46, 82, 56, 86);
        ctx.closePath();
        ctx.fill();
    });
    ctx.shadowBlur = 0;
    mirrored(ctx, cx, () => {
        // Wing ribs and rim.
        ctx.strokeStyle = dark(c, 0.65);
        ctx.lineWidth = 2;
        for (const [x, y] of [[14, 30], [22, 52], [32, 64]]) {
            ctx.beginPath();
            ctx.moveTo(54, 50);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
        ctx.strokeStyle = light(c, 0.6);
        ctx.beginPath();
        ctx.moveTo(56, 36);
        ctx.quadraticCurveTo(26, 14, 6, 26);
        ctx.stroke();
        // Gold claws at the front.
        ctx.fillStyle = '#f5c542';
        poly(ctx, [54, 92, 46, 118, 58, 100]);
        ctx.fill();
    });
    // Armoured body.
    const body = ctx.createLinearGradient(46, 0, 82, 0);
    body.addColorStop(0, '#1f2230');
    body.addColorStop(0.5, '#7c86a6');
    body.addColorStop(1, '#1f2230');
    ctx.fillStyle = body;
    poly(ctx, [64, 10, 80, 34, 77, 86, 64, 120, 51, 86, 48, 34]);
    ctx.fill();
    ctx.strokeStyle = '#11131b';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = dark(c, 0.2);
    poly(ctx, [64, 74, 72, 86, 64, 110, 56, 86]);
    ctx.fill();
    // Glowing core.
    ctx.shadowColor = css(c);
    ctx.shadowBlur = 16;
    glowCircle(ctx, 64, 54, 13, c);
    ctx.shadowBlur = 0;
}

/** Heavy enemy (large), nose down, 128 x 128: spiked wings and twin cores. */
function heavy(ctx: Ctx, c: number) {
    const cx = 64;
    ctx.shadowColor = css(c, 0.85);
    ctx.shadowBlur = 14;
    mirrored(ctx, cx, () => {
        const g = ctx.createLinearGradient(0, 20, 60, 100);
        g.addColorStop(0, light(c, 0.4));
        g.addColorStop(0.5, css(c));
        g.addColorStop(1, dark(c, 0.55));
        ctx.fillStyle = g;
        poly(ctx, [54, 30, 30, 18, 4, 30, 14, 44, 2, 58, 16, 66, 8, 84, 30, 80, 44, 96, 56, 92]);
        ctx.fill();
    });
    ctx.shadowBlur = 0;
    mirrored(ctx, cx, () => {
        ctx.strokeStyle = dark(c, 0.7);
        ctx.lineWidth = 2;
        poly(ctx, [54, 30, 30, 18, 4, 30, 14, 44, 2, 58, 16, 66, 8, 84, 30, 80, 44, 96, 56, 92]);
        ctx.stroke();
        // Armour plate and gun barrel on each wing.
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        poly(ctx, [50, 42, 24, 40, 20, 62, 46, 74]);
        ctx.fill();
        ctx.fillStyle = steel(ctx, 26, 36);
        ctx.fillRect(27, 70, 8, 26);
        ctx.fillStyle = '#ff9a3c';
        ctx.fillRect(28, 94, 6, 4);
    });
    const body = ctx.createLinearGradient(42, 0, 86, 0);
    body.addColorStop(0, '#1b1d29');
    body.addColorStop(0.5, '#8a93b3');
    body.addColorStop(1, '#1b1d29');
    ctx.fillStyle = body;
    poly(ctx, [64, 6, 84, 26, 84, 80, 70, 116, 58, 116, 44, 80, 44, 26]);
    ctx.fill();
    ctx.strokeStyle = '#0f1118';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#f5c542';
    poly(ctx, [64, 92, 72, 100, 64, 122, 56, 100]);
    ctx.fill();
    ctx.shadowColor = css(c);
    ctx.shadowBlur = 16;
    glowCircle(ctx, 56, 50, 9, c);
    glowCircle(ctx, 72, 50, 9, c);
    glowCircle(ctx, 64, 72, 7, c);
    ctx.shadowBlur = 0;
}

// ------------------------------------------------------------------ projectiles and fx

function plasma(ctx: Ctx, c: number) {
    ctx.shadowColor = css(c);
    ctx.shadowBlur = 10;
    ctx.fillStyle = css(c, 0.95);
    ctx.beginPath();
    ctx.moveTo(12, 4);
    ctx.quadraticCurveTo(22, 30, 12, 60);
    ctx.quadraticCurveTo(2, 30, 12, 4);
    ctx.fill();
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(12, 26, 3.5, 16, 0, 0, Math.PI * 2);
    ctx.fill();
}

function enemyShot(ctx: Ctx, c: number) {
    ctx.shadowColor = css(c);
    ctx.shadowBlur = 10;
    ctx.strokeStyle = light(c, 0.2);
    ctx.lineWidth = 4;
    poly(ctx, [18, 4, 32, 18, 18, 32, 4, 18]);
    ctx.stroke();
    glowCircle(ctx, 18, 18, 8, c);
}

function softDot(ctx: Ctx, size: number) {
    const r = size / 2;
    const g = ctx.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
}

function flame(ctx: Ctx, inner: string, outer: string) {
    const g = ctx.createLinearGradient(0, 0, 0, 56);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.25, inner);
    g.addColorStop(0.7, outer);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(4, 2);
    ctx.quadraticCurveTo(14, 4, 24, 2);
    ctx.quadraticCurveTo(18, 30, 14, 56);
    ctx.quadraticCurveTo(10, 30, 4, 2);
    ctx.fill();
}

// ------------------------------------------------------------------ boss

// A boss is one spaceship, nose down, drawn in boss space (origin = boss centre). Each part slot
// (see BOSS_SLOTS in rules.ts) is a section of the ship painted in its part's colour:
// 0/1 wings, 2 central hull with the reactor, 3 nose, 4/5 engines, 6/7 outer gun pods.
// Three designs share those slots, so gameplay is identical whichever one a level uses.

const mirrorX = (pts: number[]) => pts.map((v, i) => (i % 2 ? v : -v));

function ring(cx: number, cy: number, rx: number, ry: number, n: number, rot = 0) {
    const pts: number[] = [];
    for (let i = 0; i < n; i++) {
        const a = rot + (i / n) * Math.PI * 2;
        pts.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
    }
    return pts;
}

/** Annulus sector (degrees, y down) around the saucer centre; `bulge` pushes the outer edge out near an angle. */
function sector(a0: number, a1: number, r0: number, r1: number, bulge?: { at: number; by: number; width: number }) {
    const pts: number[] = [];
    const steps = 18;
    const rad = (d: number) => (d * Math.PI) / 180;
    for (let i = 0; i <= steps; i++) {
        const a = a0 + ((a1 - a0) * i) / steps;
        const r = r1 + (bulge ? bulge.by * Math.max(0, 1 - Math.abs(a - bulge.at) / bulge.width) : 0);
        pts.push(Math.cos(rad(a)) * r, -20 + Math.sin(rad(a)) * r);
    }
    for (let i = steps; i >= 0; i--) {
        const a = a0 + ((a1 - a0) * i) / steps;
        pts.push(Math.cos(rad(a)) * r0, -20 + Math.sin(rad(a)) * r0);
    }
    return pts;
}

interface BossArt {
    shapes: number[][];
    /** Paints the dark hull; `has(slot)` says which sections this boss has, so struts only go to real parts. */
    frame: (ctx: Ctx, has: (slot: number) => boolean) => void;
    /** Where the main engine flame burns (boss space). */
    tail: [number, number];
}

function metalGradient(ctx: Ctx, x0: number, x1: number) {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, '#1b1a24');
    g.addColorStop(0.5, '#5b5670');
    g.addColorStop(1, '#1b1a24');
    return g;
}

function neonLine(ctx: Ctx, pts: number[], color = '#ff8a3c') {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.stroke();
    ctx.restore();
}

const RAPTOR_WING = [-56, -72, -124, -66, -306, 26, -294, 64, -160, 42, -56, 54];
const RAPTOR_ENGINE = [-142, -198, -122, -234, -88, -234, -68, -198, -70, -82, -140, -82];
const RAPTOR_POD = [-330, -146, -302, -186, -276, -122, -272, 8, -300, 44, -328, 8];

const MANTIS_ARM = [-56, -72, -150, -104, -252, -74, -304, -10, -294, 66, -242, 120, -246, 58, -232, 26, -170, 22, -100, 32, -56, 52];

const BOSS_ART: Record<BossDesign, BossArt> = {
    // Angular warship: forward-swept blade wings, split-jaw prow, twin thruster blocks, spike cannons.
    raptor: {
        shapes: [
            RAPTOR_WING, mirrorX(RAPTOR_WING),
            [-58, -112, 58, -112, 74, -30, 58, 62, -58, 62, -74, -30],
            [-58, 60, 58, 60, 46, 150, 30, 238, 12, 162, -12, 162, -30, 238, -46, 150],
            RAPTOR_ENGINE, mirrorX(RAPTOR_ENGINE),
            RAPTOR_POD, mirrorX(RAPTOR_POD)
        ],
        tail: [0, -256],
        frame: (ctx, has) => {
            ctx.strokeStyle = '#0d0c12';
            ctx.lineWidth = 3;
            if (has(6)) {
                ctx.fillStyle = '#25222e';
                poly(ctx, [-300, -84, 300, -84, 300, -62, -300, -62]);
                ctx.fill();
                ctx.stroke();
            }
            mirrored(ctx, 0, () => {
                ctx.fillStyle = metalGradient(ctx, -140, -20);
                poly(ctx, [-24, -150, -120, -270, -136, -252, -56, -130]);
                ctx.fill();
                ctx.stroke();
            });
            ctx.fillStyle = metalGradient(ctx, -50, 50);
            poly(ctx, [-44, -100, 44, -100, 30, -220, 0, -260, -30, -220]);
            ctx.fill();
            ctx.stroke();
            neonLine(ctx, [0, -110, 0, -246]);
            if (has(6)) neonLine(ctx, [-290, -73, 290, -73], '#ff5a3c');
        }
    },
    // Insectoid hive ship: hooked claw arms, an orb body, a stinger prow, round engine pods.
    mantis: {
        shapes: [
            MANTIS_ARM, mirrorX(MANTIS_ARM),
            ring(0, -20, 70, 70, 28),
            [-36, 40, 36, 40, 24, 140, 0, 244, -24, 140],
            ring(-105, -150, 34, 40, 20),
            ring(105, -150, 34, 40, 20),
            [...ring(-300, -66, 24, 62, 18, Math.PI / 2), -300, 20],
            [...ring(300, -66, 24, 62, 18, Math.PI / 2), 300, 20]
        ],
        tail: [0, -268],
        frame: (ctx, has) => {
            ctx.strokeStyle = '#0d0c12';
            ctx.lineWidth = 3;
            // Segmented abdomen trailing behind the orb.
            for (const [y, r] of [[-120, 38], [-168, 32], [-212, 26], [-248, 18]]) {
                ctx.fillStyle = metalGradient(ctx, -r, r);
                ctx.beginPath();
                ctx.ellipse(0, y, r, r * 0.7, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
            // Struts to the engine pods and the gun pods.
            ctx.strokeStyle = '#3b3550';
            ctx.lineWidth = 12;
            ctx.beginPath();
            for (const s of [-1, 1]) {
                if (has(4)) {
                    ctx.moveTo(s * 40, -70);
                    ctx.lineTo(s * 105, -150);
                }
                if (has(6)) {
                    ctx.moveTo(s * 240, -40);
                    ctx.lineTo(s * 300, -66);
                }
            }
            ctx.stroke();
            // Antennae.
            ctx.strokeStyle = '#8a7fa8';
            ctx.lineWidth = 4;
            ctx.beginPath();
            for (const s of [-1, 1]) {
                ctx.moveTo(s * 20, 60);
                ctx.quadraticCurveTo(s * 90, 150, s * 70, 240);
            }
            ctx.stroke();
            neonLine(ctx, [0, -100, 0, -258], '#c06bff');
        }
    },
    // Battle saucer: a ring split into armoured sectors around a reactor dome, satellite turrets.
    dreadnought: {
        shapes: [
            sector(140, 214, 74, 236), sector(-34, 40, 74, 236),
            ring(0, -20, 72, 72, 28),
            sector(42, 138, 74, 236, { at: 90, by: 34, width: 14 }),
            sector(216, 262, 74, 236), sector(278, 324, 74, 236),
            ring(-302, -70, 36, 36, 8, Math.PI / 8),
            ring(302, -70, 36, 36, 8, Math.PI / 8)
        ],
        tail: [0, -280],
        frame: (ctx, has) => {
            ctx.strokeStyle = '#0d0c12';
            ctx.lineWidth = 3;
            // Bridge tower at the back.
            ctx.fillStyle = metalGradient(ctx, -40, 40);
            poly(ctx, [-34, -220, -24, -276, 24, -276, 34, -220]);
            ctx.fill();
            ctx.stroke();
            // The saucer's base disc shows through the gaps between sectors.
            ctx.fillStyle = '#211e2b';
            ctx.beginPath();
            ctx.arc(0, -20, 240, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            if (has(6)) {
                ctx.strokeStyle = '#3b3550';
                ctx.lineWidth = 14;
                ctx.beginPath();
                for (const s of [-1, 1]) {
                    ctx.moveTo(s * 230, -60);
                    ctx.lineTo(s * 300, -70);
                }
                ctx.stroke();
            }
            // Rim lights.
            ctx.fillStyle = '#ffb36b';
            ctx.shadowColor = '#ff8a3c';
            ctx.shadowBlur = 8;
            for (let a = 0; a < 360; a += 15) {
                const r = (a * Math.PI) / 180;
                ctx.beginPath();
                ctx.arc(Math.cos(r) * 246, -20 + Math.sin(r) * 246, 3, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.shadowBlur = 0;
        }
    }
};

/** Back-to-front draw order so the sections overlap like one hull. */
export const BOSS_DRAW_ORDER = [4, 5, 6, 7, 0, 1, 2, 3];

export function bossTail(design: BossDesign) {
    return BOSS_ART[design].tail;
}

function weapon(ctx: Ctx, x: number, y: number, pattern: AttackPattern) {
    const tube = (dx: number, w: number, len: number, angle = 0) => {
        ctx.save();
        ctx.translate(x + dx, y);
        ctx.rotate(angle);
        ctx.fillStyle = steel(ctx, -w / 2, w / 2);
        ctx.fillRect(-w / 2, -6, w, len + 6);
        ctx.strokeStyle = '#151820';
        ctx.lineWidth = 2;
        ctx.strokeRect(-w / 2, -6, w, len + 6);
        ctx.fillStyle = '#ff7a2f';
        ctx.fillRect(-w / 2 + 2, len - 5, w - 4, 4);
        ctx.restore();
    };
    if (pattern === 'single') tube(0, 10, 24);
    else if (pattern === 'spread') {
        tube(-16, 9, 22, 0.35);
        tube(0, 10, 26);
        tube(16, 9, 22, -0.35);
    } else if (pattern === 'burst') {
        tube(0, 16, 36);
        ctx.fillStyle = '#5d6478';
        for (const dy of [8, 18, 28]) ctx.fillRect(x - 10, y + dy, 20, 4);
    } else {
        tube(-7, 7, 28);
        tube(7, 7, 28);
        ctx.fillStyle = '#ff3b3b';
        ctx.beginPath();
        ctx.arc(x, y + 4, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

function centroid(pts: number[]) {
    let x = 0;
    let y = 0;
    for (let i = 0; i < pts.length; i += 2) (x += pts[i]), (y += pts[i + 1]);
    return [x / (pts.length / 2), y / (pts.length / 2)];
}

function bossPiece(ctx: Ctx, design: BossDesign, slot: number, c: number) {
    const pts = BOSS_ART[design].shapes[slot];
    const [mx, my] = centroid(pts);
    const ys = pts.filter((_, i) => i % 2);
    ctx.shadowColor = css(c, 0.85);
    ctx.shadowBlur = 16;
    const g = ctx.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys));
    g.addColorStop(0, dark(c, 0.4));
    g.addColorStop(0.5, css(c));
    g.addColorStop(1, light(c, 0.3));
    ctx.fillStyle = g;
    poly(ctx, pts);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = dark(c, 0.7);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.save();
    poly(ctx, pts);
    ctx.clip();
    // Armour seams across the section, then an inset trim line.
    ctx.strokeStyle = dark(c, 0.45);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let y = Math.min(...ys) + 26; y < Math.max(...ys); y += 34) {
        ctx.moveTo(mx - 400, y);
        ctx.lineTo(mx + 400, y + 18);
    }
    ctx.stroke();
    const inset = pts.map((v, i) => (i % 2 ? my + (v - my) * 0.78 : mx + (v - mx) * 0.78));
    ctx.strokeStyle = light(c, 0.55);
    ctx.lineWidth = 2;
    poly(ctx, inset);
    ctx.stroke();
    ctx.restore();
    // Per-role details.
    const [sx, sy] = [BOSS_SLOTS[slot].x, BOSS_SLOTS[slot].y];
    if (slot === 2) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.arc(sx, sy, 36, 0, Math.PI * 2);
        ctx.fill();
        glowCircle(ctx, sx, sy, 32, c);
    } else if (slot === 3) {
        ctx.fillStyle = light(c, 0.9);
        ctx.shadowColor = css(c);
        ctx.shadowBlur = 12;
        poly(ctx, [sx - 26, sy - 14, sx + 26, sy - 14, sx + 14, sy - 4, sx - 14, sy - 4]);
        ctx.fill();
        ctx.shadowBlur = 0;
    } else if (slot >= 6) {
        glowCircle(ctx, sx, sy - 36, 9, c);
    } else if (slot >= 4) {
        ctx.strokeStyle = dark(c, 0.65);
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (const dy of [-36, -24, -12]) {
            ctx.moveTo(sx - 16, sy + dy);
            ctx.lineTo(sx + 16, sy + dy);
        }
        ctx.stroke();
    }
    // Running lights near the outer corners.
    for (let i = 0; i < pts.length; i += 6) glowCircle(ctx, mx + (pts[i] - mx) * 0.82, my + (pts[i + 1] - my) * 0.82, 4, c);
}

/**
 * Paints one boss section in its colour, with guns at its lowest point showing its weapon.
 * Returns the texture key, its centre in boss space, and the section's top (for engine flames).
 */
export function paintBossPart(scene: Phaser.Scene, design: BossDesign, slot: number, color: number, pattern: AttackPattern) {
    const key = `boss-${design}-${slot}-${color.toString(16)}-${pattern}`;
    const pts = BOSS_ART[design].shapes[slot];
    const xs = pts.filter((_, i) => i % 2 === 0);
    const ys = pts.filter((_, i) => i % 2 === 1);
    let low = 0;
    for (let i = 1; i < ys.length; i++) if (ys[i] > ys[low]) low = i;
    const gun: [number, number] = [xs[low], ys[low] - 8];
    const pad = 30;
    const x0 = Math.min(...xs) - pad;
    const y0 = Math.min(...ys) - pad;
    const x1 = Math.max(...xs) + pad;
    const y1 = Math.max(...ys) + 46 + pad;
    if (!scene.textures.exists(key)) {
        paint(scene, key, Math.ceil(x1 - x0), Math.ceil(y1 - y0), (ctx) => {
            ctx.translate(-x0, -y0);
            weapon(ctx, gun[0], gun[1], pattern);
            bossPiece(ctx, design, slot, color);
        });
    }
    return { key, x: (x0 + x1) / 2, y: (y0 + y1) / 2, top: Math.min(...ys), topX: xs[ys.indexOf(Math.min(...ys))] };
}

/** The dark hull the coloured sections sit on, one per design. */
export function paintBossFrame(scene: Phaser.Scene, design: BossDesign, slots: number[]) {
    const key = `boss-frame-${design}-${[...slots].sort().join('')}`;
    if (!scene.textures.exists(key)) {
        paint(scene, key, 720, 600, (ctx) => {
            ctx.translate(360, 300);
            const glow = ctx.createRadialGradient(0, 0, 40, 0, 0, 340);
            glow.addColorStop(0, 'rgba(255,80,40,0.22)');
            glow.addColorStop(1, 'rgba(255,80,40,0)');
            ctx.fillStyle = glow;
            ctx.fillRect(-360, -300, 720, 600);
            BOSS_ART[design].frame(ctx, (slot) => slots.includes(slot));
        });
    }
    return key;
}

/** Elevator, facing up (rotated in game): a lift shaft with a glowing exit chevron. */
function elevator(ctx: Ctx) {
    const frame = ctx.createLinearGradient(0, 0, 128, 128);
    frame.addColorStop(0, '#4a5470');
    frame.addColorStop(1, '#1e2436');
    ctx.fillStyle = frame;
    ctx.beginPath();
    ctx.roundRect(4, 4, 120, 120, 16);
    ctx.fill();
    ctx.strokeStyle = '#8fa0c8';
    ctx.lineWidth = 3;
    ctx.stroke();
    // Shaft.
    const shaft = ctx.createLinearGradient(0, 20, 0, 116);
    shaft.addColorStop(0, '#05070f');
    shaft.addColorStop(1, '#12203a');
    ctx.fillStyle = shaft;
    ctx.beginPath();
    ctx.roundRect(20, 22, 88, 90, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(79,216,255,0.35)';
    ctx.lineWidth = 2;
    for (const y of [44, 66, 88]) {
        ctx.beginPath();
        ctx.moveTo(26, y);
        ctx.lineTo(102, y);
        ctx.stroke();
    }
    // Open door edge and exit chevron at the facing side.
    ctx.fillStyle = '#4fd8ff';
    ctx.shadowColor = '#4fd8ff';
    ctx.shadowBlur = 12;
    ctx.fillRect(20, 6, 88, 5);
    poly(ctx, [64, 14, 86, 34, 76, 34, 64, 24, 52, 34, 42, 34]);
    ctx.fill();
    ctx.shadowBlur = 0;
}

// ------------------------------------------------------------------ scenery

function nebula(ctx: Ctx) {
    const base = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    base.addColorStop(0, '#04050d');
    base.addColorStop(0.45, '#0d0820');
    base.addColorStop(1, '#14061a');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalCompositeOperation = 'lighter';
    const blobs: [number, number, number, string][] = [
        [180, 380, 460, 'rgba(110,40,170,0.30)'],
        [640, 220, 380, 'rgba(30,70,170,0.30)'],
        [600, 820, 420, 'rgba(160,30,90,0.22)'],
        [120, 1150, 420, 'rgba(150,40,30,0.22)'],
        [560, 1500, 380, 'rgba(60,30,140,0.25)']
    ];
    for (const [x, y, r, col] of blobs) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, col);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
    // Fine dust.
    for (let i = 0; i < 2500; i++) {
        ctx.fillStyle = `rgba(200,180,255,${Math.random() * 0.06})`;
        ctx.fillRect(Math.random() * WIDTH, Math.random() * HEIGHT, 2, 2);
    }
    ctx.globalCompositeOperation = 'source-over';
}

function stars(ctx: Ctx, count: number, big: boolean) {
    for (let i = 0; i < count; i++) {
        const x = Math.random() * WIDTH;
        const y = Math.random() * HEIGHT;
        const r = big ? 1.2 + Math.random() * 1.8 : 0.5 + Math.random() * 1;
        ctx.fillStyle = `rgba(255,255,255,${big ? 0.9 : 0.3 + Math.random() * 0.5})`;
        if (big) {
            ctx.shadowColor = Math.random() < 0.5 ? '#9fd8ff' : '#ffd1f0';
            ctx.shadowBlur = 8;
        }
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        if (big && Math.random() < 0.3) {
            ctx.fillRect(x - r * 4, y - 0.5, r * 8, 1);
            ctx.fillRect(x - 0.5, y - r * 4, 1, r * 8);
        }
    }
    ctx.shadowBlur = 0;
}

function slot(ctx: Ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#0b0f1c');
    g.addColorStop(1, '#1b2338');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(4, 4, 120, 120, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,200,255,0.35)';
    ctx.lineWidth = 3;
    ctx.stroke();
    // Landing marks.
    ctx.strokeStyle = 'rgba(90,200,255,0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(64, 64, 38, 0, Math.PI * 2);
    ctx.stroke();
}

function crate(ctx: Ctx) {
    const g = ctx.createLinearGradient(0, 0, 128, 128);
    g.addColorStop(0, '#5f6780');
    g.addColorStop(1, '#2a2f40');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(4, 4, 120, 120, 14);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.rect(18, 46, 92, 36);
    ctx.clip();
    for (let x = -40; x < 140; x += 24) {
        ctx.fillStyle = '#f5c542';
        poly(ctx, [x, 82, x + 12, 82, x + 48, 46, x + 36, 46]);
        ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(18, 46, 92, 3);
    ctx.strokeStyle = '#8b93ad';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(4, 4, 120, 120, 14);
    ctx.stroke();
    ctx.fillStyle = '#c9cfdd';
    for (const [x, y] of [[18, 18], [110, 18], [18, 110], [110, 110]]) {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}


/** Mystery fighter: the fighter silhouette in near-black with a faint violet rim. 128 x 128. */
function mysteryFighter(ctx: Ctx) {
    const wing = [58, 44, 10, 84, 8, 102, 30, 100, 58, 84];
    const body = [64, 4, 75, 30, 79, 72, 72, 108, 56, 108, 49, 72, 53, 30];
    ctx.shadowColor = 'rgba(170,120,255,0.8)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#15121f';
    mirrored(ctx, 64, () => {
        poly(ctx, wing);
        ctx.fill();
    });
    poly(ctx, body);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#4a3d6e';
    ctx.lineWidth = 2;
    mirrored(ctx, 64, () => {
        poly(ctx, wing);
        ctx.stroke();
    });
    poly(ctx, body);
    ctx.stroke();
}

/** Ice block that encases a frozen fighter, 128 x 128: translucent crystal with facets and cracks. */
function iceBlock(ctx: Ctx) {
    const g = ctx.createLinearGradient(0, 0, 128, 128);
    g.addColorStop(0, 'rgba(220,250,255,0.7)');
    g.addColorStop(0.5, 'rgba(120,210,255,0.35)');
    g.addColorStop(1, 'rgba(60,150,230,0.6)');
    ctx.fillStyle = g;
    poly(ctx, [20, 6, 108, 6, 122, 26, 122, 104, 104, 122, 22, 122, 6, 102, 6, 24]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(240,255,255,0.95)';
    ctx.lineWidth = 3;
    ctx.stroke();
    // Facets.
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    poly(ctx, [20, 6, 64, 6, 40, 40, 6, 24]);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    poly(ctx, [122, 26, 122, 70, 92, 50]);
    ctx.fill();
    // Cracks.
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(30, 100);
    ctx.lineTo(48, 82);
    ctx.lineTo(44, 70);
    ctx.moveTo(98, 30);
    ctx.lineTo(84, 46);
    ctx.lineTo(90, 58);
    ctx.stroke();
}

function shard(ctx: Ctx) {
    ctx.fillStyle = 'rgba(210,245,255,0.95)';
    ctx.strokeStyle = 'rgba(255,255,255,1)';
    ctx.lineWidth = 1;
    poly(ctx, [2, 18, 10, 2, 22, 10, 14, 22]);
    ctx.fill();
    ctx.stroke();
}

/** Every texture the game uses. Called once from Boot. */
export function paintAll(scene: Phaser.Scene) {
    for (const k of COLOR_KEYS) {
        const c = COLORS[k].hex;
        paint(scene, `fighter-${k}`, 128, 128, (ctx) => fighter(ctx, c));
        paint(scene, `drone-${k}`, 128, 128, (ctx) => drone(ctx, c));
        paint(scene, `heavy-${k}`, 128, 128, (ctx) => heavy(ctx, c));
        paint(scene, `plasma-${k}`, 24, 64, (ctx) => plasma(ctx, c));
        paint(scene, `eshot-${k}`, 36, 36, (ctx) => enemyShot(ctx, c));
    }
    paint(scene, 'elevator', 128, 128, elevator);
    paint(scene, 'fighter-mystery', 128, 128, mysteryFighter);
    paint(scene, 'ice', 128, 128, iceBlock);
    paint(scene, 'shard', 24, 24, shard);
    paint(scene, 'spark', 32, 32, (ctx) => softDot(ctx, 32));
    paint(scene, 'glow', 128, 128, (ctx) => softDot(ctx, 128));
    paint(scene, 'ring', 128, 128, (ctx) => {
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 12;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(64, 64, 52, 0, Math.PI * 2);
        ctx.stroke();
    });
    // White flame, tinted to each fighter's colour.
    paint(scene, 'flame', 28, 58, (ctx) => flame(ctx, '#e6e6e6', 'rgba(170,170,170,0.8)'));
    paint(scene, 'flame-enemy', 28, 58, (ctx) => flame(ctx, '#ffd36b', 'rgba(255,70,30,0.8)'));
    paint(scene, 'nebula', WIDTH, HEIGHT, nebula);
    paint(scene, 'stars-far', WIDTH, HEIGHT, (ctx) => stars(ctx, 260, false));
    paint(scene, 'stars-near', WIDTH, HEIGHT, (ctx) => stars(ctx, 60, true));
    paint(scene, 'slot', 128, 128, slot);
    paint(scene, 'crate', 128, 128, crate);
}

/** Nebula plus two star layers scrolling at different speeds. Returns a per-frame updater. */
export function addSpaceBackground(scene: Phaser.Scene) {
    scene.add.image(0, 0, 'nebula').setOrigin(0).setDepth(-10);
    const far = scene.add.tileSprite(0, 0, WIDTH, HEIGHT, 'stars-far').setOrigin(0).setDepth(-9);
    const near = scene.add.tileSprite(0, 0, WIDTH, HEIGHT, 'stars-near').setOrigin(0).setDepth(-8);
    return (dt: number) => {
        far.tilePositionY -= 18 * dt;
        near.tilePositionY -= 55 * dt;
    };
}
