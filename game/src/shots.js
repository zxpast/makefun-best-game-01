// WICKWARD — staged screenshots. Each shot plays the REAL simulation with a
// fixed seed and stops at a chosen moment, so every screenshot is an honest
// render of the game's own code, never composited.
import { Game } from './world.js';
import { runAutopilot, driveUntil } from './autopilot.js';
import { TOWERS } from './config.js';

function demoBackdrop(g) {
  // A few towers and foes on the field behind the title screen, visual only.
  const spots = [
    [0, 610, 240], [1, 730, 420], [2, 490, 240], [3, 850, 420],
    [5, 370, 240], [6, 970, 240], [0, 610, 102], [3, 730, 102],
  ];
  for (const [ti, x, y] of spots) {
    const def = TOWERS[ti];
    g.towers.push({
      def, type: def.key, x, y, lane: -1, level: 1, cd: 0, invested: def.cost,
      hp: 0, maxHp: 0, angle: -Math.PI / 2, flash: 0, auraT: 0,
    });
  }
}

export function stageShot(g, name, seed) {
  if (name === 'title') {
    g.phase = 'title';
    demoBackdrop(g);
    return true;
  }
  // play / boss / win: drive the autopilot, trying a few seeds until the
  // staged moment is actually reached (a lost game has no win screen).
  const seeds = [seed, seed + 1, seed + 2, seed + 3, seed + 4];
  for (const s of seeds) {
    const run = new Game(s, 0);
    run.startGame(0);
    let ok = false;
    if (name === 'play') {
      ok = driveUntil(run, (x) => x.phase === 'wave' && x.night >= 8 && x.enemies.filter((e) => e.x < 1050).length >= 6 && x.towers.length >= 10);
    } else if (name === 'boss') {
      ok = driveUntil(run, (x) => x.boss && x.boss.x < 1000 && x.boss.hp < x.boss.maxHp * 0.85 && x.enemies.length >= 3);
    } else if (name === 'win') {
      const res = runAutopilot(run);
      ok = res.won;
    }
    if (ok) {
      // copy the staged state into g (same object identity the shell holds)
      for (const k of Object.keys(run)) g[k] = run[k];
      return true;
    }
  }
  return false;
}
