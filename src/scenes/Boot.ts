import * as Phaser from 'phaser';

// Draws every texture once. Shapes are white (with grey details) so one texture can be
// tinted to any colour; tinting multiplies, so grey parts become a darker shade.
export class Boot extends Phaser.Scene {
    constructor() {
        super('Boot');
    }

    create() {
        const g = this.add.graphics();
        const poly = (pts: number[]) => {
            const v: Phaser.Math.Vector2[] = [];
            for (let i = 0; i < pts.length; i += 2) v.push(new Phaser.Math.Vector2(pts[i], pts[i + 1]));
            g.fillPoints(v, true);
        };

        // Fighter, nose up.
        g.fillStyle(0xffffff);
        poly([48, 2, 57, 28, 94, 60, 94, 72, 57, 64, 60, 82, 74, 94, 22, 94, 36, 82, 39, 64, 2, 72, 2, 60, 39, 28]);
        g.fillStyle(0x9a9a9a);
        g.fillEllipse(48, 36, 12, 26);
        g.fillRect(14, 62, 18, 5);
        g.fillRect(64, 62, 18, 5);
        g.generateTexture('fighter', 96, 96);
        g.clear();

        // Enemy, nose down.
        g.fillStyle(0xffffff);
        poly([48, 94, 62, 66, 94, 44, 94, 22, 64, 30, 58, 6, 38, 6, 32, 30, 2, 22, 2, 44, 34, 66]);
        g.fillStyle(0x9a9a9a);
        g.fillEllipse(48, 58, 14, 24);
        g.fillTriangle(6, 28, 26, 34, 6, 40);
        g.fillTriangle(90, 28, 70, 34, 90, 40);
        g.generateTexture('enemy', 96, 96);
        g.clear();

        // Boss armour part: chamfered plate.
        g.fillStyle(0xffffff);
        poly([22, 0, 98, 0, 120, 22, 120, 74, 98, 96, 22, 96, 0, 74, 0, 22]);
        g.fillStyle(0xb0b0b0);
        poly([30, 12, 90, 12, 108, 30, 108, 66, 90, 84, 30, 84, 12, 66, 12, 30]);
        g.generateTexture('part', 120, 96);
        g.clear();

        g.fillStyle(0xffffff);
        g.fillRoundedRect(0, 0, 12, 30, 6);
        g.generateTexture('bullet', 12, 30);
        g.clear();

        g.fillStyle(0xffffff);
        g.fillCircle(10, 10, 10);
        g.generateTexture('spark', 20, 20);
        g.clear();

        // Enemy bullet: glowing orb with a dark rim (tinted to the shooter's colour).
        g.fillStyle(0x777777);
        g.fillCircle(13, 13, 13);
        g.fillStyle(0xffffff);
        g.fillCircle(13, 13, 9);
        g.generateTexture('ebullet', 26, 26);
        g.destroy();

        const level = Number(new URLSearchParams(location.search).get('level'));
        if (level) this.scene.start('Game', { index: level - 1 });
        else this.scene.start('Menu');
    }
}
