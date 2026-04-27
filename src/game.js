import Sprite from './sprite.js'
import Cannon from './cannon.js'
import Bullet from './bullet.js'
import Alien from './alien.js'
import InputHandler from './input-handler.js'

const assetPath = './assets/invaders.png';

let assets;
const CANVAS_WIDTH = 600;
const SPRITE_SCALE = 1.45;
const BULLET_SCALE = 1.35;
const HUD_X = 12;
const HUD_Y = 18;
const HUD_LINE = 22;
const FORMATION_START_X = 26;
const FORMATION_START_Y = 30;
const FORMATION_STEP_X = 34;
const FORMATION_STEP_Y = 30;
const PLAYER_BOTTOM_MARGIN = 6;
const PLAYER_BULLET_SPEED = -8;
const ENEMY_BULLET_BASE_SPEED = 5.5;
const ENEMY_BULLET_ENRAGED_SPEED = 7.5;
const ENEMY_SHOT_COOLDOWN = 1200;
const ENEMY_SHOT_COOLDOWN_ENRAGED = 400;
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

function createAliens() {
  const alienTypes = [1, 0, 1, 2, 0, 2];
  const aliens = [];

	for (let i = 0, len = alienTypes.length; i < len; i++) {
		for (let j = 0; j < 10; j++) {
      const alienType = alienTypes[i];

      let alienX = FORMATION_START_X + j * FORMATION_STEP_X;
      let alienY = FORMATION_START_Y + i * FORMATION_STEP_Y;

      if (alienType === 1) {
        alienX += 3;
      }

			const alien = new Alien(alienX, alienY, sprites.aliens[alienType]);
      alien.scale = SPRITE_SCALE;
      alien.row = i;
      alien.col = j;
			aliens.push(alien);
		}
	}

  return aliens;
}

function resetGame() {
  gameState.bullets = [];
  gameState.aliens = createAliens();
  gameState.cannonLives = STARTING_LIVES;
  gameState.lastPlayerShotAt = 0;
  gameState.lastEnemyShotAt = 0;
  gameState.alienDirection = 1;
  gameState.alienSpeed = 1.2;
  gameState.alienDropStep = 18;
  gameState.enragedUntil = 0;
  gameState.killStreak = 0;
  gameState.lastKillAt = 0;
  gameState.gameOver = false;
  gameState.victory = false;
  gameState.aggroByColumn = {};
  gameState.killedRows = {};

  if (gameState.cannon) {
    gameState.cannon.x = Math.max(0, (gameState.canvasWidth - gameState.cannon.width) / 2);
    gameState.cannon.y = gameState.canvasHeight - gameState.cannon.height - PLAYER_BOTTOM_MARGIN;
    gameState.cannon.invulnerableUntil = 0;
  }

  inputHandler.reset();
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyR' && !e.repeat) {
    resetGame();
  }
});

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

  if (gameState.killStreak >= 5) {
    activateEnragedMode(time);
  }

  const stillAliveInRow = gameState.aliens.some(alien => alien.row === alienRow);
  if (!stillAliveInRow && !gameState.killedRows[alienRow]) {
    gameState.killedRows[alienRow] = true;
    activateEnragedMode(time);
  }
}

function clampCannonToCanvas() {
  const cannonWidth = gameState.cannon.width;
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

  const cannonCenterX = gameState.cannon.x + gameState.cannon.width / 2;
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
    4,
    12,
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
        w: gameState.cannon.width,
        h: gameState.cannon.height,
      };

      if (sweptBulletIntersectsRect(bullet, cannonRect)) {
        if (time >= gameState.cannon.invulnerableUntil) {
          gameState.cannonLives -= 1;
          gameState.cannon.invulnerableUntil = time + 1300;
          gameState.cannon.x = (gameState.canvasWidth - gameState.cannon.width) / 2;
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
    return;
  }

  if (gameState.cannonLives <= 0 && !gameState.gameOver) {
    gameState.gameOver = true;
    return;
  }

  for (let i = 0; i < gameState.aliens.length; i++) {
    const alien = gameState.aliens[i];
    if (alien.y + alien.height >= gameState.cannon.y) {
      gameState.gameOver = true;
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
  gameState.canvasHeight = canvas.height;
  gameState.canvasWidth = canvas.width;

  gameState.cannon = new Cannon(
    Math.max(0, (canvas.width - sprites.cannon.w * SPRITE_SCALE) / 2),
    canvas.height - (sprites.cannon.h * SPRITE_SCALE) - PLAYER_BOTTOM_MARGIN,
    sprites.cannon,
    SPRITE_SCALE
  );

  resetGame();
}

export function resize(canvas) {
  gameState.canvasWidth = canvas.width;
  gameState.canvasHeight = canvas.height;

  if (gameState.cannon) {
    gameState.cannon.y = canvas.height - gameState.cannon.height - PLAYER_BOTTOM_MARGIN;
    clampCannonToCanvas();
  }
}

export function update(time, stopGame) {
	if (gameState.gameOver) {
    return;
  }

	if (inputHandler.isDown('ArrowLeft') || inputHandler.isDown('KeyA')) {
    gameState.cannon.x -= 4;
  }

	if (inputHandler.isDown('ArrowRight') || inputHandler.isDown('KeyD')) {
		gameState.cannon.x += 4;
	}

  clampCannonToCanvas();

  if (inputHandler.isPressed('Space') && time - gameState.lastPlayerShotAt >= PLAYER_SHOT_COOLDOWN) {
    const bulletX = gameState.cannon.x + gameState.cannon.width * 0.42;
    const bulletY = gameState.cannon.y;
		gameState.bullets.push(new Bullet(bulletX, bulletY, PLAYER_BULLET_SPEED, 4, 12, '#fff', 'player'));
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
  ctx.font = '18px monospace';
  ctx.fillText(`Lives: ${gameState.cannonLives}`, HUD_X, HUD_Y);
  ctx.fillText(`Aliens: ${gameState.aliens.length}`, HUD_X, HUD_Y + HUD_LINE);

  if (isEnraged(time)) {
    ctx.fillStyle = '#ff8b8b';
    ctx.fillText('ENRAGED', HUD_X, HUD_Y + HUD_LINE * 2);
  }

  if (gameState.gameOver) {
    const message = gameState.victory ? 'YOU WIN' : 'GAME OVER';
    ctx.fillStyle = gameState.victory ? '#7dff9f' : '#ff7d7d';
    ctx.font = 'bold 32px monospace';
    ctx.fillText(message, gameState.canvasWidth / 2 - 90, canvas.height / 2);

    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.fillText('Press R to restart', gameState.canvasWidth / 2 - 92, canvas.height / 2 + 28);
  }
}
