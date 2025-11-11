// ui.js
// UI module: circular knobs + ADSR & modulation visuals + Drive control
// Exports: setupUI, updateNoiseToneUI, updateADSRPreview, drawModulationGraph

function $id(id) { return document.getElementById(id); }

// --- Circular knob widget ---
function createCircularKnob(knobEl) {
  const input = knobEl.querySelector('input[type="range"]');
  if (!input) return null;

  input.style.display = 'none';

  const wrapper = document.createElement('div');
  wrapper.className = 'knob-ui';

  const face = document.createElement('div');
  face.className = 'knob-face';

  const indicator = document.createElement('div');
  indicator.className = 'knob-indicator';

  const valueText = document.createElement('div');
  valueText.className = 'knob-value';
  valueText.setAttribute('aria-hidden', 'true');

  face.appendChild(indicator);
  wrapper.appendChild(face);
  wrapper.appendChild(valueText);

  knobEl.insertBefore(wrapper, input);

  const min = parseFloat(input.min ?? 0);
  const max = parseFloat(input.max ?? 1);
  const step = parseFloat(input.step ?? (max - min) / 100);

  const valueToAngle = (v) => 360 * ((v - min) / (max - min));
  const angleToValue = (a) => {
    let ratio = (a % 360) / 360;
    if (ratio < 0) ratio += 1;
    const v = min + ratio * (max - min);
    return Math.round(v / step) * step;
  };

  function updateVisualFromInput() {
    const v = parseFloat(input.value);
    const angle = valueToAngle(v);
    indicator.style.transform = `rotate(${angle}deg)`;
    wrapper.style.setProperty('--knob-rotation', `${angle}deg`);
    valueText.textContent = Number(v).toFixed((step < 1 && step % 1 !== 0) ? 2 : 0);
  }

  let dragging = false;
  let startAngle = 0;

  function getCenter(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function angleFromEvent(e, el) {
    const center = getCenter(el);
    const clientX = (e.touches ? e.touches[0].clientX : e.clientX);
    const clientY = (e.touches ? e.touches[0].clientY : e.clientY);
    const dx = clientX - center.x;
    const dy = clientY - center.y;
    const rad = Math.atan2(dy, dx);
    let angle = rad * (180 / Math.PI);
    angle = angle + 90;
    return (angle + 360) % 360;
  }

  function onPointerDown(e) {
    e.preventDefault();
    dragging = true;
    startAngle = angleFromEvent(e, face);
    face.classList.add('active');
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp, { passive: false });
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp, { passive: false });
  }

  function onPointerMove(e) {
    if (!dragging) return;
    e.preventDefault();
    const ang = angleFromEvent(e, face);
    const newVal = angleToValue(ang);
    input.value = newVal;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    updateVisualFromInput();
  }

  function onPointerUp(e) {
    dragging = false;
    face.classList.remove('active');
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('touchmove', onPointerMove);
    window.removeEventListener('touchend', onPointerUp);
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function onKey(e) {
    const key = e.key;
    let v = parseFloat(input.value);
    const inc = step || ((max - min) / 100);
    if (key === 'ArrowRight' || key === 'ArrowUp') v = Math.min(max, v + inc);
    else if (key === 'ArrowLeft' || key === 'ArrowDown') v = Math.max(min, v - inc);
    else if (key === 'PageUp') v = Math.min(max, v + inc * 5);
    else if (key === 'PageDown') v = Math.max(min, v - inc * 5);
    else return;

    e.preventDefault();
    input.value = v;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    updateVisualFromInput();
  }

  function onFaceClick(e) {
    const ang = angleFromEvent(e, face);
    const newVal = angleToValue(ang);
    input.value = newVal;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    updateVisualFromInput();
  }

  face.addEventListener('pointerdown', onPointerDown);
  face.addEventListener('touchstart', onPointerDown, { passive: false });
  face.addEventListener('click', onFaceClick);
  face.tabIndex = 0;
  face.addEventListener('keydown', onKey);

  input.addEventListener('input', updateVisualFromInput);
  input.addEventListener('change', updateVisualFromInput);

  updateVisualFromInput();

  return {
    element: wrapper,
    input,
    setValue: (v) => {
      input.value = v;
      updateVisualFromInput();
    }
  };
}

// --- ADSR + Mod Graph ---
function getCtx(id) {
  const c = $id(id);
  if (!c) return null;
  const ctx = c.getContext('2d');
  return { canvas: c, ctx };
}

export function updateADSRPreview(adsr) {
  const g = getCtx('adsrPreview');
  if (!g) return;
  const { canvas, ctx } = g;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const a = Math.max(0, adsr.attack || 0.01);
  const d = Math.max(0, adsr.decay || 0.01);
  const s = Math.min(1, Math.max(0, adsr.sustain ?? 0.7));
  const r = Math.max(0, adsr.release || 0.01);
  const total = a + d + 1 + r;
  const scale = w / total;
  const yBottom = h - 4;
  const yTop = 8;
  const ySustain = h * (1 - s);

  ctx.beginPath();
  ctx.moveTo(0, yBottom);
  ctx.lineTo(a * scale, yTop);
  ctx.lineTo((a + d) * scale, ySustain);
  ctx.lineTo((a + d + 1) * scale, ySustain);
  ctx.lineTo((a + d + 1 + r) * scale, yBottom);
  ctx.strokeStyle = '#00ffcc';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();
}

export function drawModulationGraph(adsr, noiseTone = 0.5, isNoiseOsc = false) {
  const g = getCtx('modGraph');
  if (!g) return;
  const { canvas, ctx } = g;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#0b0b0b');
  grad.addColorStop(1, '#111');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const a = Math.max(0, adsr.attack || 0.01);
  const d = Math.max(0, adsr.decay || 0.01);
  const s = Math.min(1, Math.max(0, adsr.sustain ?? 0.7));
  const r = Math.max(0, adsr.release || 0.01);

  const total = a + d + 1 + r;
  const scale = w / total;
  const yBottom = h - 6;
  const yTop = 6;
  const ySustain = h * (1 - s);

  ctx.beginPath();
  ctx.moveTo(0, yBottom);
  ctx.lineTo(a * scale, yTop);
  ctx.lineTo((a + d) * scale, ySustain);
  ctx.lineTo((a + d + 1) * scale, ySustain);
  ctx.lineTo((a + d + 1 + r) * scale, yBottom);
  ctx.strokeStyle = '#00eaff';
  ctx.lineWidth = 2;
  ctx.stroke();

  if (isNoiseOsc) {
    const noiseY = h - noiseTone * (h * 0.75) - 6;
    ctx.beginPath();
    ctx.setLineDash([4, 3]);
    ctx.moveTo(0, noiseY);
    ctx.lineTo(w, noiseY);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '10px monospace';
    ctx.fillText(`Noise: ${noiseTone.toFixed(2)}`, 6, Math.max(12, noiseY - 8));
  }
}

export function updateNoiseToneUI(isNoiseOsc) {
  const knobInput = $id('stepNoiseTone');
  if (!knobInput) return;
  const parent = knobInput.closest('.knob') || knobInput.parentElement;
  if (!parent) return;
  if (isNoiseOsc) {
    parent.classList.remove('dimmed');
    knobInput.disabled = false;
  } else {
    parent.classList.add('dimmed');
    knobInput.disabled = true;
  }
}

// --- NEW: Drive Knob Sync & UI Update ---
function setupDriveKnob() {
  const driveInput = $id('driveKnob');
  if (!driveInput) return;

  driveInput.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    window.currentDrive = val;
    document.dispatchEvent(new CustomEvent('driveChange', { detail: val }));
  });

  // initialize with stored or default value
  if (!isNaN(window.currentDrive)) {
    driveInput.value = window.currentDrive;
  } else {
    driveInput.value = 0.2; // default mild drive
  }
  driveInput.dispatchEvent(new Event('input'));
}

// --- setupUI ---
export function setupUI() {
  const knobEls = Array.from(document.querySelectorAll('.knob'));
  knobEls.forEach(k => {
    if (k.dataset.knobInit === '1') return;
    createCircularKnob(k);
    k.dataset.knobInit = '1';
  });

  // Drive knob (if exists)
  setupDriveKnob();

  const adsr = { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.2 };
  updateADSRPreview(adsr);
  drawModulationGraph(adsr, parseFloat($id('stepNoiseTone')?.value ?? 0.5), false);

  window.addEventListener('resize', () => {
    const curAdsr = window.selectedStep?.adsr ?? adsr;
    updateADSRPreview(curAdsr);
    drawModulationGraph(curAdsr, parseFloat($id('stepNoiseTone')?.value ?? 0.5), false);
  }, { passive: true });
}