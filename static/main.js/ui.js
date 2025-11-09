// ui.js
// ─────────────────────────────────────────────
// This file only handles *visuals* and *UI updates*
// It does NOT alter layout or affect sequencer logic.
// ─────────────────────────────────────────────

// Helper to safely get canvas context
function getCtx(id) {
  const canvas = document.getElementById(id);
  if (!canvas) return null;
  const ctx = canvas.getContext("2d");
  return { canvas, ctx };
}

// ====== Noise Tone UI ======
export function updateNoiseToneUI(isNoiseOsc) {
  const noiseToneKnob = document.getElementById("noiseTone");
  if (!noiseToneKnob) return;
  noiseToneKnob.style.opacity = isNoiseOsc ? "1" : "0.4";
  noiseToneKnob.style.filter = isNoiseOsc ? "drop-shadow(0 0 6px #00ff00)" : "none";
}

// ====== ADSR Envelope Preview ======
export function updateADSRPreview(adsr) {
  const g = getCtx("adsrPreview");
  if (!g) return;
  const { canvas, ctx } = g;

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const a = adsr.attack || 0.1;
  const d = adsr.decay || 0.1;
  const s = adsr.sustain ?? 0.5;
  const r = adsr.release || 0.1;

  const total = a + d + 1 + r;
  const scale = w / total;
  const y0 = h - 2;
  const y1 = 10;
  const ySustain = h * (1 - s);

  ctx.beginPath();
  ctx.moveTo(0, y0);
  ctx.lineTo(a * scale, y1);
  ctx.lineTo((a + d) * scale, ySustain);
  ctx.lineTo((a + d + 1) * scale, ySustain);
  ctx.lineTo((a + d + 1 + r) * scale, y0);
  ctx.strokeStyle = "#00ffcc";
  ctx.lineWidth = 2;
  ctx.stroke();
}

// ====== Modulation Graph ======
export function drawModulationGraph(adsr, noiseTone = 0.5, isNoiseOsc = false) {
  const g = getCtx("modGraph");
  if (!g) return;
  const { canvas, ctx } = g;
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  // Background
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#0a0a0a");
  grad.addColorStop(1, "#151515");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const a = adsr.attack || 0.1;
  const d = adsr.decay || 0.1;
  const s = adsr.sustain ?? 0.5;
  const r = adsr.release || 0.1;
  const total = a + d + 1 + r;
  const scale = w / total;

  const y0 = h - 5;
  const y1 = 10;
  const ySustain = h * (1 - s);

  // ADSR curve
  ctx.beginPath();
  ctx.moveTo(0, y0);
  ctx.lineTo(a * scale, y1);
  ctx.lineTo((a + d) * scale, ySustain);
  ctx.lineTo((a + d + 1) * scale, ySustain);
  ctx.lineTo((a + d + 1 + r) * scale, y0);
  ctx.strokeStyle = "#00ffff";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Noise tone overlay
  if (isNoiseOsc) {
    const noiseY = h - noiseTone * h * 0.9;
    ctx.beginPath();
    ctx.moveTo(0, noiseY);
    ctx.lineTo(w, noiseY);
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

export function setupUI() {
  console.log("✅ setupUI initialized");
}