'use strict';

var SHOT_RELOAD_TIME = 0.2;
var PLAYER_SPEED = 300.0;
var MISSILE_SPEED = 800.0;

class Entity {
	constructor() {
		this.markedForRemoval = false;
	}
	remove() {
		this.markedForRemoval = true;
	}
}

class Player extends Entity {
	constructor() {
		super();
		this.sprite = game.spritesheet.createSprite('player');
		this.playerMovement = [0, 0];
		this.shotTimer = SHOT_RELOAD_TIME;
	}
	update() {
		this.updateMovement();
		this.updateFire();
	}
	updateMovement() {
		vec2.set(this.playerMovement, 0, 0);
		if (game.input.isKeyDown(Yaje.Keys.ARROW_UP)) {
			this.playerMovement[1] -= 1;
		}
		if (game.input.isKeyDown(Yaje.Keys.ARROW_DOWN)) {
			this.playerMovement[1] += 1;
		}
		if (game.input.isKeyDown(Yaje.Keys.ARROW_LEFT)) {
			this.playerMovement[0] -= 1;
		}
		if (game.input.isKeyDown(Yaje.Keys.ARROW_RIGHT)) {
			this.playerMovement[0] += 1;
		}
		vec2.normalize(this.playerMovement, this.playerMovement);
		this.playerMovement[0] *= PLAYER_SPEED * game.clock.deltaTime;
		this.playerMovement[1] *= PLAYER_SPEED * game.clock.deltaTime;
		
		this.sprite.move(this.playerMovement[0], this.playerMovement[1]);
	}
	updateFire() {
		if (this.shotTimer > 0) this.shotTimer -= game.clock.deltaTime;
		if (game.input.isKeyDown(32)) {
			if (this.shotTimer <= 0) {
				this.shotTimer = SHOT_RELOAD_TIME;
				game.soundPlayer.play('shot');
				game.addEntity(new Missile());
			}
		}
	}
	draw() {
		game.graphics.draw(this.sprite);
	}
}

class Missile extends Entity {
	constructor() {
		super();
		this.sprite = game.spritesheet.createSprite('missile');
		this.sprite.setPosition(game.player.sprite.position[0] + 14, game.player.sprite.position[1]);
	}
	update() {
		this.sprite.move(0, -MISSILE_SPEED * game.clock.deltaTime);
		if (this.sprite.position[1] < -100) {
			this.remove();
		}
	}
	draw() {
		game.graphics.draw(this.sprite);
	}
}

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
		
		this.soundPlayer = new Yaje.SoundPlayer();
		this.soundPlayer.register('shot', 'assets/shot.wav', 3);
		
		this.entities = [];
	}
	start() {
		this.musicPlayer.play('default');
		this.player = new Player();
		
		this.entities.push(this.player);
	}
	update() {
		requestAnimationFrame(() => this.update());
		this.clock.update();
		
		for (let i = 0; i < this.entities.length; ++i) {
			let entity = this.entities[i];
			entity.update();
			if (entity.markedForRemoval) {
				this.entities.splice(i, 1);
				--i;
			}
		}
		
		this.draw();
	}
	draw() {
		this.graphics.clear();
		
		for (var entity of this.entities) {
			entity.draw();
		}
		
		this.graphics.display();
	}
	addEntity(entity) {
		this.entities.push(entity);
	}
}

(function () {
	window.game = new Game();
	window.game.start();
	window.game.update();
})();
