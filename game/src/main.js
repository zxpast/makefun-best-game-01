// WICKWARD — shell: boots the game, routes input, runs the frame loop, and
// serves the two headless modes the build uses to verify itself:
//   ?auto=1&seed=N        run the autopilot to win/lose, print the result
//   ?shot=play|boss|win|title&seed=N   stage one screenshot frame
import { Game } from './world.js';
import {
  drawGame, buildCardRect, boonCardRect, rerollRect, titleDiffRect,
  titleStartRect, winEndlessRect, winAgainRect, overRetryRect, inRect,
} from './render.js';
import { Sound } from './audio.js';
import { Input } from './input.js';
import { runAutopilot } from './autopilot.js';
import { stageShot } from './shots.js';
import { TOWERS } from './config.js';

const params = new URLSearchParams(location.search);
const seed = (parseInt(params.get('seed') || '7', 10) || 7) >>> 0;
const shotName = params.get('shot');
const autoMode = params.get('auto') === '1';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const game = new Game(seed, 0);
const sound = new Sound();
const input = new Input(canvas);
const ui = { diffIndex: 0, speed: 1, muted: false, paused: false, hoverX: 0, hoverY: 0, hoverCell: null, hoverTower: null };

try { game.best = parseInt(localStorage.getItem('wickward-best') || '0', 10) || 0; } catch (e) { /* storage unavailable */ }
window.__game = game;

window.addEventListener('error', (e) => {
  const el = document.getElementById('errors');
  if (el) el.textContent += 'ERROR: ' + e.message + ' @ ' + (e.filename || '') + ':' + (e.lineno || '') + '\n';
});

function saveBest() {
  if (game.score > game.best) {
    game.best = game.score;
    try { localStorage.setItem('wickward-best', String(game.best)); } catch (e) { /* ignore */ }
  }
}

function playEvent(ev) {
  switch (ev.type) {
    case 'shoot': sound.shoot(); break;
    case 'sniper': sound.sniper(); break;
    case 'splash': sound.splash(); break;
    case 'chain': sound.chain(); break;
    case 'bell': sound.bell(); break;
    case 'cannon': sound.cannon(); break;
    case 'frost': sound.frost(); break;
    case 'coin': sound.coin(); break;
    case 'leak': sound.leak(); break;
    case 'build': sound.build(); break;
    case 'horn': sound.horn(); break;
    case 'boon': sound.boon(); break;
    case 'win': sound.win(); break;
    case 'lose': sound.lose(); break;
    case 'deny': sound.tone(110, 0.15, 'square', 0.12); break;
    case 'wallbreak': sound.noise(0.2, 0.2, 600); break;
    case 'enrage': sound.tone(90, 0.4, 'sawtooth', 0.2, 50); break;
    default: break;
  }
}

function startGame() {
  game.startGame(ui.diffIndex);
  ui.paused = false;
}

// ---- headless modes -----------------------------------------------------
if (autoMode) {
  game.startGame(0);
  // test hooks (used by the build's balance tests, not by players):
  // ?flame=N overrides starting flame, ?mono=<tower key> forces mono-build,
  // ?nobuild=1 runs with no towers at all (bare-lane baseline)
  const flameParam = parseInt(params.get('flame') || '0', 10);
  if (flameParam > 0) game.flame = flameParam;
  const mono = params.get('mono');
  if (mono) game._autoMono = TOWERS.findIndex((t) => t.key === mono);
  if (params.get('nobuild') === '1') game._autoNoBuild = true;
  const res = runAutopilot(game);
  window.__autoResult = res;
  const el = document.getElementById('auto-result');
  if (el) el.textContent = JSON.stringify(res);
  document.title = 'AUTO ' + (res.won ? 'WIN' : 'LOSS') + ' score=' + res.score + ' night=' + res.night;
  drawGame(ctx, game, ui);
} else if (shotName) {
  sound.muted = true;
  const ok = stageShot(game, shotName, seed);
  drawGame(ctx, game, ui);
  window.__shotReady = !!ok;
  const el = document.getElementById('shot-ready');
  if (el) el.textContent = ok ? 'ready' : 'FAILED';
  document.title = 'SHOT ' + shotName + ' ' + (ok ? 'ready' : 'FAILED');
} else {
  // ---- interactive mode -------------------------------------------------
  let last = performance.now();
  let acc = 0;

  function updateHover(mx, my) {
    ui.hoverX = mx; ui.hoverY = my;
    ui.hoverTower = (game.phase === 'build' || game.phase === 'wave') ? game.towerAt(mx, my) : null;
    if (game.selected >= 0 && (game.phase === 'build' || game.phase === 'wave')) {
      const def = TOWERS[game.selected];
      ui.hoverCell = game.cellAt(mx, my, def.key === 'thorn');
    } else {
      ui.hoverCell = null;
    }
  }

  function handleKey(k) {
    if (k === 'm') { ui.muted = !ui.muted; sound.setMuted(ui.muted); return; }
    if (k === 'f') { ui.speed = ui.speed === 1 ? 2 : 1; return; }
    if (k === 'p') { if (game.phase !== 'title') ui.paused = !ui.paused; return; }
    if (k === 'escape') { game.selected = -1; game.selectedTower = null; return; }
    if (ui.paused) return;
    if (game.phase === 'title') {
      if (k === '1' || k === '2' || k === '3') ui.diffIndex = parseInt(k, 10) - 1;
      if (k === 'enter' || k === ' ') startGame();
      return;
    }
    if (game.phase === 'build' || game.phase === 'wave') {
      if (k >= '1' && k <= '8') {
        const i = parseInt(k, 10) - 1;
        game.selected = game.selected === i ? -1 : i;
        game.selectedTower = null;
        return;
      }
      if (k === 'u' && game.selectedTower) game.upgradeTower(game.selectedTower);
      if (k === 'x' && game.selectedTower) game.sellTower(game.selectedTower);
      if ((k === ' ' || k === 'enter') && game.phase === 'build') game.startNight();
      return;
    }
    if (game.phase === 'boon') {
      if (k === '1' || k === '2' || k === '3') game.chooseBoon(parseInt(k, 10) - 1);
      if (k === 'r') game.rerollBoons();
      return;
    }
    if (game.phase === 'win') {
      if (k === 'enter' || k === ' ') game.enterEndless();
      if (k === 'r') startGame();
      return;
    }
    if (game.phase === 'over') {
      if (k === 'r') startGame();
    }
  }

  function handleClick(x, y) {
    if (ui.paused) { ui.paused = false; return; }
    if (game.phase === 'title') {
      for (let i = 0; i < 3; i++) {
        if (inRect(titleDiffRect(i), x, y)) { ui.diffIndex = i; return; }
      }
      if (inRect(titleStartRect(), x, y)) startGame();
      return;
    }
    if (game.phase === 'build' || game.phase === 'wave') {
      // tower panel buttons first
      const t = game.selectedTower;
      if (t && t._upRect && inRect(t._upRect, x, y)) { game.upgradeTower(t); return; }
      if (t && t._sellRect && inRect(t._sellRect, x, y)) { game.sellTower(t); return; }
      // build cards
      for (let i = 0; i < TOWERS.length; i++) {
        if (inRect(buildCardRect(i), x, y)) {
          game.selected = game.selected === i ? -1 : i;
          game.selectedTower = null;
          return;
        }
      }
      // board
      if (game.selected >= 0) {
        game.buildTower(game.selected, x, y);
        return;
      }
      const hit = game.towerAt(x, y);
      game.selectedTower = hit || null;
      return;
    }
    if (game.phase === 'boon') {
      for (let i = 0; i < game.boons.length; i++) {
        if (inRect(boonCardRect(i), x, y)) { game.chooseBoon(i); return; }
      }
      if (inRect(rerollRect(), x, y)) game.rerollBoons();
      return;
    }
    if (game.phase === 'win') {
      if (inRect(winEndlessRect(), x, y)) game.enterEndless();
      else if (inRect(winAgainRect(), x, y)) startGame();
      return;
    }
    if (game.phase === 'over') {
      if (inRect(overRetryRect(), x, y)) startGame();
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const ev = input.poll();
    for (const k of ev.pressed) { sound.unlock(); handleKey(k); }
    for (const c of ev.clicks) { sound.unlock(); handleClick(c.x, c.y); }
    updateHover(ev.mouseX, ev.mouseY);
    if (!ui.paused) {
      if (game.phase === 'title') {
        game.time += dt; // ambient twinkle + flame flicker behind the title
      } else {
        acc += dt * ui.speed;
        const step = 1 / 60;
        let n = 0;
        while (acc >= step && n < 8) { game.step(step); acc -= step; n += 1; }
        if (n === 8) acc = 0;
      }
    }
    for (const e of game.events) playEvent(e);
    game.events.length = 0;
    if (game.phase === 'win' || game.phase === 'over') saveBest();
    drawGame(ctx, game, ui);
  }

  requestAnimationFrame(frame);
}
