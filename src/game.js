import Sprite from './sprite'
import Cannon from './cannon'
import Bullet from './bullet'
import Alien from './alien'
import InputHandler from './input-handler'

import assetPath from '../assets/invaders.png'

let assets;
const sprites = {
  aliens: [],
  cannon: null,
  bunker: null
};
const gameState = {
  bullets: [],
  aliens: [],
  cannon: null,
};
const inputHandler = new InputHandler();

export function preload(onPreloadComplete) {
  assets = new Image();
	assets.addEventListener("load", () => {
    sprites.cannon = new Sprite(assets, 62, 0, 22, 16);
    sprites.bunker = new Sprite(assets, 84, 8, 36, 24);
    sprites.aliens = [
      [new Sprite(assets,  0, 0, 22, 16), new Sprite(assets,  0, 16, 22, 16)],
			[new Sprite(assets, 22, 0, 16, 16), new Sprite(assets, 22, 16, 16, 16)],
			[new Sprite(assets, 38, 0, 24, 16), new Sprite(assets, 38, 16, 24, 16)]
    ]

    onPreloadComplete();
  });
	assets.src = assetPath;
}

export function init(canvas) {
  const alienTypes = [1, 0, 1, 2, 0, 2];
	for (var i = 0, len = alienTypes.length; i < len; i++) {
		for (var j = 0; j < 10; j++) {
      const alienType = alienTypes[i];

      let alienX = 30 + j*30;
      let alienY = 30 + i*30;

      if (alienType === 1) {
        alienX += 3; // (kostyl) aliens of this type is a bit thinner
      }

			gameState.aliens.push(
        new Alien(alienX, alienY, sprites.aliens[alienType])
			);
		}
	}

  gameState.cannon = new Cannon(
    100, canvas.height - 100,
    sprites.cannon
  );
}

export function update(time, stopGame) {
	if (inputHandler.isDown('ArrowLeft')) {
		gameState.cannon.x -= 4;
	}

	if (inputHandler.isDown('ArrowRight')) {
		gameState.cannon.x += 4;
	}

  if (inputHandler.isPressed('Space')) {
    const bulletX = gameState.cannon.x + 10;
    const bulletY = gameState.cannon.y;
		gameState.bullets.push(new Bullet(bulletX, bulletY, -8, 2, 6, "#fff"));
	}

  gameState.bullets.forEach(b => b.update(time));
}

export function draw(canvas, time) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  gameState.aliens.forEach(a => a.draw(ctx, time));
  gameState.cannon.draw(ctx);
  gameState.bullets.forEach(b => b.draw(ctx));
}
