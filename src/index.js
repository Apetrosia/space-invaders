import {
  preload,
  init,
  resize,
  update,
  draw
} from './game.js'

const canvas = document.getElementById("cnvs");

function fitCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    resize(canvas);
}

window.addEventListener('resize', fitCanvas);
fitCanvas();

const tickLength = 15; //ms
let lastTick;
let lastRender;
let stopCycle;

function run(tFrame) {
    stopCycle = window.requestAnimationFrame(run);

    const nextTick = lastTick + tickLength;
    let numTicks = 0;

    if (tFrame > nextTick) {
        const timeSinceTick = tFrame - lastTick;
        numTicks = Math.floor(timeSinceTick / tickLength);
    }

    for (let i = 0; i < numTicks; i++) {
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
  fitCanvas();
  run();
}

preload(onPreloadComplete);
