import * as Phaser from 'phaser';

export const FONT = 'Arial Black, Arial, sans-serif';

export function label(scene: Phaser.Scene, x: number, y: number, text: string, size: number, color = '#ffffff') {
    return scene.add
        .text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, color, stroke: '#000000', strokeThickness: Math.max(2, size / 7) })
        .setOrigin(0.5);
}

/** Rounded button; returns its container so callers can position or destroy it. */
export function button(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    onClick: () => void,
    fill = 0x3b3b55,
    size = 34
) {
    const bg = scene.add.graphics();
    const draw = (c: number) => {
        bg.clear();
        bg.fillStyle(c, 1);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 22);
        bg.lineStyle(3, 0xffffff, 0.15);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 22);
    };
    draw(fill);
    const txt = label(scene, 0, 0, text, size);
    const hit = scene.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    const c = scene.add.container(x, y, [bg, txt, hit]);
    hit.on('pointerover', () => draw(Phaser.Display.Color.IntegerToColor(fill).brighten(15).color));
    hit.on('pointerout', () => draw(fill));
    hit.on('pointerdown', () => scene.tweens.add({ targets: c, scale: 0.94, duration: 60, yoyo: true }));
    hit.on('pointerup', onClick);
    return c;
}
