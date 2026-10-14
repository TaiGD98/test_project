import * as Phaser from 'phaser';
import { paintAll } from '../game/art';
import { FONT_NAME } from '../game/ui';

// Paints every texture once (see game/art.ts) after the game font has loaded.
export class Boot extends Phaser.Scene {
    constructor() {
        super('Boot');
    }

    create() {
        // Don't hold the game hostage to the font: fall back after 2.5 s.
        const font = document.fonts.load(`32px "${FONT_NAME}"`).catch(() => undefined);
        const timeout = new Promise((r) => setTimeout(r, 2500));
        void Promise.race([font, timeout]).then(() => {
            paintAll(this);
            const level = Number(new URLSearchParams(location.search).get('level'));
            if (level) this.scene.start('Game', { index: level - 1 });
            else this.scene.start('Menu');
        });
    }
}
