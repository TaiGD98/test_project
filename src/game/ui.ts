import * as Phaser from 'phaser';

export const FONT_NAME = 'Russo One';
export const FONT = `"${FONT_NAME}", "Arial Black", Arial, sans-serif`;

/** Neon cyan used for UI edges and highlights. */
export const NEON = 0x4fd8ff;

export function label(scene: Phaser.Scene, x: number, y: number, text: string, size: number, color = '#ffffff') {
    return scene.add
        .text(x, y, text, {
            fontFamily: FONT,
            fontSize: `${size}px`,
            color,
            stroke: '#05060f',
            strokeThickness: Math.max(3, size / 6),
            shadow: { offsetX: 0, offsetY: 3, color: '#000000', blur: 6, fill: true, stroke: true }
        })
        .setOrigin(0.5);
}

/** Sci-fi panel: dark glass with chamfered corners and a glowing edge. */
export function drawPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, fill: number, edge = NEON, cut = 18) {
    const pts = [x + cut, y, x + w - cut, y, x + w, y + cut, x + w, y + h - cut, x + w - cut, y + h, x + cut, y + h, x, y + h - cut, x, y + cut].reduce<
        Phaser.Math.Vector2[]
    >((a, v, i, arr) => (i % 2 ? a : [...a, new Phaser.Math.Vector2(v, arr[i + 1])]), []);
    g.fillStyle(fill, 0.92);
    g.fillPoints(pts, true);
    g.fillGradientStyle(0xffffff, 0xffffff, 0xffffff, 0xffffff, 0.06, 0.06, 0, 0);
    g.fillRect(x + cut, y + 3, w - cut * 2, h * 0.45);
    g.lineStyle(8, edge, 0.18);
    g.strokePoints(pts, true);
    g.lineStyle(3, edge, 0.9);
    g.strokePoints(pts, true);
}

/** Panel button; returns its container so callers can position or destroy it. */
export function button(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    onClick: () => void,
    fill = 0x16213a,
    size = 34
) {
    const bg = scene.add.graphics();
    const draw = (c: number) => {
        bg.clear();
        drawPanel(bg, -w / 2, -h / 2, w, h, c, NEON, Math.min(18, h / 4));
    };
    draw(fill);
    const txt = label(scene, 0, 0, text, size);
    const hit = scene.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    const c = scene.add.container(x, y, [bg, txt, hit]);
    hit.on('pointerover', () => draw(Phaser.Display.Color.IntegerToColor(fill).brighten(12).color));
    hit.on('pointerout', () => draw(fill));
    hit.on('pointerdown', () => scene.tweens.add({ targets: c, scale: 0.94, duration: 60, yoyo: true }));
    hit.on('pointerup', onClick);
    return c;
}
