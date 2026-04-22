// src/sprite.js
class Sprite {
  constructor(img, x, y, w, h) {
    this.img = img;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }
}

// src/cannon.js
class Cannon {
  constructor(x, y, sprite) {
    this.x = x;
    this.y = y;
    this._sprite = sprite;
  }
  draw(ctx, time) {
    ctx.drawImage(this._sprite.img, this._sprite.x, this._sprite.y, this._sprite.w, this._sprite.h, this.x, this.y, this._sprite.w, this._sprite.h);
  }
}

// src/bullet.js
class Bullet {
  constructor(x, y, vy, w, h, color) {
    this.x = x;
    this.y = y;
    this.vy = vy;
    this.w = w;
    this.h = h;
    this.color = color;
  }
  update(time) {
    this.y += this.vy;
  }
  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.w, this.h);
  }
}

// src/alien.js
class Alien {
  constructor(x, y, [spriteA, spriteB]) {
    this.x = x;
    this.y = y;
    this._spriteA = spriteA;
    this._spriteB = spriteB;
  }
  draw(ctx, time) {
    let sp = Math.ceil(time / 1000) % 2 === 0 ? this._spriteA : this._spriteB;
    ctx.drawImage(sp.img, sp.x, sp.y, sp.w, sp.h, this.x, this.y, sp.w, sp.h);
  }
}

// src/input-handler.js
class InputHandler {
  constructor() {
    this.down = {};
    this.pressed = {};
    document.addEventListener("keydown", (e) => {
      this.down[e.code] = true;
    });
    document.addEventListener("keyup", (e) => {
      delete this.down[e.code];
      delete this.pressed[e.code];
    });
  }
  isDown(code) {
    return this.down[code];
  }
  isPressed(code) {
    if (this.pressed[code]) {
      return false;
    } else if (this.down[code]) {
      return this.pressed[code] = true;
    }
    return false;
  }
}

// assets/invaders.png
var invaders_default = "./invaders-01smhj7c.png";

// src/game.js
var assets;
var sprites = {
  aliens: [],
  cannon: null,
  bunker: null
};
var gameState = {
  bullets: [],
  aliens: [],
  cannon: null
};
var inputHandler = new InputHandler;
function preload(onPreloadComplete) {
  assets = new Image;
  assets.addEventListener("load", () => {
    sprites.cannon = new Sprite(assets, 62, 0, 22, 16);
    sprites.bunker = new Sprite(assets, 84, 8, 36, 24);
    sprites.aliens = [
      [new Sprite(assets, 0, 0, 22, 16), new Sprite(assets, 0, 16, 22, 16)],
      [new Sprite(assets, 22, 0, 16, 16), new Sprite(assets, 22, 16, 16, 16)],
      [new Sprite(assets, 38, 0, 24, 16), new Sprite(assets, 38, 16, 24, 16)]
    ];
    onPreloadComplete();
  });
  assets.src = invaders_default;
}
function init(canvas) {
  const alienTypes = [1, 0, 1, 2, 0, 2];
  for (var i = 0, len = alienTypes.length;i < len; i++) {
    for (var j = 0;j < 10; j++) {
      const alienType = alienTypes[i];
      let alienX = 30 + j * 30;
      let alienY = 30 + i * 30;
      if (alienType === 1) {
        alienX += 3;
      }
      gameState.aliens.push(new Alien(alienX, alienY, sprites.aliens[alienType]));
    }
  }
  gameState.cannon = new Cannon(100, canvas.height - 100, sprites.cannon);
}
function update(time, stopGame) {
  if (inputHandler.isDown("ArrowLeft")) {
    gameState.cannon.x -= 4;
  }
  if (inputHandler.isDown("ArrowRight")) {
    gameState.cannon.x += 4;
  }
  if (inputHandler.isPressed("Space")) {
    const bulletX = gameState.cannon.x + 10;
    const bulletY = gameState.cannon.y;
    gameState.bullets.push(new Bullet(bulletX, bulletY, -8, 2, 6, "#fff"));
  }
  gameState.bullets.forEach((b) => b.update(time));
}
function draw(canvas, time) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  gameState.aliens.forEach((a) => a.draw(ctx, time));
  gameState.cannon.draw(ctx);
  gameState.bullets.forEach((b) => b.draw(ctx));
}

// src/index.js
var canvas = document.getElementById("cnvs");
canvas.width = 600;
canvas.height = window.innerHeight;
var tickLength = 15;
var lastTick;
var lastRender;
var stopCycle;
function run(tFrame) {
  stopCycle = window.requestAnimationFrame(run);
  const nextTick = lastTick + tickLength;
  let numTicks = 0;
  if (tFrame > nextTick) {
    const timeSinceTick = tFrame - lastTick;
    numTicks = Math.floor(timeSinceTick / tickLength);
  }
  for (let i = 0;i < numTicks; i++) {
    lastTick = lastTick + tickLength;
    update(lastTick, stopGame);
  }
  draw(canvas, tFrame);
  lastRender = tFrame;
}
function stopGame() {
  window.cancelAnimationFrame(stopCycle);
}
function onPreloadComplete() {
  lastTick = performance.now();
  lastRender = lastTick;
  stopCycle = null;
  init(canvas);
  run();
}
preload(onPreloadComplete);
