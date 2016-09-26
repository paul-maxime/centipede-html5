'use strict';

class Game {
	constructor() {
		let canvas = document.getElementById('game-canvas');
		this.graphics = new Yaje.Graphics();
		if (!this.graphics.initialize(canvas)) {
			return;
		}
		this.input = new Yaje.Input(document, canvas);
		this.clock = new Yaje.Clock();
		
		this.spritesheet = new Yaje.SpriteSheet(this.graphics.createTexture('assets/spritesheet.png'), 128, 128);
		this.spritesheet.registerMany({
			"centi-body" : [0, 0, 32, 32],
			"centi-head" : [33, 0, 32, 32],
			"missile" : [0, 99, 4, 12],
			"mush01" : [66, 0, 32, 32],
			"mush02" : [0, 33, 32, 32],
			"mush03" : [33, 33, 32, 32],
			"mush04" : [0, 66, 32, 32],
			"player" : [33, 66, 32, 32],
			"scorpion" : [66, 33, 32, 32],
			"spider" : [66, 66, 32, 32]
		});
		
		this.musicPlayer = new Yaje.MusicPlayer();
		this.musicPlayer.register('default', 'assets/music.ogg');
		
		this.playerMovement = [0, 0];
		
		this.start();
	}
	start() {
		this.musicPlayer.play('default');
		this.player = this.spritesheet.createSprite('player');
	}
	update() {
		requestAnimationFrame(() => this.update());
		this.clock.update();
		
		vec2.set(this.playerMovement, 0, 0);
		if (this.input.isKeyDown(Yaje.Keys.ARROW_UP)) {
			this.playerMovement[1] -= 1;
		}
		if (this.input.isKeyDown(Yaje.Keys.ARROW_DOWN)) {
			this.playerMovement[1] += 1;
		}
		if (this.input.isKeyDown(Yaje.Keys.ARROW_LEFT)) {
			this.playerMovement[0] -= 1;
		}
		if (this.input.isKeyDown(Yaje.Keys.ARROW_RIGHT)) {
			this.playerMovement[0] += 1;
		}
		vec2.normalize(this.playerMovement, this.playerMovement);
		this.playerMovement[0] *= 300 * this.clock.deltaTime;
		this.playerMovement[1] *= 300 * this.clock.deltaTime;
		
		this.player.move(this.playerMovement[0], this.playerMovement[1]);
		
		this.draw();
	}

	draw() {
		this.graphics.clear();
		
		this.graphics.draw(this.player);
		
		this.graphics.display();
	}
}

(function () {
	window.game = new Game();
	window.game.update();
})();
