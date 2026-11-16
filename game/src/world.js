// WICKWARD — the simulation. Pure game logic: no canvas, no DOM, no audio.
// The main loop steps it at a fixed 1/60s; sounds and effects are reported
// through this.events so the shell can play them.
import {
  W, H, FLAME_X, FLAME_Y, FLAME_R, LEAK_X, LANES, PLOT_COLS, PLOT_ROWS,
  TOWERS, ENEMIES, BOSSES, DIFFS, NIGHTS, BOSS_NIGHTS, BOONS,
  UPGRADE_COST_MULT, UPGRADE_DMG_MULT, UPGRADE_RANGE_MULT, UPGRADE_RATE_MULT,
  MAX_LEVEL, SELL_REFUND, waveComp, enemyStats,
} from './config.js';
import { makeRng } from './random.js';

export class Game {
  constructor(seed, diffIndex) {
    this.seed = seed >>> 0;
    this.rng = makeRng(this.seed);
    this.diff = DIFFS[diffIndex || 0];
    this.phase = 'title'; // title | build | wave | boon | win | over
    this.night = 0;
    this.flame = this.diff.flame;
    this.score = 0;
    this.kills = 0;
    this.leaks = 0;
    this.earned = 0;
    this.spent = 0;
    this.bonus = { dmg: 1, range: 1, rate: 1, reward: 0, cost: 1, thornHp: 0, slow: 0, splash: 1 };
    this.towers = [];
    this.enemies = [];
    this.proj = [];
    this.parts = [];
    this.floats = [];
    this.spawnQueue = [];
    this.waveT = 0;
    this.waveTotal = 0;
    this.waveSpawned = 0;
    this.waveResolved = 0;
    this.boons = [];
    this.rerolls = 0;
    this.selected = -1; // build-card index, -1 = none
    this.selectedTower = null;
    this.time = 0;
    this.ticks = 0;
    this.shake = 0;
    this.endless = false;
    this.best = 0;
    this.events = [];
    this.boss = null;
    this.flashFlame = 0; // flame-hit flash timer
    this.stars = [];
    for (let i = 0; i < 90; i++) {
      this.stars.push({ x: this.rng.range(0, W), y: this.rng.range(0, H), r: this.rng.range(0.6, 1.8), p: this.rng.range(0, 6.28) });
    }
  }

  // ---- lifecycle -------------------------------------------------------
  startGame(diffIndex) {
    const keepBest = this.best;
    const keepSeed = this.seed;
    const fresh = new Game(keepSeed, diffIndex);
    Object.assign(this, fresh);
    this.best = keepBest;
    this.phase = 'build';
    this.night = 1;
    this.events.push({ type: 'horn' });
  }

  startNight() {
    if (this.phase !== 'build') return;
    this.phase = 'wave';
    this.waveT = 0;
    this.waveSpawned = 0;
    this.waveResolved = 0;
    this.spawnQueue = waveComp(this.night, this.rng);
    this.waveTotal = this.spawnQueue.length;
    this.events.push({ type: 'horn' });
  }

  offerBoons() {
    const pool = this.rng.shuffle(BOONS);
    this.boons = pool.slice(0, 3);
    this.rerolls = 1;
    this.phase = 'boon';
  }

  chooseBoon(i) {
    if (this.phase !== 'boon' || !this.boons[i]) return;
    this.boons[i].apply(this);
    this.events.push({ type: 'boon' });
    this.boons = [];
    this.night += 1;
    this.phase = 'build';
    this.selected = -1;
    this.selectedTower = null;
  }

  rerollBoons() {
    if (this.phase !== 'boon' || this.rerolls <= 0) return;
    this.rerolls -= 1;
    const pool = this.rng.shuffle(BOONS.filter((b) => !this.boons.includes(b)));
    this.boons = pool.slice(0, 3);
    this.events.push({ type: 'coin' });
  }

  enterEndless() {
    if (this.phase !== 'win') return;
    this.endless = true;
    this.night = NIGHTS + 1;
    this.phase = 'build';
    this.events.push({ type: 'horn' });
  }

  // ---- economy --------------------------------------------------------
  towerCost(def) { return Math.max(1, Math.round(def.cost * this.bonus.cost)); }
  upgradeCost(t) {
    return Math.max(1, Math.round(t.def.cost * UPGRADE_COST_MULT * t.level * this.bonus.cost));
  }
  towerRange(t) {
    return t.def.range * this.bonus.range * Math.pow(UPGRADE_RANGE_MULT, t.level - 1);
  }
  towerDmg(t) {
    return t.def.dmg * this.bonus.dmg * Math.pow(UPGRADE_DMG_MULT, t.level - 1);
  }
  towerRate(t) {
    return t.def.rate * this.bonus.rate * Math.pow(UPGRADE_RATE_MULT, t.level - 1);
  }

  // ---- placement ------------------------------------------------------
  cells(forThorn) {
    const out = [];
    for (const x of PLOT_COLS) {
      if (forThorn) {
        LANES.forEach((y, lane) => out.push({ x, y, lane }));
      } else {
        for (const y of PLOT_ROWS) out.push({ x, y, lane: -1 });
      }
    }
    return out;
  }

  cellAt(x, y, forThorn) {
    let bestCell = null, bestD = 46;
    for (const c of this.cells(forThorn)) {
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < bestD) { bestD = d; bestCell = c; }
    }
    if (!bestCell) return null;
    if (this.towers.some((t) => Math.hypot(t.x - bestCell.x, t.y - bestCell.y) < 24)) return null;
    return bestCell;
  }

  towerAt(x, y) {
    let bestT = null, bestD = 34;
    for (const t of this.towers) {
      const d = Math.hypot(t.x - x, t.y - y);
      if (d < bestD) { bestD = d; bestT = t; }
    }
    return bestT;
  }

  buildTower(typeIdx, x, y) {
    const def = TOWERS[typeIdx];
    if (!def) return false;
    const cell = this.cellAt(x, y, def.key === 'thorn');
    if (!cell) return false;
    const cost = this.towerCost(def);
    if (this.flame < cost) { this.events.push({ type: 'deny' }); return false; }
    this.flame -= cost;
    this.spent += cost;
    const t = {
      def, type: def.key, x: cell.x, y: cell.y, lane: cell.lane,
      level: 1, cd: 0, invested: cost,
      hp: def.key === 'thorn' ? def.hp + this.bonus.thornHp : 0,
      maxHp: def.key === 'thorn' ? def.hp + this.bonus.thornHp : 0,
      angle: -Math.PI / 2, flash: 0, auraT: 0, born: 0.15,
    };
    this.towers.push(t);
    this.burst(cell.x, cell.y, def.color, 14, 90);
    this.events.push({ type: 'build' });
    return true;
  }

  upgradeTower(t) {
    if (!t || t.level >= MAX_LEVEL) return false;
    const cost = this.upgradeCost(t);
    if (this.flame < cost) { this.events.push({ type: 'deny' }); return false; }
    this.flame -= cost;
    this.spent += cost;
    t.invested += cost;
    t.level += 1;
    if (t.def.key === 'thorn') { t.maxHp += 120; t.hp += 120; }
    this.burst(t.x, t.y, '#ffe9a8', 16, 110);
    this.events.push({ type: 'build' });
    return true;
  }

  sellTower(t) {
    if (!t) return false;
    const refund = Math.round(t.invested * SELL_REFUND);
    this.flame += refund;
    this.floats.push({ x: t.x, y: t.y - 20, text: '+' + refund, color: '#ffd166', life: 1.1, max: 1.1 });
    this.towers = this.towers.filter((o) => o !== t);
    if (this.selectedTower === t) this.selectedTower = null;
    this.events.push({ type: 'coin' });
    return true;
  }

  // ---- combat ---------------------------------------------------------
  step(dt) {
    this.time += dt;
    this.ticks += 1;
    // juice decay: shake lasts ~100ms (research band 80-150ms)
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 5);
    if (this.flashFlame > 0) this.flashFlame = Math.max(0, this.flashFlame - dt);
    for (const e of this.enemies) if (e.squashT > 0) e.squashT -= dt;
    for (const t of this.towers) { if (t.flash > 0) t.flash -= dt; if (t.born > 0) t.born -= dt; }
    this.updateParticles(dt);
    this.updateFloats(dt);
    if (this.phase === 'wave') this.updateWave(dt);
  }

  updateWave(dt) {
    this.waveT += dt;
    while (this.spawnQueue.length && this.spawnQueue[0].at <= this.waveT) {
      const s = this.spawnQueue.shift();
      this.spawnEnemy(s.kind, s.boss);
      this.waveSpawned += 1;
    }
    this.moveEnemies(dt);
    this.fireTowers(dt);
    this.updateProjectiles(dt);
    // wave cleared?
    if (!this.spawnQueue.length && !this.enemies.length) {
      this.waveResolved = this.waveTotal;
      this.nightCleared();
    }
  }

  spawnEnemy(kind, isBoss) {
    const st = enemyStats(kind, this.night, this.diff);
    const lane = isBoss ? 1 : this.rng.int(3);
    const e = {
      ...st,
      x: W + 30 + this.rng.range(0, 40),
      y: LANES[lane],
      lane,
      maxHp: st.hp,
      slowUntil: 0, slowFactor: 1,
      phaseIdx: 0, squashT: 0,
      attackCd: 0,
      burstT: this.rng.range(0, 1),
      wob: this.rng.range(0, 6.28),
      blockedBy: null,
    };
    this.enemies.push(e);
    if (isBoss) {
      this.boss = e;
      this.floats.push({ x: 640, y: 120, text: e.name + ' approaches!', color: '#ff3b5c', life: 2, max: 2, big: 1 });
    }
  }

  wallAhead(e) {
    if (e.flying) return null;
    let wall = null;
    for (const t of this.towers) {
      if (t.type !== 'thorn' || t.lane !== e.lane) continue;
      if (t.x < e.x + 10 && t.x > e.x - 110 && (!wall || t.x > wall.x)) wall = t;
    }
    return wall;
  }

  moveEnemies(dt) {
    for (const e of this.enemies) {
      let speed = e.speed * e.slowFactor;
      if (this.time < e.slowUntil) speed *= e.slowFactor;
      // spider moves in bursts
      if (e.bursty) {
        e.burstT += dt;
        if ((e.burstT % 1.0) >= 0.6) speed = 0;
      }
      const wall = this.wallAhead(e);
      if (wall) {
        const stopX = wall.x + 30 + e.r;
        if (e.x <= stopX + 2) {
          e.x = stopX;
          e.blockedBy = wall;
          e.attackCd -= dt;
          if (e.attackCd <= 0) {
            e.attackCd = 0.8;
            wall.hp -= 10;
            wall.flash = 0.15;
            if (wall.hp <= 0) {
              this.burst(wall.x, wall.y, '#8fce6e', 18, 120);
              this.shake = Math.max(this.shake, 0.2);
              this.towers = this.towers.filter((t) => t !== wall);
              if (this.selectedTower === wall) this.selectedTower = null;
              this.events.push({ type: 'wallbreak' });
            }
          }
          // thorns bite back: the wall slowly burns whatever chews it
          e.hp -= 4 * dt;
          if (e.hp <= 0) { this.killEnemy(e); continue; }
          continue;
        }
      } else {
        e.blockedBy = null;
      }
      e.x -= speed * dt;
      if (e.x <= LEAK_X) {
        this.leakEnemy(e);
      }
    }
    // remove leaked / dead (killEnemy splices immediately, so just filter leaks)
    this.enemies = this.enemies.filter((e) => e.x > LEAK_X - 1 && e.hp > 0);
  }

  leakEnemy(e) {
    this.flame -= e.leak;
    this.leaks += 1;
    this.waveResolved += 1;
    this.shake = 0.35; // scaled to the impact: a leak stings, it does not convulse
    this.flashFlame = 0.6;
    this.floats.push({ x: FLAME_X, y: FLAME_Y - 70, text: '-' + e.leak + ' flame', color: '#ff5d7a', life: 1.4, max: 1.4, big: 1 });
    this.burst(FLAME_X + 30, FLAME_Y, '#ff5d7a', 16, 130);
    this.events.push({ type: 'leak' });
    if (this.boss === e) this.boss = null;
    if (this.flame <= 0) {
      this.flame = 0;
      this.floats = []; // keep the game-over screen clean
      this.phase = 'over';
      this.events.push({ type: 'lose' });
    }
  }

  fireTowers(dt) {
    for (const t of this.towers) {
      if (t.type === 'thorn') continue;
      t.cd -= dt;
      const range = this.towerRange(t);
      if (t.def.key === 'frost') {
        // aura: chill everything in range every half second
        t.auraT -= dt;
        if (t.auraT <= 0) {
          t.auraT = 0.5;
          let hit = false;
          for (const e of this.enemies) {
            if (Math.hypot(e.x - t.x, e.y - t.y) <= range) {
              e.slowUntil = this.time + 1.3;
              e.slowFactor = Math.max(0.2, 0.5 - this.bonus.slow);
              e.hp -= Math.max(1, this.towerDmg(t));
              hit = true;
              if (e.hp <= 0) this.killEnemy(e, false);
            }
          }
          if (hit) { this.events.push({ type: 'frost' }); t.flash = 0.2; }
        }
        continue;
      }
      if (t.cd > 0) continue;
      const target = this.pickTarget(t, range);
      if (!target) continue;
      t.cd = 1 / this.towerRate(t);
      t.angle = Math.atan2(target.y - t.y, target.x - t.x);
      t.flash = 0.12;
      const dmg = this.towerDmg(t);
      if (t.def.key === 'bell') {
        // shockwave: everything it can reach takes damage now
        for (const e of this.enemies.slice()) {
          if (e.flying && !t.def.air) continue;
          if (Math.hypot(e.x - t.x, e.y - t.y) <= range) {
            this.damageEnemy(e, dmg, t);
          }
        }
        this.ring(t.x, t.y, range);
        this.events.push({ type: 'bell' });
      } else {
        this.proj.push({
          x: t.x, y: t.y, target, speed: 520, dmg,
          splash: (t.def.splash || 0) * this.bonus.splash,
          chain: t.def.chain || 0, color: t.def.color, kind: t.def.key,
          air: t.def.air,
        });
        this.events.push({ type: t.def.key === 'sniper' ? 'sniper' : t.def.key === 'cannon' ? 'cannon' : t.def.key === 'brazier' ? 'splash' : t.def.key === 'moth' ? 'chain' : 'shoot' });
      }
    }
    this.enemies = this.enemies.filter((e) => e.hp > 0);
  }

  pickTarget(t, range) {
    let bestE = null, bestX = Infinity;
    for (const e of this.enemies) {
      if (e.flying && !t.def.air) continue; // ground-only towers cannot reach wasps
      if (Math.hypot(e.x - t.x, e.y - t.y) > range) continue;
      if (e.x < bestX) { bestX = e.x; bestE = e; }
    }
    return bestE;
  }

  updateProjectiles(dt) {
    for (const p of this.proj) {
      if (!p.target || p.target.hp <= 0 || !this.enemies.includes(p.target)) {
        p.dead = true; continue;
      }
      const dx = p.target.x - p.x, dy = p.target.y - p.y;
      const d = Math.hypot(dx, dy);
      const stepLen = p.speed * dt;
      if (d <= Math.max(stepLen, p.target.r + 4)) {
        this.hitProjectile(p);
        p.dead = true;
      } else {
        p.x += (dx / d) * stepLen;
        p.y += (dy / d) * stepLen;
      }
    }
    this.proj = this.proj.filter((p) => !p.dead);
    this.enemies = this.enemies.filter((e) => e.hp > 0);
  }

  hitProjectile(p) {
    const t = p.target;
    this.damageEnemy(t, p.dmg, null, p);
    if (p.splash > 0) {
      this.burst(t.x, t.y, p.color, 10, 90);
      for (const e of this.enemies.slice()) {
        if (e !== t && (e.flying && !p.air)) continue;
        if (e !== t && Math.hypot(e.x - t.x, e.y - t.y) <= p.splash) {
          this.damageEnemy(e, p.dmg * 0.5, null, p);
        }
      }
    }
    if (p.chain > 0) {
      let from = t, left = p.chain;
      const hitSet = new Set([t]);
      while (left > 0) {
        let next = null, nextD = 130;
        for (const e of this.enemies) {
          if (hitSet.has(e)) continue;
          const d = Math.hypot(e.x - from.x, e.y - from.y);
          if (d < nextD) { nextD = d; next = e; }
        }
        if (!next) break;
        hitSet.add(next);
        this.damageEnemy(next, p.dmg * 0.5, null, p);
        from = next;
        left -= 1;
      }
    }
  }

  damageEnemy(e, dmg, tower, proj) {
    const real = Math.max(1, Math.round(dmg - (e.armor || 0)));
    e.hp -= real;
    // heavy hits squash the target for ~100ms (juice on meaningful hits only)
    if (real >= 20) e.squashT = 0.1;
    if (proj && proj.dmg >= 20) {
      this.floats.push({ x: e.x, y: e.y - e.r - 6, text: '' + real, color: '#fff2cf', life: 0.7, max: 0.7 });
    }
    // boss phase transitions
    if (e.boss && e.phases.length) {
      const frac = e.hp / e.maxHp;
      if (frac <= e.phases[0]) {
        e.phases.shift();
        e.speed *= 1.5;
        e.phaseIdx += 1;
        this.shake = Math.max(this.shake, 0.3);
        this.floats.push({ x: e.x, y: e.y - e.r - 24, text: e.name + ' ENRAGED!', color: '#ff3b5c', life: 1.6, max: 1.6, big: 1 });
        this.events.push({ type: 'enrage' });
        if (e.kind === 'king') {
          for (let i = 0; i < 3; i++) this.spawnEnemy('mite', false);
        }
      }
    }
    if (e.hp <= 0) this.killEnemy(e, false);
  }

  killEnemy(e) {
    if (e.hp > 0) return; // safety: only the dead pay out
    const reward = e.reward + this.bonus.reward;
    this.flame += reward;
    this.earned += reward;
    this.kills += 1;
    this.waveResolved += 1;
    this.score += e.boss ? 200 : 10;
    this.floats.push({ x: e.x, y: e.y - e.r - 4, text: '+' + reward, color: '#ffd166', life: 0.9, max: 0.9 });
    this.burst(e.x, e.y, e.eye, e.boss ? 30 : 10, e.boss ? 200 : 90);
    this.events.push({ type: 'coin' });
    if (this.boss === e) this.boss = null;
    if (e.spawns) {
      for (let i = 0; i < 2; i++) {
        const st = enemyStats(e.spawns, this.night, this.diff);
        this.enemies.push({ ...st, x: e.x + (i ? 14 : -14), y: e.y + (i ? 10 : -10), lane: e.lane, maxHp: st.hp, slowUntil: 0, slowFactor: 1, phaseIdx: 0, squashT: 0, attackCd: 0, burstT: 0, wob: 0, blockedBy: null });
        this.waveTotal += 1;
      }
    }
    this.enemies = this.enemies.filter((o) => o !== e);
  }

  nightCleared() {
    const bonus = 100 * this.night;
    this.score += bonus;
    // Dawn feeds the flame: surviving a night is worth flame, so a rough
    // night does not spiral into certain death.
    const dawnFlame = 15;
    this.flame += dawnFlame;
    this.floats.push({ x: 640, y: 200, text: 'Night ' + this.night + ' survived!  +' + bonus + '  ·  dawn feeds +' + dawnFlame + ' flame', color: '#ffe9a8', life: 2, max: 2, big: 1 });
    this.events.push({ type: 'boon' });
    if (!this.endless && this.night >= NIGHTS) {
      this.score += this.flame * 2;
      this.floats = []; // keep the victory screen clean
      this.phase = 'win';
      if (this.score > this.best) this.best = this.score;
      this.events.push({ type: 'win' });
      return;
    }
    this.offerBoons();
  }

  // ---- effects --------------------------------------------------------
  burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = this.rng.range(0, Math.PI * 2);
      const v = this.rng.range(speed * 0.3, speed);
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: this.rng.range(0.3, 0.8), max: 0.8, size: this.rng.range(2, 5), color });
    }
    if (this.parts.length > 400) this.parts.splice(0, this.parts.length - 400);
  }

  ring(x, y, r) {
    this.parts.push({ x, y, vx: 0, vy: 0, life: 0.45, max: 0.45, size: r, color: '#ffe9a8', ring: 1 });
  }

  updateParticles(dt) {
    for (const p of this.parts) {
      p.life -= dt;
      p.x += (p.vx || 0) * dt;
      p.y += (p.vy || 0) * dt;
      if (p.vy !== undefined && !p.ring) p.vy += 60 * dt;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
  }

  updateFloats(dt) {
    for (const f of this.floats) {
      f.life -= dt;
      f.y -= 28 * dt;
    }
    this.floats = this.floats.filter((f) => f.life > 0);
  }

  waveProgress() {
    if (!this.waveTotal) return 0;
    return Math.min(1, this.waveResolved / this.waveTotal);
  }

  result() {
    return {
      won: this.phase === 'win',
      phase: this.phase,
      night: this.night,
      score: this.score,
      kills: this.kills,
      leaks: this.leaks,
      flame: this.flame,
      earned: this.earned,
      spent: this.spent,
      ticks: this.ticks,
      endless: this.endless,
    };
  }
}
