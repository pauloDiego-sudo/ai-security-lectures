import { blendPixel, byId, canvas2d, canvasPoint, isDark, num, setColor, setText, type RGB } from '../shared/dom';
import { scrollSpy } from '../shared/scrollSpy';
import type { LessonSetup } from '../types';

type AtAttack = 'none' | 'fgsm' | 'pgd';
type PPMode = 'orig' | 'adv' | 'blur' | 'quant' | 'jpeg';
type Pixel = [number, number, number];

/* ══════ DEFENSIVE DISTILLATION — SOFTMAX DATA ══════ */
const LG = [5, 2, 0.5, 0.1, -1];
const CL = ['Gato', 'Cao', 'Ave', 'Peixe', 'Sapo'];
const CC = ['#7F77DD', '#1D9E75', '#D85A30', '#378ADD', '#888780'];

/** Softmax with temperature T. */
export function softmax(logits: readonly number[], T: number): number[] {
  const s = logits.map((z) => z / T);
  const mx = Math.max(...s);
  const e = s.map((z) => Math.exp(z - mx));
  const S = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / S);
}

/** Shannon entropy in bits. */
export function entropy(p: readonly number[]): number {
  return -p.reduce((s, v) => s + (v > 1e-10 ? v * Math.log2(v) : 0), 0);
}

const clamp255 = (v: number) => Math.max(0, Math.min(255, v));
const addNoise = (img: readonly Pixel[], noise: readonly Pixel[]): Pixel[] =>
  img.map((p, i) => [clamp255(p[0] + noise[i][0]), clamp255(p[1] + noise[i][1]), clamp255(p[2] + noise[i][2])]);
const randomNoise = (amplitude: number): Pixel => [
  (Math.random() - 0.5) * amplitude,
  (Math.random() - 0.5) * amplitude,
  (Math.random() - 0.5) * amplitude,
];

/* ══════ INPUT PREPROCESSING: per-mode prediction shown next to the image ══════ */
const ppInfo: Record<PPMode, [pred: string, color: string, dist: string, noise: string]> = {
  orig: ['Classe A (98.2%)', 'var(--green)', '0.000', '0%'],
  adv: ['Classe B (87.5%)', 'var(--red)', '0.312', '100%'],
  blur: ['Classe A (72.1%)', 'var(--green)', '0.089', '28%'],
  quant: ['Classe A (81.3%)', 'var(--green)', '0.065', '21%'],
  jpeg: ['Classe A (68.9%)', 'var(--green)', '0.102', '15%'],
};

export const setup: LessonSetup = (life) => {
  /* ══════════════ ADVERSARIAL TRAINING ══════════════ */
  let atAtk: AtAttack = 'none';

  function setATAttack(a: AtAttack) {
    atAtk = a;
    document.querySelectorAll('#at-viz .bt').forEach((b) => b.classList.remove('on'));
    byId('at-btn-' + a).classList.add('on');
    updateAT();
  }

  /** Boundary of the standard (isAT=false) or adversarially trained model after `t` of training. */
  function atBoundary(nx: number, ny: number, t: number, isAT: boolean) {
    if (!isAT) {
      const j = 0.12 * Math.sin(ny * 12) * (1 - t * 0.3) + 0.06 * Math.cos(nx * 8 + ny * 5) * (1 - t * 0.4);
      return 0.5 + 0.15 * Math.sin(ny * 3) + j;
    }
    const s = 1 - Math.exp(-t * 3);
    const j = 0.12 * Math.sin(ny * 12) * (1 - s * 0.85) + 0.06 * Math.cos(nx * 8 + ny * 5) * (1 - s * 0.9);
    return 0.5 + 0.15 * Math.sin(ny * 3) * 1.1 + j;
  }

  function drawATSurf(cid: string, ep: number, isAT: boolean) {
    const { ctx, W, H } = canvas2d(cid);
    const img = ctx.createImageData(W, H);
    const dk = isDark(),
      t = ep / 100;
    const sh = isAT ? 8 + t * 2 : 15 + t * 15;
    const cA: RGB = dk ? [8, 80, 65] : [29, 158, 117],
      cB: RGB = dk ? [60, 52, 137] : [127, 119, 221];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const nx = x / W,
          ny = y / H;
        const bl = 1 / (1 + Math.exp(-(nx - atBoundary(nx, ny, t, isAT)) * sh));
        blendPixel(img.data, (y * W + x) * 4, cA, cB, bl, dk ? 220 : 180);
      }
    }
    ctx.putImageData(img, 0, 0);
    if (atAtk === 'none') return;
    const nP = 8,
      eps = 0.15;
    for (let i = 0; i < nP; i++) {
      const py = 30 + (i * (H - 60)) / (nP - 1),
        px = W * 0.35,
        ny = py / H;
      const b = atBoundary(px / W, ny, t, isAT);
      const sig = 1 / (1 + Math.exp(-(px / W - b) * sh)),
        grad = sig * (1 - sig) * sh;
      const steps = atAtk === 'pgd' ? 7 : 1;
      let ax = px;
      for (let s = 0; s < steps; s++) ax += ((Math.sign(grad) * eps * W) / steps) * 0.8;
      ax = Math.max(0, Math.min(W - 1, ax));
      const oc = px / W > b ? 1 : 0,
        ac = ax / W > b ? 1 : 0,
        ok = oc !== ac;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(ax, py);
      ctx.strokeStyle = ok ? '#E24B4A' : '#888';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ax, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = ok ? '#E24B4A' : '#1D9E75';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }

  function updateAT() {
    const e = num('epoch-sl');
    setText('epoch-val', e);
    drawATSurf('at-c-std', e, false);
    drawATSurf('at-c-adv', e, true);
    const t = e / 100;
    setText('m-as', Math.round(92 + t * 6) + '%');
    setText('m-aa', Math.round(90 + t * 5) + '%');
    if (atAtk === 'none') {
      setText('m-rs', '—');
      setText('m-ra', '—');
    } else if (atAtk === 'fgsm') {
      setText('m-rs', Math.round(Math.max(5, 45 - t * 35)) + '%');
      setText('m-ra', Math.round(Math.min(88, 55 + t * 33)) + '%');
    } else {
      setText('m-rs', Math.round(Math.max(2, 30 - t * 25)) + '%');
      setText('m-ra', Math.round(Math.min(78, 35 + t * 43)) + '%');
    }
  }

  /* ══════════════ DEFENSIVE DISTILLATION — SOFTMAX ══════════════ */
  function updateSM() {
    const T = num('temp-sl');
    setText('temp-val', T.toFixed(1));
    const pr = softmax(LG, T),
      mx = Math.max(...pr),
      gr = (mx * (1 - mx)) / T;
    setText('sm-max', (mx * 100).toFixed(1) + '%');
    setText('sm-ent', entropy(pr).toFixed(2));
    setText('sm-grd', gr.toFixed(4));
    byId('sm-chart').innerHTML = pr
      .map((p, i) => {
        const h = Math.max(1, p * 100);
        return `<div class="bc-c"><div class="bc-v">${(p * 100).toFixed(1)}%</div><div class="bc-a"><div class="bc-f" style="height:${h}%;background:${CC[i]};opacity:.85"></div></div><div class="bc-n">${CL[i]}</div></div>`;
      })
      .join('');
  }

  /* ══════════════ DD — ATTACK VIZ ══════════════ */
  let ddX = 150,
    ddY = 100;
  const ddBoundary = (nx: number, ny: number) => 0.5 + 0.15 * Math.sin(ny * 3.5) + 0.08 * Math.cos(nx * 2);

  function drawDD(cid: string, isD: boolean) {
    const { ctx, W, H } = canvas2d(cid);
    const img = ctx.createImageData(W, H);
    const dk = isDark();
    const cA: RGB = dk ? [8, 80, 65] : [29, 158, 117],
      cB: RGB = dk ? [60, 52, 137] : [127, 119, 221];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const nx = x / W,
          ny = y / H;
        const bl = 1 / (1 + Math.exp(-(nx - ddBoundary(nx, ny)) * (isD ? 6 : 30)));
        blendPixel(img.data, (y * W + x) * 4, cA, cB, bl, dk ? 220 : 180);
      }
    }
    ctx.putImageData(img, 0, 0);
    return ctx;
  }

  function clAt(x: number, y: number, W: number, H: number, isD: boolean) {
    const nx = x / W,
      ny = y / H;
    return 1 / (1 + Math.exp(-(nx - ddBoundary(nx, ny)) * (isD ? 6 : 30))) > 0.5 ? 1 : 0;
  }

  function updateDD() {
    const eps = num('dd-eps');
    setText('dd-eps-val', (eps / 100).toFixed(2));
    (['n', 'd'] as const).forEach((k) => {
      const isD = k === 'd';
      const ctx = drawDD('dd-c-' + k, isD);
      const { width: W, height: H } = ctx.canvas;
      const oc = clAt(ddX, ddY, W, H, isD),
        sh = isD ? 6 : 30,
        nx = ddX / W,
        b = ddBoundary(nx, ddY / H),
        sig = 1 / (1 + Math.exp(-(nx - b) * sh)),
        dx = sig * (1 - sig) * sh;
      const aX = Math.max(0, Math.min(W - 1, Math.round(ddX + Math.sign(dx) * eps * 2))),
        ac = clAt(aX, ddY, W, H, isD);
      ctx.beginPath();
      ctx.arc(ddX, ddY, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#2C2C2A';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ddX, ddY);
      ctx.lineTo(aX, ddY);
      ctx.strokeStyle = '#E24B4A';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(aX, ddY, 4, 0, Math.PI * 2);
      ctx.fillStyle = oc !== ac ? '#E24B4A' : '#1D9E75';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
      byId('dd-r-' + k).innerHTML =
        oc !== ac ? '<span class="bd bd-fl">Classe alterada</span>' : '<span class="bd bd-ok">Classe mantida</span>';
    });
    const v = eps / 100;
    setText('dd-sn', v > 0.08 ? 'Sim' : 'Nao');
    setColor('dd-sn', v > 0.08 ? 'var(--red)' : 'var(--green)');
    setText('dd-sd', v > 0.35 ? 'Sim' : 'Nao');
    setColor('dd-sd', v > 0.35 ? 'var(--red)' : 'var(--green)');
  }

  (['dd-c-n', 'dd-c-d'] as const).forEach((id) => {
    const cv = byId<HTMLCanvasElement>(id);
    life.listen<MouseEvent>(cv, 'click', (e) => {
      ({ x: ddX, y: ddY } = canvasPoint(cv, e));
      updateDD();
    });
  });

  /* ══════════════ INPUT PREPROCESSING ══════════════ */
  const GR = 16;
  const bImg: Pixel[] = [];
  const aNs: Pixel[] = [];
  for (let i = 0; i < GR * GR; i++) {
    const y = Math.floor(i / GR),
      x = i % GR,
      d = Math.sqrt((x - GR / 2) ** 2 + (y - GR / 2) ** 2);
    bImg.push(d < 5 ? [60, 140, 200] : d < 7 ? [100, 180, 140] : [200, 195, 180]);
    aNs.push(randomNoise(80));
  }

  /** 3×3 box blur; `edges` also averages the border pixels over their in-bounds neighbours. */
  function boxBlur(px: Pixel[], edges: boolean): Pixel[] {
    const out = px.map((p) => [...p] as Pixel);
    const lo = edges ? 0 : 1,
      hi = edges ? GR : GR - 1;
    for (let y = lo; y < hi; y++)
      for (let x = lo; x < hi; x++)
        for (let ch = 0; ch < 3; ch++) {
          let s = 0,
            n = 0;
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
              const ny = y + dy,
                nx = x + dx;
              if (ny >= 0 && ny < GR && nx >= 0 && nx < GR) {
                s += px[ny * GR + nx][ch];
                n++;
              }
            }
          out[y * GR + x][ch] = s / n;
        }
    return out;
  }

  function drawPP(mode: PPMode) {
    const { ctx, W: cw } = canvas2d('pp-cv');
    const ps = cw / GR;
    let px: Pixel[] = mode === 'orig' ? bImg.map((p) => [...p] as Pixel) : addNoise(bImg, aNs);
    if (mode === 'blur') px = boxBlur(px, false);
    if (mode === 'quant') {
      const lv = 7;
      px = px.map((p) => p.map((v) => (Math.round((v / 255) * lv) / lv) * 255) as Pixel);
    }
    if (mode === 'jpeg') px = boxBlur(px, true).map((p) => p.map((v) => Math.round(v / 8) * 8) as Pixel);
    ctx.clearRect(0, 0, cw, cw);
    for (let y = 0; y < GR; y++)
      for (let x = 0; x < GR; x++) {
        const p = px[y * GR + x];
        ctx.fillStyle = `rgb(${Math.round(p[0])},${Math.round(p[1])},${Math.round(p[2])})`;
        ctx.fillRect(x * ps, y * ps, ps - 1, ps - 1);
      }
    const [pred, color, dist, noise] = ppInfo[mode];
    setText('pp-pred', pred);
    setColor('pp-pred', color);
    setText('pp-dist', dist);
    setText('pp-noise', noise);
  }

  function setPP(m: PPMode) {
    document.querySelectorAll('#ip-viz .bt').forEach((b) => b.classList.remove('on-b'));
    byId('pp-' + m).classList.add('on-b');
    drawPP(m);
  }

  /* ══════════════ RANDOMIZATION ══════════════ */
  const RG = 10;
  const rB: Pixel[] = [];
  const rP: Pixel[] = [];
  for (let i = 0; i < RG * RG; i++) {
    const y = Math.floor(i / RG),
      x = i % RG,
      d = Math.sqrt((x - RG / 2) ** 2 + (y - RG / 2) ** 2);
    rB.push(d < 3.5 ? [80, 130, 200] : [190, 185, 170]);
    rP.push(randomNoise(60));
  }

  function drawG(cid: string, px: readonly Pixel[], sz: number) {
    const { ctx, W: cw } = canvas2d(cid);
    const ps = cw / sz;
    ctx.clearRect(0, 0, cw, cw);
    ctx.fillStyle = '#ddd';
    ctx.fillRect(0, 0, cw, cw);
    for (let y = 0; y < sz; y++)
      for (let x = 0; x < sz; x++) {
        const p = px[y * sz + x];
        if (!p) continue;
        ctx.fillStyle = `rgb(${Math.round(p[0])},${Math.round(p[1])},${Math.round(p[2])})`;
        ctx.fillRect(x * ps, y * ps, ps - 1, ps - 1);
      }
  }

  function sampleR() {
    drawG('r-orig', rB, RG);
    const adv = addNoise(rB, rP);
    drawG('r-adv', adv, RG);
    // random resize + random padding
    const sc = 0.8 + Math.random() * 0.15,
      ns = Math.round(RG * sc),
      px = Math.floor(Math.random() * (RG - ns)),
      py = Math.floor(Math.random() * (RG - ns));
    const res: Pixel[] = Array.from({ length: RG * RG }, () => [180, 175, 165]);
    for (let y = 0; y < ns; y++)
      for (let x = 0; x < ns; x++) {
        const sy = Math.min(RG - 1, Math.round(y / sc)),
          sx = Math.min(RG - 1, Math.round(x / sc)),
          dy = y + py,
          dx = x + px;
        if (dy < RG && dx < RG) res[dy * RG + dx] = [...adv[sy * RG + sx]];
      }
    drawG('r-res', res, RG);
    setText('r-sc', sc.toFixed(2) + 'x');
    setText('r-pd', `(${px}, ${py})`);
    setText('r-al', Math.min(95, Math.round((1 - sc) * 100 + px * 5 + py * 5)) + '%');
  }

  /* ══════════════ FEATURE SQUEEZING ══════════════ */
  function updateFS() {
    const eps = num('fs-eps') / 100,
      tau = num('fs-tau') / 100;
    setText('fs-ev', eps.toFixed(2));
    setText('fs-tv', tau.toFixed(2));
    const d1 = eps < 0.01 ? Math.random() * 0.03 : eps * 1.8 + Math.random() * 0.08,
      d2 = eps < 0.01 ? Math.random() * 0.02 : eps * 1.4 + Math.random() * 0.06,
      jt = Math.max(d1, d2),
      isA = jt > tau;
    const flag = (v: boolean) => (v ? 'var(--red)' : 'var(--green)');
    setText('fs-d1', d1.toFixed(3));
    setColor('fs-d1', flag(d1 > tau));
    setText('fs-d2', d2.toFixed(3));
    setColor('fs-d2', flag(d2 > tau));
    setText('fs-jt', jt.toFixed(3));
    setColor('fs-jt', flag(isA));
    setText('fs-vd', isA ? 'Adversarial' : 'Legitimo');
    setColor('fs-vd', flag(isA));

    const bc = 'var(--border)';
    const iBg = eps > 0 ? 'var(--red-l)' : 'var(--bg2)',
      iB = eps > 0 ? 'var(--red)' : 'var(--border)';
    const d1C = flag(d1 > tau),
      d2C = flag(d2 > tau);
    const vBg = isA ? 'var(--red-l)' : 'var(--green-l)',
      vBd = isA ? 'var(--red)' : 'var(--green)',
      vC = isA ? 'var(--red-d)' : 'var(--green-d)';
    byId('fs-svg').innerHTML = [
      `<defs><marker id="fa" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>`,
      `<rect x="20" y="90" width="90" height="60" rx="8" fill="${iBg}" stroke="${iB}" stroke-width="1"/><text x="65" y="115" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="500" fill="var(--text)">Input x</text><text x="65" y="133" text-anchor="middle" dominant-baseline="central" font-size="10" fill="var(--text2)">&epsilon;=${eps.toFixed(2)}</text>`,
      `<line x1="110" y1="120" x2="150" y2="78" stroke="${bc}" stroke-width="1" marker-end="url(#fa)"/><line x1="110" y1="120" x2="150" y2="120" stroke="${bc}" stroke-width="1" marker-end="url(#fa)"/><line x1="110" y1="120" x2="150" y2="165" stroke="${bc}" stroke-width="1" marker-end="url(#fa)"/>`,
      `<rect x="152" y="55" width="100" height="46" rx="6" fill="var(--bg2)" stroke="${bc}" stroke-width=".5"/><text x="202" y="72" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="500" fill="var(--text)">Modelo</text><text x="202" y="88" text-anchor="middle" dominant-baseline="central" font-size="10" fill="var(--text2)">g(x)</text>`,
      `<rect x="152" y="100" width="100" height="46" rx="6" fill="var(--blue-l)" stroke="var(--blue)" stroke-width=".5"/><text x="202" y="116" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="500" fill="var(--blue-d)">Bit-depth 3-bit</text><text x="202" y="132" text-anchor="middle" dominant-baseline="central" font-size="10" fill="var(--text2)">g(x_sq1)</text>`,
      `<rect x="152" y="150" width="100" height="46" rx="6" fill="var(--teal-l)" stroke="var(--teal)" stroke-width=".5"/><text x="202" y="166" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="500" fill="var(--teal-d)">Median 3x3</text><text x="202" y="182" text-anchor="middle" dominant-baseline="central" font-size="10" fill="var(--text2)">g(x_sq2)</text>`,
      `<line x1="252" y1="78" x2="320" y2="78" stroke="${bc}" stroke-width="1" marker-end="url(#fa)"/><line x1="252" y1="123" x2="300" y2="110" stroke="${bc}" stroke-width="1"/><line x1="252" y1="173" x2="300" y2="160" stroke="${bc}" stroke-width="1"/>`,
      `<rect x="300" y="95" width="70" height="30" rx="6" fill="var(--bg2)" stroke="${bc}" stroke-width=".5"/><text x="335" y="113" text-anchor="middle" dominant-baseline="central" font-size="10" fill="${d1C}" font-family="var(--mono)">${d1.toFixed(3)}</text>`,
      `<rect x="300" y="145" width="70" height="30" rx="6" fill="var(--bg2)" stroke="${bc}" stroke-width=".5"/><text x="335" y="163" text-anchor="middle" dominant-baseline="central" font-size="10" fill="${d2C}" font-family="var(--mono)">${d2.toFixed(3)}</text>`,
      `<line x1="370" y1="110" x2="415" y2="130" stroke="${bc}" stroke-width="1"/><line x1="370" y1="160" x2="415" y2="145" stroke="${bc}" stroke-width="1"/><line x1="320" y1="78" x2="415" y2="120" stroke="${bc}" stroke-width="1"/>`,
      `<rect x="415" y="115" width="80" height="40" rx="8" fill="var(--bg2)" stroke="${bc}" stroke-width=".5"/><text x="455" y="130" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="500" fill="var(--text)">max(d1,d2)</text><text x="455" y="146" text-anchor="middle" dominant-baseline="central" font-size="10" fill="${flag(isA)}" font-family="var(--mono)">${jt.toFixed(3)}</text>`,
      `<line x1="495" y1="135" x2="540" y2="135" stroke="${bc}" stroke-width="1" marker-end="url(#fa)"/><text x="518" y="126" text-anchor="middle" font-size="9" fill="var(--text3)">> ${tau.toFixed(2)}?</text>`,
      `<rect x="542" y="115" width="115" height="40" rx="10" fill="${vBg}" stroke="${vBd}" stroke-width="1"/><text x="600" y="138" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="600" fill="${vC}">${isA ? 'ADVERSARIAL' : 'LEGITIMO'}</text>`,
    ].join('');
  }

  /* ══════════════ SCROLL SPY ══════════════ */
  const secs = ['intro', 'at', 'at-viz', 'at-limits', 'dd', 'dd-temp', 'dd-pipe', 'dd-math', 'dd-attack', 'ip', 'ip-viz',
    'ip-bpda', 'rand', 'rand-viz', 'fs', 'fs-how', 'fs-viz', 'compare'];
  // Sub-sections map to the nav entry named by their prefix ("dd-temp" → "dd").
  const navMap = Object.fromEntries(secs.map((s) => [s, s.split('-')[0]]));
  scrollSpy(life, { linkSelector: '.nav-link', dataKey: 'section', activeClass: 'active', offset: 120, ids: secs, navMap });

  /* INIT */
  updateAT();
  updateSM();
  life.timeout(updateDD, 100);
  drawPP('orig');
  sampleR();
  updateFS();

  return {
    actions: {
      setATAttack: (a) => setATAttack(a as AtAttack),
      updateAT,
      updateSM,
      updateDD,
      setPP: (m) => setPP(m as PPMode),
      sampleR,
      updateFS,
    },
  };
};
