import * as Phaser from 'phaser';
import { addSpaceBackground } from '../game/art';
import { LEVELS, clearedLevels } from '../game/levels';
import { WIDTH, HEIGHT } from '../game/layout';
import { button, label } from '../game/ui';

/** Home screen: the game's name and a Play button that continues from the first uncleared level. */
export class Menu extends Phaser.Scene {
    private scrollStars: (dt: number) => void = () => {};

    constructor() {
        super('Menu');
    }

    create() {
        this.scrollStars = addSpaceBackground(this);
        const glow = this.add.image(WIDTH / 2, 560, 'glow').setTint(0x4fd8ff).setBlendMode(Phaser.BlendModes.ADD).setScale(3.4).setAlpha(0.35);
        this.tweens.add({ targets: glow, alpha: 0.2, duration: 1400, yoyo: true, repeat: -1 });
        const hero = this.add.image(WIDTH / 2, 560, 'fighter-B').setScale(2.3);
        this.tweens.add({ targets: hero, y: 540, duration: 1600, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });
        const title = label(this, WIDTH / 2, 800, 'FIGHTER FORCE', 82, '#ffffff');
        title.setShadow(0, 0, '#4fd8ff', 24, true, true);

        const cleared = clearedLevels();
        const next = LEVELS.findIndex((l) => !cleared.has(l.id));
        button(this, WIDTH / 2, 1180, 420, 140, 'PLAY', () => this.scene.start('Game', { index: next < 0 ? 0 : next }), 0x13502e, 60);

        this.add.text(WIDTH - 24, HEIGHT - 30, __APP_VERSION__, { fontSize: '22px', color: '#6f86a8' }).setOrigin(1, 0.5);
    }

    update(_time: number, delta: number) {
        this.scrollStars(delta / 1000);
    }
}
