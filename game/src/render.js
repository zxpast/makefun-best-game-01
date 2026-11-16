// WICKWARD — all drawing. Canvas 2D, no assets: every sprite is drawn from
// shapes. The night is dark on purpose: a darkness layer is punched with
// light around the Last Flame and every tower, so the screenshots read as
// light against dark at a glance.
import {
  W, H, HUD_H, BAR_H, FLAME_X, FLAME_Y, FLAME_R, LEAK_X, LANES,
  PLOT_COLS, PLOT_ROWS, PLOT_R, TOWERS, NIGHTS, DIFFS,
} from './config.js';

const darkCanvas = document.createElement('canvas');
darkCanvas.width = W; darkCanvas.height = H;
const dctx = darkCanvas.getContext('2d');

// ---- layout helpers (shared with main.js hit-testing) -------------------
export function buildCardRect(i) {
  const w = 148, h = 92, gap = 8;
  const total = 8 * w + 7 * gap;
  const x0 = (W - total) / 2;
  return { x: x0 + i * (w + gap), y: H - BAR_H + 8, w, h };
}
export function towerPanelRect(t) {
  const w = 240, h = 108;
  let x = Math.max(8, Math.min(W - w - 8, t.x - w / 2));
  let y = Math.max(HUD_H + 4, t.y - h - 40);
  return { x, y, w, h };
}
export function boonCardRect(i) {
  const w = 300, h = 220;
  const total = 3 * w + 2 * 24;
  const x0 = (W - total) / 2;
  return { x: x0 + i * (w + 24), y: 250, w, h };
}
export function rerollRect() {
  return { x: W / 2 - 110, y: 500, w: 220, h: 44 };
}
export function titleDiffRect(i) {
  const w = 260, h = 120;
  const total = 3 * w + 2 * 24;
  const x0 = (W - total) / 2;
  return { x: x0 + i * (w + 24), y: 430, w, h };
}
export function titleStartRect() { return { x: W / 2 - 130, y: 580, w: 260, h: 52 }; }
export function winEndlessRect() { return { x: W / 2 - 270, y: 480, w: 250, h: 52 }; }
export function winAgainRect() { return { x: W / 2 + 20, y: 480, w: 250, h: 52 }; }
export function overRetryRect() { return { x: W / 2 - 130, y: 480, w: 260, h: 52 }; }

function inRect(r, x, y) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
export { inRect };

// ---- small drawing helpers --------------------------------------------
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function text(ctx, s, x, y, font, color, align) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}
function glowDot(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.29); ctx.fill();
}

// ---- the game ----------------------------------------------------------
export function drawGame(ctx, g, ui) {
  ctx.save();
  if (g.shake > 0) {
    // research band: 2-5px offset, ~100ms decay (shake value decays in step())
    ctx.translate((Math.random() - 0.5) * g.shake * 10, (Math.random() - 0.5) * g.shake * 10);
  }
  drawField(ctx, g, ui);
  drawTowers(ctx, g, ui);
  drawEnemies(ctx, g);
  drawProjectiles(ctx, g);
  drawParticles(ctx, g);
  drawDarkness(ctx, g);
  drawFloaters(ctx, g);
  ctx.restore();
  drawHud(ctx, g, ui);
  if (g.phase === 'build' || g.phase === 'wave') drawBuildBar(ctx, g, ui);
  if (g.selectedTower) drawTowerPanel(ctx, g, ui);
  if (g.boss && (g.phase === 'wave')) drawBossBar(ctx, g);
  if (g.phase === 'title') drawTitle(ctx, g, ui);
  if (g.phase === 'boon') drawBoons(ctx, g, ui);
  if (g.phase === 'win') drawWin(ctx, g, ui);
  if (g.phase === 'over') drawOver(ctx, g, ui);
  if (ui.paused && g.phase !== 'title') {
    ctx.fillStyle = 'rgba(4,6,16,0.72)';
    ctx.fillRect(0, 0, W, H);
    text(ctx, 'PAUSED', W / 2, H / 2 - 10, 'bold 52px Georgia, serif', '#ffe9a8', 'center');
    text(ctx, 'Press P to keep the flame burning', W / 2, H / 2 + 40, '18px system-ui, sans-serif', '#cfd6ff', 'center');
  }
}

function drawField(ctx, g, ui) {
  // night sky
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#0a0e24');
  sky.addColorStop(0.55, '#101736');
  sky.addColorStop(1, '#0b1026');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // stars
  for (const s of g.stars) {
    const a = 0.35 + 0.3 * Math.sin(g.time * 1.5 + s.p);
    ctx.fillStyle = 'rgba(220,228,255,' + a.toFixed(2) + ')';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.29); ctx.fill();
  }
  // distant hills
  ctx.fillStyle = '#0d1330';
  ctx.beginPath();
  ctx.moveTo(0, 600);
  for (let x = 0; x <= W; x += 80) ctx.lineTo(x, 596 - 22 * Math.sin(x * 0.008 + 1.2));
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  // lanes: worn paths the dark walks
  for (const y of LANES) {
    ctx.fillStyle = 'rgba(58,48,86,0.5)';
    ctx.fillRect(LEAK_X - 10, y - 26, W - LEAK_X + 10, 52);
    ctx.fillStyle = 'rgba(20,16,40,0.6)';
    for (let x = LEAK_X + 20; x < W; x += 64) {
      ctx.fillRect(x, y - 2, 30, 4);
    }
  }
  // plots
  const hoverCell = ui.hoverCell;
  for (const x of PLOT_COLS) {
    for (const y of PLOT_ROWS) {
      const hovered = hoverCell && hoverCell.x === x && hoverCell.y === y && hoverCell.lane === -1;
      ctx.beginPath(); ctx.arc(x, y, PLOT_R, 0, 6.29);
      ctx.fillStyle = hovered ? 'rgba(255,209,102,0.30)' : 'rgba(120,110,160,0.16)';
      ctx.fill();
      ctx.strokeStyle = hovered ? '#ffd166' : 'rgba(160,150,200,0.35)';
      ctx.lineWidth = hovered ? 2.5 : 1.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(200,190,240,0.5)';
      ctx.beginPath(); ctx.arc(x, y, 3, 0, 6.29); ctx.fill();
    }
  }
  // lane cells for thorn walls (only shown while a thorn is selected)
  if (g.selected >= 0 && TOWERS[g.selected].key === 'thorn') {
    for (const x of PLOT_COLS) {
      for (let li = 0; li < LANES.length; li++) {
        const y = LANES[li];
        const hovered = hoverCell && hoverCell.x === x && hoverCell.y === y;
        ctx.beginPath(); ctx.arc(x, y, 22, 0, 6.29);
        ctx.fillStyle = hovered ? 'rgba(143,206,110,0.35)' : 'rgba(143,206,110,0.14)';
        ctx.fill();
        ctx.strokeStyle = hovered ? '#8fce6e' : 'rgba(143,206,110,0.4)';
        ctx.lineWidth = 1.5; ctx.stroke();
      }
    }
  }
  // the Last Flame keep
  const flick = 1 + 0.06 * Math.sin(g.time * 7) + 0.04 * Math.sin(g.time * 13);
  glowDot(ctx, FLAME_X, FLAME_Y, 150 * flick, 'rgba(255,150,50,0.55)');
  glowDot(ctx, FLAME_X, FLAME_Y, 70 * flick, 'rgba(255,200,90,0.8)');
  ctx.fillStyle = '#241a12';
  ctx.beginPath(); ctx.arc(FLAME_X, FLAME_Y, FLAME_R, 0, 6.29); ctx.fill();
  ctx.strokeStyle = '#6b4a26'; ctx.lineWidth = 4; ctx.stroke();
  // flame tongue
  ctx.fillStyle = '#ffb347';
  ctx.beginPath();
  ctx.moveTo(FLAME_X, FLAME_Y - 34 * flick);
  ctx.quadraticCurveTo(FLAME_X + 20, FLAME_Y - 6, FLAME_X + 8, FLAME_Y + 14);
  ctx.quadraticCurveTo(FLAME_X, FLAME_Y + 22, FLAME_X - 8, FLAME_Y + 14);
  ctx.quadraticCurveTo(FLAME_X - 20, FLAME_Y - 6, FLAME_X, FLAME_Y - 34 * flick);
  ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.moveTo(FLAME_X, FLAME_Y - 18 * flick);
  ctx.quadraticCurveTo(FLAME_X + 10, FLAME_Y - 2, FLAME_X + 4, FLAME_Y + 10);
  ctx.quadraticCurveTo(FLAME_X, FLAME_Y + 15, FLAME_X - 4, FLAME_Y + 10);
  ctx.quadraticCurveTo(FLAME_X - 10, FLAME_Y - 2, FLAME_X, FLAME_Y - 18 * flick);
  ctx.fill();
  if (g.flashFlame > 0) {
    ctx.strokeStyle = 'rgba(255,93,122,' + (g.flashFlame * 1.4).toFixed(2) + ')';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(FLAME_X, FLAME_Y, FLAME_R + 8, 0, 6.29); ctx.stroke();
  }
  // leak line
  ctx.strokeStyle = 'rgba(255,93,122,0.35)';
  ctx.setLineDash([6, 8]);
  ctx.beginPath(); ctx.moveTo(LEAK_X, HUD_H + 4); ctx.lineTo(LEAK_X, H - BAR_H - 4); ctx.stroke();
  ctx.setLineDash([]);
}

function drawTowerIcon(ctx, def, x, y, r, flash) {
  ctx.save();
  ctx.translate(x, y);
  if (flash > 0) { ctx.shadowColor = def.color; ctx.shadowBlur = 18; }
  switch (def.key) {
    case 'spitter': {
      ctx.fillStyle = def.color;
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        ctx.beginPath(); ctx.ellipse(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.42, r * 0.42, 0, 0, 6.29); ctx.fill();
      }
      ctx.fillStyle = '#fff2cf'; ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0, 6.29); ctx.fill();
      break;
    }
    case 'sniper': {
      ctx.fillStyle = '#f5e6c8'; ctx.fillRect(-r * 0.28, -r, r * 0.56, r * 1.7);
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.ellipse(0, -r * 1.15, r * 0.34, r * 0.55, 0, 0, 6.29); ctx.fill();
      ctx.fillStyle = '#fff2cf'; ctx.beginPath(); ctx.arc(0, -r * 1.15, r * 0.16, 0, 6.29); ctx.fill();
      break;
    }
    case 'frost': {
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.2); ctx.lineTo(r * 0.8, 0); ctx.lineTo(0, r * 1.2); ctx.lineTo(-r * 0.8, 0);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#eafcff'; ctx.lineWidth = 2; ctx.stroke();
      break;
    }
    case 'brazier': {
      ctx.fillStyle = '#5a3a22';
      ctx.beginPath(); ctx.arc(0, r * 0.3, r * 0.85, 0, Math.PI); ctx.closePath(); ctx.fill();
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.ellipse(0, -r * 0.45, r * 0.5, r * 0.7, 0, 0, 6.29); ctx.fill();
      ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.ellipse(0, -r * 0.35, r * 0.24, r * 0.4, 0, 0, 6.29); ctx.fill();
      break;
    }
    case 'thorn': {
      ctx.fillStyle = def.color;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const rad = i % 2 === 0 ? r : r * 0.55;
        ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2c4a22'; ctx.beginPath(); ctx.arc(0, 0, r * 0.45, 0, 6.29); ctx.fill();
      break;
    }
    case 'moth': {
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.ellipse(-r * 0.55, -r * 0.2, r * 0.6, r * 0.85, -0.5, 0, 6.29); ctx.fill();
      ctx.beginPath(); ctx.ellipse(r * 0.55, -r * 0.2, r * 0.6, r * 0.85, 0.5, 0, 6.29); ctx.fill();
      ctx.fillStyle = '#fff2cf'; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.28, r * 0.7, 0, 0, 6.29); ctx.fill();
      break;
    }
    case 'bell': {
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(0, -r * 0.5, r * 0.7, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.fillRect(-r * 0.7, -r * 0.5, r * 1.4, r * 0.35);
      ctx.fillStyle = '#8a6a2a'; ctx.beginPath(); ctx.arc(0, r * 0.35, r * 0.22, 0, 6.29); ctx.fill();
      break;
    }
    case 'cannon': {
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(0, 0, r, Math.PI * 0.15, Math.PI * 1.35); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#b388ff'; ctx.beginPath(); ctx.arc(r * 0.25, -r * 0.2, r * 0.3, 0, 6.29); ctx.fill();
      break;
    }
    default: {
      ctx.fillStyle = def.color; ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, 6.29); ctx.fill();
    }
  }
  ctx.restore();
}

function drawTowers(ctx, g, ui) {
  for (const t of g.towers) {
    // range ring for the selected / hovered tower
    if (g.selectedTower === t || (ui.hoverTower === t && t.type !== 'thorn')) {
      const range = g.towerRange(t);
      ctx.beginPath(); ctx.arc(t.x, t.y, range, 0, 6.29);
      ctx.fillStyle = 'rgba(255,209,102,0.07)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,209,102,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    // base
    ctx.fillStyle = 'rgba(20,16,40,0.85)';
    ctx.beginPath(); ctx.arc(t.x, t.y, 24, 0, 6.29); ctx.fill();
    ctx.strokeStyle = t.def.color; ctx.lineWidth = 2; ctx.stroke();
    // squash & stretch on fire (10-12%, yoyo ~100ms via t.flash) and a
    // pop-in scale when the tower is first built (t.born)
    ctx.save();
    ctx.translate(t.x, t.y);
    let sx = 1, sy = 1;
    if (t.born > 0) {
      const p = 1 - t.born / 0.15;
      const e = 1 - Math.pow(1 - p, 3);
      sx *= 0.5 + 0.5 * e; sy *= 0.5 + 0.5 * e;
    }
    if (t.flash > 0) {
      const p = 1 - t.flash / 0.12;
      const k = Math.sin(p * Math.PI);
      sx *= 1 + 0.12 * k; sy *= 1 - 0.10 * k;
    }
    ctx.scale(sx, sy);
    ctx.translate(-t.x, -t.y);
    drawTowerIcon(ctx, t.def, t.x, t.y, 15, t.flash);
    ctx.restore();
    // level pips
    for (let i = 0; i < t.level; i++) {
      ctx.fillStyle = '#ffd166';
      ctx.beginPath(); ctx.arc(t.x - 12 + i * 12, t.y + 30, 3, 0, 6.29); ctx.fill();
    }
    // thorn wall health
    if (t.type === 'thorn') {
      const frac = Math.max(0, t.hp / t.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(t.x - 22, t.y - 34, 44, 6);
      ctx.fillStyle = frac > 0.4 ? '#8fce6e' : '#ff5d7a';
      ctx.fillRect(t.x - 22, t.y - 34, 44 * frac, 6);
    }
    if (t.flash > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (t.flash * 3).toFixed(2) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(t.x, t.y, 26, 0, 6.29); ctx.stroke();
    }
  }
  // ghost preview of the tower about to be placed
  if (g.selected >= 0 && ui.hoverCell && (g.phase === 'build' || g.phase === 'wave')) {
    const def = TOWERS[g.selected];
    const c = ui.hoverCell;
    ctx.globalAlpha = 0.75;
    drawTowerIcon(ctx, def, c.x, c.y, 15, 0);
    ctx.globalAlpha = 1;
    if (def.range > 0) {
      ctx.beginPath(); ctx.arc(c.x, c.y, def.range * g.bonus.range, 0, 6.29);
      ctx.strokeStyle = 'rgba(255,209,102,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
    }
  }
}

function drawEnemies(ctx, g) {
  for (const e of g.enemies) {
    const bob = Math.sin(g.time * 3 + e.wob) * 3;
    const x = e.x, y = e.y + bob;
    // heavy-hit squash: 15% stretch-squash yoyo ~100ms + white flash
    const sq = e.squashT > 0 ? Math.sin((1 - e.squashT / 0.1) * Math.PI) : 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1 + 0.15 * sq, 1 - 0.15 * sq);
    ctx.translate(-x, -y);
    // shadow blob
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.ellipse(x, y, e.r, e.r * 0.85, 0, 0, 6.29); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2; ctx.stroke();
    // kind features
    if (e.kind === 'beetle') {
      ctx.strokeStyle = '#3a4a6a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y - 2, e.r * 0.6, Math.PI, 0); ctx.stroke();
    } else if (e.kind === 'wasp') {
      ctx.fillStyle = 'rgba(255,224,102,0.35)';
      ctx.beginPath(); ctx.ellipse(x - 8, y - e.r * 0.7, 10, 5, -0.6, 0, 6.29); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + 8, y - e.r * 0.7, 10, 5, 0.6, 0, 6.29); ctx.fill();
    } else if (e.kind === 'spider') {
      ctx.strokeStyle = '#3a2f55'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(x - 6 + i * 6, y);
        ctx.lineTo(x - 14 + i * 6, y - 12 - i * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - 6 + i * 6, y);
        ctx.lineTo(x - 14 + i * 6, y + 12 + i * 2); ctx.stroke();
      }
    } else if (e.kind === 'moth') {
      ctx.fillStyle = 'rgba(201,167,255,0.3)';
      ctx.beginPath(); ctx.ellipse(x - 10, y - 6, 11, 7, -0.5, 0, 6.29); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + 10, y - 6, 11, 7, 0.5, 0, 6.29); ctx.fill();
    } else if (e.kind === 'ant') {
      ctx.strokeStyle = e.eye; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x - 4, y - e.r * 0.7); ctx.quadraticCurveTo(x - 8, y - e.r * 1.3, x - 12, y - e.r * 1.1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 4, y - e.r * 0.7); ctx.quadraticCurveTo(x + 8, y - e.r * 1.3, x + 12, y - e.r * 1.1); ctx.stroke();
    }
    // glowing eyes, always facing left (toward the flame)
    const er = e.boss ? 5 : 3;
    ctx.fillStyle = e.eye;
    ctx.beginPath(); ctx.arc(x - e.r * 0.35, y - e.r * 0.25, er, 0, 6.29); ctx.fill();
    ctx.beginPath(); ctx.arc(x - e.r * 0.35, y + e.r * 0.25, er, 0, 6.29); ctx.fill();
    // boss crown
    if (e.boss) {
      ctx.fillStyle = '#ff2e63';
      ctx.beginPath();
      ctx.moveTo(x - 18, y - e.r - 2);
      ctx.lineTo(x - 12, y - e.r - 16); ctx.lineTo(x - 6, y - e.r - 4);
      ctx.lineTo(x, y - e.r - 18); ctx.lineTo(x + 6, y - e.r - 4);
      ctx.lineTo(x + 12, y - e.r - 16); ctx.lineTo(x + 18, y - e.r - 2);
      ctx.closePath(); ctx.fill();
    }
    // slow tint
    if (g.time < e.slowUntil) {
      ctx.fillStyle = 'rgba(127,231,255,0.25)';
      ctx.beginPath(); ctx.ellipse(x, y, e.r + 2, e.r * 0.85 + 2, 0, 0, 6.29); ctx.fill();
    }
    // health bar when hurt
    if (e.hp < e.maxHp) {
      const w = e.boss ? 70 : 34;
      const frac = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(x - w / 2, y - e.r - 12, w, 5);
      ctx.fillStyle = frac > 0.4 ? '#ff9a3c' : '#ff3b5c';
      ctx.fillRect(x - w / 2, y - e.r - 12, w * frac, 5);
    }
    if (sq > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.45 * sq).toFixed(2) + ')';
      ctx.beginPath(); ctx.ellipse(x, y, e.r, e.r * 0.85, 0, 0, 6.29); ctx.fill();
    }
    ctx.restore();
  }
}

function drawProjectiles(ctx, g) {
  for (const p of g.proj) {
    glowDot(ctx, p.x, p.y, 12, p.color);
    ctx.fillStyle = '#fff8e6';
    ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, 6.29); ctx.fill();
  }
}

function drawParticles(ctx, g) {
  for (const p of g.parts) {
    const a = Math.max(0, p.life / p.max);
    if (p.ring) {
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = a;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - a * 0.4), 0, 6.29); ctx.stroke();
      ctx.globalAlpha = 1;
      continue;
    }
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a + 0.5, 0, 6.29); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawDarkness(ctx, g) {
  dctx.clearRect(0, 0, W, H);
  dctx.globalCompositeOperation = 'source-over';
  dctx.fillStyle = 'rgba(3,5,18,0.52)';
  dctx.fillRect(0, 0, W, H);
  dctx.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r, strength) => {
    const gr = dctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(0,0,0,' + strength + ')');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    dctx.fillStyle = gr;
    dctx.beginPath(); dctx.arc(x, y, r, 0, 6.29); dctx.fill();
  };
  hole(FLAME_X, FLAME_Y, 260, 0.95);
  for (const t of g.towers) {
    if (t.type === 'thorn') { hole(t.x, t.y, 70, 0.6); continue; }
    hole(t.x, t.y, Math.max(90, g.towerRange(t) * 0.55), 0.75);
  }
  for (const p of g.proj) hole(p.x, p.y, 40, 0.5);
  ctx.drawImage(darkCanvas, 0, 0);
}

function drawFloaters(ctx, g) {
  for (const f of g.floats) {
    const a = Math.max(0, f.life / f.max);
    ctx.globalAlpha = a;
    text(ctx, f.text, f.x, f.y, (f.big ? 'bold 26px Georgia, serif' : 'bold 16px system-ui, sans-serif'), f.color, 'center');
    ctx.globalAlpha = 1;
  }
}

function drawHud(ctx, g, ui) {
  ctx.fillStyle = 'rgba(8,10,26,0.92)';
  ctx.fillRect(0, 0, W, HUD_H);
  ctx.fillStyle = 'rgba(255,209,102,0.25)';
  ctx.fillRect(0, HUD_H - 2, W, 2);
  // flame: health AND money
  glowDot(ctx, 34, HUD_H / 2, 22, 'rgba(255,150,50,0.7)');
  ctx.fillStyle = '#ffb347';
  ctx.beginPath();
  ctx.moveTo(34, HUD_H / 2 - 12);
  ctx.quadraticCurveTo(42, HUD_H / 2 + 2, 38, HUD_H / 2 + 10);
  ctx.quadraticCurveTo(34, HUD_H / 2 + 14, 30, HUD_H / 2 + 10);
  ctx.quadraticCurveTo(26, HUD_H / 2 + 2, 34, HUD_H / 2 - 12);
  ctx.fill();
  const flameColor = g.flame <= 25 ? '#ff5d7a' : '#ffd166';
  text(ctx, 'FLAME', 58, 16, 'bold 11px system-ui, sans-serif', '#9aa3c7');
  text(ctx, '' + Math.floor(g.flame), 58, 38, 'bold 24px system-ui, sans-serif', flameColor);
  // flame bar
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(130, 34, 120, 8);
  ctx.fillStyle = flameColor;
  ctx.fillRect(130, 34, 120 * Math.min(1, g.flame / 150), 8);
  text(ctx, 'health = money', 130, 16, '11px system-ui, sans-serif', '#7d86ad');
  // night / score / kills
  text(ctx, 'NIGHT', 300, 16, 'bold 11px system-ui, sans-serif', '#9aa3c7');
  text(ctx, (g.endless ? '∞ ' : '') + Math.min(g.night || 1, 99) + (g.endless ? '' : ' / ' + NIGHTS), 300, 38, 'bold 22px system-ui, sans-serif', '#fff2cf');
  text(ctx, 'SCORE', 430, 16, 'bold 11px system-ui, sans-serif', '#9aa3c7');
  text(ctx, '' + g.score, 430, 38, 'bold 22px system-ui, sans-serif', '#fff2cf');
  text(ctx, 'KILLS', 560, 16, 'bold 11px system-ui, sans-serif', '#9aa3c7');
  text(ctx, '' + g.kills, 560, 38, 'bold 22px system-ui, sans-serif', '#fff2cf');
  // wave progress
  if (g.phase === 'wave') {
    text(ctx, 'WAVE', 680, 16, 'bold 11px system-ui, sans-serif', '#9aa3c7');
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(680, 30, 180, 10);
    ctx.fillStyle = '#ff9a3c';
    ctx.fillRect(680, 30, 180 * g.waveProgress(), 10);
    text(ctx, Math.round(g.waveProgress() * 100) + '%', 868, 36, '12px system-ui, sans-serif', '#cfd6ff');
  } else if (g.phase === 'build') {
    text(ctx, 'Build your light — then press SPACE', 680, 30, 'bold 15px system-ui, sans-serif', '#ffd166');
  } else if (g.phase === 'boon') {
    text(ctx, 'Choose a boon', 680, 30, 'bold 15px system-ui, sans-serif', '#ffd166');
  }
  // right side: speed, sound, pause
  text(ctx, (ui.speed === 2 ? '2×' : '1×') + ' [F]', 1080, 30, 'bold 15px system-ui, sans-serif', '#cfd6ff');
  text(ctx, (ui.muted ? 'muted [M]' : 'sound [M]'), 1150, 30, 'bold 15px system-ui, sans-serif', '#cfd6ff');
}

function drawBuildBar(ctx, g, ui) {
  ctx.fillStyle = 'rgba(8,10,26,0.94)';
  ctx.fillRect(0, H - BAR_H, W, BAR_H);
  ctx.fillStyle = 'rgba(255,209,102,0.25)';
  ctx.fillRect(0, H - BAR_H, W, 2);
  for (let i = 0; i < TOWERS.length; i++) {
    const def = TOWERS[i];
    const r = buildCardRect(i);
    const cost = g.towerCost(def);
    const afford = g.flame >= cost;
    const selected = g.selected === i;
    ctx.fillStyle = selected ? 'rgba(255,209,102,0.22)' : 'rgba(255,255,255,0.05)';
    rr(ctx, r.x, r.y, r.w, r.h, 10); ctx.fill();
    ctx.strokeStyle = selected ? '#ffd166' : 'rgba(160,150,200,0.35)';
    ctx.lineWidth = selected ? 2.5 : 1.5;
    rr(ctx, r.x, r.y, r.w, r.h, 10); ctx.stroke();
    drawTowerIcon(ctx, def, r.x + 24, r.y + 26, 14, 0);
    text(ctx, def.name, r.x + 44, r.y + 15, 'bold 11px system-ui, sans-serif', '#fff2cf');
    text(ctx, def.role, r.x + 44, r.y + 33, '10px system-ui, sans-serif', '#9aa3c7');
    text(ctx, '🔥 ' + cost, r.x + 44, r.y + 53, 'bold 13px system-ui, sans-serif', afford ? '#ffd166' : '#ff5d7a');
    text(ctx, '[' + (i + 1) + ']', r.x + r.w - 8, r.y + 72, 'bold 11px system-ui, sans-serif', '#7d86ad', 'right');
    if (def.key === 'thorn') text(ctx, 'lane only', r.x + 44, r.y + 72, '10px system-ui, sans-serif', '#8fce6e');
    else text(ctx, 'rng ' + Math.round(def.range * g.bonus.range) + ' · dmg ' + Math.round(def.dmg * g.bonus.dmg), r.x + 44, r.y + 72, '10px system-ui, sans-serif', '#7d86ad');
  }
  text(ctx, 'Click a card, then a plot to build  ·  U upgrade  ·  X sell  ·  SPACE start night  ·  P pause', W / 2, H - 8, '12px system-ui, sans-serif', '#7d86ad', 'center');
}

function drawTowerPanel(ctx, g, ui) {
  const t = g.selectedTower;
  if (!t) return;
  const r = towerPanelRect(t);
  ctx.fillStyle = 'rgba(8,10,26,0.97)';
  rr(ctx, r.x, r.y, r.w, r.h, 10); ctx.fill();
  ctx.strokeStyle = t.def.color; ctx.lineWidth = 2;
  rr(ctx, r.x, r.y, r.w, r.h, 10); ctx.stroke();
  drawTowerIcon(ctx, t.def, r.x + 26, r.y + 28, 15, 0);
  text(ctx, t.def.name + '  Lv ' + t.level, r.x + 48, r.y + 18, 'bold 15px system-ui, sans-serif', '#fff2cf');
  if (t.type === 'thorn') {
    text(ctx, 'Wall health ' + Math.max(0, Math.ceil(t.hp)) + ' / ' + t.maxHp, r.x + 48, r.y + 40, '13px system-ui, sans-serif', '#cfd6ff');
  } else {
    text(ctx, 'dmg ' + Math.round(g.towerDmg(t)) + ' · range ' + Math.round(g.towerRange(t)) + ' · ' + g.towerRate(t).toFixed(1) + '/s', r.x + 48, r.y + 40, '13px system-ui, sans-serif', '#cfd6ff');
  }
  // upgrade button
  const upR = { x: r.x + 14, y: r.y + 62, w: 104, h: 32 };
  const canUp = t.level < MAX_LEVEL && g.flame >= g.upgradeCost(t);
  ctx.fillStyle = canUp ? 'rgba(255,209,102,0.25)' : 'rgba(255,255,255,0.06)';
  rr(ctx, upR.x, upR.y, upR.w, upR.h, 8); ctx.fill();
  ctx.strokeStyle = canUp ? '#ffd166' : 'rgba(160,150,200,0.3)'; ctx.lineWidth = 1.5;
  rr(ctx, upR.x, upR.y, upR.w, upR.h, 8); ctx.stroke();
  text(ctx, t.level >= MAX_LEVEL ? 'MAX [U]' : 'Upgrade [U] ' + g.upgradeCost(t) + '🔥', upR.x + upR.w / 2, upR.y + 17, 'bold 12px system-ui, sans-serif', canUp ? '#ffd166' : '#7d86ad', 'center');
  // sell button
  const sellR = { x: r.x + 126, y: r.y + 62, w: 100, h: 32 };
  ctx.fillStyle = 'rgba(255,93,122,0.18)';
  rr(ctx, sellR.x, sellR.y, sellR.w, sellR.h, 8); ctx.fill();
  ctx.strokeStyle = '#ff5d7a'; ctx.lineWidth = 1.5;
  rr(ctx, sellR.x, sellR.y, sellR.w, sellR.h, 8); ctx.stroke();
  text(ctx, 'Sell [X] +' + Math.round(t.invested * 0.6) + '🔥', sellR.x + sellR.w / 2, sellR.y + 17, 'bold 12px system-ui, sans-serif', '#ff9ab0', 'center');
  t._upRect = upR; t._sellRect = sellR;
}

function drawBossBar(ctx, g) {
  const b = g.boss;
  if (!b) return;
  const w = 440, x = (W - w) / 2, y = HUD_H + 6;
  text(ctx, b.name, W / 2, y + 8, 'bold 14px Georgia, serif', '#ff8fa8', 'center');
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  rr(ctx, x, y + 18, w, 10, 5); ctx.fill();
  ctx.fillStyle = '#ff2e63';
  rr(ctx, x, y + 18, w * Math.max(0, b.hp / b.maxHp), 10, 5); ctx.fill();
  ctx.strokeStyle = 'rgba(255,46,99,0.6)'; ctx.lineWidth = 1.5;
  rr(ctx, x, y + 18, w, 10, 5); ctx.stroke();
  // phase pips inline, right of the bar
  const total = b.phases.length + b.phaseIdx + 1;
  for (let i = 0; i < total; i++) {
    ctx.fillStyle = i < b.phaseIdx ? '#ff2e63' : 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.arc(x + w + 12 + i * 14, y + 23, 4, 0, 6.29); ctx.fill();
  }
}

function drawTitle(ctx, g, ui) {
  ctx.fillStyle = 'rgba(4,6,16,0.78)';
  ctx.fillRect(0, 0, W, H);
  // demo backdrop: a few towers + foes, purely visual
  glowDot(ctx, FLAME_X, FLAME_Y, 200, 'rgba(255,150,50,0.35)');
  text(ctx, 'WICKWARD', W / 2, 130, 'bold 84px Georgia, serif', '#ffd166', 'center');
  text(ctx, 'The last flame is your health — and your money.', W / 2, 190, 'italic 24px Georgia, serif', '#ffe9a8', 'center');
  text(ctx, 'Every tower you build burns a piece of your own flame. Every kill feeds it back.', W / 2, 224, '18px system-ui, sans-serif', '#cfd6ff', 'center');
  text(ctx, 'Hold the Last Flame through 10 nights. Bosses rise on nights 5 and 10.', W / 2, 252, '18px system-ui, sans-serif', '#cfd6ff', 'center');
  text(ctx, 'Spend too much light and the dark takes you.', W / 2, 280, '18px system-ui, sans-serif', '#ff9ab0', 'center');
  text(ctx, 'Choose your night:', W / 2, 400, 'bold 18px system-ui, sans-serif', '#fff2cf', 'center');
  for (let i = 0; i < DIFFS.length; i++) {
    const d = DIFFS[i];
    const r = titleDiffRect(i);
    const sel = ui.diffIndex === i;
    ctx.fillStyle = sel ? 'rgba(255,209,102,0.22)' : 'rgba(255,255,255,0.05)';
    rr(ctx, r.x, r.y, r.w, r.h, 12); ctx.fill();
    ctx.strokeStyle = sel ? '#ffd166' : 'rgba(160,150,200,0.35)';
    ctx.lineWidth = sel ? 2.5 : 1.5;
    rr(ctx, r.x, r.y, r.w, r.h, 12); ctx.stroke();
    text(ctx, d.name, r.x + r.w / 2, r.y + 30, 'bold 24px Georgia, serif', '#fff2cf', 'center');
    text(ctx, d.desc, r.x + r.w / 2, r.y + 60, '14px system-ui, sans-serif', '#cfd6ff', 'center');
    text(ctx, 'starts at ' + d.flame + ' flame', r.x + r.w / 2, r.y + 86, '13px system-ui, sans-serif', '#9aa3c7', 'center');
    text(ctx, '[press ' + (i + 1) + ']', r.x + r.w / 2, r.y + 106, '12px system-ui, sans-serif', '#7d86ad', 'center');
  }
  const s = titleStartRect();
  ctx.fillStyle = '#ffd166';
  rr(ctx, s.x, s.y, s.w, s.h, 12); ctx.fill();
  text(ctx, 'LIGHT THE FLAME  [ENTER]', s.x + s.w / 2, s.y + 27, 'bold 18px system-ui, sans-serif', '#241a12', 'center');
  if (g.best > 0) text(ctx, 'Best score: ' + g.best, W / 2, 660, '16px system-ui, sans-serif', '#9aa3c7', 'center');
  text(ctx, '1–8 build · click a plot to place · U upgrade · X sell · SPACE start night · F speed · M sound · P pause', W / 2, 690, '13px system-ui, sans-serif', '#7d86ad', 'center');
}

function drawBoons(ctx, g, ui) {
  ctx.fillStyle = 'rgba(4,6,16,0.72)';
  ctx.fillRect(0, 0, W, H);
  text(ctx, 'Night ' + g.night + ' survived — choose a boon', W / 2, 200, 'bold 34px Georgia, serif', '#ffe9a8', 'center');
  text(ctx, 'The flame rewards the wise. Pick one.', W / 2, 232, '16px system-ui, sans-serif', '#cfd6ff', 'center');
  for (let i = 0; i < g.boons.length; i++) {
    const b = g.boons[i];
    const r = boonCardRect(i);
    const hovered = ui.hoverX >= r.x && ui.hoverX <= r.x + r.w && ui.hoverY >= r.y && ui.hoverY <= r.y + r.h;
    ctx.fillStyle = hovered ? 'rgba(255,209,102,0.18)' : 'rgba(255,255,255,0.06)';
    rr(ctx, r.x, r.y, r.w, r.h, 14); ctx.fill();
    ctx.strokeStyle = hovered ? '#ffd166' : 'rgba(160,150,200,0.4)';
    ctx.lineWidth = hovered ? 2.5 : 1.5;
    rr(ctx, r.x, r.y, r.w, r.h, 14); ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 52px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('✦', r.x + r.w / 2, r.y + 62);
    text(ctx, b.name, r.x + r.w / 2, r.y + 128, 'bold 22px Georgia, serif', '#fff2cf', 'center');
    text(ctx, b.desc, r.x + r.w / 2, r.y + 162, '15px system-ui, sans-serif', '#cfd6ff', 'center');
    text(ctx, '[press ' + (i + 1) + ']', r.x + r.w / 2, r.y + 196, '13px system-ui, sans-serif', '#7d86ad', 'center');
  }
  if (g.rerolls > 0) {
    const r = rerollRect();
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    rr(ctx, r.x, r.y, r.w, r.h, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(160,150,200,0.5)'; ctx.lineWidth = 1.5;
    rr(ctx, r.x, r.y, r.w, r.h, 10); ctx.stroke();
    text(ctx, 'Reroll  [R]  —  1 left', r.x + r.w / 2, r.y + 23, 'bold 15px system-ui, sans-serif', '#cfd6ff', 'center');
  }
}

function drawWin(ctx, g, ui) {
  ctx.fillStyle = 'rgba(4,6,16,0.82)';
  ctx.fillRect(0, 0, W, H);
  glowDot(ctx, W / 2, 220, 260, 'rgba(255,200,90,0.35)');
  text(ctx, 'DAWN BREAKS', W / 2, 180, 'bold 64px Georgia, serif', '#ffd166', 'center');
  text(ctx, 'Ten nights held. The Last Flame still burns — because of you.', W / 2, 240, 'italic 20px Georgia, serif', '#ffe9a8', 'center');
  const rows = [
    ['Score', '' + g.score],
    ['Kills', '' + g.kills],
    ['Flame left', '' + Math.floor(g.flame)],
    ['Flame earned', '' + g.earned],
    ['Flame spent on towers', '' + g.spent],
    ['Best score', '' + Math.max(g.best, g.score)],
  ];
  let y = 300;
  for (const [k, v] of rows) {
    text(ctx, k, W / 2 - 160, y, '17px system-ui, sans-serif', '#9aa3c7');
    text(ctx, v, W / 2 + 160, y, 'bold 17px system-ui, sans-serif', '#fff2cf', 'right');
    y += 30;
  }
  const e = winEndlessRect(), a = winAgainRect();
  ctx.fillStyle = '#ffd166'; rr(ctx, e.x, e.y, e.w, e.h, 12); ctx.fill();
  text(ctx, 'ENDLESS NIGHTS [ENTER]', e.x + e.w / 2, e.y + 27, 'bold 15px system-ui, sans-serif', '#241a12', 'center');
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; rr(ctx, a.x, a.y, a.w, a.h, 12); ctx.fill();
  ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 1.5; rr(ctx, a.x, a.y, a.w, a.h, 12); ctx.stroke();
  text(ctx, 'Play again [R]', a.x + a.w / 2, a.y + 27, 'bold 15px system-ui, sans-serif', '#ffd166', 'center');
}

function drawOver(ctx, g, ui) {
  ctx.fillStyle = 'rgba(10,4,10,0.85)';
  ctx.fillRect(0, 0, W, H);
  text(ctx, 'THE FLAME IS OUT', W / 2, 180, 'bold 60px Georgia, serif', '#ff5d7a', 'center');
  text(ctx, 'The dark crept in on night ' + g.night + ' — but the wick can be lit again.', W / 2, 240, 'italic 20px Georgia, serif', '#cfd6ff', 'center');
  const rows = [
    ['Score', '' + g.score],
    ['Nights held', '' + (g.night - 1) + ' / ' + NIGHTS],
    ['Kills', '' + g.kills],
    ['Flame earned', '' + g.earned],
  ];
  let y = 300;
  for (const [k, v] of rows) {
    text(ctx, k, W / 2 - 160, y, '17px system-ui, sans-serif', '#9aa3c7');
    text(ctx, v, W / 2 + 160, y, 'bold 17px system-ui, sans-serif', '#fff2cf', 'right');
    y += 30;
  }
  const r = overRetryRect();
  ctx.fillStyle = '#ffd166'; rr(ctx, r.x, r.y, r.w, r.h, 12); ctx.fill();
  text(ctx, 'LIGHT IT AGAIN  [R]', r.x + r.w / 2, r.y + 27, 'bold 17px system-ui, sans-serif', '#241a12', 'center');
}
