// Ember Tide — everything the player sees. One function per picture: the sea,
// the things in it, the HUD, and each screen. Drawing reads only the world
// and a small ui object, so a screenshot is just one render call.

import { FIELD, PALETTE, WAVES } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_WIN = 'win';
export const SCREEN_OVER = 'over';
export const SCREEN_PAUSE = 'pause';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function glowCircle(ctx, x, y, radius, color, alpha) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawBackground(ctx, world) {
  const gradient = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  gradient.addColorStop(0, PALETTE.skyTop);
  gradient.addColorStop(0.55, '#0e2233');
  gradient.addColorStop(1, PALETTE.skyBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);

  // Stars twinkle on the world's own clock, so a staged frame is stable.
  for (const star of world.stars) {
    const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(world.time * 1.4 + star.phase));
    ctx.globalAlpha = twinkle;
    ctx.fillStyle = '#dfe9ff';
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Moon, upper right but below the score readout, with a soft halo.
  glowCircle(ctx, FIELD.width - 80, 150, 90, '#f5e9c8', 0.16);
  ctx.fillStyle = PALETTE.moon;
  ctx.beginPath();
  ctx.arc(FIELD.width - 80, 150, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,160,110,0.5)';
  ctx.beginPath();
  ctx.arc(FIELD.width - 90, 142, 7, 0, Math.PI * 2);
  ctx.arc(FIELD.width - 70, 160, 5, 0, Math.PI * 2);
  ctx.fill();

  // Slow sea lines drifting across the lower half.
  ctx.strokeStyle = PALETTE.seaLine;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 2;
  for (let row = 0; row < 5; row += 1) {
    const y = 330 + row * 52;
    ctx.beginPath();
    for (let x = 0; x <= FIELD.width; x += 24) {
      const wave = Math.sin(x * 0.012 + world.time * 0.9 + row * 1.7) * 7;
      if (x === 0) ctx.moveTo(x, y + wave);
      else ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawEmbers(ctx, world) {
  for (const ember of world.embers) {
    const bob = Math.sin(world.time * 3 + ember.swayPhase) * 2;
    glowCircle(ctx, ember.x, ember.y + bob, 26, PALETTE.ember, 0.5);
    ctx.fillStyle = PALETTE.emberHot;
    ctx.beginPath();
    ctx.arc(ember.x, ember.y + bob, ember.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.emberCore;
    ctx.beginPath();
    ctx.arc(ember.x - 2, ember.y + bob - 2, ember.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWisps(ctx, world) {
  for (const wisp of world.wisps) {
    const wobble = Math.sin(world.time * 4 + wisp.swayPhase) * 3;
    glowCircle(ctx, wisp.x, wisp.y, 34, PALETTE.wisp, 0.35);
    ctx.fillStyle = PALETTE.wispDark;
    ctx.beginPath();
    ctx.ellipse(wisp.x, wisp.y + wobble, wisp.radius + 3, wisp.radius - 1, 0, 0, Math.PI * 2);
    ctx.fill();
    // Two pale eyes give the wisp a face.
    ctx.fillStyle = '#c9b8ff';
    ctx.beginPath();
    ctx.arc(wisp.x - 5, wisp.y + wobble - 3, 2.4, 0, Math.PI * 2);
    ctx.arc(wisp.x + 5, wisp.y + wobble - 3, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer(ctx, world) {
  const p = world.player;
  const blink = p.invulnerableLeft > 0 && Math.floor(world.time * 12) % 2 === 0;
  if (blink) ctx.globalAlpha = 0.35;

  // Lantern glow: the catch radius, drawn faintly so the player can feel it.
  glowCircle(ctx, p.x, p.y, p.catchRadius, PALETTE.lantern, 0.2);
  glowCircle(ctx, p.x, p.y - 6, 30, PALETTE.lantern, 0.55);

  // Wake.
  ctx.strokeStyle = 'rgba(159,216,255,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x - 14, p.y + 12);
  ctx.quadraticCurveTo(p.x - 24 - p.vx * 0.03, p.y + 20, p.x - 30 - p.vx * 0.05, p.y + 16);
  ctx.moveTo(p.x + 14, p.y + 12);
  ctx.quadraticCurveTo(p.x + 24 - p.vx * 0.03, p.y + 20, p.x + 30 - p.vx * 0.05, p.y + 16);
  ctx.stroke();

  // Hull: a little skiff, leaning into its motion.
  const lean = Math.max(-0.18, Math.min(0.18, p.vx * 0.0006));
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(lean);
  ctx.fillStyle = PALETTE.skiffDark;
  ctx.beginPath();
  ctx.moveTo(-18, 2);
  ctx.quadraticCurveTo(0, 16, 18, 2);
  ctx.lineTo(12, 8);
  ctx.lineTo(-12, 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.skiff;
  ctx.fillRect(-14, 0, 28, 4);
  // Mast and lantern.
  ctx.strokeStyle = '#6b4423';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -26);
  ctx.stroke();
  ctx.fillStyle = PALETTE.lantern;
  ctx.beginPath();
  ctx.arc(0, -30, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawParticles(ctx, world) {
  for (const part of world.particles) {
    ctx.globalAlpha = Math.max(0, part.life / part.maxLife);
    ctx.fillStyle = part.color;
    ctx.beginPath();
    ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTexts(ctx, world) {
  ctx.textAlign = 'center';
  ctx.font = 'bold 16px Georgia, serif';
  for (const text of world.texts) {
    ctx.globalAlpha = Math.max(0, text.life / 0.9);
    ctx.fillStyle = text.color;
    ctx.fillText(text.text, text.x, text.y);
  }
  ctx.globalAlpha = 1;
}

function drawHeart(ctx, x, y, filled) {
  ctx.fillStyle = filled ? '#ff6b6b' : 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.moveTo(x, y + 5);
  ctx.bezierCurveTo(x - 9, y - 3, x - 5, y - 10, x, y - 4);
  ctx.bezierCurveTo(x + 5, y - 10, x + 9, y - 3, x, y + 5);
  ctx.fill();
}

function drawHud(ctx, world, ui) {
  // Hearts, top left.
  for (let i = 0; i < world.player.maxHearts; i += 1) {
    drawHeart(ctx, 28 + i * 26, 30, i < world.player.hearts);
  }
  // Wave and its progress, top centre.
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillText(`Wave ${Math.min(world.wave, WAVES.count)} / ${WAVES.count}`, FIELD.width / 2, 32);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundRect(ctx, FIELD.width / 2 - 90, 42, 180, 6, 3);
  ctx.fill();
  ctx.fillStyle = PALETTE.ember;
  roundRect(ctx, FIELD.width / 2 - 90, 42, 180 * (world.waveTime / WAVES.length), 6, 3);
  ctx.fill();
  // Score and combo, top right.
  ctx.textAlign = 'right';
  ctx.font = 'bold 22px Georgia, serif';
  ctx.fillText(`${world.score}`, FIELD.width - 24, 32);
  if (world.combo >= 2) {
    ctx.fillStyle = PALETTE.ember;
    ctx.font = 'bold 15px Georgia, serif';
    ctx.fillText(`x${(1 + (world.combo - 1) * 0.1).toFixed(1)}  combo ${world.combo}`, FIELD.width - 24, 54);
  }
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '13px Georgia, serif';
  ctx.fillText('M mute', FIELD.width - 24, FIELD.height - 14);
  // Dash readiness, under the skiff.
  const p = world.player;
  const ready = p.dashLeft <= 0;
  ctx.textAlign = 'center';
  ctx.fillStyle = ready ? '#9fd8ff' : 'rgba(159,216,255,0.35)';
  ctx.font = '12px Georgia, serif';
  ctx.fillText(ready ? 'SPACE — dash ready' : 'dash…', p.x, p.y + 34);
  // Banner text (wave intro, gust warning).
  if (ui.banner && ui.bannerLeft > 0) {
    ctx.globalAlpha = Math.min(1, ui.bannerLeft * 2);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 34px Georgia, serif';
    ctx.fillText(ui.banner, FIELD.width / 2, 150);
    ctx.globalAlpha = 1;
  }
  if (world.flash > 0) {
    ctx.fillStyle = `rgba(255,60,60,${world.flash * 0.22})`;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }
}

function drawTitle(ctx, world, ui) {
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 64px Georgia, serif';
  ctx.fillText('EMBER TIDE', FIELD.width / 2, 190);
  ctx.fillStyle = PALETTE.ember;
  ctx.font = 'italic 22px Georgia, serif';
  ctx.fillText('Lantern of the Last Light', FIELD.width / 2, 228);
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '17px Georgia, serif';
  ctx.fillText('Catch the falling embers. Dodge the ash-wisps.', FIELD.width / 2, 280);
  ctx.fillText('Survive all 10 waves until dawn — and keep the light alive.', FIELD.width / 2, 306);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 17px Georgia, serif';
  ctx.fillText('WASD / arrows — sail    SPACE — dash    P — pause', FIELD.width / 2, 360);
  ctx.fillText('Between waves, pick a blessing: keys 1, 2, 3 or click', FIELD.width / 2, 386);
  ctx.fillStyle = PALETTE.ember;
  ctx.font = 'bold 22px Georgia, serif';
  ctx.fillText(ui.blink ? '— press ENTER or click to begin —' : '', FIELD.width / 2, 448);
  if (ui.best > 0) {
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '15px Georgia, serif';
    ctx.fillText(`Best score: ${ui.best}`, FIELD.width / 2, 490);
  }
}

function cardRect(index) {
  const width = 250;
  const gap = 24;
  const total = width * 3 + gap * 2;
  const x = (FIELD.width - total) / 2 + index * (width + gap);
  return { x, y: 210, width, height: 190 };
}

function drawUpgrade(ctx, world, ui) {
  ctx.fillStyle = 'rgba(5,8,20,0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 34px Georgia, serif';
  ctx.fillText(`Wave ${world.wave} clear — choose a blessing`, FIELD.width / 2, 150);
  ctx.font = '15px Georgia, serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText('The tide rests a moment. One blessing carries into the next wave.', FIELD.width / 2, 178);
  world.blessings.forEach((blessing, index) => {
    const rect = cardRect(index);
    const hover = ui.mouse.x >= rect.x && ui.mouse.x <= rect.x + rect.width
      && ui.mouse.y >= rect.y && ui.mouse.y <= rect.y + rect.height;
    ctx.fillStyle = hover ? '#1d2f52' : PALETTE.card;
    roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 12);
    ctx.fill();
    ctx.strokeStyle = hover ? PALETTE.ember : PALETTE.cardEdge;
    ctx.lineWidth = hover ? 3 : 2;
    ctx.stroke();
    ctx.fillStyle = PALETTE.ember;
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillText(`${index + 1}`, rect.x + rect.width / 2, rect.y + 36);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 19px Georgia, serif';
    ctx.fillText(blessing.name, rect.x + rect.width / 2, rect.y + 72);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '15px Georgia, serif';
    wrapText(ctx, blessing.text, rect.x + rect.width / 2, rect.y + 104, rect.width - 36, 22);
  });
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let lineY = y;
  for (const word of words) {
    const test = line === '' ? word : `${line} ${word}`;
    if (ctx.measureText(test).width > maxWidth && line !== '') {
      ctx.fillText(line, x, lineY);
      line = word;
      lineY += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, lineY);
}

function drawEnd(ctx, world, ui, won) {
  ctx.fillStyle = won ? 'rgba(10,26,18,0.6)' : 'rgba(20,5,12,0.6)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? '#ffe9a8' : PALETTE.text;
  ctx.font = 'bold 52px Georgia, serif';
  ctx.fillText(won ? 'DAWN BREAKS' : 'THE LIGHT FADES', FIELD.width / 2, 210);
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = 'italic 20px Georgia, serif';
  ctx.fillText(
    won ? 'Ten waves weathered — the ember tide is over, and morning comes.'
      : 'The wisps take the last ember. The tide keeps your score, though.',
    FIELD.width / 2, 250,
  );
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 22px Georgia, serif';
  ctx.fillText(`Score  ${world.score}`, FIELD.width / 2, 320);
  ctx.font = '17px Georgia, serif';
  ctx.fillText(`Embers caught  ${world.caught}      Best combo  ${world.bestCombo}      Wave reached  ${world.wave}`, FIELD.width / 2, 352);
  if (world.score > ui.best && world.score > 0) {
    ctx.fillStyle = PALETTE.ember;
    ctx.font = 'bold 17px Georgia, serif';
    ctx.fillText('A new best score!', FIELD.width / 2, 384);
  }
  ctx.fillStyle = PALETTE.ember;
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillText(ui.blink ? '— press R or ENTER to sail again —' : '', FIELD.width / 2, 440);
}

function drawPause(ctx) {
  ctx.fillStyle = 'rgba(5,8,20,0.6)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 40px Georgia, serif';
  ctx.fillText('Becalmed', FIELD.width / 2, 280);
  ctx.font = '17px Georgia, serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText('Press P to sail on', FIELD.width / 2, 316);
}

// Draw one frame. `screen` picks the overlay; the sea and its creatures are
// always drawn underneath so every screen still shows the game.
export function render(ctx, world, screen, ui) {
  ctx.save();
  if (world.shake > 0) {
    const amount = world.shake * 7;
    ctx.translate((Math.random() - 0.5) * amount, (Math.random() - 0.5) * amount);
  }
  drawBackground(ctx, world);
  drawEmbers(ctx, world);
  drawWisps(ctx, world);
  drawPlayer(ctx, world);
  drawParticles(ctx, world);
  drawTexts(ctx, world);
  ctx.restore();

  if (screen === SCREEN_TITLE) {
    drawTitle(ctx, world, ui);
  } else if (screen === SCREEN_UPGRADE) {
    drawHud(ctx, world, ui);
    drawUpgrade(ctx, world, ui);
  } else if (screen === SCREEN_WIN) {
    drawEnd(ctx, world, ui, true);
  } else if (screen === SCREEN_OVER) {
    drawEnd(ctx, world, ui, false);
  } else if (screen === SCREEN_PAUSE) {
    drawHud(ctx, world, ui);
    drawPause(ctx);
  } else {
    drawHud(ctx, world, ui);
  }
}

export { cardRect };
