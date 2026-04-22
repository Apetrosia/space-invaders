export default class Bullet {
  constructor(x, y, vy, w, h, color, owner = 'player', vx = 0) {
    this.x = x;
  	this.y = y;
    this.prevX = x;
    this.prevY = y;
		this.vx = vx;
  	this.vy = vy;
  	this.w = w;
  	this.h = h;
  	this.color = color;
    this.owner = owner;
  }

  update(time) {
    this.prevX = this.x;
    this.prevY = this.y;
    this.x += this.vx;
    this.y += this.vy;
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
  	ctx.fillRect(this.x, this.y, this.w, this.h);
  }
}
