'use strict';

const SHOT_RELOAD_TIME = 0.2;
const PLAYER_SPEED = 400.0;
const MISSILE_SPEED = 1200.0;

const CENTIPEDE_INITIAL_SPEED = 100;
const CENTIPEDE_SPEED_PER_LEVEL = 25;

const GAME_WIDTH = 800;
const GAME_HEIGHT = 640;

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
		if (this.collider !== null && entity.collider !== null) {
			return this.collider.intersectWith(entity.collider);
		}
	}
}

class Mushroom extends Entity {
	constructor(x, y) {
		super('Mushroom');
		this.health = 4;
		this.sprite = game.spritesheet.createSprite('mush-4');
		this.sprite.setPosition(x * this.width, y * this.height);
		this.collider = new Yaje.BoxCollider(this.sprite, 0, 0, this.width, this.height);
	}
	hit() {
		this.setHealth(this.health - 1);
		if (this.health === 0) {
			game.updateScore(1);
		}
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
		this.heightLimit = Math.floor(height / 3 * 2);
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
		let number = Math.floor(Math.random() * 10) + 20;
		for (let i = 0; i < number; ++i) {
			var x = Math.floor(Math.random() * this.width);
			var y = Math.floor(Math.random() * (this.height - 1));
			this.spawnMushroom(x, y);
		}
	}
	restoreNextMushroom() {
		for (let x = 0; x < this.width; ++x) {
			for (let y = 0; y < this.height; ++y) {
				if (this.mushrooms[x][y] !== null && !this.mushrooms[x][y].markedForRemoval && this.mushrooms[x][y].health < 4) {
					this.mushrooms[x][y].setHealth(4);
					game.soundPlayer.play('little-pop');
					game.updateScore(10);
					return true;
				}
			}
		}
		return false;
	}
	isCellAccessible(x, y) {
		return x >= 0 && y >= 0 && x < this.width && y < this.height &&
			(this.mushrooms[x][y] === null || this.mushrooms[x][y].markedForRemoval);
	}
}

class Player extends Entity {
	constructor() {
		super('Player');
		this.sprite = game.spritesheet.createSprite('player');
		this.playerMovement = [0, 0];
		this.shotTimer = SHOT_RELOAD_TIME;

		this.sprite.setPosition(GAME_WIDTH / 2 - this.width / 2, GAME_HEIGHT - this.height);
		this.collider = new Yaje.BoxCollider(this.sprite, this.width / 2, this.height / 2, 1, 1);
	}
	update() {
		this.updateMovement();
		this.updateFire();
		this.updateCollisions();
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
		
		this.sprite.move(this.playerMovement[0], 0);
		if (this.isCollidingWithMushroom()) {
			this.sprite.move(-this.playerMovement[0], 0);
		}

		this.sprite.move(0, this.playerMovement[1]);
		if (this.isCollidingWithMushroom()) {
			this.sprite.move(0, -this.playerMovement[1]);
		}

		if (this.x < 0) this.sprite.setPosition(1, this.y);
		if (this.x > GAME_WIDTH - this.width) this.sprite.setPosition(GAME_WIDTH - this.width, this.y);
		if (this.y < GAME_HEIGHT / 3 * 2) this.sprite.setPosition(this.x, GAME_HEIGHT / 3 * 2);
		if (this.y > GAME_HEIGHT - this.height) this.sprite.setPosition(this.x, GAME_HEIGHT - this.height);
	}
	isCollidingWithMushroom() {
		for (var i = 0; i < game.entities.length; ++i) {
			if (game.entities[i].type === 'Mushroom' && this.intersectWith(game.entities[i])) {
				return true;
			}
		}
		return false;
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
	updateCollisions() {
		for (var i = 0; i < game.entities.length; ++i) {
			if (game.entities[i].type === 'Centipede' && this.intersectWith(game.entities[i])) {
				game.soundPlayer.play('explosion');
				this.remove();
				game.killPlayer();
				return;
			}
		}
	}
}

class Missile extends Entity {
	constructor() {
		super('Missile');
		this.sprite = game.spritesheet.createSprite('missile');
		this.sprite.setPosition(game.player.x + 14, game.player.y);
		this.collider = new Yaje.BoxCollider(this.sprite, 0, 0, this.width, this.height);
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
			if (game.entities[i].type === 'Centipede' && this.intersectWith(game.entities[i])) {
				game.entities[i].hit();
				game.soundPlayer.play('big-pop');
				this.remove();
				return;
			}
		}
	}
}

class Centipede extends Entity {
	constructor(parent, x, y) {
		super('Centipede');
		this.parent = parent;
		this.mapX = x;
		this.mapY = y;
		this.direction = 1;
		this.verticalDirection = 1;
		this.sprite = game.spritesheet.createSprite(this.parent === null ? 'centi-head' : 'centi-body');
		this.sprite.setPosition(this.mapX * this.width, this.mapY * this.width)
		this.collider = new Yaje.BoxCollider(this.sprite, 0, 0, this.width, this.height);
		game.remainingParts += 1;
	}
	update() {
		if (this.parent !== null && this.parent.markedForRemoval) {
			this.parent = null;
			game.spritesheet.setSpriteTexture(this.sprite, 'centi-head');
		}
		let inactive = this.moveToMapPosition();
		if (inactive) {
			this.moveToNextCell();
			this.moveToMapPosition();
		}
	}
	moveToMapPosition() {
		let inactive = true;
		let newX;
		let newY;
		let finalX = this.mapX * 32;
		let finalY = this.mapY * 32;
		let requiredMovementX = Math.abs(finalX - this.x);
		let requiredMovementY = Math.abs(finalY - this.y);
		let rotation = 0;
		if (this.x < finalX - 0.01) {
			newX = this.x + Math.min(requiredMovementX, game.centipedeSpeed * game.clock.deltaTime);
			inactive = false;
			rotation = 180;
		} else if (this.x > finalX + 0.01) {
			newX = this.x - Math.min(requiredMovementX, game.centipedeSpeed * game.clock.deltaTime);
			inactive = false;
			rotation = 0;
		} else {
			newX = this.x;
		}
		if (this.y < finalY - 0.01) {
			newY = this.y + Math.min(requiredMovementY, game.centipedeSpeed * game.clock.deltaTime);
			inactive = false;
			rotation = -90;
		} else if (this.y > finalY + 0.01) {
			newY = this.y - Math.min(requiredMovementY, game.centipedeSpeed * game.clock.deltaTime);
			inactive = false;
			rotation = 90;
		} else {
			newY = this.y;
		}
		if (!inactive) {
			if (this.parent === null) {
				this.sprite.setRotation(rotation);
			}
			this.sprite.setPosition(newX, newY);
		}
		return inactive;
	}
	moveToNextCell() {
		let x = this.mapX + this.direction;
		let y = this.mapY;
		if (this.mapY < 0) {
			this.mapY = y + 1;
			return;
		}
		let nextDirection = this.direction;
		let nextVerticalDirection = this.verticalDirection;
		if (!game.map.isCellAccessible(x, y)) {
			if ((this.verticalDirection === 1 && y >= game.map.height - 1) ||
				(this.verticalDirection === -1 && y <= game.map.heightLimit)) {
				nextVerticalDirection = this.verticalDirection * -1;
			}
			x = this.mapX;
			y = this.mapY + nextVerticalDirection;
			nextDirection = this.direction * -1;
		}
		if (!this.isAnotherCentipedeOnCell(x, y)) {
			this.mapX = x;
			this.mapY = y;
			this.direction = nextDirection;
			this.verticalDirection = nextVerticalDirection;
		}
	}
	isAnotherCentipedeOnCell(x, y) {
		for (var i = 0; i < game.entities.length; ++i) {
			if (game.entities[i].type === 'Centipede' &&
				game.entities[i].mapX == x && game.entities[i].mapY == y &&
				game.entities[i].direction == this.direction && game.entities[i].verticalDirection == this.verticalDirection) {
				return true;
			}
		}
		return false;
	}
	hit() {
		game.map.spawnMushroom(this.mapX, this.mapY);
		this.remove();
		game.remainingParts -= 1;
		game.updateScore(this.parent === null ? 20 : 10);
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
		this.soundPlayer.register('explosion', 'assets/explosion.ogg');

		this.entities = [];
		
		this.score = 0;
		this.centipedeSpeed = 0;
		this.level = 0;
		this.remainingParts = 0;
		this.mushroomTimer = 0;
	}
	start() {
		this.updateScore(0);
		
		this.spawnPlayer();
		
		this.map = new Map(Math.floor(GAME_WIDTH / 32), Math.floor(GAME_HEIGHT / 32));
		this.map.spawnDefaultMushrooms();
	}
	update() {
		requestAnimationFrame(() => this.update());
		this.clock.update();
		this.input.update();

		for (let i = 0; i < this.entities.length; ++i) {
			let entity = this.entities[i];
			entity.update();
			if (entity.markedForRemoval) {
				this.entities.splice(i, 1);
				--i;
			}
		}

		if (this.isPlayerDead) {
			this.mushroomTimer -= this.clock.deltaTime;
			if (this.mushroomTimer <= 0) {
				if (!this.map.restoreNextMushroom()) {
					this.spawnPlayer();
					this.nextLevel();
				} else {
					this.mushroomTimer = 0.15;
				}
			}
		} else if (this.remainingParts === 0 || this.input.wasKeyPressed(Yaje.Keys.L)) {
			this.nextLevel();
		}

		this.draw();
	}
	spawnPlayer() {
		this.player = new Player();
		this.isPlayerDead = false;
		this.entities.push(this.player);
		this.musicPlayer.play('default');
	}
	nextLevel() {
		this.level += 1;
		this.centipedeSpeed = CENTIPEDE_INITIAL_SPEED + CENTIPEDE_SPEED_PER_LEVEL * this.level;
		let centipedePart = null;
		for (let i = 0; i < this.level * 5; ++i) {
			centipedePart = new Centipede(centipedePart, Math.floor(this.map.width / 2), -1 - i);
			this.entities.push(centipedePart);
		}
		this.setColors();
	}
	killPlayer() {
		this.isPlayerDead = true;
		this.remainingParts = 0;
		for (var i = 0; i < game.entities.length; ++i) {
			if (game.entities[i].type === 'Centipede') {
				game.entities[i].remove();
			}
		}
		this.mushroomTimer = 1.5;
		this.musicPlayer.stop();
	}
	setColors() {
		let color = Game.colors[(this.level - 1) % Game.colors.length];
		this.colorR = ((color >> 16) & 0xFF) / 0xFF;
		this.colorG = ((color >> 8) & 0xFF) / 0xFF;
		this.colorB = (color & 0xFF) / 0xFF;
		for (let i = 0; i < this.entities.length; ++i) {
			this.setEntityColor(this.entities[i]);
		}
	}
	setEntityColor(entity) {
		if (entity.type == 'Mushroom') {
			entity.sprite.setColor(this.colorR, this.colorG, this.colorB, 1.0);
		} else {
			entity.sprite.setColor(1.0 - this.colorR, 1.0 - this.colorG, 1.0 - this.colorB, 1.0);
		}
	}
	draw() {
		this.graphics.clear();

		for (var entity of this.entities) {
			entity.draw();
		}

		this.graphics.display();
	}
	addEntity(entity) {
		this.setEntityColor(entity);
		this.entities.push(entity);
	}
	updateScore(delta) {
		this.score += delta;
		document.getElementById('game-score-value').innerHTML = this.score;
	}
}

Game.colors = [0x20F020, 0x3040F0, 0xF02020];

(function () {
	window.game = new Game();
	window.game.start();
	window.game.update();
})();
