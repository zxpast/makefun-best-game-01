// All sound is synthesised with plain WebAudio oscillators — no audio files,
// no network. Every effect is a short envelope so the mix stays light, and
// everything is guarded: if the browser has no audio, the game just stays
// silent instead of throwing.

export class Sound {
  constructor() {
    this.context = null;
    this.master = null;
    this.muted = false;
  }

  // Browsers only allow audio after a user gesture; call this from one.
  unlock() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      return;
    }
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      this.context = new Ctor();
      this.master = this.context.createGain();
      this.master.gain.value = 0.16;
      this.master.connect(this.context.destination);
    } catch (error) {
      this.context = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.16;
    return this.muted;
  }

  tone(freqFrom, freqTo, seconds, type, volume) {
    if (!this.context || this.muted) return;
    try {
      const now = this.context.currentTime;
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqFrom, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), now + seconds);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(now);
      osc.stop(now + seconds + 0.02);
    } catch (error) {
      // Silence is always acceptable; never break the game for a sound.
    }
  }

  // Higher combo, higher chime: the pitch climbs with the streak.
  pickup(combo) {
    const base = 520 + Math.min(combo, 24) * 22;
    this.tone(base, base * 1.6, 0.12, 'sine', 0.5);
    this.tone(base * 2, base * 2.4, 0.08, 'triangle', 0.18);
  }

  hit() {
    this.tone(180, 55, 0.28, 'sawtooth', 0.5);
    this.tone(90, 40, 0.32, 'square', 0.3);
  }

  dash() {
    this.tone(320, 900, 0.16, 'sine', 0.28);
  }

  waveHorn() {
    this.tone(392, 392, 0.22, 'triangle', 0.35);
    this.tone(523, 523, 0.3, 'triangle', 0.3);
  }

  blessing() {
    this.tone(523, 523, 0.1, 'sine', 0.3);
    this.tone(659, 659, 0.1, 'sine', 0.3);
    this.tone(784, 784, 0.22, 'sine', 0.32);
  }

  win() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, index) => {
      setTimeout(() => this.tone(freq, freq, 0.3, 'triangle', 0.32), index * 130);
    });
  }

  gameOver() {
    this.tone(330, 110, 0.7, 'sawtooth', 0.3);
  }
}
