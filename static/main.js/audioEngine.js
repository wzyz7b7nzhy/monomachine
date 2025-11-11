// audioEngine.js
class AudioEngine {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      console.log("AudioContext initialized ✅");
    }
  }

  playOnce(
    freq = 440,
    type = "sawtooth",
    vol = 0.5,
    dur = 0.15,
    lfoRate = 0,
    lfoDepth = 0,
    lfoTarget = "none",
    filterCutoff = 10000,
    filterRes = 0,
    noiseTone = 0.0,
    adsr = { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.2 }
  ) {
    if (!this.ctx) this.init();

    const ctx = this.ctx;
    const now = ctx.currentTime;

    let sourceNode;

    // --- Oscillator or Noise ---
    if (type === "noise") {
      const bufferSize = ctx.sampleRate * dur * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;

      // Noise tone filter
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.setValueAtTime(200 + noiseTone * 8000, now);

      noiseSource.connect(noiseFilter);
      sourceNode = noiseFilter;
      noiseSource.start();
      noiseSource.stop(now + dur + adsr.release);
    } else {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      sourceNode = osc;
      osc.start();
      osc.stop(now + dur + adsr.release);
    }

    // --- Filter ---
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(filterCutoff, now);
    filter.Q.setValueAtTime(filterRes, now);
    
    // --- Gain (Envelope) ---
    const gain = ctx.createGain();
    const attackEnd = now + adsr.attack;
    const decayEnd = attackEnd + adsr.decay;

    const drive = adsr.drive ?? 0.5; // default drive if not set

    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(0.0, now);
    gain.gain.linearRampToValueAtTime(vol * drive, attackEnd);
    gain.gain.linearRampToValueAtTime(vol * adsr.sustain * drive, decayEnd);
    gain.gain.linearRampToValueAtTime(0.0, now + dur + adsr.release);

    // --- LFO ---
    if (lfoRate > 0 && lfoDepth > 0 && lfoTarget !== "none") {
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(lfoRate, now);
      lfoGain.gain.setValueAtTime(lfoDepth, now);
      lfo.connect(lfoGain);

      if (lfoTarget === "freq" && type !== "noise") lfoGain.connect(sourceNode.frequency);
      else if (lfoTarget === "vol") lfoGain.connect(gain.gain);
      else if (lfoTarget === "filter") lfoGain.connect(filter.frequency);

      lfo.start();
      lfo.stop(now + dur + adsr.release);
    }
    
    // --- DRIVE / DISTORTION ---
    const driveAmount = adsr.drive ?? 0.5;
    const driveNode = ctx.createWaveShaper();

    // make a distortion curve based on drive amount
    const makeDistortionCurve = (amount = 0) => {
    const k = amount * 100; // scale drive amount
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    let x;
    for (let i = 0; i < n_samples; ++i) {
      x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  };

  driveNode.curve = makeDistortionCurve(drive);
  driveNode.oversample = "4x";
  }
}

export const audioEngine = new AudioEngine();