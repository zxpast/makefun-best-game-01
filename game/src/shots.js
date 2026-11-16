// Screenshot staging: each named scene plays the real rules forward from a
// fresh world for a fixed stretch, steered by a simple autopilot, so the frame
// is what a short game really looks like and the same seed always gives the
// same frame. No state is faked: the win scene really survives ten waves.

import { FIELD } from './config.js';
import { STEP, EVENT_WAVE_CLEAR, EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_WIN } from './render.js';

const TITLE_SECONDS = 6;
const MAX_SECONDS = 400;

// Steer the skiff: flee a wisp that is close above, else chase the nearest
// ember, leading it slightly. Returns {x, y, dash}.
function autopilot(world) {
  const p = world.player;
  let threat = null;
  let threatDist = Infinity;
  for (const wisp of world.wisps) {
    if (wisp.y > p.y || p.y - wisp.y > 190) continue;
    const dist = Math.hypot(wisp.x - p.x, wisp.y - p.y);
    if (dist < threatDist) {
      threatDist = dist;
      threat = wisp;
    }
  }
  let move = { x: 0, y: 0 };
  let dash = false;
  if (threat && threatDist < 130) {
    const away = p.x < threat.x ? -1 : 1;
    move = { x: away, y: 0.4 };
    if (threatDist < 62 && p.dashLeft <= 0) dash = true;
  } else {
    let target = null;
    let targetDist = Infinity;
    for (const ember of world.embers) {
      if (ember.y > p.y + 30) continue;
      const dist = Math.hypot(ember.x - p.x, ember.y - p.y);
      if (dist < targetDist) {
        targetDist = dist;
        target = ember;
      }
    }
    if (target) {
      const lead = Math.max(0, (p.y - target.y) / target.speed) * 12;
      const dx = target.x + lead - p.x;
      const dy = target.y - 8 - p.y;
      const length = Math.hypot(dx, dy) || 1;
      move = { x: dx / length, y: dy / length };
    } else {
      move = { x: (FIELD.width / 2 - p.x) / 200, y: 0 };
      const length = Math.hypot(move.x, move.y) || 1;
      move = { x: move.x / length, y: 0 };
    }
  }
  return { ...move, dash };
}

// A careless pilot for the game-over scene: it drifts toward embers and never
// dodges, so the wisps catch it as a hurried player would be caught.
function carelessPilot(world) {
  const p = world.player;
  let target = null;
  let targetDist = Infinity;
  for (const ember of world.embers) {
    const dist = Math.hypot(ember.x - p.x, ember.y - p.y);
    if (dist < targetDist) {
      targetDist = dist;
      target = ember;
    }
  }
  if (!target) return { x: 0, y: 0, dash: false };
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length, dash: false };
}

// Run the world forward with `pilot` until `stop` says the scene is ready.
// With autoBlessing, wave clears take the first blessing on offer and play
// continues; without it, the run stops at the clear so the caller can show
// the choice itself.
function runForward(world, pilot, stop, autoBlessing) {
  let event = 0;
  for (let step = 0; step < MAX_SECONDS / STEP; step += 1) {
    const move = pilot(world);
    event = world.step(STEP, { x: move.x, y: move.y }, move.dash, null);
    if ((event & EVENT_WAVE_CLEAR) !== 0 && autoBlessing) {
      world.takeBlessing(world.blessings[0]);
    }
    if (stop(event, world)) return event;
  }
  return event;
}

// Set `world` to the named scene and return the screen to draw over it.
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    // Mid-wave 2: the field is busier than wave 1 and the score has grown.
    runForward(world, autopilot, (_event, w) => w.wave >= 2 && w.waveTime >= 8, true);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'upgrade') {
    const event = runForward(world, autopilot, (event) => (event & EVENT_WAVE_CLEAR) !== 0, false);
    if (event & EVENT_WAVE_CLEAR) return { screen: SCREEN_UPGRADE };
    return { screen: SCREEN_PLAY };
  }
  if (name === 'win') {
    const event = runForward(world, autopilot, (event) => (event & (EVENT_WIN | EVENT_OVER)) !== 0, true);
    if (event & EVENT_WIN) return { screen: SCREEN_WIN };
    return { screen: SCREEN_OVER };
  }
  if (name === 'over') {
    runForward(world, carelessPilot, (event) => (event & EVENT_OVER) !== 0, false);
    return { screen: SCREEN_OVER };
  }
  runForward(world, autopilot, (_event, w) => w.time >= TITLE_SECONDS, true);
  return { screen: SCREEN_TITLE };
}
