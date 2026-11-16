// WICKWARD — all tuning in one place: board, towers, enemies, waves, boons,
// difficulties. The one idea: your FLAME is both your health and your money.
// Every tower you build burns a piece of your own flame; every kill feeds
// flame back. Spend too much and the dark takes you.

export const W = 1280;
export const H = 720;
export const HUD_H = 56;
export const BAR_H = 116;
export const FIELD_TOP = HUD_H;
export const FIELD_BOTTOM = H - BAR_H;

// The Last Flame (the keep). Enemies leak here.
export const FLAME_X = 96;
export const FLAME_Y = 330;
export const FLAME_R = 52;
export const LEAK_X = 158; // enemies vanish here and burn your flame

// Three lanes the dark walks down, right to left.
export const LANES = [168, 330, 492];

// Tower plots (off-lane) and lane cells (thorn walls only).
export const PLOT_COLS = [250, 370, 490, 610, 730, 850, 970, 1090];
export const PLOT_ROWS = [102, 240, 420, 558];
export const PLOT_R = 26;

// key, name, cost (flame), range, damage, rate (shots/sec), color, role
// air: 1 = can hit flying Wisp Wasps, 0 = ground only (a near-hard counter:
// a spitter-only army is helpless once wasps arrive)
export const TOWERS = [
  { key: 'spitter', name: 'Ember Spitter', cost: 14, range: 170, dmg: 6, rate: 2.0, air: 0, color: '#ff9a3c', role: 'Ground only' },
  { key: 'sniper', name: 'Cinder Sniper', cost: 28, range: 265, dmg: 26, rate: 0.7, air: 1, color: '#ffd166', role: 'Hits wasps' },
  { key: 'frost', name: 'Frost Wisp', cost: 25, range: 145, dmg: 2, rate: 1.0, air: 1, color: '#7fe7ff', role: 'Slows all' },
  { key: 'brazier', name: 'Splash Brazier', cost: 45, range: 190, dmg: 12, rate: 0.8, splash: 72, air: 0, color: '#ff5d3a', role: 'Ground splash' },
  { key: 'thorn', name: 'Thorn Wall', cost: 20, range: 0, dmg: 0, rate: 0, hp: 240, air: 0, color: '#8fce6e', role: 'Blocks a lane' },
  { key: 'moth', name: 'Glimmer Moth', cost: 42, range: 185, dmg: 9, rate: 1.1, chain: 2, air: 1, color: '#c9a7ff', role: 'Chains ×3' },
  { key: 'bell', name: 'Dawn Bell', cost: 60, range: 165, dmg: 18, rate: 0.5, shock: 1, air: 1, color: '#ffe9a8', role: 'Shockwave' },
  { key: 'cannon', name: 'Moonpetal Cannon', cost: 85, range: 305, dmg: 55, rate: 0.45, air: 1, color: '#e8ecff', role: 'Hits wasps' },
];

export const UPGRADE_COST_MULT = 1.0; // times base cost, times level
export const UPGRADE_DMG_MULT = 1.6;
export const UPGRADE_RANGE_MULT = 1.12;
export const UPGRADE_RATE_MULT = 1.12;
export const MAX_LEVEL = 3;
export const SELL_REFUND = 0.6;

// key, name, hp, speed (px/s), reward (flame), leak (flame lost), radius, color, eye
export const ENEMIES = {
  mite:   { name: 'Murk Mite',    hp: 18,  speed: 56, reward: 2, leak: 2, r: 12, color: '#2a2140', eye: '#b388ff' },
  ant:    { name: 'Shade Ant',    hp: 42,  speed: 38, reward: 2, leak: 3, r: 15, color: '#241d33', eye: '#ff5d7a' },
  beetle: { name: 'Gloom Beetle', hp: 125, speed: 24, reward: 4, leak: 5, r: 19, color: '#1c2438', eye: '#7fe7ff', armor: 2 },
  wasp:   { name: 'Wisp Wasp',    hp: 32,  speed: 72, reward: 3, leak: 3, r: 13, color: '#2b2033', eye: '#ffe066', flying: 1 },
  spider: { name: 'Web Spider',   hp: 58,  speed: 88, reward: 3, leak: 4, r: 14, color: '#201a2e', eye: '#ff9a3c', bursty: 1 },
  moth:   { name: 'Gloom Moth',   hp: 74,  speed: 33, reward: 5, leak: 5, r: 17, color: '#262040', eye: '#c9a7ff', spawns: 'mite' },
};

export const BOSSES = {
  herald: { name: 'Murk Herald', hp: 950,  speed: 20, reward: 45,  leak: 30, r: 34, color: '#160f26', eye: '#ff3b5c', phases: [0.5] },
  king:   { name: 'The Gloam King', hp: 2400, speed: 16, reward: 100, leak: 45, r: 44, color: '#120a20', eye: '#ff2e63', phases: [0.66, 0.33] },
};

export const DIFFS = [
  { key: 'ember',   name: 'Ember',   desc: 'A fair fight',   flame: 130, hpMult: 1.0,  speedMult: 1.0,  rewardMult: 1.0 },
  { key: 'blaze',   name: 'Blaze',   desc: 'The dark hungers', flame: 100, hpMult: 1.25, speedMult: 1.08, rewardMult: 1.0 },
  { key: 'inferno', name: 'Inferno', desc: 'No mercy',       flame: 80,  hpMult: 1.55, speedMult: 1.15, rewardMult: 0.9 },
];

export const NIGHTS = 10;
export const BOSS_NIGHTS = { 5: 'herald', 10: 'king' };

// Boons offered between nights: pick 1 of 3, reroll once per night.
export const BOONS = [
  { key: 'flame30',  name: '+30 Flame',      desc: 'Feed the Last Flame.', apply: (g) => { g.flame += 30; } },
  { key: 'dmg20',    name: 'Burn Brighter',  desc: 'Towers deal +20% damage.', apply: (g) => { g.bonus.dmg *= 1.2; } },
  { key: 'range12',  name: 'Far Sight',      desc: 'Towers reach +12% further.', apply: (g) => { g.bonus.range *= 1.12; } },
  { key: 'rate15',   name: 'Quick Hands',    desc: 'Towers fire +15% faster.', apply: (g) => { g.bonus.rate *= 1.15; } },
  { key: 'reward1',  name: 'Rich Embers',    desc: 'Every kill feeds +1 flame.', apply: (g) => { g.bonus.reward += 1; } },
  { key: 'cheap15',  name: 'Thrifty Wick',   desc: 'Towers cost 15% less flame.', apply: (g) => { g.bonus.cost *= 0.85; } },
  { key: 'thorn150', name: 'Iron Thorns',    desc: 'Thorn Walls gain +150 health.', apply: (g) => { g.bonus.thornHp += 150; } },
  { key: 'chill15',  name: 'Deep Frost',     desc: 'Slows bite 15% harder.', apply: (g) => { g.bonus.slow += 0.15; } },
  { key: 'splash20', name: 'Wide Brazier',   desc: 'Splash radius +20%.', apply: (g) => { g.bonus.splash *= 1.2; } },
  { key: 'flame20',  name: '+20 Flame',      desc: 'A small mercy.', apply: (g) => { g.flame += 20; } },
];

// Wave composition for a night: returns [{kind, at}] spawn events (seconds).
// Waves are RECIPES (a mix of archetypes), not a hit-point total: the mix is
// what forces a wider build. Nights 1-3 teach; each later night has a named
// character. Spawns come in sub-groups with a breath between them — pressure,
// then relief, then pressure again.
const RECIPES = {
  1: { mite: 10, ant: 3 },
  2: { mite: 8, ant: 10 },
  3: { mite: 8, ant: 10, beetle: 5 },
  4: { mite: 10, ant: 8, beetle: 4, wasp: 8 },               // wasps arrive
  5: { mite: 4, ant: 4, beetle: 2, wasp: 3, spider: 3 },     // + Murk Herald
  6: { mite: 8, ant: 8, beetle: 6, wasp: 6, spider: 6, moth: 6 }, // moth swarm
  7: { mite: 6, ant: 6, beetle: 6, wasp: 10, spider: 10, moth: 4 }, // spider rush
  8: { mite: 6, ant: 8, beetle: 12, wasp: 8, spider: 6, moth: 6 }, // beetle wall
  9: { mite: 10, ant: 10, beetle: 8, wasp: 10, spider: 8, moth: 8 }, // the dark masses
  10: { mite: 6, ant: 6, beetle: 4, wasp: 4, spider: 3, moth: 3 },  // + Gloam King
};

export function waveComp(night, rng) {
  const list = [];
  const isBoss = !!BOSS_NIGHTS[night];
  const recipe = RECIPES[Math.min(night, 10)] || RECIPES[10];
  const kinds = [];
  for (const [kind, n] of Object.entries(recipe)) {
    for (let i = 0; i < n; i++) kinds.push(kind);
  }
  // shuffle the recipe (rng) so the order varies, then breathe: a 2.2s gap
  // after each third of the wave
  const shuffled = rng.shuffle(kinds);
  const interval = Math.max(0.42, 0.95 - night * 0.05);
  const third = Math.max(1, Math.floor(shuffled.length / 3));
  let t = 0.5;
  shuffled.forEach((kind, i) => {
    if (i > 0 && i % third === 0) t += 2.2; // the wave breathes
    list.push({ kind, at: t });
    t += interval * rng.range(0.7, 1.3);
  });
  if (isBoss) list.push({ kind: BOSS_NIGHTS[night], at: Math.max(6, t * 0.45), boss: true });
  return list;
}

export function enemyStats(kind, night, diff) {
  const base = ENEMIES[kind] || BOSSES[kind];
  // linear early, quadratic late: the last nights must bite even a full board
  const hpScale = 1 + 0.13 * (night - 1) + 0.012 * (night - 1) * (night - 1);
  return {
    kind,
    name: base.name,
    hp: Math.round(base.hp * hpScale * diff.hpMult),
    speed: base.speed * (1 + 0.03 * (night - 1)) * diff.speedMult,
    reward: Math.max(1, Math.round(base.reward * diff.rewardMult)),
    // wasps grow hungrier as the nights deepen: a wasp that slips past late
    // burns far more flame than one that slips past early
    leak: kind === 'wasp' ? 3 + Math.floor(night / 2) : base.leak,
    r: base.r,
    color: base.color,
    eye: base.eye,
    armor: base.armor || 0,
    flying: !!base.flying,
    bursty: !!base.bursty,
    spawns: base.spawns || null,
    boss: !!BOSSES[kind],
    phases: (base.phases || []).slice(),
  };
}
