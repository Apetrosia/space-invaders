export default class Bullet {
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
