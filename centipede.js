'use strict';

const SHOT_RELOAD_TIME = 0.2;
const PLAYER_SPEED = 400.0;
const MISSILE_SPEED = 1200.0;

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

class Entity {
	constructor(type) {
		this.type = type;
		this.markedForRemoval = false;
		this.sprite = null;
	}
	remove() {
		this.markedForRemoval = true;
	}
	update() {}
	draw() {
		game.graphics.draw(this.sprite);
	}
	get x() {
		return this.sprite.position[0];
	}
	get y() {
		return this.sprite.position[1];
	}
	get width() {
		return this.sprite.width;
	}
	get height() {
		return this.sprite.height;
	}
	intersectWith(entity) {
		return !(
			this.x + this.width < entity.x ||
			this.x > entity.x + entity.width ||
			this.y + this.height < entity.y ||
			this.y > entity.y + entity.height
		);
	}
}

class Mushroom extends Entity {
	constructor(x, y) {
		super('Mushroom');
		this.health = 4;
		this.sprite = game.spritesheet.createSprite('mush-4');
		this.sprite.setPosition(x * this.width, y * this.height);
	}
	hit() {
		this.setHealth(this.health - 1);
	}
	restore() {
		this.setHealth(4);
	}
	setHealth(health) {
		this.health = health;
		if (this.health > 0) {
			game.spritesheet.setSpriteTexture(this.sprite, 'mush-' + this.health);
		} else {
			this.remove();
		}
	}
}

class Map {
	constructor(width, height) {
		this.width = width;
		this.height = height;
		this.mushrooms = [];
		for (let x = 0; x < this.width; ++x) {
			this.mushrooms[x] = [];
			for (let y = 0; y < this.height; ++y) {
				this.mushrooms[x][y] = null;
			}
		}
	}
	spawnMushroom(x, y) {
		if (this.mushrooms[x][y] === null || this.mushrooms[x][y].markedForRemoval) {
			this.mushrooms[x][y] = new Mushroom(x, y);
			game.addEntity(this.mushrooms[x][y]);
		} else {
			this.mushrooms[x][y].restore();
		}
	}
	spawnDefaultMushrooms() {
		for (let i = 0; i < 15; ++i) {
			var x = Math.floor(Math.random() * this.width);
			var y = Math.floor(Math.random() * this.height * 2 / 3);
			this.spawnMushroom(x, y);
		}
	}
}

class Player extends Entity {
	constructor() {
		super('Player');
		this.sprite = game.spritesheet.createSprite('player');
		this.playerMovement = [0, 0];
		this.shotTimer = SHOT_RELOAD_TIME;

		this.sprite.setPosition(GAME_WIDTH / 2 - this.width / 2, GAME_HEIGHT - this.height);
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

		if (this.x < 0) this.sprite.setPosition(1, this.y);
		if (this.x > GAME_WIDTH - this.width) this.sprite.setPosition(GAME_WIDTH - this.width, this.y);
		if (this.y < GAME_HEIGHT / 3 * 2) this.sprite.setPosition(this.x, GAME_HEIGHT / 3 * 2);
		if (this.y > GAME_HEIGHT - this.height) this.sprite.setPosition(this.x, GAME_HEIGHT - this.height);
	}
	updateFire() {
		if (this.shotTimer > 0) this.shotTimer -= game.clock.deltaTime;
		if (game.input.isKeyDown(Yaje.Keys.SPACE)) {
			if (this.shotTimer <= 0) {
				this.shotTimer = SHOT_RELOAD_TIME;
				game.soundPlayer.play('shot');
				game.addEntity(new Missile());
			}
		}
	}
}

class Missile extends Entity {
	constructor() {
		super('Missile');
		this.sprite = game.spritesheet.createSprite('missile');
		this.sprite.setPosition(game.player.x + 14, game.player.y);
	}
	update() {
		this.sprite.move(0, -MISSILE_SPEED * game.clock.deltaTime);
		if (this.sprite.position[1] < -100) {
			this.remove();
			return;
		}
		for (var i = 0; i < game.entities.length; ++i) {
			if (game.entities[i].type === 'Mushroom' && this.intersectWith(game.entities[i])) {
				game.entities[i].hit();
				game.soundPlayer.play('little-pop');
				this.remove();
				return;
			}
		}
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
			"mush-4" : [66, 0, 32, 32],
			"mush-3" : [0, 33, 32, 32],
			"mush-2" : [33, 33, 32, 32],
			"mush-1" : [0, 66, 32, 32],
			"player" : [33, 66, 32, 32],
			"scorpion" : [66, 33, 32, 32],
			"spider" : [66, 66, 32, 32]
		});

		this.musicPlayer = new Yaje.MusicPlayer();
		this.musicPlayer.register('default', 'assets/music.ogg');

		this.soundPlayer = new Yaje.SoundPlayer();
		this.soundPlayer.register('shot', 'assets/shot.wav', 3);
		this.soundPlayer.register('big-pop', 'assets/pop1.wav', 3);
		this.soundPlayer.register('little-pop', 'assets/pop2.wav', 3);

		this.entities = [];
	}
	start() {
		this.musicPlayer.play('default');
		this.player = new Player();

		this.entities.push(this.player);
		
		this.map = new Map(Math.floor(GAME_WIDTH / 32), Math.floor(GAME_HEIGHT / 32));
		this.map.spawnDefaultMushrooms();
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
