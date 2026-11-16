// Keyboard + mouse for WICKWARD. The main loop polls this once per frame;
// clicks are queued so a fast click is never lost between frames.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.mouseX = 0;
    this.mouseY = 0;
    this.clicks = []; // {x, y} in canvas pixels
    this.keys = {};   // currently held, by e.key.toLowerCase()
    this.pressed = []; // keys pressed since last poll, e.key.toLowerCase()
    this.hover = { x: 0, y: 0 };

    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      const sx = canvas.width / Math.max(1, r.width);
      const sy = canvas.height / Math.max(1, r.height);
      this.mouseX = (e.clientX - r.left) * sx;
      this.mouseY = (e.clientY - r.top) * sy;
      this.hover.x = this.mouseX; this.hover.y = this.mouseY;
    });
    canvas.addEventListener('mousedown', (e) => {
      const r = canvas.getBoundingClientRect();
      const sx = canvas.width / Math.max(1, r.width);
      const sy = canvas.height / Math.max(1, r.height);
      this.clicks.push({ x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy });
    });
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (!this.keys[k]) this.pressed.push(k);
      this.keys[k] = true;
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false; });
  }

  // Drain this frame's events; call once per frame from the main loop.
  poll() {
    const out = { clicks: this.clicks, pressed: this.pressed, mouseX: this.mouseX, mouseY: this.mouseY };
    this.clicks = [];
    this.pressed = [];
    return out;
  }

  held(k) { return !!this.keys[k]; }
}
