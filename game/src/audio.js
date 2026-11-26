// Sound, synthesized live with WebAudio — no audio files, no network.
// An engine hum that follows the throttle, a chime for a ring, a little fanfare
// for a delivery, and a thud for a crash. Silent until the player first touches
// a control, so the page never needs permission up front.
export function createAudio() {
  let ctx = null;
  let engine = null;
  let engineGain = null;
  let windGain = null;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      engine = ctx.createOscillator();
      engine.type = 'sawtooth';
      engine.frequency.value = 70;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engine.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engine.start();
      // Wind: looped noise through a bandpass, gain follows speed.
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      noise.loop = true;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 900;
      windGain = ctx.createGain();
      windGain.gain.value = 0;
      noise.connect(band);
      band.connect(windGain);
      windGain.connect(ctx.destination);
      noise.start();
      return true;
    } catch {
      return false;
    }
  }

  function blip(freq, when, dur, vol, type = 'sine') {
    if (!ctx) return;
    try {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, ctx.currentTime + when);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(ctx.currentTime + when);
      o.stop(ctx.currentTime + when + dur + 0.05);
    } catch {
      // Sound is garnish; a failure never stops the game.
    }
  }

  return {
    unlock() {
      if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    engine(throttle, speed, on) {
      if (!ctx || !engineGain) return;
      try {
        engine.frequency.value = 55 + throttle * 55 + speed * 0.35;
        engineGain.gain.value = on ? 0.02 + throttle * 0.05 : 0;
        windGain.gain.value = on ? Math.min(0.05, speed * 0.0006) : 0;
      } catch {
        // ignore
      }
    },
    ring(centre) {
      blip(880, 0, 0.14, 0.16);
      blip(centre ? 1318 : 1174, 0.09, 0.22, 0.16);
    },
    land() {
      [523, 659, 784, 1046].forEach((f, i) => blip(f, i * 0.09, 0.3, 0.14));
    },
    crash() {
      blip(70, 0, 0.5, 0.3, 'square');
      blip(48, 0.08, 0.6, 0.25, 'sawtooth');
    },
    warn() {
      blip(440, 0, 0.1, 0.08, 'square');
    },
  };
}
