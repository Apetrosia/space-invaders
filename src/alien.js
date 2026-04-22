export default class Alien {
  constructor(x, y, [spriteA, spriteB], scale = 1) {
    this.x = x;
  	this.y = y;
    this._spriteA = spriteA;
    this._spriteB = spriteB;
    this.scale = scale;
  }

  get width() {
    return this._spriteA.w * this.scale;
  }

  get height() {
    return this._spriteA.h * this.scale;
  }

  draw(ctx, time) {
    let sp = (Math.ceil(time / 1000) % 2 === 0) ? this._spriteA : this._spriteB;
    const drawWidth = sp.w * this.scale;
    const drawHeight = sp.h * this.scale;

    ctx.drawImage(
      sp.img,
      sp.x, sp.y, sp.w, sp.h,
      this.x, this.y, drawWidth, drawHeight
    )
  }
}
