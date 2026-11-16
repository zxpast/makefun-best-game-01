// WebAudio synth for WICKWARD: no audio files, everything is oscillators and
// filtered noise. Safe to construct before any user gesture; it stays silent
// until unlock() runs on the first input, and headless runs never unlock it.
export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.drone = null;
  }

  unlock() {
    if (this.ctx || this.muted) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.32;
      this.master.connect(this.ctx.destination);
      this.startDrone();
    } catch (e) { this.ctx = null; }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.32;
  }

  startDrone() {
    // A low night drone: two detuned sines through a slow-breathing gain.
    const c = this.ctx;
    const g = c.createGain(); g.gain.value = 0.05; g.connect(this.master);
    const o1 = c.createOscillator(); o1.type = 'sine'; o1.frequency.value = 55;
    const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = 55.7;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.07;
    const lg = c.createGain(); lg.gain.value = 0.02;
    lfo.connect(lg); lg.connect(g.gain);
    o1.connect(g); o2.connect(g);
    o1.start(); o2.start(); lfo.start();
    this.drone = g;
  }

  tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  noise(dur, vol, cutoff) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx, t = c.currentTime;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff || 1200;
    const g = c.createGain(); g.gain.value = vol || 0.2;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  }

  shoot() { this.tone(880 + Math.random() * 120, 0.07, 'triangle', 0.10, 420); }
  sniper() { this.tone(300, 0.14, 'square', 0.12, 90); }
  splash() { this.noise(0.18, 0.16, 900); this.tone(180, 0.16, 'sine', 0.14, 60); }
  chain() { this.tone(1240, 0.08, 'sine', 0.10, 1900); }
  bell() { this.tone(523, 0.5, 'sine', 0.16, 520); this.tone(784, 0.4, 'sine', 0.08, 780); }
  cannon() { this.noise(0.25, 0.2, 500); this.tone(120, 0.25, 'sine', 0.2, 40); }
  frost() { this.tone(1560, 0.12, 'sine', 0.06, 2100); }
  coin() { this.tone(1320, 0.09, 'sine', 0.10); setTimeout(() => this.tone(1760, 0.12, 'sine', 0.08), 60); }
  leak() { this.tone(140, 0.3, 'sawtooth', 0.2, 55); this.noise(0.2, 0.14, 400); }
  build() { this.tone(440, 0.1, 'triangle', 0.14, 660); this.tone(660, 0.12, 'triangle', 0.1, 880); }
  horn() { this.tone(196, 0.5, 'sawtooth', 0.14, 196); this.tone(294, 0.5, 'sawtooth', 0.08, 294); }
  boon() { [523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 'triangle', 0.12), i * 90)); }
  win() { [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 'triangle', 0.14), i * 130)); }
  lose() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, 'sawtooth', 0.1), i * 170)); }
}
