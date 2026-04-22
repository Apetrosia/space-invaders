export default class Cannon {
  constructor(x, y, sprite, scale = 1) {
    this.x = x;
  	this.y = y;
    this._sprite = sprite;
    this.scale = scale;
  }

  get width() {
    return this._sprite.w * this.scale;
  }

  get height() {
    return this._sprite.h * this.scale;
  }

  draw(ctx, time) {
    const drawWidth = this._sprite.w * this.scale;
    const drawHeight = this._sprite.h * this.scale;
    ctx.drawImage(
      this._sprite.img,
      this._sprite.x, this._sprite.y, this._sprite.w, this._sprite.h,
      this.x, this.y, drawWidth, drawHeight
    );
  }
}
