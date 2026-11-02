import { canvas2d, cssVars, isDark, num, setColor, setText } from '../shared/dom';
import { scrollSpy } from '../shared/scrollSpy';
import type { LessonSetup } from '../types';

/** Laplace density with location `mu` and scale `b`. */
export const laplacePdf = (x: number, mu: number, b: number) => (1 / (2 * b)) * Math.exp(-Math.abs(x - mu) / b);

/** Unbiased estimate of the true "yes" rate under randomised response with bias γ. */
export const rrEstimate = (rawYes: number, gamma: number) => (1 / (2 * gamma)) * (rawYes + gamma - 0.5);

export const setup: LessonSetup = (life) => {
  /** Plot frame shared by the three charts. */
  function frame(id: string, pad: { l: number; r: number; t: number; b: number }) {
    const { ctx, W, H } = canvas2d(id);
    const dk = isDark();
    ctx.fillStyle = dk ? '#1e1e1c' : '#f1efe8';
    ctx.fillRect(0, 0, W, H);
    const cL = pad.l,
      cR = W - pad.r,
      cT = pad.t,
      cB = H - pad.b;
    return { ctx, W, H, dk, cL, cR, cT, cB, cW: cR - cL, cH: cB - cT };
  }

  /* ══════════════ RANDOMISED RESPONSE ══════════════ */
  function updateRR() {
    const gamma = num('rr-gamma') / 100;
    const N = num('rr-n');
    const pReal = num('rr-p') / 100;
    setText('rr-gamma-val', gamma.toFixed(2));
    setText('rr-n-val', N);
    setText('rr-p-val', Math.round(pReal * 100) + '%');
    let yesCount = 0;
    for (let i = 0; i < N; i++) {
      const cheated = Math.random() < pReal;
      const tellTruth = Math.random() < 0.5 + gamma;
      if (tellTruth ? cheated : !cheated) yesCount++;
    }
    const rawYes = yesCount / N;
    const hasSignal = gamma > 0.001;
    const pEst = hasSignal ? rrEstimate(rawYes, gamma) : 0.5;
    const varBound = hasSignal ? 1 / (16 * N * gamma * gamma) : Infinity;
    setText('rr-true', (pReal * 100).toFixed(0) + '%');
    setText('rr-raw', (rawYes * 100).toFixed(1) + '%');
    setText('rr-est', hasSignal ? (Math.max(0, Math.min(1, pEst)) * 100).toFixed(1) + '%' : 'N/A');
    setColor('rr-est', Math.abs(pEst - pReal) < 0.1 ? 'var(--green)' : 'var(--amber)');
    setText('rr-var', varBound < 100 ? varBound.toFixed(4) : '∞');

    const { ctx, dk, cL, cR, cT, cB, cW, cH } = frame('rr-canvas', { l: 60, r: 20, t: 30, b: 35 });
    ctx.strokeStyle = dk ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cL, cT);
    ctx.lineTo(cL, cB);
    ctx.lineTo(cR, cB);
    ctx.stroke();
    ctx.font = '10px "DM Sans"';
    ctx.fillStyle = '#888';
    for (let v = 0; v <= 100; v += 20) {
      const y = cB - (v / 100) * cH;
      ctx.fillText(v + '%', 15, y + 3);
      ctx.beginPath();
      ctx.moveTo(cL, y);
      ctx.lineTo(cR, y);
      ctx.strokeStyle = dk ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
      ctx.stroke();
    }
    const barW = cW / 5;
    const bars = [
      { val: pReal, label: 'p real', color: '#378ADD' },
      { val: rawYes, label: 'Respostas "sim"', color: '#BA7517' },
      { val: Math.max(0, Math.min(1, pEst)), label: 'p̂ estimado', color: '#1D9E75' },
    ];
    const gap = (cW - bars.length * barW) / (bars.length + 1);
    bars.forEach((b, i) => {
      const bx = cL + gap + (barW + gap) * i;
      const top = cB - b.val * cH;
      // bar with rounded top corners
      ctx.fillStyle = b.color;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(bx + 6, cB);
      ctx.lineTo(bx + 6, top + 6);
      ctx.quadraticCurveTo(bx + 6, top, bx + 12, top);
      ctx.lineTo(bx + barW - 12, top);
      ctx.quadraticCurveTo(bx + barW - 6, top, bx + barW - 6, top + 6);
      ctx.lineTo(bx + barW - 6, cB);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.font = 'bold 12px "JetBrains Mono"';
      ctx.fillStyle = dk ? '#e8e6de' : '#1a1a18';
      ctx.fillText((b.val * 100).toFixed(0) + '%', bx + barW / 2 - 15, top - 8);
      ctx.font = '11px "DM Sans"';
      ctx.fillStyle = dk ? '#b4b2a9' : '#5f5e5a';
      ctx.fillText(b.label, bx + barW / 2 - 30, cB + 16);
    });
  }

  /* ══════════════ LAPLACE PDF ══════════════ */
  function updateLap() {
    const b = num('lap-b') / 10;
    setText('lap-b-val', b.toFixed(1));
    setText('lap-peak', (1 / (2 * b)).toFixed(3));
    setText('lap-varv', (2 * b * b).toFixed(2));
    const { ctx, dk, cL, cR, cT, cB, cW, cH } = frame('lap-canvas', { l: 40, r: 20, t: 20, b: 25 });
    // The original passed 'var(--coral)' to the canvas, which ignores var(); resolve it instead.
    const coral = cssVars()('--coral') || '#D85A30';
    ctx.strokeStyle = dk ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cL, cB);
    ctx.lineTo(cR, cB);
    ctx.stroke();
    const xMin = -4 * b - 1,
      xMax = 4 * b + 1,
      xRange = xMax - xMin;
    const yScale = Math.max((1 / (2 * b)) * 1.2, 0.6);
    const curve = (scale: number) => {
      for (let px = 0; px <= cW; px++) {
        const x = xMin + (px / cW) * xRange;
        const cy = cB - (laplacePdf(x, 0, scale) / yScale) * cH;
        if (px === 0) ctx.moveTo(cL + px, cy);
        else ctx.lineTo(cL + px, cy);
      }
    };
    // reference curves at b=1 and b=4
    [
      { bv: 1, color: 'rgba(120,120,120,0.25)', dash: [4, 4] },
      { bv: 4, color: 'rgba(120,120,120,0.15)', dash: [2, 3] },
    ].forEach((r) => {
      ctx.beginPath();
      ctx.setLineDash(r.dash);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 1;
      curve(r.bv);
      ctx.stroke();
      ctx.setLineDash([]);
    });
    // main curve
    ctx.beginPath();
    curve(b);
    ctx.strokeStyle = coral;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.lineTo(cR, cB);
    ctx.lineTo(cL, cB);
    ctx.closePath();
    ctx.fillStyle = dk ? 'rgba(216,90,48,0.15)' : 'rgba(216,90,48,0.08)';
    ctx.fill();
    ctx.font = 'bold 11px "DM Sans"';
    ctx.fillStyle = coral;
    ctx.fillText('b=' + b.toFixed(1), cL + 10, cT + 10);
    ctx.fillStyle = 'rgba(120,120,120,0.5)';
    ctx.fillText('b=1 (ref)', cL + 10, cT + 24);
    ctx.fillText('b=4 (ref)', cL + 10, cT + 38);
  }

  /* ══════════════ DIFFERENTIAL PRIVACY VIZ ══════════════ */
  function updateDP() {
    const eps = num('dp-eps') / 10;
    const dist = num('dp-dist') / 10;
    setText('dp-eps-val', eps.toFixed(1));
    setText('dp-dist-val', dist.toFixed(1));
    const b = eps > 0.01 ? dist / eps : 100;
    const { ctx, dk, cL, cR, cT, cB, cW, cH } = frame('dp-canvas', { l: 40, r: 20, t: 25, b: 30 });
    const mu1 = 0,
      mu2 = dist;
    const xMin = Math.min(mu1, mu2) - 4 * b - 1,
      xMax = Math.max(mu1, mu2) + 4 * b + 1,
      xRange = xMax - xMin;
    const tX = (x: number) => cL + ((x - xMin) / xRange) * cW;
    const yScale = Math.max((1 / (2 * b)) * 1.3, 0.01);
    const tY = (y: number) => cB - (y / yScale) * cH;
    const xAt = (px: number) => xMin + (px / cW) * xRange;

    ctx.strokeStyle = dk ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cL, cB);
    ctx.lineTo(cR, cB);
    ctx.stroke();

    const density = (mu: number, stroke: string, fill: string, dash: number[]) => {
      ctx.beginPath();
      for (let px = 0; px <= cW; px++) {
        const cy = tY(laplacePdf(xAt(px), mu, b));
        if (px === 0) ctx.moveTo(cL + px, cy);
        else ctx.lineTo(cL + px, cy);
      }
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2.5;
      ctx.setLineDash(dash);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineTo(cR, cB);
      ctx.lineTo(cL, cB);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
    };
    density(mu1, '#378ADD', dk ? 'rgba(55,138,221,0.12)' : 'rgba(55,138,221,0.08)', []);
    density(mu2, '#1D9E75', dk ? 'rgba(29,158,117,0.12)' : 'rgba(29,158,117,0.08)', [6, 4]);

    ctx.beginPath();
    ctx.arc(tX(mu1), cB, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#378ADD';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(tX(mu2), cB, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#1D9E75';
    ctx.fill();
    ctx.font = 'bold 11px "DM Sans"';
    ctx.fillStyle = '#378ADD';
    ctx.fillText('P(θ|X)', cL + 10, cT + 10);
    ctx.fillStyle = '#1D9E75';
    ctx.fillText("P(θ|X')", cL + 10, cT + 26);

    // overlap of the two output distributions
    let ov = 0,
      tot = 0;
    for (let px = 0; px <= cW; px++) {
      const p1 = laplacePdf(xAt(px), mu1, b),
        p2 = laplacePdf(xAt(px), mu2, b);
      ov += Math.min(p1, p2);
      tot += Math.max(p1, p2);
    }
    const ovPct = tot > 0 ? (ov / tot) * 100 : 100;
    setText('dp-overlap', ovPct.toFixed(0) + '%');
    setColor('dp-overlap', ovPct > 70 ? 'var(--green)' : ovPct > 40 ? 'var(--amber)' : 'var(--red)');
    setText('dp-priv', eps <= 1 ? 'Forte' : eps <= 3 ? 'Moderada' : 'Fraca');
    setColor('dp-priv', eps <= 1 ? 'var(--green)' : eps <= 3 ? 'var(--amber)' : 'var(--red)');
    setText('dp-scale', b.toFixed(2));
  }

  /* ══════════════ SCROLL SPY ══════════════ */
  const groups: Record<string, string[]> = {
    intro: ['intro'],
    attacks: ['attacks', 'linkage', 'inversion'],
    anon: ['anon', 'pseudo', 'hashing', 'kanon'],
    randresp: ['randresp', 'rr-formal', 'rr-math', 'rr-viz'],
    dp: ['dp', 'dp-motiv', 'dp-def', 'laplace', 'dp-viz'],
    dpml: ['dpml', 'logreg', 'dpsgd-algo', 'dpsgd-tradeoff'],
    resumo: ['resumo'],
  };
  const navMap = Object.fromEntries(Object.entries(groups).flatMap(([nav, ids]) => ids.map((id) => [id, nav])));
  scrollSpy(life, {
    linkSelector: '.nav-link', dataKey: 'section', activeClass: 'active', offset: 120,
    ids: Object.values(groups).flat(), navMap,
  });

  /* INIT */
  updateRR();
  updateLap();
  updateDP();

  return { actions: { updateRR, updateLap, updateDP } };
};
