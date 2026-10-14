import * as Phaser from 'phaser';
import { Boot } from './scenes/Boot';
import { Menu } from './scenes/Menu';
import { Game } from './scenes/Game';
import { WIDTH, HEIGHT, PALETTE } from './game/layout';

// Portrait phone: 390x844 points rendered at 2x for crisp text.
// Open with ?level=N to jump straight into a level.
const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    title: 'Fighter Force',
    backgroundColor: PALETTE.background,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        parent: 'game-container',
        width: WIDTH,
        height: HEIGHT
    },
    scene: [Boot, Menu, Game]
};

const game = new Phaser.Game(config);

if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;

export default game;
