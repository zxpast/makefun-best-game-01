// Ember Tide — tuning and palette. Every number that shapes how the game feels
// lives here, so balancing is one file, not a hunt through the logic.

export const FIELD = { width: 960, height: 600 };

export const PALETTE = {
  skyTop: '#0b1026',
  skyBottom: '#12333d',
  seaLine: '#1d4e5e',
  moon: '#f5e9c8',
  ember: '#ffb347',
  emberHot: '#ff7a3c',
  emberCore: '#fff3c4',
  wisp: '#7a5cff',
  wispDark: '#2a1b4d',
  skiff: '#e8b06a',
  skiffDark: '#8a5a2b',
  lantern: '#ffd97a',
  text: '#f2ead8',
  textDim: '#9fb3c8',
  danger: '#ff5a5a',
  card: '#16233d',
  cardEdge: '#3d5a80',
};

export const PLAYER = {
  radius: 16,
  speed: 250,
  dashSpeed: 640,
  dashTime: 0.18,
  dashCooldown: 1.6,
  catchRadius: 52,
  hearts: 3,
  maxHearts: 5,
  invulnerableTime: 1.4,
};

export const EMBER = {
  score: 10,
  fallMin: 55,
  fallMax: 95,
  sway: 26,
  radius: 9,
};

export const WISP = {
  fallMin: 85,
  fallMax: 150,
  sway: 60,
  radius: 15,
};

export const WAVES = {
  count: 10,
  // Seconds each wave lasts before the blessing choice.
  length: 24,
  // Embers and wisps spawned per second at wave 1, growing per wave.
  emberRate: 1.15,
  emberRatePerWave: 0.16,
  wispRate: 0.42,
  wispRatePerWave: 0.16,
  // A gust of wind every so often pushes everything sideways.
  gustEvery: 9,
  gustStrength: 130,
};

// Blessings offered between waves. Each one is picked at most once per run
// unless it says repeatable.
export const BLESSINGS = [
  {
    id: 'glow',
    name: 'Wide Glow',
    text: 'Your lantern reaches further: +16 catch radius.',
    apply: (p) => { p.catchRadius += 16; },
  },
  {
    id: 'swift',
    name: 'Swift Current',
    text: 'The skiff answers faster: +18% move speed.',
    apply: (p) => { p.speed *= 1.18; },
  },
  {
    id: 'magnet',
    name: 'Ember Magnet',
    text: 'Nearby embers drift toward your lantern.',
    apply: (p) => { p.magnet = (p.magnet || 0) + 130; },
  },
  {
    id: 'hull',
    name: 'Sturdy Hull',
    text: 'Patch the hull: +1 heart, up to 5.',
    apply: (p) => { p.hearts = Math.min(p.maxHearts, p.hearts + 1); },
  },
  {
    id: 'dash',
    name: 'Quick Dash',
    text: 'The dash is ready sooner: -35% cooldown.',
    apply: (p) => { p.dashCooldown *= 0.65; },
  },
  {
    id: 'ward',
    name: 'Ember Ward',
    text: 'Once per wave, a hit costs no heart.',
    apply: (p) => { p.ward = true; },
  },
];
