// Ember Tide — boot and the frame loop. Owns the screen state machine (title,
// play, blessing choice, win, game over, pause) and hands each frame to the
// renderer. In shot mode (?shot=title|play|upgrade|win|over&seed=N) it stages
// one deterministic frame and stops, so screenshots are reproducible.

import { FIELD, WAVES } from './config.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import { World, EVENT_WAVE_CLEAR, EVENT_OVER, EVENT_WIN, STEP } from './world.js';
import {
  render,
  cardRect,
  SCREEN_TITLE,
  SCREEN_PLAY,
  SCREEN_UPGRADE,
  SCREEN_WIN,
  SCREEN_OVER,
  SCREEN_PAUSE,
} from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = new Input();
const sound = new Sound();
input.attach(canvas);
input.onFirstGesture = () => sound.unlock();

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number.parseInt(params.get('seed') || '20261116', 10) || 20261116;

const world = new World(seed);
let screen = SCREEN_TITLE;
let previousScreen = SCREEN_PLAY;
let best = 0;
try {
  best = Number.parseInt(window.localStorage.getItem('ember-tide-best') || '0', 10) || 0;
} catch (error) {
  best = 0;
}

const ui = {
  banner: '',
  bannerLeft: 0,
  blink: true,
  best,
  mouse: input.mouse,
};

function saveBest() {
  if (world.score <= best) return;
  best = world.score;
  ui.best = best;
  try {
    window.localStorage.setItem('ember-tide-best', String(best));
  } catch (error) {
    // A browser that blocks storage still plays fine.
  }
}

function startGame() {
  world.reset();
  screen = SCREEN_PLAY;
  ui.banner = 'Wave 1 — catch the embers!';
  ui.bannerLeft = 2.4;
  sound.waveHorn();
}

function chooseBlessing(index) {
  const blessing = world.blessings[index];
  if (!blessing) return;
  world.takeBlessing(blessing);
  sound.blessing();
  screen = SCREEN_PLAY;
  ui.banner = `Wave ${world.wave} — the tide quickens`;
  ui.bannerLeft = 2.2;
}

function endRun(won) {
  saveBest();
  screen = won ? SCREEN_WIN : SCREEN_OVER;
  if (won) sound.win();
  else sound.gameOver();
}

function update(dt) {
  ui.blink = Math.floor(world.time * 1.6) % 2 === 0;
  ui.bannerLeft = Math.max(0, ui.bannerLeft - dt);

  if (input.wasPressed('KeyM')) sound.toggleMute();

  if (screen === SCREEN_TITLE) {
    world.step(dt, { x: 0, y: 0 }, false, null);
    if (input.wasPressed('Enter', 'Space') || input.wasClicked()) startGame();
    return;
  }

  if (screen === SCREEN_PAUSE) {
    if (input.wasPressed('KeyP', 'Escape') || input.wasClicked()) screen = previousScreen;
    return;
  }

  if (screen === SCREEN_UPGRADE) {
    if (input.wasPressed('Digit1', 'Numpad1')) chooseBlessing(0);
    else if (input.wasPressed('Digit2', 'Numpad2')) chooseBlessing(1);
    else if (input.wasPressed('Digit3', 'Numpad3')) chooseBlessing(2);
    else if (input.wasClicked()) {
      for (let i = 0; i < 3; i += 1) {
        const rect = cardRect(i);
        if (input.mouse.x >= rect.x && input.mouse.x <= rect.x + rect.width
          && input.mouse.y >= rect.y && input.mouse.y <= rect.y + rect.height) {
          chooseBlessing(i);
          break;
        }
      }
    }
    return;
  }

  if (screen === SCREEN_WIN || screen === SCREEN_OVER) {
    if (input.wasPressed('KeyR', 'Enter', 'Space') || input.wasClicked()) startGame();
    return;
  }

  // Playing.
  if (input.wasPressed('KeyP', 'Escape')) {
    previousScreen = SCREEN_PLAY;
    screen = SCREEN_PAUSE;
    return;
  }
  const move = input.moveVector();
  const dash = input.wasPressed('Space', 'ShiftLeft', 'ShiftRight');
  const event = world.step(dt, move, dash, sound);
  if (event & EVENT_WAVE_CLEAR) {
    screen = SCREEN_UPGRADE;
  } else if (event & EVENT_WIN) {
    endRun(true);
  } else if (event & EVENT_OVER) {
    endRun(false);
  }
}

function frame(now) {
  const dt = Math.min(0.05, (now - frame.last) / 1000 || STEP);
  frame.last = now;
  update(dt);
  render(ctx, world, screen, ui);
  input.endFrame();
  if (!shotName) requestAnimationFrame(frame);
}
frame.last = 0;

if (shotName) {
  // One staged frame, then stop: the screenshot tool reads this frame.
  const staged = stageShot(shotName, world);
  screen = staged.screen;
  ui.banner = '';
  ui.bannerLeft = 0;
  ui.blink = true;
  render(ctx, world, screen, ui);
  document.title = `Ember Tide — ${shotName}`;
  window.__shotReady = true;
} else {
  window.__shotReady = false;
  requestAnimationFrame(frame);
}
