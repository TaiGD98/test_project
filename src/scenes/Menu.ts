import * as Phaser from 'phaser';
import { LEVELS, clearedLevels } from '../game/levels';
import { WIDTH, HEIGHT, PALETTE } from '../game/layout';
import { COLORS } from '../game/rules';
import { button, label } from '../game/ui';

export class Menu extends Phaser.Scene {
    constructor() {
        super('Menu');
    }

    create() {
        this.add.image(WIDTH / 2, 300, 'fighter').setScale(1.8).setTint(COLORS.B.hex);
        label(this, WIDTH / 2, 470, 'Prototype Test', 64);
        label(this, WIDTH / 2, 540, 'Tap fighters out of the hangar.\nEach one only shoots its own colour.', 26, PALETTE.textDim).setAlign('center');

        const cleared = clearedLevels();
        LEVELS.forEach((level, i) => {
            const fighters = level.grid.join('').replace(/[.#]/g, '');
            const colours = new Set(fighters).size;
            const y = 700 + i * 150;
            const done = cleared.has(level.id) ? '  ✓' : '';
            const b = button(this, WIDTH / 2, y, 600, 120, `${level.id}. ${level.name}${done}`, () => this.scene.start('Game', { index: i }), 0x34344c, 36);
            (b.list[1] as Phaser.GameObjects.Text).setY(-16);
            label(this, WIDTH / 2, y + 30, `${colours} colours · ${fighters.length} fighters · ${level.stages.length} stages${level.stages.at(-1)?.boss ? ' · boss' : ''}`, 20, PALETTE.textDim);
        });

        this.add.text(WIDTH - 24, HEIGHT - 30, __APP_VERSION__, { fontSize: '22px', color: '#8a8aa0' }).setOrigin(1, 0.5);
    }
}
