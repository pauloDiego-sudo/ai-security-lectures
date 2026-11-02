import { blendPixel, byId, canvas2d, canvasPoint, isDark, num, setColor, setText, type RGB } from '../shared/dom';
import { scrollSpy } from '../shared/scrollSpy';
import type { LessonSetup } from '../types';

type Activation = 'relu' | 'sigmoid' | 'tanh';
interface Point {
  x: number;
  y: number;
  c: number;
}

const relu = (z: number) => Math.max(0, z);
const sig = (z: number) => 1 / (1 + Math.exp(-z));
const tnh = (z: number) => Math.tanh(z);
const lossF = (t: number) => (t - 3) * (t - 3) * 0.3 + 0.8 * Math.sin(t * 2) + 2;
const lossGrad = (t: number) => {
  const h = 0.001;
  return (lossF(t + h) - lossF(t - h)) / (2 * h);
};

export const setup: LessonSetup = (life) => {
  /* ══════════════ NEURON ══════════════ */
  let actFn: Activation = 'relu';

  const activate = (z: number) => (actFn === 'relu' ? relu(z) : actFn === 'sigmoid' ? sig(z) : tnh(z));
  const actGrad = (z: number) => {
    if (actFn === 'relu') return z > 0 ? 1 : 0;
    if (actFn === 'sigmoid') {
      const s = sig(z);
      return s * (1 - s);
    }
    return 1 - tnh(z) ** 2;
  };

  function setAct(a: Activation) {
    actFn = a;
    document.querySelectorAll('#nn .bt').forEach((b) => b.classList.remove('on'));
    byId('act-' + a).classList.add('on');
    updateNeuron();
  }

  function updateNeuron() {
    const x1 = num('x1'),
      x2 = num('x2');
    const w1 = num('w1') / 10,
      w2 = num('w2') / 10;
    const b = num('nb') / 10;
    setText('x1v', x1);
    setText('x2v', x2);
    setText('w1v', w1.toFixed(1));
    setText('w2v', w2.toFixed(1));
    setText('nbv', b.toFixed(1));
    const z = w1 * x1 + w2 * x2 + b;
    const a = activate(z),
      g = actGrad(z);
    setText('n-z', z.toFixed(2));
    setText('n-a', a.toFixed(4));
    setText('n-g', g.toFixed(4));
    setColor('n-a', a > 0.5 ? 'var(--green)' : 'var(--text)');
    setColor('n-g', g < 0.01 ? 'var(--red)' : 'var(--text)');
  }

  /* ══════════════ DECISION BOUNDARY ══════════════ */
  let dbPts: Point[] = [];
  let dbClass = 0;

  function setDBClass(c: number) {
    dbClass = c;
    byId('db-c0').classList.toggle('on-c', c === 0);
    byId('db-c1').classList.toggle('on-c', c === 1);
  }

  function resetDB() {
    dbPts = [];
    drawDB();
  }

  function drawDB() {
    const { ctx, W, H } = canvas2d('db-canvas');
    const dk = isDark();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = dk ? '#1e1e1c' : '#faf9f6';
    ctx.fillRect(0, 0, W, H);
    const a = dbPts.filter((p) => p.c === 0),
      b = dbPts.filter((p) => p.c === 1);
    setText('db-na', a.length);
    setText('db-nb', b.length);
    if (a.length > 0 && b.length > 0) {
      const cx0 = a.reduce((s, p) => s + p.x, 0) / a.length,
        cy0 = a.reduce((s, p) => s + p.y, 0) / a.length;
      const cx1 = b.reduce((s, p) => s + p.x, 0) / b.length,
        cy1 = b.reduce((s, p) => s + p.y, 0) / b.length;
      const dx = cx1 - cx0,
        dy = cy1 - cy0;
      const mx = (cx0 + cx1) / 2,
        my = (cy0 + cy1) / 2;
      if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
        const img = ctx.createImageData(W, H);
        const cA: RGB = dk ? [10, 70, 56] : [200, 240, 220],
          cB: RGB = dk ? [50, 42, 110] : [220, 210, 240];
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const dot = (x - mx) * dx + (y - my) * dy;
            const v = 1 / (1 + Math.exp(-dot * 0.05));
            blendPixel(img.data, (y * W + x) * 4, cA, cB, v, 60);
          }
        }
        ctx.putImageData(img, 0, 0);
        const len = Math.max(W, H) * 2;
        const n = Math.sqrt(dx * dx + dy * dy);
        ctx.beginPath();
        ctx.moveTo(mx - (dy / n) * len, my + (dx / n) * len);
        ctx.lineTo(mx + (dy / n) * len, my - (dx / n) * len);
        ctx.strokeStyle = dk ? 'rgba(255,255,255,.3)' : 'rgba(0,0,0,.2)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
    dbPts.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = p.c === 0 ? '#1D9E75' : '#7F77DD';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }

  const dbCanvas = byId<HTMLCanvasElement>('db-canvas');
  life.listen<MouseEvent>(dbCanvas, 'click', (e) => {
    dbPts.push({ ...canvasPoint(dbCanvas, e), c: dbClass });
    drawDB();
  });

  /* ══════════════ EVASION VIZ ══════════════ */
  let evX = 200,
    evY = 130;
  const boundaryAt = (nx: number, ny: number) => 0.5 + 0.12 * Math.sin(ny * 4) + 0.08 * Math.cos(nx * 3);

  function drawEvasion() {
    const { ctx, W, H } = canvas2d('ev-canvas');
    const dk = isDark();
    const eps = num('ev-eps');
    setText('ev-ev', (eps / 100).toFixed(2));
    const img = ctx.createImageData(W, H);
    const cA: RGB = dk ? [10, 70, 56] : [29, 158, 117],
      cB: RGB = dk ? [50, 42, 110] : [127, 119, 221];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const nx = x / W,
          ny = y / H;
        const bl = 1 / (1 + Math.exp(-(nx - boundaryAt(nx, ny)) * 25));
        blendPixel(img.data, (y * W + x) * 4, cA, cB, bl, dk ? 200 : 160);
      }
    }
    ctx.putImageData(img, 0, 0);
    const nx = evX / W,
      ny = evY / H,
      b = boundaryAt(nx, ny);
    const origClass = nx > b ? 1 : 0;
    const sh = 25,
      s = 1 / (1 + Math.exp(-(nx - b) * sh)),
      grad = s * (1 - s) * sh;
    const aX = Math.max(0, Math.min(W - 1, Math.round(evX + Math.sign(grad) * eps * 2)));
    const advNx = aX / W,
      advClass = advNx > b ? 1 : 0;
    ctx.beginPath();
    ctx.arc(evX, evY, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (eps > 0) {
      ctx.beginPath();
      ctx.moveTo(evX, evY);
      ctx.lineTo(aX, evY);
      ctx.strokeStyle = '#E24B4A';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(aX, evY, 5, 0, Math.PI * 2);
      ctx.fillStyle = origClass !== advClass ? '#E24B4A' : '#1D9E75';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    setText('ev-orig', origClass === 0 ? 'A (verde)' : 'B (roxo)');
    setText('ev-adv', advClass === 0 ? 'A (verde)' : 'B (roxo)');
    const succ = origClass !== advClass;
    setText('ev-succ', succ ? 'Sim' : 'Nao');
    setColor('ev-succ', succ ? 'var(--red)' : 'var(--green)');
  }

  const evCanvas = byId<HTMLCanvasElement>('ev-canvas');
  life.listen<MouseEvent>(evCanvas, 'click', (e) => {
    ({ x: evX, y: evY } = canvasPoint(evCanvas, e));
    drawEvasion();
  });

  /* ══════════════ GRADIENT DESCENT ══════════════ */
  let gdTheta = 0.5,
    gdStep = 0;
  let gdTrail: Array<{ t: number; l: number }> = [];

  function resetGD() {
    gdTheta = 0.5;
    gdStep = 0;
    gdTrail = [{ t: gdTheta, l: lossF(gdTheta) }];
    drawGD();
  }

  function stepGD() {
    const lr = num('gd-lr') / 100;
    const g = lossGrad(gdTheta);
    gdTheta = Math.max(0.01, Math.min(4.99, gdTheta - lr * g));
    gdStep++;
    gdTrail.push({ t: gdTheta, l: lossF(gdTheta) });
    drawGD();
  }

  function autoGD() {
    for (let i = 0; i < 10; i++) life.timeout(stepGD, i * 200);
  }

  function updateGDLabel() {
    setText('gd-lrv', (num('gd-lr') / 100).toFixed(2));
  }

  function drawGD() {
    const { ctx, W, H } = canvas2d('gd-canvas');
    const dk = isDark();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = dk ? '#1e1e1c' : '#faf9f6';
    ctx.fillRect(0, 0, W, H);
    const px = 40,
      py = 20,
      pw = W - 80,
      ph = H - 60;
    ctx.strokeStyle = dk ? '#444' : '#ddd';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      const x = px + (i * pw) / 5;
      ctx.beginPath();
      ctx.moveTo(x, py);
      ctx.lineTo(x, py + ph);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(px, py + ph);
    ctx.lineTo(px + pw, py + ph);
    ctx.strokeStyle = dk ? '#666' : '#999';
    ctx.lineWidth = 1;
    ctx.stroke();
    const minL = 0.8,
      maxL = 5.0;
    const toScreen = (t: number, l: number) => ({ x: px + (t / 5) * pw, y: py + ph - ((l - minL) / (maxL - minL)) * ph });
    ctx.beginPath();
    for (let i = 0; i <= pw; i++) {
      const t = (i / pw) * 5,
        s = toScreen(t, lossF(t));
      if (i === 0) ctx.moveTo(s.x, s.y);
      else ctx.lineTo(s.x, s.y);
    }
    ctx.strokeStyle = dk ? '#B5D4F4' : '#378ADD';
    ctx.lineWidth = 2;
    ctx.stroke();
    for (let i = 1; i < gdTrail.length; i++) {
      const a = toScreen(gdTrail[i - 1].t, gdTrail[i - 1].l),
        b = toScreen(gdTrail[i].t, gdTrail[i].l);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = 'rgba(216,90,48,.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    const cur = toScreen(gdTheta, lossF(gdTheta));
    ctx.beginPath();
    ctx.arc(cur.x, cur.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#D85A30';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    const g = lossGrad(gdTheta);
    const gLen = Math.min(60, Math.abs(g) * 30) * Math.sign(-g);
    ctx.beginPath();
    ctx.moveTo(cur.x, cur.y);
    ctx.lineTo(cur.x + gLen, cur.y);
    ctx.strokeStyle = '#E24B4A';
    ctx.lineWidth = 2;
    ctx.stroke();
    const head = gLen > 0 ? 6 : -6;
    ctx.beginPath();
    ctx.moveTo(cur.x + gLen, cur.y);
    ctx.lineTo(cur.x + gLen - head, cur.y - 4);
    ctx.moveTo(cur.x + gLen, cur.y);
    ctx.lineTo(cur.x + gLen - head, cur.y + 4);
    ctx.stroke();
    setText('gd-step', gdStep);
    setText('gd-theta', gdTheta.toFixed(3));
    setText('gd-loss', lossF(gdTheta).toFixed(3));
  }

  /* ══════════════ SCROLL SPY ══════════════ */
  const secs = ['intro', 'sl', 'nn', 'geo', 'opt', 'threats', 'tax'];
  const navMap: Record<string, string> = {
    intro: 'intro', sl: 'sl', 'sl-data': 'sl', 'sl-poison': 'sl', nn: 'nn', 'nn-viz': 'nn',
    geo: 'geo', 'geo-db': 'geo', 'geo-manifold': 'geo', 'geo-evasion': 'geo',
    opt: 'opt', 'opt-loss': 'opt', 'opt-gd': 'opt', 'opt-dual': 'opt',
    threats: 'threats', 't-poison': 'threats', 't-evasion': 'threats', 't-backdoor': 'threats',
    't-inversion': 'threats', 't-stealing': 'threats', tax: 'tax',
  };
  scrollSpy(life, {
    linkSelector: '.nl', dataKey: 's', activeClass: 'on', offset: 120,
    ids: [...secs, ...Object.keys(navMap)], navMap,
  });

  /* INIT */
  updateNeuron();
  drawDB();
  drawEvasion();
  resetGD();

  return {
    actions: {
      setAct: (a) => setAct(a as Activation),
      setDBClass: (c) => setDBClass(Number(c)),
      resetDB,
      updateNeuron,
      updateEvasion: drawEvasion,
      stepGD,
      autoGD,
      resetGD,
      updateGDLabel,
    },
  };
};
