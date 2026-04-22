import Sprite from './sprite.js'
import Cannon from './cannon.js'
import Bullet from './bullet.js'
import Alien from './alien.js'
import InputHandler from './input-handler.js'

const assetPath = './assets/invaders.png';

let assets;
const CANVAS_WIDTH = 600;
const PLAYER_BULLET_SPEED = -8;
const ENEMY_BULLET_BASE_SPEED = 3.5;
const ENEMY_BULLET_ENRAGED_SPEED = 5.5;
const ENEMY_SHOT_COOLDOWN = 1200;
const ENEMY_SHOT_COOLDOWN_ENRAGED = 700;
const PLAYER_SHOT_COOLDOWN = 240;
const COMBO_WINDOW_MS = 1400;
const ENRAGED_DURATION_MS = 5000;
const STARTING_LIVES = 3;

const sprites = {
  aliens: [],
  cannon: null,
  bunker: null
};
const gameState = {
  bullets: [],
  aliens: [],
  cannon: null,
  cannonLives: STARTING_LIVES,
  lastPlayerShotAt: 0,
  lastEnemyShotAt: 0,
  alienDirection: 1,
  alienSpeed: 0.35,
  alienDropStep: 18,
  enragedUntil: 0,
  killStreak: 0,
  lastKillAt: 0,
  gameOver: false,
  victory: false,
  aggroByColumn: {},
  killedRows: {},
  canvasHeight: 0,
  canvasWidth: CANVAS_WIDTH,
};
const inputHandler = new InputHandler();

function rectIntersects(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function sweptBulletIntersectsRect(bullet, targetRect) {
  const left = Math.min(bullet.prevX, bullet.x);
  const top = Math.min(bullet.prevY, bullet.y);
  const right = Math.max(bullet.prevX + bullet.w, bullet.x + bullet.w);
  const bottom = Math.max(bullet.prevY + bullet.h, bullet.y + bullet.h);

  return rectIntersects(
    left,
    top,
    right - left,
    bottom - top,
    targetRect.x,
    targetRect.y,
    targetRect.w,
    targetRect.h
  );
}

function isEnraged(time) {
  return time < gameState.enragedUntil;
}

function activateEnragedMode(time) {
  gameState.enragedUntil = Math.max(gameState.enragedUntil, time + ENRAGED_DURATION_MS);
}

function registerKill(time, alienRow) {
  if (time - gameState.lastKillAt <= COMBO_WINDOW_MS) {
    gameState.killStreak += 1;
  } else {
    gameState.killStreak = 1;
  }

  gameState.lastKillAt = time;

  if (gameState.killStreak >= 3) {
    activateEnragedMode(time);
  }

  const stillAliveInRow = gameState.aliens.some(alien => alien.row === alienRow);
  if (!stillAliveInRow && !gameState.killedRows[alienRow]) {
    gameState.killedRows[alienRow] = true;
    activateEnragedMode(time);
  }
}

function clampCannonToCanvas() {
  const cannonWidth = gameState.cannon._sprite.w;
  gameState.cannon.x = Math.max(0, Math.min(gameState.canvasWidth - cannonWidth, gameState.cannon.x));
}

function updateAliens(time) {
  if (gameState.aliens.length === 0) {
    return;
  }

  const speedMultiplier = isEnraged(time) ? 1.4 : 1;
  const moveStep = gameState.alienSpeed * speedMultiplier * gameState.alienDirection;

  let hitEdge = false;
  for (let i = 0; i < gameState.aliens.length; i++) {
    const alien = gameState.aliens[i];
    alien.x += moveStep;

    if (alien.x <= 0 || alien.x + alien.width >= gameState.canvasWidth) {
      hitEdge = true;
    }
  }

  if (hitEdge) {
    gameState.alienDirection *= -1;
    for (let i = 0; i < gameState.aliens.length; i++) {
      gameState.aliens[i].y += gameState.alienDropStep;
    }
  }
}

function chooseShooterColumn(cannonCenterX) {
  const columns = {};

  for (let i = 0; i < gameState.aliens.length; i++) {
    const alien = gameState.aliens[i];
    const key = alien.col;
    const current = columns[key];

    if (!current || alien.y > current.y) {
      columns[key] = alien;
    }
  }

  const shooters = Object.values(columns);
  if (shooters.length === 0) {
    return null;
  }

  const ranked = shooters
    .map(shooter => {
      const colAggro = gameState.aggroByColumn[shooter.col] || 0;
      const distance = Math.abs((shooter.x + shooter.width / 2) - cannonCenterX);
      return {
        shooter,
        score: distance - colAggro * 35,
      };
    })
    .sort((a, b) => a.score - b.score);

  // Mostly pick the best column; sometimes pick among top options for variety.
  if (Math.random() < 0.8 || ranked.length === 1) {
    return ranked[0].shooter;
  }

  const topCount = Math.min(4, ranked.length);
  const randomIndex = Math.floor(Math.random() * topCount);
  return ranked[randomIndex].shooter;
}

function updateAggroDecay() {
  const keys = Object.keys(gameState.aggroByColumn);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    gameState.aggroByColumn[key] *= 0.97;
    if (gameState.aggroByColumn[key] < 0.05) {
      delete gameState.aggroByColumn[key];
    }
  }
}

function enemyShoot(time) {
  const cooldown = isEnraged(time) ? ENEMY_SHOT_COOLDOWN_ENRAGED : ENEMY_SHOT_COOLDOWN;
  if (time - gameState.lastEnemyShotAt < cooldown || gameState.aliens.length === 0) {
    return;
  }

  const cannonCenterX = gameState.cannon.x + gameState.cannon._sprite.w / 2;
  const shooter = chooseShooterColumn(cannonCenterX);
  if (!shooter) {
    return;
  }

  const shooterCenterX = shooter.x + shooter.width / 2;
  const bulletSpeed = isEnraged(time) ? ENEMY_BULLET_ENRAGED_SPEED : ENEMY_BULLET_BASE_SPEED;
  const spawnY = shooter.y + shooter.height;
  const verticalDistance = Math.max(1, gameState.cannon.y - spawnY);
  const ticksToTarget = Math.max(1, verticalDistance / bulletSpeed);

  // Estimate horizontal speed so bullet crosses cannon Y near cannon center.
  let directionX = (cannonCenterX - shooterCenterX) / ticksToTarget;
  const maxHorizontalSpeed = isEnraged(time) ? 2.8 : 2.1;
  directionX = Math.max(-maxHorizontalSpeed, Math.min(maxHorizontalSpeed, directionX));

  gameState.bullets.push(
    new Bullet(
      shooterCenterX,
      spawnY,
      bulletSpeed,
      3,
      8,
      isEnraged(time) ? '#ff6363' : '#9fd0ff',
      'enemy',
      directionX
    )
  );

  // Neighboring columns become temporarily more aggressive after a shot.
  gameState.aggroByColumn[shooter.col] = (gameState.aggroByColumn[shooter.col] || 0) + 0.7;
  gameState.aggroByColumn[shooter.col - 1] = (gameState.aggroByColumn[shooter.col - 1] || 0) + 0.35;
  gameState.aggroByColumn[shooter.col + 1] = (gameState.aggroByColumn[shooter.col + 1] || 0) + 0.35;
  gameState.lastEnemyShotAt = time;
}

function cleanupOutOfBoundsBullets() {
  gameState.bullets = gameState.bullets.filter(b => (
    b.y + b.h >= 0 &&
    b.y <= gameState.canvasHeight &&
    b.x + b.w >= 0 &&
    b.x <= gameState.canvasWidth
  ));
}

function handleBulletCollisions(time) {
  const remainingBullets = [];
  const deadAliens = new Set();

  for (let i = 0; i < gameState.bullets.length; i++) {
    const bullet = gameState.bullets[i];
    let consumed = false;

    if (bullet.owner === 'player') {
      for (let j = 0; j < gameState.aliens.length; j++) {
        const alien = gameState.aliens[j];
        const alienRect = {
          x: alien.x,
          y: alien.y,
          w: alien.width,
          h: alien.height,
        };

        if (sweptBulletIntersectsRect(bullet, alienRect)) {
          deadAliens.add(alien);
          registerKill(time, alien.row);
          consumed = true;
          break;
        }
      }
    } else {
      const cannonRect = {
        x: gameState.cannon.x,
        y: gameState.cannon.y,
        w: gameState.cannon._sprite.w,
        h: gameState.cannon._sprite.h,
      };

      if (sweptBulletIntersectsRect(bullet, cannonRect)) {
        if (time >= gameState.cannon.invulnerableUntil) {
          gameState.cannonLives -= 1;
          gameState.cannon.invulnerableUntil = time + 1300;
          gameState.cannon.x = (gameState.canvasWidth - gameState.cannon._sprite.w) / 2;
        }
        consumed = true;
      }
    }

    if (!consumed) {
      remainingBullets.push(bullet);
    }
  }

  if (deadAliens.size > 0) {
    gameState.aliens = gameState.aliens.filter(alien => !deadAliens.has(alien));
  }

  gameState.bullets = remainingBullets;
}

function checkWinLoseState(stopGame) {
  if (gameState.aliens.length === 0 && !gameState.victory) {
    gameState.victory = true;
    gameState.gameOver = true;
    stopGame();
    return;
  }

  if (gameState.cannonLives <= 0 && !gameState.gameOver) {
    gameState.gameOver = true;
    stopGame();
    return;
  }

  for (let i = 0; i < gameState.aliens.length; i++) {
    const alien = gameState.aliens[i];
    if (alien.y + alien.height >= gameState.cannon.y) {
      gameState.gameOver = true;
      stopGame();
      return;
    }
  }
}

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
	const formationStartX = 40;
	const formationStartY = 24;
	const formationStepX = 26;
	const formationStepY = 24;
	for (var i = 0, len = alienTypes.length; i < len; i++) {
		for (var j = 0; j < 10; j++) {
      const alienType = alienTypes[i];

      let alienX = formationStartX + j * formationStepX;
      let alienY = formationStartY + i * formationStepY;

      if (alienType === 1) {
        alienX += 3; // (kostyl) aliens of this type is a bit thinner
      }

			const alien = new Alien(alienX, alienY, sprites.aliens[alienType]);
      alien.row = i;
      alien.col = j;
			gameState.aliens.push(alien);
		}
	}

  gameState.cannon = new Cannon(
    100, canvas.height - 72,
    sprites.cannon
  );

  gameState.cannon.invulnerableUntil = 0;
  gameState.canvasHeight = canvas.height;
  gameState.canvasWidth = canvas.width;
}

export function update(time, stopGame) {
	if (gameState.gameOver) {
    return;
  }

	if (inputHandler.isDown('ArrowLeft')) {
		gameState.cannon.x -= 4;
	}

	if (inputHandler.isDown('ArrowRight')) {
		gameState.cannon.x += 4;
	}

  clampCannonToCanvas();

  if (inputHandler.isPressed('Space') && time - gameState.lastPlayerShotAt >= PLAYER_SHOT_COOLDOWN) {
    const bulletX = gameState.cannon.x + 10;
    const bulletY = gameState.cannon.y;
		gameState.bullets.push(new Bullet(bulletX, bulletY, PLAYER_BULLET_SPEED, 2, 8, '#fff', 'player'));
    gameState.lastPlayerShotAt = time;
	}

  updateAliens(time);
  updateAggroDecay();
  enemyShoot(time);

  gameState.bullets.forEach(b => b.update(time));
  handleBulletCollisions(time);
  cleanupOutOfBoundsBullets();
  checkWinLoseState(stopGame);
}

export function draw(canvas, time) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  gameState.aliens.forEach(a => a.draw(ctx, time));
  if (time >= gameState.cannon.invulnerableUntil || Math.floor(time / 100) % 2 === 0) {
    gameState.cannon.draw(ctx);
  }
  gameState.bullets.forEach(b => b.draw(ctx));

  ctx.fillStyle = '#fff';
  ctx.font = '16px monospace';
  ctx.fillText(`Lives: ${gameState.cannonLives}`, 16, 24);
  ctx.fillText(`Aliens: ${gameState.aliens.length}`, 16, 44);

  if (isEnraged(time)) {
    ctx.fillStyle = '#ff8b8b';
    ctx.fillText('ENRAGED', 16, 64);
  }

  if (gameState.gameOver) {
    ctx.fillStyle = gameState.victory ? '#7dff9f' : '#ff7d7d';
    ctx.font = 'bold 32px monospace';
    ctx.fillText(gameState.victory ? 'YOU WIN' : 'GAME OVER', gameState.canvasWidth / 2 - 90, canvas.height / 2);
  }
}
