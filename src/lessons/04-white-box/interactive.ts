import { byId, canvas2d, cssVars, num, setColor, setText } from '../shared/dom';
import { scrollSpy } from '../shared/scrollSpy';
import type { LessonSetup } from '../types';

type Norm = 'inf' | '2' | '1' | '0';
type FgsmMode = 'untarg' | 'targ';
type IterMode = 'fgsm' | 'ifgsm' | 'pgd';
type UapNorm = 'l2' | 'linf';
type Vec = [number, number];

/* ══════ NORM GEOMETRY DATA ══════ */
const normDescs: Record<Norm, [desc: string, shape: string, corner: string, sparse: string]> = {
  inf: ['L∞: perturbação uniforme em todos os pixels — cada pixel muda no máximo ε. Cria um cubo centrado em x₀.', 'Cubo', 'Alta', 'Não'],
  '2': ['L₂: distância Euclidiana total — perturbação distribuída como ruído. Cria uma esfera centrada em x₀.', 'Esfera', 'Média', 'Não'],
  '1': ['L₁: soma das alterações absolutas — favorece perturbações esparsas. Cria um octaedro/losango.', 'Losango', 'Baixa', 'Moderado'],
  '0': ['L₀: número de pixels alterados — apenas pontos nos eixos coordenados. Ataque esparso extremo.', 'Esparso', 'N/A', 'Máxima'],
};
const normLabels: Record<Norm, string> = { inf: '‖x−x₀‖∞ ≤ ε', '2': '‖x−x₀‖₂ ≤ ε', '1': '‖x−x₀‖₁ ≤ ε', '0': '‖x−x₀‖₀ ≤ k' };

/* ══════ UAP DATA ══════ */
const uapData: Record<UapNorm, { names: string[]; train: number[]; val: number[] }> = {
  l2: {
    names: ['CaffeNet', 'VGG-F', 'VGG-16', 'VGG-19', 'GoogLeNet', 'ResNet-152'],
    train: [85.4, 85.9, 90.7, 86.9, 82.9, 89.7],
    val: [85.6, 87.0, 90.3, 84.5, 82.0, 88.5],
  },
  linf: {
    names: ['CaffeNet', 'VGG-F', 'VGG-16', 'VGG-19', 'GoogLeNet', 'ResNet-152'],
    train: [93.1, 93.8, 78.5, 77.8, 80.8, 85.4],
    val: [93.3, 93.7, 78.3, 77.8, 78.9, 84.0],
  },
};

/* ══════ FGSM helpers ══════ */
/** Boundary x at a given y (wavy). */
function fgsmBoundaryX(W: number, H: number, y: number) {
  const center = W * 0.47;
  return center + 18 * Math.sin((y / H) * Math.PI * 2.5 + 0.4);
}
/** Which class a point falls in. */
function fgsmClassAt(W: number, H: number, px: number, py: number) {
  const bnd = fgsmBoundaryX(W, H, py);
  if (px < bnd) return 'C₁';
  return py < H / 2 ? 'C₂' : 'C₃';
}

/* ══════ DEEPFOOL geometry ══════
   C₁ = background (where x₀ lives), C₂ = circle (target).
   g(x) = R − dist(x, centre): positive inside the circle (C₂), negative outside (C₁). */
const DF_CX = 0.18,
  DF_CY = 0.0; // centre of circle C₂ (normalised coords)
const DF_R = 0.3; // radius of circle C₂
const dfX0x = -0.45,
  dfX0y = 0.05; // x₀ clearly outside the circle (C₁)

function dfG(nx: number, ny: number) {
  const d = Math.sqrt((nx - DF_CX) ** 2 + (ny - DF_CY) ** 2);
  return DF_R - d;
}
/** ∇g points from the point TO the centre: ∇(R − dist) = −(x−c)/‖x−c‖. */
function dfGrad(nx: number, ny: number): Vec {
  const dx = nx - DF_CX,
    dy = ny - DF_CY;
  const d = Math.sqrt(dx * dx + dy * dy) || 1e-9;
  return [-dx / d, -dy / d];
}

export const setup: LessonSetup = (life) => {
  /* ══════ NORM GEOMETRY VISUALIZER ══════ */
  let currentNorm: Norm = 'inf';

  function setNorm(n: Norm) {
    currentNorm = n;
    document.querySelectorAll('#geo-norms .bt').forEach((b) => b.classList.remove('on'));
    byId('nb-' + n).classList.add('on');
    const [desc, shape, corner, sparse] = normDescs[n];
    setText('norm-desc', desc);
    setText('norm-shape', shape);
    setText('norm-corner', corner);
    setText('norm-sparse', sparse);
    drawNorm();
  }

  function drawNorm() {
    const { ctx, W, H } = canvas2d('norm-cv');
    const cx = W / 2,
      cy = H / 2,
      R = Math.min(W, H) * 0.32;
    const clr = cssVars();

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = clr('--bg');
    ctx.fillRect(0, 0, W, H);

    // axes
    ctx.strokeStyle = clr('--border');
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, cy);
    ctx.lineTo(W - 40, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, 30);
    ctx.lineTo(cx, H - 30);
    ctx.stroke();

    // axis labels
    ctx.fillStyle = clr('--text3');
    ctx.font = '13px ' + clr('--mono');
    ctx.textAlign = 'center';
    ctx.fillText('x₁', W - 25, cy - 6);
    ctx.fillText('x₂', cx + 16, 40);
    ctx.fillText('+ε', cx + R + 6, cy - 6);
    ctx.fillText('-ε', cx - R - 8, cy - 6);

    ctx.save();
    const colors: Record<Norm, string> = { inf: clr('--coral'), '2': clr('--blue'), '1': clr('--purple'), '0': clr('--teal') };
    const col = colors[currentNorm];

    ctx.strokeStyle = col;
    ctx.lineWidth = 2.5;
    ctx.fillStyle = col + '22';

    if (currentNorm === 'inf') {
      ctx.beginPath();
      ctx.rect(cx - R, cy - R, 2 * R, 2 * R);
      ctx.fill();
      ctx.stroke();
    } else if (currentNorm === '2') {
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (currentNorm === '1') {
      ctx.beginPath();
      ctx.moveTo(cx, cy - R);
      ctx.lineTo(cx + R, cy);
      ctx.lineTo(cx, cy + R);
      ctx.lineTo(cx - R, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // L0: only the points on the axes
      ctx.fillStyle = col;
      const pts: Vec[] = [
        [cx + R, cy],
        [cx - R, cy],
        [cx, cy - R],
        [cx, cy + R],
      ];
      pts.forEach(([px, py]) => {
        ctx.beginPath();
        ctx.arc(px, py, 10, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.strokeStyle = col + '44';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.rect(cx - R, cy - R, 2 * R, 2 * R);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // centre point x0
    ctx.fillStyle = clr('--text');
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = clr('--bg');
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = clr('--text');
    ctx.textAlign = 'left';
    ctx.font = '13px ' + clr('--serif');
    ctx.fillText('x₀', cx + 10, cy - 6);

    // legend label per norm
    ctx.font = '12px ' + clr('--sans');
    ctx.textAlign = 'center';
    ctx.fillStyle = col;
    ctx.fillText(normLabels[currentNorm], cx, H - 12);
    ctx.restore();
  }

  /* ══════ FGSM VISUALIZER ══════ */
  let fgsmMode: FgsmMode = 'untarg';

  function setFGSMMode(m: FgsmMode) {
    fgsmMode = m;
    byId('fgsm-btn-u').className = 'bt' + (m === 'untarg' ? ' on' : '');
    byId('fgsm-btn-t').className = 'bt' + (m === 'targ' ? ' on' : '');
    updateFGSM();
  }

  function updateFGSM() {
    const eta = num('fgsm-eps') / 100;
    setText('fgsm-eps-v', eta.toFixed(2));

    const { ctx, W, H } = canvas2d('fgsm-cv');
    const clr = cssVars();
    ctx.clearRect(0, 0, W, H);

    // ── decision regions: C1 left (blue), C2 top-right (teal), C3 bottom-right (coral)
    const imgData = ctx.createImageData(W, H);
    const data = imgData.data;
    const alpha = 40;
    for (let y = 0; y < H; y++) {
      const bx = fgsmBoundaryX(W, H, y);
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const [r, g, b] = x < bx ? [55, 138, 221] : y < H / 2 ? [29, 158, 117] : [216, 90, 48];
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = alpha;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // ── curved boundary line
    ctx.strokeStyle = clr('--border');
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    for (let y = 0; y <= H; y += 2) {
      const bx = fgsmBoundaryX(W, H, y);
      if (y === 0) ctx.moveTo(bx, y);
      else ctx.lineTo(bx, y);
    }
    ctx.stroke();
    // horizontal separator (right half only)
    ctx.beginPath();
    ctx.moveTo(fgsmBoundaryX(W, H, H / 2) + 1, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();

    // region labels
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px ' + clr('--sans');
    ctx.fillStyle = clr('--blue-d');
    ctx.fillText('C₁ (original)', 18, H / 2);
    ctx.fillStyle = clr('--teal-d');
    ctx.fillText('C₂', W - 56, H / 4);
    ctx.fillStyle = clr('--coral-d');
    ctx.fillText('C₃', W - 56, (H * 3) / 4);

    // ── x₀ placed 80px left of the boundary so a moderate η crosses it
    const x0y = H * 0.52;
    const x0x = fgsmBoundaryX(W, H, x0y) - 80;

    // ── sign(∇J): roughly perpendicular to the boundary, or towards C₂ when targeted
    let [gx, gy] = fgsmMode === 'untarg' ? [1.0, 0.08] : [0.85, -0.53];
    const gn = Math.sqrt(gx * gx + gy * gy);
    gx /= gn;
    gy /= gn;

    // step length in px: η=0.20 → 50px; η=0.30 → 75px
    const stepLen = eta * 250;
    const advx = x0x + gx * stepLen;
    const advy = x0y + gy * stepLen;

    // ── ε-box around x₀
    const boxPx = stepLen;
    ctx.strokeStyle = clr('--text4');
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(x0x - boxPx, x0y - boxPx, 2 * boxPx, 2 * boxPx);
    ctx.setLineDash([]);
    ctx.fillStyle = clr('--text3');
    ctx.font = '10px ' + clr('--mono');
    ctx.textAlign = 'center';
    ctx.fillText('η=' + eta.toFixed(2), x0x, x0y - boxPx - 4);

    // ── perturbation arrow
    ctx.strokeStyle = clr('--red');
    ctx.lineWidth = 2.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x0x, x0y);
    ctx.lineTo(advx, advy);
    ctx.stroke();
    const angle = Math.atan2(advy - x0y, advx - x0x);
    ctx.fillStyle = clr('--red');
    ctx.beginPath();
    ctx.moveTo(advx, advy);
    ctx.lineTo(advx - 13 * Math.cos(angle - 0.35), advy - 13 * Math.sin(angle - 0.35));
    ctx.lineTo(advx - 13 * Math.cos(angle + 0.35), advy - 13 * Math.sin(angle + 0.35));
    ctx.closePath();
    ctx.fill();

    ctx.font = '11px ' + clr('--mono');
    ctx.fillStyle = clr('--red');
    ctx.textAlign = 'left';
    ctx.fillText('η·sign(∇J)', (x0x + advx) / 2 + 6, (x0y + advy) / 2 - 8);

    // ── x₀
    ctx.fillStyle = clr('--blue');
    ctx.beginPath();
    ctx.arc(x0x, x0y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x0x, x0y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = clr('--text');
    ctx.font = '13px serif';
    ctx.textAlign = 'left';
    ctx.fillText('x₀', x0x - 22, x0y - 12);

    // ── x_adv
    const advClass = fgsmClassAt(W, H, advx, advy);
    const success = advClass !== 'C₁';
    ctx.fillStyle = success ? clr('--red') : clr('--text3');
    ctx.beginPath();
    ctx.arc(advx, advy, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(advx, advy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = clr('--text');
    ctx.font = '12px serif';
    ctx.fillText('x_adv', advx + 11, advy - 9);

    // ── target region in targeted mode
    if (fgsmMode === 'targ') {
      const bx0 = fgsmBoundaryX(W, H, 0);
      ctx.strokeStyle = clr('--teal');
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(bx0 + 4, 0, W - bx0 - 8, H / 2);
      ctx.setLineDash([]);
      ctx.fillStyle = clr('--teal') + '44';
      ctx.fillRect(bx0 + 4, 0, W - bx0 - 8, H / 2);
      ctx.font = '10px ' + clr('--sans');
      ctx.fillStyle = clr('--teal-d');
      ctx.textAlign = 'center';
      ctx.fillText('Classe alvo', W - 45, 16);
    }

    // ── metrics
    setText('fgsm-dist', eta.toFixed(2));
    setText('fgsm-class', advClass);
    setColor('fgsm-class', success ? clr('--red') : clr('--green'));
    setText('fgsm-status', success ? 'Sim ✓' : 'Não ✗');
    setColor('fgsm-status', success ? clr('--green') : clr('--red'));
  }

  /* ══════ ITERATIVE ATTACK VISUALIZER ══════ */
  let iterMode: IterMode = 'fgsm';

  function setIterMode(m: IterMode) {
    iterMode = m;
    (['fgsm', 'ifgsm', 'pgd'] as const).forEach((n) => {
      byId('iter-' + n).className = 'bt' + (n === m ? ' on' : '');
    });
    updateIter();
  }

  function updateIter() {
    const eps = num('iter-eps') / 100;
    const K = num('iter-k');
    setText('iter-eps-v', eps.toFixed(2));
    setText('iter-k-v', K);

    const { ctx, W, H } = canvas2d('iter-cv');
    const clr = cssVars();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = clr('--bg');
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2,
      cy = H / 2,
      scale = W * 0.38;

    // decision regions (circular boundary)
    const r1 = 0.4;
    ctx.fillStyle = clr('--blue') + '18';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = clr('--coral') + '22';
    ctx.beginPath();
    ctx.arc(cx, cy, r1 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = clr('--border');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r1 * scale, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = '13px sans-serif';
    ctx.fillStyle = clr('--coral-d');
    ctx.fillText('C₁ (orig)', cx - 30, cy - 8);
    ctx.fillStyle = clr('--blue-d');
    ctx.fillText('C₂ (advers.)', cx + r1 * scale + 8, cy - 8);

    // x0 (inside C1)
    const x0nx = -0.2,
      x0ny = 0.05;
    const x0px = cx + x0nx * scale,
      x0py = cy + x0ny * scale;

    // epsilon box
    ctx.strokeStyle = clr('--border');
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(x0px - eps * scale, x0py - eps * scale, 2 * eps * scale, 2 * eps * scale);
    ctx.setLineDash([]);
    ctx.font = '10px ' + clr('--mono');
    ctx.fillStyle = clr('--text3');
    ctx.fillText('ε', x0px + eps * scale + 3, x0py);

    // simulated trajectory
    const alpha = eps / Math.max(K, 1);
    const path: Vec[] = [];
    let px: number, py: number;
    if (iterMode === 'pgd') {
      // random start within the eps ball
      const ang = Math.random() * Math.PI * 2,
        r = Math.random() * eps;
      px = x0nx + r * Math.cos(ang);
      py = x0ny + r * Math.sin(ang);
    } else {
      px = x0nx;
      py = x0ny;
    }
    path.push([px, py]);

    const stepsActual = iterMode === 'fgsm' ? 1 : K;
    for (let k = 0; k < stepsActual; k++) {
      // gradient points away from the origin (towards the boundary), with some curvature
      const dist = Math.sqrt(px * px + py * py);
      const gnx = px / dist,
        gny = py / dist;
      const step = iterMode === 'fgsm' ? eps : alpha;
      let npx = px + step * Math.sign(gnx + 0.1 * Math.sin(k * 1.2));
      let npy = py + step * Math.sign(gny + 0.1 * Math.cos(k * 0.9));
      // clip to the eps ball around x0
      npx = Math.max(x0nx - eps, Math.min(x0nx + eps, npx));
      npy = Math.max(x0ny - eps, Math.min(x0ny + eps, npy));
      px = npx;
      py = npy;
      path.push([px, py]);
    }

    const colors: Record<IterMode, string> = { fgsm: clr('--coral'), ifgsm: clr('--teal'), pgd: clr('--purple') };
    const col = colors[iterMode];
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    path.forEach(([nx, ny], i) => {
      const ppx = cx + nx * scale,
        ppy = cy + ny * scale;
      if (i === 0) ctx.moveTo(ppx, ppy);
      else ctx.lineTo(ppx, ppy);
    });
    ctx.stroke();

    path.slice(1, -1).forEach(([nx, ny]) => {
      ctx.fillStyle = col + '88';
      ctx.beginPath();
      ctx.arc(cx + nx * scale, cy + ny * scale, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // x0
    ctx.fillStyle = clr('--blue-d');
    ctx.beginPath();
    ctx.arc(x0px, x0py, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x0px, x0py, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = clr('--text');
    ctx.font = '12px ' + clr('--serif');
    ctx.fillText('x₀', x0px + 10, x0py - 6);

    // final point
    const [finalNx, finalNy] = path[path.length - 1];
    const finalPx = cx + finalNx * scale,
      finalPy = cy + finalNy * scale;
    const finalDist = Math.sqrt(finalNx * finalNx + finalNy * finalNy);
    const success = finalDist > r1;
    ctx.fillStyle = success ? clr('--red') : col;
    ctx.beginPath();
    ctx.arc(finalPx, finalPy, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(finalPx, finalPy, 4, 0, Math.PI * 2);
    ctx.fill();

    // metrics
    const perturbNorm = Math.max(Math.abs(finalNx - x0nx), Math.abs(finalNy - x0ny));
    setText('iter-passos', stepsActual);
    setText('iter-perturb', perturbNorm.toFixed(3));
    setText('iter-loss', finalDist.toFixed(3));
    setText('iter-status', success ? 'Sim ✓' : 'Não ✗');
    setColor('iter-status', success ? clr('--green') : clr('--red'));
  }

  /* ══════ DEEPFOOL VISUALIZER ══════ */
  let dfIter = 0,
    dfPx = dfX0x,
    dfPy = dfX0y;
  let dfHistory: Vec[] = [[dfX0x, dfX0y]];

  function dfStep() {
    if (dfIter >= 15) return;
    const g = dfG(dfPx, dfPy);
    if (g >= 0) return; // already inside — stop
    const [gradx, grady] = dfGrad(dfPx, dfPy);
    const gradNorm2 = gradx * gradx + grady * grady;
    // DeepFool step: move to the local linearised hyperplane, overshoot α=1.05 to cross it
    const step = 1.05 * (-g / gradNorm2);
    dfPx += step * gradx;
    dfPy += step * grady;
    dfIter++;
    dfHistory.push([dfPx, dfPy]);
    drawDeepFool();
  }

  function dfReset() {
    dfIter = 0;
    dfPx = dfX0x;
    dfPy = dfX0y;
    dfHistory = [[dfX0x, dfX0y]];
    drawDeepFool();
  }

  function drawDeepFool() {
    const { ctx, W, H } = canvas2d('df-cv');
    const clr = cssVars();
    const cx = W / 2,
      cy = H / 2,
      scale = W * 0.36;
    const px = (nx: number) => cx + nx * scale;
    const py = (ny: number) => cy + ny * scale;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = clr('--bg');
    ctx.fillRect(0, 0, W, H);

    // background = C₁
    ctx.fillStyle = clr('--blue') + '18';
    ctx.fillRect(0, 0, W, H);

    // circle C₂
    const circPx = px(DF_CX),
      circPy = py(DF_CY),
      circR = DF_R * scale;
    ctx.fillStyle = clr('--coral') + '28';
    ctx.beginPath();
    ctx.arc(circPx, circPy, circR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = clr('--coral');
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(circPx, circPy, circR, 0, Math.PI * 2);
    ctx.stroke();

    // region labels
    ctx.font = 'bold 13px ' + clr('--sans');
    ctx.textAlign = 'center';
    ctx.fillStyle = clr('--coral-d');
    ctx.fillText('C₂ (alvo adversarial)', circPx, circPy + 4);
    ctx.fillStyle = clr('--blue-d');
    ctx.fillText('C₁ (classe original)', px(-0.52), py(-0.3));

    // linearised hyperplane at the current point
    const g = dfG(dfPx, dfPy);
    const [gradx, grady] = dfGrad(dfPx, dfPy);
    const tangLen = 0.48;
    const tx = -grady,
      ty = gradx;
    const tlen = Math.sqrt(tx * tx + ty * ty) || 1;
    // foot of the perpendicular: solves g + ∇g·(foot−p) = 0
    const gn2 = gradx * gradx + grady * grady || 1;
    const footNx = dfPx + (-g / gn2) * gradx;
    const footNy = dfPy + (-g / gn2) * grady;
    ctx.strokeStyle = clr('--purple') + 'bb';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([7, 4]);
    ctx.beginPath();
    ctx.moveTo(px(footNx + (tx / tlen) * tangLen), py(footNy + (ty / tlen) * tangLen));
    ctx.lineTo(px(footNx - (tx / tlen) * tangLen), py(footNy - (ty / tlen) * tangLen));
    ctx.stroke();
    ctx.setLineDash([]);

    const hLabelX = px(footNx + (tx / tlen) * tangLen * 0.9);
    const hLabelY = py(footNy + (ty / tlen) * tangLen * 0.9) - 10;
    ctx.fillStyle = clr('--purple');
    ctx.font = '10px ' + clr('--mono');
    ctx.textAlign = 'left';
    ctx.fillText('hiperplano local', hLabelX, hLabelY);

    // projection arrow (current point → foot of perpendicular)
    if (dfIter > 0 && g < 0) {
      ctx.strokeStyle = clr('--amber');
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(px(dfPx), py(dfPy));
      ctx.lineTo(px(footNx), py(footNy));
      ctx.stroke();
      const ang = Math.atan2(py(footNy) - py(dfPy), px(footNx) - px(dfPx));
      ctx.fillStyle = clr('--amber');
      ctx.beginPath();
      ctx.moveTo(px(footNx), py(footNy));
      ctx.lineTo(px(footNx) - 12 * Math.cos(ang - 0.32), py(footNy) - 12 * Math.sin(ang - 0.32));
      ctx.lineTo(px(footNx) - 12 * Math.cos(ang + 0.32), py(footNy) - 12 * Math.sin(ang + 0.32));
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = clr('--amber');
      ctx.font = '10px ' + clr('--mono');
      ctx.textAlign = 'center';
      ctx.fillText('projeção', (px(dfPx) + px(footNx)) / 2 + 18, (py(dfPy) + py(footNy)) / 2 - 8);
    }

    // full trajectory
    if (dfHistory.length > 1) {
      ctx.strokeStyle = clr('--teal') + '99';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      dfHistory.forEach(([nx, ny], i) => {
        if (i === 0) ctx.moveTo(px(nx), py(ny));
        else ctx.lineTo(px(nx), py(ny));
      });
      ctx.stroke();
      ctx.setLineDash([]);
      dfHistory.slice(1, -1).forEach(([nx, ny]) => {
        ctx.fillStyle = clr('--teal') + '77';
        ctx.beginPath();
        ctx.arc(px(nx), py(ny), 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // x₀
    ctx.fillStyle = clr('--blue');
    ctx.beginPath();
    ctx.arc(px(dfX0x), py(dfX0y), 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px(dfX0x), py(dfX0y), 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = clr('--text');
    ctx.font = '13px serif';
    ctx.textAlign = 'left';
    ctx.fillText('x₀', px(dfX0x) + 12, py(dfX0y) - 8);

    // current point x⁽ᵏ⁾
    const success = dfG(dfPx, dfPy) >= 0;
    ctx.fillStyle = success ? clr('--red') : clr('--teal');
    ctx.beginPath();
    ctx.arc(px(dfPx), py(dfPy), 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px(dfPx), py(dfPy), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = clr('--text');
    ctx.font = '12px serif';
    ctx.textAlign = 'left';
    ctx.fillText('x⁽' + dfIter + '⁾', px(dfPx) + 12, py(dfPy) - 9);

    const totalDist = Math.sqrt((dfPx - dfX0x) ** 2 + (dfPy - dfX0y) ** 2);
    setText('df-iter', dfIter);
    setText('df-dist', totalDist.toFixed(4));
    setText('df-g', dfG(dfPx, dfPy).toFixed(4));
    setText('df-status', success ? 'C₂ ✓ cruzou!' : 'C₁ — ainda fora');
    setColor('df-status', success ? clr('--red') : clr('--blue'));
  }

  /* ══════ C&W VISUALIZER ══════ */
  function updateCW() {
    const lam = num('cw-lambda') / 100;
    setText('cw-lambda-v', lam.toFixed(2));

    const { ctx, W, H } = canvas2d('cw-cv');
    const clr = cssVars();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = clr('--bg');
    ctx.fillRect(0, 0, W, H);

    const pts = 80;
    const margin = 24;
    const pw = W - 2 * margin,
      ph = H - 2 * margin;

    // axes
    ctx.strokeStyle = clr('--border');
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, margin);
    ctx.lineTo(margin, H - margin);
    ctx.lineTo(W - margin, H - margin);
    ctx.stroke();
    ctx.fillStyle = clr('--text3');
    ctx.font = '11px ' + clr('--mono');
    ctx.fillText('λ →', W - margin - 20, H - margin + 14);
    ctx.fillText('valor', margin - 5, margin - 6);

    const curve = (f: (x: number) => number) => Array.from({ length: pts }, (_, i) => f(i / (pts - 1)));
    // distance decreases as λ grows (with a floor)
    const distVals = curve((x) => 0.1 + 0.85 * Math.exp(-5 * x));
    // loss margin increases then plateaus
    const marginVals = curve((x) => Math.min(0.95, 0.05 + 0.9 * (1 - Math.exp(-4 * x))));
    // convergence speed: high at the extremes, low in the middle
    const itersVals = curve((x) => 0.1 + 0.8 * Math.exp(-10 * (x - 0.15) * (x - 0.15)));

    const drawCurve = (vals: number[], col: string, label: string, labelY: number) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      vals.forEach((v, i) => {
        const px = margin + (i / (pts - 1)) * pw,
          py = H - margin - v * ph;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.font = '11px sans-serif';
      ctx.fillText(label, W - margin - 80, labelY);
    };

    drawCurve(distVals, clr('--blue'), '‖r‖₂ (distância)', margin + 12);
    drawCurve(marginVals, clr('--red'), 'Confiança ataque', margin + 30);
    // drawCurve resets the dash, so this curve is drawn solid — same as the original page.
    ctx.setLineDash([4, 3]);
    drawCurve(itersVals, clr('--amber'), 'Velocidade conv.', margin + 48);
    ctx.setLineDash([]);

    // current λ marker
    const curX = margin + lam * pw;
    ctx.strokeStyle = clr('--purple');
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(curX, margin);
    ctx.lineTo(curX, H - margin);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = clr('--purple');
    const ci = Math.round(lam * (pts - 1));
    ctx.beginPath();
    ctx.arc(curX, H - margin - distVals[ci] * ph, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(curX, H - margin - marginVals[ci] * ph, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '11px ' + clr('--mono');
    ctx.fillText('λ=' + lam.toFixed(2), curX + 4, margin + 8);

    // metrics for the current λ
    const li = Math.min(Math.round(lam * 100), pts - 1);
    const dist = distVals[li];
    const conf = marginVals[li];
    const iters = Math.round(10 + (1 - itersVals[li]) * 80);
    const success = conf > 0.3;

    setText('cw-dist', (dist * 0.5).toFixed(3));
    setText('cw-conf', (conf * 100).toFixed(0) + '%');
    setColor('cw-conf', conf > 0.5 ? clr('--green') : clr('--red'));
    setText('cw-iters', iters);
    setText('cw-status', success ? 'Sim ✓' : 'Não ✗');
    setColor('cw-status', success ? clr('--green') : clr('--red'));
  }

  /* ══════ UAP FOOLING RATE CHART ══════ */
  let uapNorm: UapNorm = 'l2';

  function setUAPNorm(n: UapNorm) {
    uapNorm = n;
    byId('uap-l2').className = 'bt' + (n === 'l2' ? ' on' : '');
    byId('uap-linf').className = 'bt' + (n === 'linf' ? ' on' : '');
    drawUAP();
  }

  function drawUAP() {
    const { ctx, W, H } = canvas2d('uap-cv');
    const clr = cssVars();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = clr('--bg');
    ctx.fillRect(0, 0, W, H);

    const data = uapData[uapNorm];
    const n = data.names.length;
    const mg = 30,
      bw = (W - 2 * mg) / (n * 2.4);
    const maxV = 100,
      ph = H - mg * 2;

    // grid lines
    [25, 50, 75, 100].forEach((v) => {
      const y = H - mg - (v / maxV) * ph;
      ctx.strokeStyle = clr('--border-l');
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(mg, y);
      ctx.lineTo(W - mg / 2, y);
      ctx.stroke();
      ctx.fillStyle = clr('--text3');
      ctx.font = '10px ' + clr('--mono');
      ctx.fillText(v + '%', mg - 24, y + 4);
    });
    ctx.setLineDash([]);

    data.names.forEach((name, i) => {
      const gx = mg + (i * (W - 2 * mg)) / n + (W - 2 * mg) / (n * 2) - bw * 1.1;
      const tv = data.train[i];
      const th = (tv / maxV) * ph;
      ctx.fillStyle = clr('--blue') + 'cc';
      ctx.beginPath();
      ctx.roundRect(gx, H - mg - th, bw, th, [4, 4, 0, 0]);
      ctx.fill();
      const vv = data.val[i];
      const vh = (vv / maxV) * ph;
      ctx.fillStyle = clr('--teal') + 'cc';
      ctx.beginPath();
      ctx.roundRect(gx + bw + 3, H - mg - vh, bw, vh, [4, 4, 0, 0]);
      ctx.fill();
      ctx.fillStyle = clr('--text2');
      ctx.font = '10px ' + clr('--mono');
      ctx.textAlign = 'center';
      ctx.fillText(tv + '%', gx + bw / 2, H - mg - th - 4);
      ctx.fillText(vv + '%', gx + bw + 3 + bw / 2, H - mg - vh - 4);
      ctx.fillStyle = clr('--text3');
      ctx.font = '9px sans-serif';
      ctx.fillText(name.replace('Net', '').replace('ResNet-', 'Res-'), gx + bw + 1.5, H - mg + 12);
    });
    ctx.textAlign = 'left';

    // legend
    ctx.fillStyle = clr('--blue') + 'cc';
    ctx.fillRect(mg, mg - 10, 14, 10);
    ctx.fillStyle = clr('--text2');
    ctx.font = '11px sans-serif';
    ctx.fillText('Treino (X)', mg + 18, mg - 1);
    ctx.fillStyle = clr('--teal') + 'cc';
    ctx.fillRect(mg + 90, mg - 10, 14, 10);
    ctx.fillStyle = clr('--text2');
    ctx.fillText('Validação', mg + 108, mg - 1);

    const vals = [...data.train, ...data.val];
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    setText('uap-mean', mean.toFixed(1) + '%');
    setText('uap-max', Math.max(...vals).toFixed(1) + '%');
  }

  /* ══════ SCROLL SPY ══════ */
  scrollSpy(life, {
    linkSelector: '.nav-link', dataKey: 'section', activeClass: 'active', offset: 120,
    ids: ['intro', 'formulation', 'geo', 'taxonomy', 'fgsm', 'ifgsm', 'deepfool', 'cw', 'uap', 'compare'],
  });

  /* INIT */
  drawNorm();
  updateFGSM();
  updateIter();
  drawDeepFool();
  updateCW();
  drawUAP();

  return {
    actions: {
      setNorm: (n) => setNorm(n as Norm),
      setFGSMMode: (m) => setFGSMMode(m as FgsmMode),
      updateFGSM,
      setIterMode: (m) => setIterMode(m as IterMode),
      updateIter,
      dfStep,
      dfReset,
      updateCW,
      setUAPNorm: (n) => setUAPNorm(n as UapNorm),
    },
  };
};
