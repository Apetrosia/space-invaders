export default class Alien {
  constructor(x, y, [spriteA, spriteB]) {
    this.x = x;
  	this.y = y;
    this._spriteA = spriteA;
    this._spriteB = spriteB;
  }

  draw(ctx, time) {
    let sp = (Math.ceil(time / 1000) % 2 === 0) ? this._spriteA : this._spriteB;

    ctx.drawImage(
      sp.img,
      sp.x, sp.y, sp.w, sp.h,
      this.x, this.y, sp.w, sp.h
    )
  }
}
