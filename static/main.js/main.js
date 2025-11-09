// main.js
import { audioEngine } from './audioEngine.js';
import { sequencer } from './sequencer.js';
import {
  setupUI,
  updateNoiseToneUI,
  updateADSRPreview,
  drawModulationGraph,
} from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('Main.js loaded ✅');

  // ==== DOM ELEMENTS ====
  const powerBtn = document.getElementById('powerBtn');
  const powerIndicator = document.getElementById('powerIndicator');
  const playBtn = document.getElementById('playBtn');
  const grid = document.getElementById('sequencerGrid') || document.getElementById('multiTrackGrid');
  const patternButtons = document.querySelectorAll('[data-pattern]');
  const chainBtn = document.getElementById('chainPatterns');
  const patternQueueContainer = document.createElement('div');
  patternQueueContainer.id = 'patternQueue';
  patternQueueContainer.style.marginTop = '10px';
  patternQueueContainer.style.display = 'flex';
  patternQueueContainer.style.gap = '6px';
  const patternControls = document.getElementById('patternControls');
  if (patternControls) patternControls.appendChild(patternQueueContainer);

  const stepEditor = document.getElementById('stepEditor');
  const stepFreq = document.getElementById('stepFreq');
  const stepVol = document.getElementById('stepVol');
  const stepOsc = document.getElementById('stepOsc');

  // === SIDE MODULATION PANEL ===
  const stepLfoRate = document.getElementById('stepLfoRate');
  const stepLfoDepth = document.getElementById('stepLfoDepth');
  const stepLfoTarget = document.getElementById('stepLfoTarget');
  const stepFilterCutoff = document.getElementById('stepFilterCutoff');
  const stepFilterRes = document.getElementById('stepFilterRes');

  // === NEW: Noise Tone + ADSR knobs (in mod panel) ===
  const stepNoiseTone = document.getElementById('stepNoiseTone');
  const stepAttack = document.getElementById('stepAttack');
  const stepDecay = document.getElementById('stepDecay');
  const stepSustain = document.getElementById('stepSustain');
  const stepRelease = document.getElementById('stepRelease');

  // ==== STATE ====
  const TOTAL_STEPS = 16;
  const NUM_TRACKS = 4;
  const patterns = Array.from({ length: 8 }, () =>
    Array.from({ length: NUM_TRACKS }, () => Array(TOTAL_STEPS).fill(null))
  );
  let currentPattern = 0;
  let chainMode = false;
  let patternQueue = [];
  let currentQueueIndex = 0;
  let selectedStep = { track: 0, step: 0 };
  let currentNoiseTone = 0.5; // used by visualizer if no note present

  // Default ADSR helper
  const defaultADSR = () => ({ attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.2 });

  // ==== INIT UI ====
  // Setup UI visuals (safe - does nothing if elements missing)
  try {
    setupUI();
  } catch (e) {
    console.warn('setupUI failed:', e);
  }

  // ==== GRID CREATION ====
  function createGrid() {
    if (!grid) return;
    grid.innerHTML = '';
    grid.classList.add('multi-track-grid');
    for (let t = 0; t < NUM_TRACKS; t++) {
      const trackRow = document.createElement('div');
      trackRow.className = 'track-row';
      for (let s = 0; s < TOTAL_STEPS; s++) {
        const step = document.createElement('div');
        step.className = 'step';
        step.dataset.track = t;
        step.dataset.step = s;
        step.addEventListener('click', () => toggleStep(t, s));
        trackRow.appendChild(step);
      }
      grid.appendChild(trackRow);
    }
  }

  // Ensure note object exists with defaults
  function ensureNoteExists(track, step) {
    if (!patterns[currentPattern][track][step]) {
      patterns[currentPattern][track][step] = {
        freq: 440,
        vol: 0.4,
        osc: 'square',
        lfoRate: 0,
        lfoDepth: 0,
        lfoTarget: 'none',
        filterCutoff: 10000,
        filterRes: 0,
        noiseTone: currentNoiseTone,
        adsr: defaultADSR(),
      };
    }
    return patterns[currentPattern][track][step];
  }

  // Helpers used by visual functions
  function getCurrentStepADSR() {
    const { track, step } = selectedStep;
    const note = patterns[currentPattern]?.[track]?.[step];
    return (note && note.adsr) ? note.adsr : defaultADSR();
  }
  function isCurrentNoiseOsc() {
    const { track, step } = selectedStep;
    const note = patterns[currentPattern]?.[track]?.[step];
    if (!note) {
      // if no note, check UI oscillator select
      return stepOsc?.value === 'noise';
    }
    return note.osc === 'noise';
  }

  // ==== STEP EDITOR ====
  function openStepEditor(track, step) {
    selectedStep = { track, step };
    const note = patterns[currentPattern][track][step];

    if (note) {
      if (stepFreq) stepFreq.value = note.freq ?? 440;
      if (stepVol) stepVol.value = note.vol ?? 0.4;
      if (stepOsc) stepOsc.value = note.osc ?? 'square';
    } else {
      if (stepFreq) stepFreq.value = 440;
      if (stepVol) stepVol.value = 0.4;
      if (stepOsc) stepOsc.value = 'square';
    }

    updateModPanel();

    // Disable freq slider for noise oscillator
    if (stepFreq && stepOsc) stepFreq.disabled = (stepOsc.value === 'noise');

    // Update Noise Tone UI (shaded if not noise)
    try {
      updateNoiseToneUI(stepOsc?.value === 'noise');
    } catch (e) {
      // ignore
    }

    // Draw ADSR preview (safe)
    try {
      const adsr = getCurrentStepADSR();
      updateADSRPreview(adsr);
      drawModulationGraph(adsr, note?.noiseTone ?? currentNoiseTone, isCurrentNoiseOsc());
    } catch (e) {
      // ignore drawing errors
    }
  }

  function toggleStep(track, step) {
    const current = patterns[currentPattern][track][step];
    if (current) {
      patterns[currentPattern][track][step] = null;
    } else {
      patterns[currentPattern][track][step] = {
        freq: parseFloat(stepFreq?.value) || 440,
        vol: parseFloat(stepVol?.value) || 0.4,
        osc: stepOsc?.value || 'square',
        lfoRate: parseFloat(stepLfoRate?.value) || 0,
        lfoDepth: parseFloat(stepLfoDepth?.value) || 0,
        lfoTarget: stepLfoTarget?.value || 'none',
        filterCutoff: parseFloat(stepFilterCutoff?.value) || 10000,
        filterRes: parseFloat(stepFilterRes?.value) || 0,
        noiseTone: parseFloat(stepNoiseTone?.value) || currentNoiseTone,
        adsr: {
          attack: parseFloat(stepAttack?.value) || defaultADSR().attack,
          decay: parseFloat(stepDecay?.value) || defaultADSR().decay,
          sustain: parseFloat(stepSustain?.value) || defaultADSR().sustain,
          release: parseFloat(stepRelease?.value) || defaultADSR().release,
        },
      };
    }
    updateGrid();
    openStepEditor(track, step);
  }

  function updateGrid() {
    if (!grid) return;
    const steps = grid.querySelectorAll('.step');
    steps.forEach((el) => {
      const t = parseInt(el.dataset.track);
      const s = parseInt(el.dataset.step);
      el.classList.toggle('active', !!patterns[currentPattern][t][s]);
      el.classList.toggle('selected-step', selectedStep.track === t && selectedStep.step === s);
    });
  }

  // ==== STEP EDITOR LISTENERS ====
  function updateStepParam(param, value) {
    const { track, step } = selectedStep;
    if (!patterns[currentPattern][track][step]) ensureNoteExists(track, step);
    patterns[currentPattern][track][step][param] = value;
    updateGrid();

    // Draw ADSR if an ADSR param changed
    if (param === 'adsr') {
      try {
        updateADSRPreview(patterns[currentPattern][track][step].adsr);
        drawModulationGraph(patterns[currentPattern][track][step].adsr,
          patterns[currentPattern][track][step].noiseTone ?? currentNoiseTone,
          patterns[currentPattern][track][step].osc === 'noise');
      } catch (e) {}
    }
  }

  stepFreq?.addEventListener('input', () => updateStepParam('freq', parseFloat(stepFreq.value)));
  stepVol?.addEventListener('input', () => updateStepParam('vol', parseFloat(stepVol.value)));
  stepOsc?.addEventListener('input', () => {
    updateStepParam('osc', stepOsc.value);
    if (stepFreq) stepFreq.disabled = (stepOsc.value === 'noise');
    try { updateNoiseToneUI(stepOsc.value === 'noise'); } catch (e) {}
    // update graph even if no note exists yet
    try {
      const adsr = getCurrentStepADSR();
      drawModulationGraph(adsr, currentNoiseTone, stepOsc.value === 'noise');
    } catch (e) {}
  });

  // ==== MOD PANEL ====
  function updateModPanel() {
    const { track, step } = selectedStep;
    const note = patterns[currentPattern][track][step];
    if (note) {
      if (stepLfoRate) stepLfoRate.value = note.lfoRate ?? 0;
      if (stepLfoDepth) stepLfoDepth.value = note.lfoDepth ?? 0;
      if (stepLfoTarget) stepLfoTarget.value = note.lfoTarget ?? 'none';
      if (stepFilterCutoff) stepFilterCutoff.value = note.filterCutoff ?? 10000;
      if (stepFilterRes) stepFilterRes.value = note.filterRes ?? 0;

      if (stepNoiseTone) stepNoiseTone.value = note.noiseTone ?? currentNoiseTone;
      const adsr = note.adsr ?? defaultADSR();
      if (stepAttack) stepAttack.value = adsr.attack;
      if (stepDecay) stepDecay.value = adsr.decay;
      if (stepSustain) stepSustain.value = adsr.sustain;
      if (stepRelease) stepRelease.value = adsr.release;

      // Update ADSR preview
      try {
        updateADSRPreview(adsr);
        drawModulationGraph(adsr, note.noiseTone ?? currentNoiseTone, note.osc === 'noise');
      } catch (e) {}
      // Update Noise Tone UI shading
      try { updateNoiseToneUI(note.osc === 'noise'); } catch (e) {}
    } else {
      // no note: set sensible defaults
      if (stepLfoRate) stepLfoRate.value = 0;
      if (stepLfoDepth) stepLfoDepth.value = 0;
      if (stepLfoTarget) stepLfoTarget.value = 'none';
      if (stepFilterCutoff) stepFilterCutoff.value = 10000;
      if (stepFilterRes) stepFilterRes.value = 0;

      if (stepNoiseTone) stepNoiseTone.value = currentNoiseTone;
      const adsr = defaultADSR();
      if (stepAttack) stepAttack.value = adsr.attack;
      if (stepDecay) stepDecay.value = adsr.decay;
      if (stepSustain) stepSustain.value = adsr.sustain;
      if (stepRelease) stepRelease.value = adsr.release;

      try {
        updateADSRPreview(adsr);
        drawModulationGraph(adsr, currentNoiseTone, isCurrentNoiseOsc());
        updateNoiseToneUI(isCurrentNoiseOsc());
      } catch (e) {}
    }
  }

  // Listeners for mod panel controls
  [stepLfoRate, stepLfoDepth, stepLfoTarget, stepFilterCutoff, stepFilterRes].forEach((ctrl) => {
    ctrl?.addEventListener('input', () => {
      const { track, step } = selectedStep;
      if (!patterns[currentPattern][track][step]) return;
      patterns[currentPattern][track][step].lfoRate = parseFloat(stepLfoRate.value) || 0;
      patterns[currentPattern][track][step].lfoDepth = parseFloat(stepLfoDepth.value) || 0;
      patterns[currentPattern][track][step].lfoTarget = stepLfoTarget.value || 'none';
      patterns[currentPattern][track][step].filterCutoff = parseFloat(stepFilterCutoff.value) || 10000;
      patterns[currentPattern][track][step].filterRes = parseFloat(stepFilterRes.value) || 0;
    });
  });

  // Noise Tone & ADSR controls
  stepNoiseTone?.addEventListener('input', () => {
    currentNoiseTone = parseFloat(stepNoiseTone.value);
    const { track, step } = selectedStep;
    if (patterns[currentPattern][track][step]) {
      patterns[currentPattern][track][step].noiseTone = currentNoiseTone;
    }
    // update visuals
    try {
      const adsr = getCurrentStepADSR();
      drawModulationGraph(adsr, currentNoiseTone, isCurrentNoiseOsc());
    } catch (e) {}
  });

  stepAttack?.addEventListener('input', () => {
    const { track, step } = selectedStep;
    if (!patterns[currentPattern][track][step]) return;
    patterns[currentPattern][track][step].adsr.attack = parseFloat(stepAttack.value);
    const adsr = patterns[currentPattern][track][step].adsr;
    try { updateADSRPreview(adsr); drawModulationGraph(adsr, patterns[currentPattern][track][step].noiseTone ?? currentNoiseTone, patterns[currentPattern][track][step].osc === 'noise'); } catch (e) {}
  });

  stepDecay?.addEventListener('input', () => {
    const { track, step } = selectedStep;
    if (!patterns[currentPattern][track][step]) return;
    patterns[currentPattern][track][step].adsr.decay = parseFloat(stepDecay.value);
    const adsr = patterns[currentPattern][track][step].adsr;
    try { updateADSRPreview(adsr); drawModulationGraph(adsr, patterns[currentPattern][track][step].noiseTone ?? currentNoiseTone, patterns[currentPattern][track][step].osc === 'noise'); } catch (e) {}
  });

  stepSustain?.addEventListener('input', () => {
    const { track, step } = selectedStep;
    if (!patterns[currentPattern][track][step]) return;
    patterns[currentPattern][track][step].adsr.sustain = parseFloat(stepSustain.value);
    const adsr = patterns[currentPattern][track][step].adsr;
    try { updateADSRPreview(adsr); drawModulationGraph(adsr, patterns[currentPattern][track][step].noiseTone ?? currentNoiseTone, patterns[currentPattern][track][step].osc === 'noise'); } catch (e) {}
  });

  stepRelease?.addEventListener('input', () => {
    const { track, step } = selectedStep;
    if (!patterns[currentPattern][track][step]) return;
    patterns[currentPattern][track][step].adsr.release = parseFloat(stepRelease.value);
    const adsr = patterns[currentPattern][track][step].adsr;
    try { updateADSRPreview(adsr); drawModulationGraph(adsr, patterns[currentPattern][track][step].noiseTone ?? currentNoiseTone, patterns[currentPattern][track][step].osc === 'noise'); } catch (e) {}
  });

  // ==== PATTERN MEMORY ====
  patternButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.pattern);
      if (!chainMode) {
        currentPattern = index;
        updateGrid();
        highlightCurrentPattern();
      } else {
        if (!patternQueue.includes(index)) {
          patternQueue.push(index);
          updateQueueVisual();
        }
      }
    });
  });

  function highlightCurrentPattern() {
    patternButtons.forEach((b, i) => {
      b.style.backgroundColor = i === currentPattern ? '#ffc107' : '';
    });
  }

  // ==== CHAINING ====
  if (chainBtn) {
    chainBtn.addEventListener('click', () => {
      chainMode = !chainMode;
      chainBtn.textContent = chainMode ? 'Chaining...' : 'Chain Selected';
      if (!chainMode && patternQueue.length > 0) {
        currentQueueIndex = 0;
        currentPattern = patternQueue[0];
        highlightCurrentPattern();
        updateQueueVisual();
      }
    });
  }

  function updateQueueVisual() {
    if (!patternQueueContainer) return;
    patternQueueContainer.innerHTML = '';
    patternQueue.forEach((pIndex, order) => {
      const qEl = document.createElement('div');
      qEl.textContent = `P${pIndex + 1}`;
      qEl.style.padding = '4px 8px';
      qEl.style.border = '1px solid #888';
      qEl.style.borderRadius = '4px';
      qEl.style.background = currentQueueIndex === order ? '#00ff00' : '#222';
      qEl.style.color = '#fff';
      qEl.title = `Order ${order + 1}`;
      patternQueueContainer.appendChild(qEl);
    });
  }

  function advanceQueue() {
    if (patternQueue.length === 0) return;
    currentQueueIndex = (currentQueueIndex + 1) % patternQueue.length;
    currentPattern = patternQueue[currentQueueIndex];
    highlightCurrentPattern();
    updateQueueVisual();
  }

  // ==== AUDIO ENGINE ====
  async function ensureAudioContextRunning() {
    if (!audioEngine.ctx) audioEngine.init();
    if (audioEngine.ctx && audioEngine.ctx.state === 'suspended') {
      await audioEngine.ctx.resume();
      console.log('✅ AudioContext resumed (auto or manual)');
    }
  }

  // Power button logic
  powerBtn?.addEventListener('click', async () => {
    await ensureAudioContextRunning();
    console.log('Power on ✅');
    if (powerIndicator) powerIndicator.style.backgroundColor = '#0f0';
  });

  // Auto-resume AudioContext after sleep on first user interaction
  document.addEventListener('click', async () => {
    await ensureAudioContextRunning();
  }, { once: true });

  // Play button logic
  playBtn?.addEventListener('click', async () => {
    await ensureAudioContextRunning();
    if (!sequencer.isPlaying) {
      sequencer.start();
      playBtn.textContent = 'STOP';
    } else {
      sequencer.stop();
      playBtn.textContent = 'PLAY';
    }
  });

  // ==== SEQUENCER ====
  const originalStepCallback = sequencer.onStepCallback;
  sequencer.onStepCallback = (step) => {
    if (typeof originalStepCallback === 'function') originalStepCallback(step);

    const allSteps = grid?.querySelectorAll('.step');
    allSteps?.forEach((el) => el.classList.remove('current'));
    grid?.querySelectorAll(`[data-step="${step}"]`)?.forEach((el) => el.classList.add('current'));

    let activePattern = currentPattern;
    if (step === TOTAL_STEPS - 1 && patternQueue.length > 0) {
      advanceQueue();
      activePattern = currentPattern;
    }

    for (let t = 0; t < NUM_TRACKS; t++) {
      const note = patterns[activePattern][t][step];
      if (note) {
        audioEngine.playOnce(
          note.freq,
          note.osc,
          note.vol,
          0.12,
          note.lfoRate,
          note.lfoDepth,
          note.lfoTarget,
          note.filterCutoff,
          note.filterRes,
          note.noiseTone,
          note.adsr
        );
      }
    }
  };

  // ==== INIT ====
  createGrid();
  updateGrid();
  highlightCurrentPattern();
  openStepEditor(0, 0); // show first step by default
  console.log('✅ Noise Tone + ADSR + UI integrated in main.js');
});