import { blendPixel, byId, canvas2d, isDark, num, setColor, setText, type RGB } from '../shared/dom';
import { C } from '../shared/palette';
import { scrollSpy } from '../shared/scrollSpy';
import type { LessonSetup } from '../types';

type TransferArch = 'same' | 'similar' | 'diff';

const seedsByArch: Record<TransferArch, number> = { same: 1.05, similar: 1.8, diff: 3.5 };

/** Wavy decision boundary of a model identified by `seed`, at normalised (nx, ny). */
function surfaceBoundary(nx: number, ny: number, seed: number) {
  const j = 0.08 * Math.sin(ny * 10 + seed) + 0.05 * Math.cos(nx * 7 + seed * 2 + ny * 4);
  return 0.45 + 0.2 * Math.sin(ny * 2.5 + seed * 0.5) + j;
}

function drawSurface(cid: string, seed: number): CanvasRenderingContext2D {
  const { ctx, W, H } = canvas2d(cid);
  const img = ctx.createImageData(W, H);
  const dk = isDark();
  const cA: RGB = dk ? [8, 80, 65] : [29, 158, 117],
    cB: RGB = dk ? [100, 52, 52] : [226, 75, 74];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const nx = x / W,
        ny = y / H;
      const bl = 1 / (1 + Math.exp(-(nx - surfaceBoundary(nx, ny, seed)) * 12));
      blendPixel(img.data, (y * W + x) * 4, cA, cB, bl, dk ? 220 : 180);
    }
  }
  ctx.putImageData(img, 0, 0);
  return ctx;
}

/** Deterministic Park–Miller generator so the query points stay put between redraws. */
function lehmer(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

const lossAt = (x: number, y: number) =>
  Math.sin(x * 6 + 1) * 0.3 + Math.cos(y * 5) * 0.2 + ((x - 0.5) ** 2 + (y - 0.5) ** 2) * 2;

export const setup: LessonSetup = (life) => {
  /* ══════════════ TRANSFER-BASED ATTACK SIMULATION ══════════════ */
  let trArch: TransferArch = 'same';

  function setTrArch(a: TransferArch) {
    trArch = a;
    document.querySelectorAll('#trans-viz .bt, #trans .bt').forEach((b) => b.classList.remove('on'));
    byId('tr-btn-' + a).classList.add('on');
    updateTransfer();
  }

  function updateTransfer() {
    const eps = num('tr-eps') / 100;
    setText('tr-eps-val', eps.toFixed(2));
    const seedSub = 1.0;
    const seedTgt = seedsByArch[trArch];

    const ctxS = drawSurface('tr-c-sub', seedSub);
    const ctxT = drawSurface('tr-c-tgt', seedTgt);
    const W = 300,
      H = 200,
      nP = 12;
    let subHits = 0,
      tgtHits = 0;
    const dotColor = C.text();
    for (let i = 0; i < nP; i++) {
      const px = 40 + Math.random() * (W - 80),
        py = 20 + Math.random() * (H - 40);
      const nx = px / W,
        ny = py / H;
      const bS = surfaceBoundary(nx, ny, seedSub);
      const origClassS = nx < bS ? 0 : 1;
      const advNx = nx + eps * (origClassS === 0 ? 1 : -1);
      const advClassS = advNx < bS ? 0 : 1;
      const subSuccess = origClassS !== advClassS;
      if (subSuccess) subHits++;
      const bT = surfaceBoundary(nx, ny, seedTgt);
      const origClassT = nx < bT ? 0 : 1;
      const advClassT = advNx < bT ? 0 : 1;
      const tgtSuccess = origClassT !== advClassT;
      if (subSuccess && tgtSuccess) tgtHits++;
      const dx = eps * W * (origClassS === 0 ? 1 : -1);
      const hit = 'rgba(226,75,74,0.85)',
        miss = 'rgba(29,158,117,0.6)';
      for (const [ctx, ok] of [
        [ctxS, subSuccess],
        [ctxT, subSuccess && tgtSuccess],
      ] as const) {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + dx * 0.6, py);
        ctx.strokeStyle = ok ? hit : miss;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = dotColor;
        ctx.fill();
      }
    }
    const subRate = Math.round((subHits / nP) * 100);
    const tgtRate = subHits > 0 ? Math.round((tgtHits / subHits) * 100) : 0;
    setText('m-sub-acc', subRate + '%');
    setColor('m-sub-acc', subRate > 50 ? 'var(--red)' : 'var(--green)');
    setText('m-tgt-acc', (subHits > 0 ? Math.round((tgtHits / nP) * 100) : 0) + '%');
    setColor('m-tgt-acc', tgtHits > 3 ? 'var(--red)' : 'var(--green)');
    setText('m-tr-rate', tgtRate + '%');
    setColor('m-tr-rate', tgtRate > 60 ? 'var(--red)' : tgtRate > 30 ? 'var(--amber)' : 'var(--green)');
    setText('m-tr-dist', eps.toFixed(2));
  }

  /* ══════════════ FINITE DIFFERENCES SIMULATION ══════════════ */
  function updateFD() {
    const nQ = num('fd-queries');
    const h = num('fd-h') / 100;
    setText('fd-q-val', nQ);
    setText('fd-h-val', h.toFixed(2));
    const { ctx, W, H } = canvas2d('fd-canvas');
    const dk = isDark();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = dk ? '#1e1e1c' : '#f1efe8';
    ctx.fillRect(0, 0, W, H);
    // loss landscape as contour
    const img = ctx.createImageData(W, H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const v = Math.max(0, Math.min(1, (lossAt(x / W, y / H) + 0.5) / 3));
        const i = (y * W + x) * 4;
        if (dk) {
          img.data[i] = Math.round(18 + v * 70);
          img.data[i + 1] = Math.round(18 + v * 45);
          img.data[i + 2] = Math.round(30 + v * 55);
        } else {
          img.data[i] = Math.round(245 - v * 80);
          img.data[i + 1] = Math.round(240 - v * 100);
          img.data[i + 2] = Math.round(250 - v * 50);
        }
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    // current point
    const px = 0.4,
      py = 0.45;
    const sx = px * W,
      sy = py * H;
    ctx.beginPath();
    ctx.arc(sx, sy, 7, 0, Math.PI * 2);
    ctx.fillStyle = dk ? '#e8e6de' : '#1a1a18';
    ctx.fill();
    ctx.strokeStyle = dk ? '#333' : '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    // true (analytical) gradient
    const gxTrue = Math.cos(px * 6 + 1) * 6 * 0.3 + 2 * (px - 0.5) * 2;
    const gyTrue = -Math.sin(py * 5) * 5 * 0.2 + 2 * (py - 0.5) * 2;
    const gMag = Math.sqrt(gxTrue ** 2 + gyTrue ** 2);
    const gnx = gxTrue / gMag,
      gny = gyTrue / gMag;
    const arrowLen = 70;
    const greenC = C.green(),
      blueC = C.blue();
    const arrow = (dx: number, dy: number, color: string) => {
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + dx * arrowLen, sy + dy * arrowLen);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(sx + dx * arrowLen, sy + dy * arrowLen, 6, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    };
    arrow(gnx, gny, greenC);
    // gradient estimated by finite differences
    const dims = Math.min(nQ, 100);
    let estGx = 0,
      estGy = 0;
    const lossCur = lossAt(px, py);
    for (let i = 0; i < dims; i++) {
      const angle = (Math.PI * 2 * i) / dims;
      const dL = (lossAt(px + Math.cos(angle) * h, py + Math.sin(angle) * h) - lossCur) / h;
      estGx += (dL * Math.cos(angle)) / dims;
      estGy += (dL * Math.sin(angle)) / dims;
    }
    const eMag = Math.sqrt(estGx ** 2 + estGy ** 2) || 1;
    const enx = estGx / eMag,
      eny = estGy / eMag;
    arrow(enx, eny, blueC);
    // query sample points around the current point
    for (let i = 0; i < dims; i++) {
      const angle = (Math.PI * 2 * i) / dims;
      ctx.beginPath();
      ctx.arc(sx + Math.cos(angle) * h * W * 0.4, sy + Math.sin(angle) * h * H * 0.4, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = dk ? 'rgba(180,178,169,0.3)' : 'rgba(90,90,85,0.25)';
      ctx.fill();
    }
    // legend
    ctx.font = 'bold 13px "DM Sans",system-ui,sans-serif';
    ctx.fillStyle = greenC;
    ctx.fillText('● Gradiente real', W - 170, 28);
    ctx.fillStyle = blueC;
    ctx.fillText('● Estimado (FD)', W - 170, 48);
    // metrics
    const cosine = gnx * enx + gny * eny;
    const angleErr = (Math.acos(Math.max(-1, Math.min(1, cosine))) * 180) / Math.PI;
    setText('fd-err', angleErr.toFixed(1) + '°');
    setColor('fd-err', angleErr < 15 ? 'var(--green)' : angleErr < 40 ? 'var(--amber)' : 'var(--red)');
    setText('fd-cos', cosine.toFixed(3));
    setColor('fd-cos', cosine > 0.9 ? 'var(--green)' : cosine > 0.6 ? 'var(--amber)' : 'var(--red)');
    setText('fd-dim', dims);
    setText('fd-tot', nQ);
  }

  /* ══════════════ BOUNDARY ATTACK SIMULATION ══════════════ */
  let baSeed = Math.random() * 100;

  function resetBA() {
    baSeed = Math.random() * 100;
    byId<HTMLInputElement>('ba-iter').value = '0';
    updateBA();
  }

  function updateBA() {
    const iter = num('ba-iter');
    setText('ba-iter-val', iter);
    const { ctx, W, H } = canvas2d('ba-canvas');
    const dk = isDark();
    // decision regions
    const img = ctx.createImageData(W, H);
    const cA: RGB = dk ? [12, 55, 45] : [225, 245, 235],
      cB: RGB = dk ? [70, 30, 30] : [252, 230, 230];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const nx = x / W,
          ny = y / H;
        const b = 0.5 + 0.15 * Math.sin(ny * 4 + 0.5) + 0.06 * Math.cos(nx * 6 + ny * 3);
        const bl = 1 / (1 + Math.exp(-(nx - b) * 14));
        blendPixel(img.data, (y * W + x) * 4, cA, cB, bl, 255);
      }
    }
    ctx.putImageData(img, 0, 0);
    // boundary line
    ctx.beginPath();
    for (let y = 0; y < H; y++) {
      const ny = y / H;
      const base = 0.5 + 0.15 * Math.sin(ny * 4 + 0.5);
      const bx = base + 0.06 * Math.cos(base * 6 + ny * 3);
      if (y === 0) ctx.moveTo(bx * W, y);
      else ctx.lineTo(bx * W, y);
    }
    ctx.strokeStyle = dk ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // original point (class A)
    const greenC = C.green(),
      greenDC = C.greenD(),
      redC = C.red();
    const ox = 0.3,
      oy = 0.5;
    ctx.beginPath();
    ctx.arc(ox * W, oy * H, 9, 0, Math.PI * 2);
    ctx.fillStyle = greenC;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.font = 'bold 12px "DM Sans",system-ui,sans-serif';
    ctx.fillStyle = greenDC;
    ctx.fillText('Original', ox * W + 16, oy * H + 5);
    // adversarial trajectory: approach the boundary, then walk along it towards the original
    const startX = 0.8 + 0.1 * Math.sin(baSeed),
      startY = 0.2 + 0.3 * Math.cos(baSeed);
    const boundX = 0.5 + 0.15 * Math.sin(oy * 4 + 0.5) + 0.06 * Math.cos(ox * 6 + oy * 3) + 0.03;
    const positionAt = (t: number): [number, number] => {
      if (t < 0.5) {
        const t2 = t / 0.5;
        const fade = Math.max(0, 1 - t2 * 1.5);
        return [
          startX * (1 - t2) + boundX * t2 + 0.05 * Math.sin(t2 * 8 + baSeed) * fade,
          startY * (1 - t2) + oy * t2 + 0.08 * Math.cos(t2 * 6 + baSeed) * fade,
        ];
      }
      const t2 = (t - 0.5) / 0.5;
      return [boundX + 0.03 * (1 - t2) + 0.01 * Math.sin(t2 * 12 + baSeed) * (1 - t2), oy + 0.02 * Math.sin(t2 * 10 + baSeed) * (1 - t2)];
    };
    const [curX, curY] = positionAt(iter / 100);
    // path
    ctx.beginPath();
    ctx.setLineDash([4, 3]);
    ctx.moveTo(startX * W, startY * H);
    for (let s = 0; s <= iter; s++) {
      const [x2, y2] = positionAt(s / 100);
      ctx.lineTo(x2 * W, y2 * H);
    }
    ctx.strokeStyle = 'rgba(226,75,74,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
    // starting point marker
    if (iter < 5) {
      ctx.beginPath();
      ctx.arc(startX * W, startY * H, 6, 0, Math.PI * 2);
      ctx.fillStyle = redC;
      ctx.globalAlpha = 0.5;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // current adversarial point
    ctx.beginPath();
    ctx.arc(curX * W, curY * H, 8, 0, Math.PI * 2);
    ctx.fillStyle = redC;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // distance line
    ctx.beginPath();
    ctx.setLineDash([2, 4]);
    ctx.moveTo(ox * W, oy * H);
    ctx.lineTo(curX * W, curY * H);
    ctx.strokeStyle = dk ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    const dist = Math.sqrt((curX - ox) ** 2 + (curY - oy) ** 2);
    setText('ba-dist', dist.toFixed(3));
    setColor('ba-dist', dist < 0.1 ? 'var(--green)' : dist < 0.3 ? 'var(--amber)' : 'var(--red)');
    setText('ba-class', curX > 0.5 ? 'Classe B (adversarial)' : 'Classe A (limpa)');
    setColor('ba-class', curX > 0.48 ? 'var(--red)' : 'var(--green)');
    setText('ba-qs', iter * 25);
  }

  /* ══════════════ PAPERNOT SIMULATION ══════════════ */
  function updatePN() {
    const epoch = num('pn-epoch');
    setText('pn-epoch-val', epoch);
    drawSurface('pn-c-oracle', 0.7);
    const subSeed = 3.5 - epoch * 0.4;
    const subCtx = drawSurface('pn-c-sub', subSeed);
    const W = 300,
      H = 200;
    const baseN = 15;
    const nPts = baseN + epoch * 12;
    const rand = lehmer(42);
    const dk = isDark();
    for (let i = 0; i < nPts; i++) {
      let px: number, py: number;
      if (i < baseN) {
        px = rand() * W;
        py = rand() * H;
      } else {
        // Jacobian-augmented samples cluster around the substitute's boundary
        const ny = rand();
        const j = 0.08 * Math.sin(ny * 10 + subSeed) + 0.05 * Math.cos(0.5 * 7 + subSeed * 2 + ny * 4);
        const bx = 0.45 + 0.2 * Math.sin(ny * 2.5 + subSeed * 0.5) + j;
        px = (bx + 0.08 * (rand() - 0.5)) * W;
        py = ny * H;
      }
      subCtx.beginPath();
      subCtx.arc(px, py, 3, 0, Math.PI * 2);
      subCtx.fillStyle = dk ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.9)';
      subCtx.fill();
      subCtx.strokeStyle = dk ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.35)';
      subCtx.lineWidth = 0.8;
      subCtx.stroke();
    }
    const agree = Math.min(95, 50 + epoch * 7 + Math.round(Math.random() * 3));
    const transfer = Math.min(88, 30 + epoch * 10 + Math.round(Math.random() * 4));
    setText('pn-queries', baseN + epoch * baseN * 2);
    setText('pn-agree', agree + '%');
    setColor('pn-agree', agree > 80 ? 'var(--green)' : agree > 60 ? 'var(--amber)' : 'var(--red)');
    setText('pn-transfer', transfer + '%');
    setColor('pn-transfer', transfer > 70 ? 'var(--red)' : transfer > 40 ? 'var(--amber)' : 'var(--green)');
    setText('pn-samples', nPts);
  }

  /* ══════════════ SCROLL SPY ══════════════ */
  scrollSpy(life, {
    linkSelector: '.nav-link', dataKey: 'section', activeClass: 'active', offset: 120,
    ids: ['intro', 'trans', 'trans-viz', 'trans-limits', 'query', 'score', 'score-viz', 'decision', 'decision-viz',
      'papernot', 'papernot-algo', 'papernot-viz', 'papernot-results', 'sota', 'compare'],
    navMap: {
      intro: 'intro', trans: 'trans', 'trans-viz': 'trans', 'trans-limits': 'trans', 'trans-factors': 'trans',
      query: 'query', score: 'query', 'score-viz': 'query', decision: 'query', 'decision-viz': 'query',
      papernot: 'papernot', 'papernot-algo': 'papernot', 'papernot-viz': 'papernot', 'papernot-results': 'papernot',
      sota: 'sota', compare: 'compare',
    },
  });

  /* INIT */
  updateTransfer();
  updateFD();
  resetBA();
  updatePN();

  return {
    actions: {
      setTrArch: (a) => setTrArch(a as TransferArch),
      updateTransfer,
      updateFD,
      updateBA,
      resetBA,
      updatePN,
    },
  };
};
