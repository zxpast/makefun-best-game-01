// Ember Tide — the world: everything that moves, spawns, collides and scores.
// Pure logic, no drawing and no DOM: the same step() runs the live game, the
// autopilot screenshots and the headless balance test alike.

import { FIELD, PLAYER, EMBER, WISP, WAVES, BLESSINGS } from './config.js';
import { makeRandom, pick, range } from './random.js';

export const EVENT_NONE = 0;
export const EVENT_WAVE_CLEAR = 1;
export const EVENT_OVER = 2;
export const EVENT_WIN = 4;

const STEP = 1 / 60;

function makePlayer() {
  return {
    x: FIELD.width / 2,
    y: FIELD.height - 110,
    vx: 0,
    vy: 0,
    speed: PLAYER.speed,
    catchRadius: PLAYER.catchRadius,
    dashCooldown: PLAYER.dashCooldown,
    hearts: PLAYER.hearts,
    maxHearts: PLAYER.maxHearts,
    magnet: 0,
    ward: false,
    dashTimer: 0,
    dashLeft: 0,
    invulnerableLeft: 0,
    dashing: false,
    facing: 1,
  };
}

export class World {
  constructor(seed) {
    this.random = makeRandom(seed);
    this.reset();
  }

  reset() {
    this.time = 0;
    this.player = makePlayer();
    this.embers = [];
    this.wisps = [];
    this.particles = [];
    this.texts = [];
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.caught = 0;
    this.wave = 1;
    this.waveTime = 0;
    this.waveScore = 0;
    this.spawnEmberIn = 0.4;
    this.spawnWispIn = 2.2;
    this.gustIn = WAVES.gustEvery;
    this.gust = 0;
    this.gustDirection = 1;
    this.shake = 0;
    this.flash = 0;
    this.blessings = [];
    this.takenBlessings = [];
    this.wardUsedThisWave = false;
    this.stars = [];
    for (let i = 0; i < 90; i += 1) {
      this.stars.push({
        x: this.random() * FIELD.width,
        y: this.random() * FIELD.height * 0.55,
        r: 0.6 + this.random() * 1.4,
        phase: this.random() * Math.PI * 2,
      });
    }
  }

  emberRate() {
    return WAVES.emberRate + (this.wave - 1) * WAVES.emberRatePerWave;
  }

  wispRate() {
    return WAVES.wispRate + (this.wave - 1) * WAVES.wispRatePerWave;
  }

  spawnEmber() {
    const x = range(this.random, 30, FIELD.width - 30);
    this.embers.push({
      x,
      y: -16,
      speed: range(this.random, EMBER.fallMin, EMBER.fallMax) * (1 + (this.wave - 1) * 0.05),
      swayPhase: this.random() * Math.PI * 2,
      swaySpeed: range(this.random, 0.8, 1.6),
      radius: EMBER.radius,
      dead: false,
    });
  }

  spawnWisp() {
    const x = range(this.random, 40, FIELD.width - 40);
    this.wisps.push({
      x,
      y: -20,
      speed: range(this.random, WISP.fallMin, WISP.fallMax) * (1 + (this.wave - 1) * 0.06),
      swayPhase: this.random() * Math.PI * 2,
      swaySpeed: range(this.random, 0.6, 1.3),
      radius: WISP.radius,
      dead: false,
    });
  }

  burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const angle = this.random() * Math.PI * 2;
      const power = range(this.random, speed * 0.3, speed);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * power,
        vy: Math.sin(angle) * power - 30,
        life: range(this.random, 0.35, 0.8),
        maxLife: 0.8,
        size: range(this.random, 1.5, 3.5),
        color,
      });
    }
  }

  floatText(x, y, text, color) {
    this.texts.push({ x, y, text, color, life: 0.9 });
  }

  // One fixed step. `move` is a normalised {x, y}; `dash` starts a dash.
  // Returns an event bitmask. `sound` is an optional {pickup, hit, ...} sink;
  // passing null keeps the world silent (screenshots, headless tests).
  step(dt, move, dash, sound) {
    this.time += dt;
    const p = this.player;
    p.invulnerableLeft = Math.max(0, p.invulnerableLeft - dt);
    p.dashLeft = Math.max(0, p.dashLeft - dt);
    this.shake = Math.max(0, this.shake - dt * 2.2);
    this.flash = Math.max(0, this.flash - dt * 2.5);

    // Gusts: a sideways wind that pushes everything falling.
    this.gustIn -= dt;
    if (this.gustIn <= 0) {
      this.gustIn = WAVES.gustEvery + this.random() * 3;
      this.gustDirection = this.random() < 0.5 ? -1 : 1;
      this.gust = WAVES.gustStrength * this.gustDirection;
    }
    this.gust *= Math.max(0, 1 - dt * 0.55);

    // Movement: dash overrides steering for a burst, then steers again.
    if (dash && p.dashLeft <= 0 && (move.x !== 0 || move.y !== 0)) {
      p.dashLeft = p.dashCooldown;
      p.dashTimer = PLAYER.dashTime;
      p.dashing = true;
      p.invulnerableLeft = Math.max(p.invulnerableLeft, PLAYER.dashTime + 0.08);
      if (sound) sound.dash();
      this.burst(p.x, p.y + 8, '#9fd8ff', 10, 120);
    }
    let speed = p.speed;
    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
      speed = PLAYER.dashSpeed;
      if (p.dashTimer <= 0) p.dashing = false;
    }
    p.vx = move.x * speed;
    p.vy = move.y * speed;
    p.x += p.vx * dt + this.gust * 0.02 * dt;
    p.y += p.vy * dt;
    p.x = Math.min(FIELD.width - 24, Math.max(24, p.x));
    p.y = Math.min(FIELD.height - 24, Math.max(70, p.y));
    if (move.x !== 0) p.facing = move.x > 0 ? 1 : -1;

    // Spawning.
    this.waveTime += dt;
    this.spawnEmberIn -= dt;
    if (this.spawnEmberIn <= 0) {
      this.spawnEmberIn = 1 / this.emberRate();
      this.spawnEmber();
    }
    this.spawnWispIn -= dt;
    if (this.spawnWispIn <= 0) {
      this.spawnWispIn = 1 / this.wispRate();
      this.spawnWisp();
    }

    // Embers fall, sway, drift toward the lantern when magnetised.
    for (const ember of this.embers) {
      ember.y += ember.speed * dt;
      ember.x += Math.sin(this.time * ember.swaySpeed + ember.swayPhase) * EMBER.sway * dt;
      ember.x += this.gust * dt * 0.6;
      if (p.magnet > 0) {
        const dx = p.x - ember.x;
        const dy = p.y - ember.y;
        const dist = Math.hypot(dx, dy);
        if (dist < p.magnet && dist > 1) {
          ember.x += (dx / dist) * 90 * dt;
          ember.y += (dy / dist) * 90 * dt;
        }
      }
      const dist = Math.hypot(ember.x - p.x, ember.y - p.y);
      if (dist < p.catchRadius) {
        ember.dead = true;
        this.combo += 1;
        this.bestCombo = Math.max(this.bestCombo, this.combo);
        const gained = Math.round(EMBER.score * (1 + (this.combo - 1) * 0.1));
        this.score += gained;
        this.waveScore += gained;
        this.caught += 1;
        this.burst(ember.x, ember.y, '#ffb347', 8, 90);
        this.floatText(ember.x, ember.y - 12, `+${gained}`, '#ffd97a');
        if (sound) sound.pickup(this.combo);
      } else if (ember.y > FIELD.height + 20) {
        // An ember that hits the sea is lost: the streak breaks, no heart lost.
        ember.dead = true;
        if (this.combo >= 5) this.floatText(ember.x, FIELD.height - 40, 'streak lost', '#9fb3c8');
        this.combo = 0;
      }
    }
    this.embers = this.embers.filter((e) => !e.dead);

    // Wisps fall and hurt on touch.
    for (const wisp of this.wisps) {
      wisp.y += wisp.speed * dt;
      wisp.x += Math.sin(this.time * wisp.swaySpeed + wisp.swayPhase) * WISP.sway * dt;
      wisp.x += this.gust * dt * 0.7;
      if (wisp.y > FIELD.height + 24) {
        wisp.dead = true;
        continue;
      }
      const dist = Math.hypot(wisp.x - p.x, wisp.y - p.y);
      if (dist < wisp.radius + PLAYER.radius && p.invulnerableLeft <= 0) {
        wisp.dead = true;
        this.combo = 0;
        this.shake = 1;
        this.flash = 1;
        if (p.ward && !this.wardUsedThisWave) {
          this.wardUsedThisWave = true;
          this.floatText(p.x, p.y - 30, 'ward held!', '#9fd8ff');
          this.burst(p.x, p.y, '#9fd8ff', 14, 130);
        } else {
          p.hearts -= 1;
          p.invulnerableLeft = PLAYER.invulnerableTime;
          this.burst(p.x, p.y, '#ff5a5a', 16, 160);
          if (sound) sound.hit();
          if (p.hearts <= 0) return EVENT_OVER;
        }
      }
    }
    this.wisps = this.wisps.filter((w) => !w.dead);

    // Particles and floating text fade out.
    for (const part of this.particles) {
      part.x += part.vx * dt;
      part.y += part.vy * dt;
      part.vy += 60 * dt;
      part.life -= dt;
    }
    this.particles = this.particles.filter((part) => part.life > 0);
    for (const text of this.texts) {
      text.y -= 34 * dt;
      text.life -= dt;
    }
    this.texts = this.texts.filter((text) => text.life > 0);

    // Wave ends: bonus, then the blessing choice.
    if (this.waveTime >= WAVES.length) {
      const bonus = 50 * this.wave;
      this.score += bonus;
      this.waveScore = 0;
      this.waveTime = 0;
      this.wardUsedThisWave = false;
      this.embers = [];
      this.wisps = [];
      this.blessings = this.drawBlessings();
      if (this.wave >= WAVES.count) return EVENT_WIN;
      return EVENT_WAVE_CLEAR;
    }
    return EVENT_NONE;
  }

  // Three blessings the run has not taken yet (or any three when exhausted).
  drawBlessings() {
    const pool = BLESSINGS.filter((b) => !this.takenBlessings.includes(b.id));
    const source = pool.length >= 3 ? pool : BLESSINGS;
    const chosen = [];
    const copy = [...source];
    while (chosen.length < 3 && copy.length > 0) {
      const index = Math.floor(this.random() * copy.length);
      chosen.push(copy.splice(index, 1)[0]);
    }
    return chosen;
  }

  takeBlessing(blessing) {
    blessing.apply(this.player);
    this.takenBlessings.push(blessing.id);
    this.wave += 1;
    this.spawnWispIn = 1.6;
    this.spawnEmberIn = 0.3;
  }
}

export { STEP };
