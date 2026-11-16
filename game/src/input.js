// Keyboard and mouse state. The game reads movement as a held set of keys and
// one-shot actions (dash, confirm, pause) as presses that are consumed once,
// so a held key never double-fires a menu choice.

const MOVE_KEYS = {
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
};

export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    this.mouse = { x: 0, y: 0, clicked: false };
    this.onFirstGesture = null;
  }

  attach(element) {
    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      this.down.add(event.code);
      this.pressed.add(event.code);
      if (this.onFirstGesture) this.onFirstGesture();
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
      }
    });
    window.addEventListener('keyup', (event) => {
      this.down.delete(event.code);
    });
    window.addEventListener('blur', () => {
      this.down.clear();
    });
    element.addEventListener('pointermove', (event) => {
      const rect = element.getBoundingClientRect();
      this.mouse.x = (event.clientX - rect.left) * (element.width / rect.width);
      this.mouse.y = (event.clientY - rect.top) * (element.height / rect.height);
    });
    element.addEventListener('pointerdown', (event) => {
      const rect = element.getBoundingClientRect();
      this.mouse.x = (event.clientX - rect.left) * (element.width / rect.width);
      this.mouse.y = (event.clientY - rect.top) * (element.height / rect.height);
      this.mouse.clicked = true;
      if (this.onFirstGesture) this.onFirstGesture();
    });
  }

  // Normalised movement vector from the keys currently held.
  moveVector() {
    let x = 0;
    let y = 0;
    for (const code of this.down) {
      const dir = MOVE_KEYS[code];
      if (dir) {
        x += dir[0];
        y += dir[1];
      }
    }
    if (x === 0 && y === 0) return { x: 0, y: 0 };
    const length = Math.hypot(x, y);
    return { x: x / length, y: y / length };
  }

  // True once for the frame after the key went down, then consumed.
  wasPressed(...codes) {
    for (const code of codes) {
      if (this.pressed.has(code)) {
        this.pressed.delete(code);
        return true;
      }
    }
    return false;
  }

  // True once for the frame after a click, then consumed.
  wasClicked() {
    if (!this.mouse.clicked) return false;
    this.mouse.clicked = false;
    return true;
  }

  // Call at the end of each frame so unclaimed presses do not linger.
  endFrame() {
    this.pressed.clear();
    this.mouse.clicked = false;
  }
}
