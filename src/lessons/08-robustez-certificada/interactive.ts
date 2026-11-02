import { blendPixel, canvas2d, isDark, num, setColor, setText, type RGB } from '../shared/dom';
import { C } from '../shared/palette';
import { scrollSpy } from '../shared/scrollSpy';
import type { LessonSetup } from '../types';
import { gaussRand, probit } from './stats';

const CLASS_NAMES = ['Azul', 'Verde', 'Vermelho', 'Amarelo'];

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = Math.PI / 2 + (i * Math.PI * 2) / 5;
    const ox = x + Math.cos(a) * r,
      oy = y - Math.sin(a) * r;
    const a2 = a + Math.PI / 5;
    const ix = x + Math.cos(a2) * r * 0.4,
      iy = y - Math.sin(a2) * r * 0.4;
    if (i === 0) ctx.moveTo(ox, oy);
    else ctx.lineTo(ox, oy);
    ctx.lineTo(ix, iy);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** Base classifier f with 4 organic regions: 0 blue (centre-left), 1 green, 2 red, 3 yellow. */
function classAt(nx: number, ny: number): number {
  // polar coordinates around the centre of the blue blob
  const bx = 0.38,
    by = 0.42;
  const dx = nx - bx,
    dy = ny - by;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  // blue: large organic blob whose radius varies with the angle (indent on the right)
  const blueR =
    0.3 +
    0.08 * Math.sin(angle * 2 + 0.5) +
    0.05 * Math.cos(angle * 3 - 1.0) +
    0.04 * Math.sin(angle * 5 + 2.0) -
    0.06 * Math.max(0, Math.cos(angle - 0.3));

  // green: top-left corner, left strip, bottom-left, wavy fingers, top strip
  const greenScore =
    0.6 * Math.max(0, 0.28 - nx) * Math.max(0, 0.4 - ny) +
    0.3 * Math.max(0, 0.15 - nx) +
    0.25 * Math.max(0, ny - 0.78) * Math.max(0, 0.55 - nx) +
    0.12 * Math.sin(ny * 7 + nx * 3 + 1.5) * Math.max(0, 0.35 - nx) +
    0.18 * Math.max(0, 0.22 - ny) * Math.max(0, 0.65 - nx);

  // red: right side wrapping into the bottom-right
  const redScore =
    0.5 * Math.max(0, nx - 0.58) +
    0.3 * Math.max(0, nx - 0.45) * Math.max(0, ny - 0.55) +
    0.08 * Math.sin(ny * 6 + 2) * Math.max(0, nx - 0.5) +
    0.15 * Math.max(0, nx - 0.7) * Math.max(0, 0.6 - ny);

  // yellow: small pocket between blue and green near the top
  const ydist = Math.sqrt((nx - 0.48) ** 2 + (ny - 0.15) ** 2);
  const yellowScore =
    Math.max(0, 0.12 - ydist) * 3.0 + 0.15 * Math.max(0, 0.2 - ny) * Math.max(0, nx - 0.35) * Math.max(0, 0.6 - nx);

  if (dist < blueR && greenScore < 0.15 && redScore < 0.12 && yellowScore < 0.1) return 0;
  const maxOther = Math.max(greenScore, redScore, yellowScore);
  if (maxOther < 0.05) return 0;
  if (yellowScore === maxOther && yellowScore > 0.08) return 3;
  if (greenScore >= redScore && greenScore > 0.05) return 1;
  if (redScore > greenScore && redScore > 0.05) return 2;
  return 0;
}

export const setup: LessonSetup = (life) => {
  /* ══════════════ LIPSCHITZ SIMULATION ══════════════ */
  function updateLip() {
    const sc1 = num('lip-sc');
    const sc2 = num('lip-sc2');
    const L = num('lip-L');
    setText('lip-sc-val', sc1.toFixed(1));
    setText('lip-sc2-val', sc2.toFixed(1));
    setText('lip-L-val', L);

    const margin = Math.max(0, sc1 - sc2);
    const radius = margin > 0 ? margin / (2 * L) : 0;
    setText('lip-margin', margin.toFixed(1));
    setText('lip-radius', radius.toFixed(3));
    const [label, color] = radius >= 0.5 ? ['Forte', C.green()] : radius >= 0.1 ? ['Moderado', C.amber()] : ['Fraco', C.red()];
    setText('lip-status', label);
    setColor('lip-status', color);

    const { ctx, W, H } = canvas2d('lip-canvas');
    const dk = isDark();
    ctx.fillStyle = dk ? '#1e1e1c' : '#f1efe8';
    ctx.fillRect(0, 0, W, H);

    // score bar chart
    const barW = 60,
      barGap = 30,
      chartLeft = 40,
      chartBottom = H - 40,
      chartTop = 30;
    const maxScore = 22;
    const barH1 = (sc1 / maxScore) * (chartBottom - chartTop);
    const barH2 = (sc2 / maxScore) * (chartBottom - chartTop);

    ctx.strokeStyle = dk ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chartLeft, chartTop);
    ctx.lineTo(chartLeft, chartBottom);
    ctx.stroke();

    ctx.font = '11px "DM Sans",system-ui,sans-serif';
    ctx.fillStyle = C.text3();
    for (let v = 0; v <= 20; v += 5) {
      const y = chartBottom - (v / maxScore) * (chartBottom - chartTop);
      ctx.fillText(String(v), 8, y + 4);
      ctx.beginPath();
      ctx.moveTo(chartLeft, y);
      ctx.lineTo(chartLeft + 200, y);
      ctx.strokeStyle = dk ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
      ctx.stroke();
    }

    // bar 1 (cat)
    const bx1 = chartLeft + barGap;
    ctx.fillStyle = C.blue();
    ctx.beginPath();
    ctx.roundRect(bx1, chartBottom - barH1, barW, barH1, [6, 6, 0, 0]);
    ctx.fill();
    ctx.font = 'bold 13px "DM Sans"';
    ctx.fillStyle = C.blueD();
    ctx.fillText(sc1.toFixed(1), bx1 + barW / 2 - 15, chartBottom - barH1 - 8);
    ctx.font = '12px "DM Sans"';
    ctx.fillStyle = C.text2();
    ctx.fillText('Gato', bx1 + barW / 2 - 14, chartBottom + 18);

    // bar 2 (dog)
    const bx2 = bx1 + barW + barGap;
    ctx.fillStyle = C.coral();
    ctx.beginPath();
    ctx.roundRect(bx2, chartBottom - barH2, barW, barH2, [6, 6, 0, 0]);
    ctx.fill();
    ctx.font = 'bold 13px "DM Sans"';
    ctx.fillStyle = C.text();
    ctx.fillText(sc2.toFixed(1), bx2 + barW / 2 - 15, chartBottom - barH2 - 8);
    ctx.font = '12px "DM Sans"';
    ctx.fillStyle = C.text2();
    ctx.fillText('Cachorro', bx2 + barW / 2 - 24, chartBottom + 18);

    // margin bracket
    if (margin > 0) {
      const my1 = chartBottom - barH1;
      const my2 = chartBottom - barH2;
      const mx = bx2 + barW + 25;
      ctx.strokeStyle = C.purple();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(mx - 5, my1);
      ctx.lineTo(mx, my1);
      ctx.lineTo(mx, my2);
      ctx.lineTo(mx - 5, my2);
      ctx.stroke();
      ctx.font = 'bold 12px "DM Sans"';
      ctx.fillStyle = C.purple();
      ctx.fillText('Margem=' + margin.toFixed(1), mx + 6, (my1 + my2) / 2 + 4);
    }

    // certified radius on the right
    const vizCx = W - 130,
      vizCy = H / 2;
    const maxR = 80;
    const vizR = Math.min(maxR, (radius * maxR) / 1.5);
    if (radius > 0) {
      ctx.beginPath();
      ctx.arc(vizCx, vizCy, vizR, 0, Math.PI * 2);
      ctx.fillStyle = dk ? 'rgba(29,158,117,0.15)' : 'rgba(29,158,117,0.1)';
      ctx.fill();
      ctx.strokeStyle = C.green();
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.beginPath();
    ctx.arc(vizCx, vizCy, 7, 0, Math.PI * 2);
    ctx.fillStyle = C.blue();
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 11px "DM Sans"';
    ctx.fillStyle = C.text2();
    ctx.fillText('x₀', vizCx + 12, vizCy + 4);
    if (radius > 0.01) {
      ctx.fillStyle = C.green();
      ctx.fillText('ε=' + radius.toFixed(3), vizCx - 20, vizCy - vizR - 8);
    }
    ctx.font = '10px "DM Sans"';
    ctx.fillStyle = C.text3();
    ctx.fillText('Zona segura', vizCx - 28, vizCy + vizR + 20);
  }

  /* ══════════════ F vs G INTUITION SIMULATION ══════════════ */
  function updateFG() {
    const sigma = num('fg-sigma') / 100;
    const eps = num('fg-eps') / 100;
    setText('fg-sigma-val', sigma.toFixed(2));
    setText('fg-eps-val', eps.toFixed(2));
    const dk = isDark();

    // ── LEFT CANVAS: decision regions of f + Gaussian level sets
    const { ctx: ctxL, W: WL, H: HL } = canvas2d('fg-canvas-left');
    const imgL = ctxL.createImageData(WL, HL);
    const cols: RGB[] = dk
      ? [[40, 100, 190], [50, 160, 85], [195, 60, 55], [190, 155, 40]]
      : [[75, 140, 225], [90, 190, 110], [225, 90, 80], [230, 205, 70]];

    for (let y = 0; y < HL; y++) {
      for (let x = 0; x < WL; x++) {
        const nx = x / WL,
          ny = y / HL;
        const cl = classAt(nx, ny);
        // darken near boundaries for depth
        const onBorder = classAt(Math.min(1, (x + 2) / WL), ny) !== cl || classAt(nx, Math.min(1, (y + 2) / HL)) !== cl;
        const shade = onBorder ? 0.82 : 1.0;
        const i = (y * WL + x) * 4;
        imgL.data[i] = Math.round(cols[cl][0] * shade);
        imgL.data[i + 1] = Math.round(cols[cl][1] * shade);
        imgL.data[i + 2] = Math.round(cols[cl][2] * shade);
        imgL.data[i + 3] = dk ? 240 : 235;
      }
    }
    ctxL.putImageData(imgL, 0, 0);

    // crisp class boundaries
    ctxL.fillStyle = dk ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.22)';
    for (let y = 1; y < HL - 1; y++) {
      for (let x = 1; x < WL - 1; x++) {
        const c0 = classAt(x / WL, y / HL);
        if (
          c0 !== classAt((x - 1) / WL, y / HL) ||
          c0 !== classAt(x / WL, (y - 1) / HL) ||
          c0 !== classAt((x + 1) / WL, y / HL) ||
          c0 !== classAt(x / WL, (y + 1) / HL)
        ) {
          ctxL.fillRect(x, y, 1, 1);
        }
      }
    }

    // point x and perturbed x'
    const xPt = 0.38,
      yPt = 0.48;
    const xPtp = xPt + eps * 0.8,
      yPtp = yPt - eps * 0.3;

    // Gaussian level sets (concentric dashed circles)
    const nRings = 5;
    const rings = (cx: number, cy: number, color: (alpha: number) => string, dash: number[]) => {
      for (let r = 1; r <= nRings; r++) {
        const alpha = 1 - (r / nRings) * 0.6;
        ctxL.beginPath();
        ctxL.arc(cx * WL, cy * HL, r * sigma * WL * 0.7, 0, Math.PI * 2);
        ctxL.strokeStyle = color(alpha);
        ctxL.lineWidth = r === 1 ? 2 : 1.2;
        ctxL.setLineDash(dash);
        ctxL.stroke();
        ctxL.setLineDash([]);
      }
    };
    rings(xPt, yPt, (a) => (dk ? `rgba(220,220,210,${0.22 * a})` : `rgba(20,20,20,${0.18 * a})`), [5, 4]);

    if (eps > 0.01) {
      rings(xPtp, yPtp, (a) => `rgba(226,75,74,${0.18 * a})`, [3, 5]);
      ctxL.beginPath();
      ctxL.moveTo(xPt * WL, yPt * HL);
      ctxL.lineTo(xPtp * WL, yPtp * HL);
      ctxL.strokeStyle = dk ? 'rgba(226,75,74,0.6)' : 'rgba(226,75,74,0.5)';
      ctxL.lineWidth = 2;
      ctxL.setLineDash([3, 3]);
      ctxL.stroke();
      ctxL.setLineDash([]);
      drawStar(ctxL, xPtp * WL, yPtp * HL, 6, C.red());
      ctxL.fillStyle = dk ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)';
      ctxL.fillRect(xPtp * WL + 8, yPtp * HL - 15, 16, 14);
      ctxL.font = 'bold 11px "DM Sans"';
      ctxL.fillStyle = C.red();
      ctxL.fillText("x'", xPtp * WL + 10, yPtp * HL - 4);
    }

    drawStar(ctxL, xPt * WL, yPt * HL, 9, C.amber());
    ctxL.fillStyle = dk ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)';
    ctxL.fillRect(xPt * WL + 11, yPt * HL - 7, 14, 14);
    ctxL.font = 'bold 12px "DM Sans"';
    ctxL.fillStyle = dk ? '#fff' : '#000';
    ctxL.fillText('x', xPt * WL + 14, yPt * HL + 4);

    // σ ring labels (with backdrop)
    ctxL.font = 'bold 10px "DM Sans"';
    const labelR = sigma * WL * 0.7;
    const backdrop = dk ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)';
    const ink = dk ? '#ccc' : '#444';
    if (labelR > 15) {
      const lx = xPt * WL + labelR + 3,
        ly = yPt * HL - 5;
      ctxL.fillStyle = backdrop;
      ctxL.fillRect(lx - 2, ly - 9, 16, 13);
      ctxL.fillStyle = ink;
      ctxL.fillText('σ', lx, ly);
    }
    if (labelR * 2 > 30) {
      const lx2 = xPt * WL + labelR * 2 + 3,
        ly2 = yPt * HL - 5;
      if (lx2 < WL - 20) {
        ctxL.fillStyle = backdrop;
        ctxL.fillRect(lx2 - 2, ly2 - 9, 22, 13);
        ctxL.fillStyle = ink;
        ctxL.fillText('2σ', lx2, ly2);
      }
    }

    // legend
    const lgX = 6,
      lgY = HL - 60;
    ctxL.fillStyle = dk ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.75)';
    ctxL.beginPath();
    ctxL.roundRect(lgX - 3, lgY - 4, 82, 58, [6, 6, 6, 6]);
    ctxL.fill();
    const lgColsVivid = dk ? ['#4888d0', '#40b858', '#d04038', '#c8a828'] : ['#4b8ce1', '#5abe6e', '#e15a50', '#e6cd46'];
    ctxL.font = 'bold 10px "DM Sans"';
    for (let i = 0; i < 4; i++) {
      ctxL.fillStyle = lgColsVivid[i];
      ctxL.fillRect(lgX, lgY + i * 13, 10, 10);
      ctxL.strokeStyle = dk ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)';
      ctxL.lineWidth = 0.5;
      ctxL.strokeRect(lgX, lgY + i * 13, 10, 10);
      ctxL.fillStyle = dk ? '#ddd' : '#333';
      ctxL.fillText(CLASS_NAMES[i], lgX + 14, lgY + i * 13 + 9);
    }

    // ── votes by Monte Carlo sampling (same noise for x and x')
    const Nsamp = 2000;
    const voteCounts = [0, 0, 0, 0];
    const voteCountsP = [0, 0, 0, 0];
    const inUnit = (v: number) => v >= 0 && v <= 1;
    for (let i = 0; i < Nsamp; i++) {
      const dx = gaussRand() * sigma;
      const dy = gaussRand() * sigma;
      const sx = xPt + dx,
        sy = yPt + dy;
      if (inUnit(sx) && inUnit(sy)) voteCounts[classAt(sx, sy)]++;
      const spx = xPtp + dx,
        spy = yPtp + dy;
      if (inUnit(spx) && inUnit(spy)) voteCountsP[classAt(spx, spy)]++;
    }
    const toProbs = (votes: number[]) => {
      const total = votes.reduce((a, b) => a + b, 0);
      return votes.map((v) => (total > 0 ? v / total : 0));
    };
    const probs = toProbs(voteCounts);
    const probsP = toProbs(voteCountsP);
    const useP = eps > 0.01;
    const displayProbs = useP ? probsP : probs;

    // ── RIGHT CANVAS: integrated probabilities
    const { ctx: ctxR, W: WR, H: HR } = canvas2d('fg-canvas-right');
    ctxR.fillStyle = dk ? '#1e1e1c' : '#f1efe8';
    ctxR.fillRect(0, 0, WR, HR);

    const bcs = dk ? ['#2060A0', '#157050', '#A03030', '#8A5510'] : ['#378ADD', '#1D9E75', '#E24B4A', '#BA7517'];
    const barNames = ['Azul', 'Verde', 'Verm.', 'Amar.'];
    const chartL = 45,
      chartR2 = WR - 15,
      chartT = 40,
      chartB = HR - 35;
    const chartW2 = chartR2 - chartL,
      chartH2 = chartB - chartT;
    const barW2 = (chartW2 / 4) * 0.6;
    const barGap2 = chartW2 / 4;
    const barX = (i: number) => chartL + i * barGap2 + (barGap2 - barW2) / 2;

    ctxR.strokeStyle = dk ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
    ctxR.lineWidth = 1;
    ctxR.beginPath();
    ctxR.moveTo(chartL, chartT);
    ctxR.lineTo(chartL, chartB);
    ctxR.lineTo(chartR2, chartB);
    ctxR.stroke();

    ctxR.font = '10px "DM Sans"';
    ctxR.fillStyle = C.text3();
    for (let v = 0; v <= 100; v += 25) {
      const y = chartB - (v / 100) * chartH2;
      ctxR.fillText(v + '%', 8, y + 3);
      ctxR.beginPath();
      ctxR.moveTo(chartL, y);
      ctxR.lineTo(chartR2, y);
      ctxR.strokeStyle = dk ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
      ctxR.stroke();
    }

    // 50% threshold
    const y50 = chartB - 0.5 * chartH2;
    ctxR.beginPath();
    ctxR.moveTo(chartL, y50);
    ctxR.lineTo(chartR2, y50);
    ctxR.strokeStyle = dk ? 'rgba(226,75,74,0.3)' : 'rgba(226,75,74,0.2)';
    ctxR.lineWidth = 1.5;
    ctxR.setLineDash([4, 4]);
    ctxR.stroke();
    ctxR.setLineDash([]);
    ctxR.font = '9px "DM Sans"';
    ctxR.fillStyle = C.red();
    ctxR.fillText('50%', chartR2 - 22, y50 - 4);

    for (let i = 0; i < 4; i++) {
      const bx = barX(i);
      const bh = displayProbs[i] * chartH2;
      ctxR.fillStyle = bcs[i];
      ctxR.beginPath();
      ctxR.roundRect(bx, chartB - bh, barW2, bh, [4, 4, 0, 0]);
      ctxR.fill();
      ctxR.font = 'bold 10px "JetBrains Mono"';
      ctxR.fillStyle = C.text();
      ctxR.fillText((displayProbs[i] * 100).toFixed(0) + '%', bx + barW2 / 2 - 12, chartB - bh - 6);
      ctxR.font = '10px "DM Sans"';
      ctxR.fillStyle = C.text2();
      ctxR.fillText(barNames[i], bx + barW2 / 2 - 12, chartB + 14);
    }

    // original bars as ghost outlines next to the perturbed ones
    if (useP) {
      for (let i = 0; i < 4; i++) {
        const bh = probs[i] * chartH2;
        ctxR.beginPath();
        ctxR.roundRect(barX(i), chartB - bh, barW2, bh, [4, 4, 0, 0]);
        ctxR.strokeStyle = dk ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)';
        ctxR.lineWidth = 1.5;
        ctxR.setLineDash([3, 3]);
        ctxR.stroke();
        ctxR.setLineDash([]);
      }
    }

    // pA and pB markers
    const [pA, pB] = [...displayProbs].sort((a, b) => b - a);
    const marker = (p: number, stroke: string, color: string, label: string) => {
      const y = chartB - p * chartH2;
      ctxR.beginPath();
      ctxR.moveTo(chartL - 2, y);
      ctxR.lineTo(chartR2 + 2, y);
      ctxR.strokeStyle = stroke;
      ctxR.lineWidth = 1;
      ctxR.setLineDash([6, 3]);
      ctxR.stroke();
      ctxR.setLineDash([]);
      ctxR.font = 'bold 11px "DM Sans"';
      ctxR.fillStyle = color;
      ctxR.fillText(label, chartR2 - 25, y - 5);
    };
    marker(pA, dk ? 'rgba(55,138,221,0.4)' : 'rgba(55,138,221,0.3)', C.blue(), 'p_A');
    marker(pB, dk ? 'rgba(29,158,117,0.4)' : 'rgba(29,158,117,0.3)', C.green(), 'p_B');

    ctxR.font = '11px "DM Sans"';
    ctxR.fillStyle = C.text3();
    ctxR.fillText(useP ? "Votos para x'" : 'Votos para x', chartL + 10, chartT - 12);
    if (useP) {
      ctxR.font = '9px "DM Sans"';
      ctxR.fillText('(tracejado = original)', chartL + 10, chartT - 1);
    }

    // ── metrics
    const fPred = useP ? classAt(xPtp, yPtp) : classAt(xPt, yPt);
    const classColors = [C.blue(), C.green(), C.red(), C.amber()];
    const gPredIdx = displayProbs.indexOf(Math.max(...displayProbs));

    setText('fg-f-pred', CLASS_NAMES[fPred]);
    setColor('fg-f-pred', classColors[fPred]);
    setText('fg-g-pred', CLASS_NAMES[gPredIdx]);
    setColor('fg-g-pred', classColors[gPredIdx]);
    setText('fg-pa', (pA * 100).toFixed(1) + '%');
    setColor('fg-pa', pA > 0.6 ? C.green() : pA > 0.5 ? C.amber() : C.red());

    const certR = pA > 0.5 ? sigma * probit(pA) : 0;
    const isCert = certR > 0 && eps <= certR;
    setText('fg-status', pA <= 0.5 ? 'NAO (p<0.5)' : isCert ? 'SIM (R=' + certR.toFixed(3) + ')' : 'VIOLA (ε>R)');
    setColor('fg-status', isCert ? C.green() : C.red());
  }

  /* ══════════════ RANDOMIZED SMOOTHING SIMULATION ══════════════ */
  function updateRS() {
    const sigma = num('rs-sigma') / 100;
    const N = num('rs-n');
    setText('rs-sigma-val', sigma.toFixed(2));
    setText('rs-n-val', N);

    const { ctx, W, H } = canvas2d('rs-canvas');
    const dk = isDark();
    ctx.fillStyle = dk ? '#1e1e1c' : '#f1efe8';
    ctx.fillRect(0, 0, W, H);

    const boundary = (nx: number, ny: number) => 0.6 + 0.12 * Math.sin(ny * 5) + 0.06 * Math.cos(nx * 4 + ny * 3);
    const img = ctx.createImageData(W, H);
    const cA: RGB = dk ? [8, 60, 85] : [200, 225, 250],
      cB: RGB = dk ? [70, 25, 25] : [250, 215, 215];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const nx = x / W,
          ny = y / H;
        const bl = 1 / (1 + Math.exp(-(nx - boundary(nx, ny)) * 16));
        blendPixel(img.data, (y * W + x) * 4, cA, cB, bl, 255);
      }
    }
    ctx.putImageData(img, 0, 0);

    ctx.beginPath();
    for (let y = 0; y < H; y++) {
      const bx = boundary(0.6, y / H);
      if (y === 0) ctx.moveTo(bx * W, y);
      else ctx.lineTo(bx * W, y);
    }
    ctx.strokeStyle = dk ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // noisy samples around x
    const cx = 0.42,
      cy = 0.45;
    let votesA = 0,
      votesB = 0;
    for (let i = 0; i < N; i++) {
      const sx = cx + gaussRand() * sigma,
        sy = cy + gaussRand() * sigma;
      if (sx < 0 || sx > 1 || sy < 0 || sy > 1) continue;
      const isA = sx < boundary(sx, sy);
      if (isA) votesA++;
      else votesB++;
      // draw at most ~200 sample points
      if (N <= 200 || i % Math.ceil(N / 200) === 0) {
        ctx.beginPath();
        ctx.arc(sx * W, sy * H, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = isA
          ? dk ? 'rgba(55,138,221,0.6)' : 'rgba(55,138,221,0.5)'
          : dk ? 'rgba(226,75,74,0.6)' : 'rgba(226,75,74,0.5)';
        ctx.fill();
      }
    }

    const totalVotes = votesA + votesB;
    const pc = totalVotes > 0 ? Math.max(votesA, votesB) / totalVotes : 0.5;
    const R = pc > 0.5 ? sigma * probit(pc) : 0;

    if (R > 0) {
      ctx.beginPath();
      ctx.arc(cx * W, cy * H, R * W, 0, Math.PI * 2);
      ctx.fillStyle = dk ? 'rgba(29,158,117,0.12)' : 'rgba(29,158,117,0.08)';
      ctx.fill();
      ctx.strokeStyle = C.green();
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    drawStar(ctx, cx * W, cy * H, 8, C.amber());

    setText('rs-votes-a', votesA);
    setColor('rs-votes-a', C.blue());
    setText('rs-votes-b', votesB);
    setColor('rs-votes-b', C.red());
    setText('rs-pc', (pc * 100).toFixed(1) + '%');
    setColor('rs-pc', pc > 0.7 ? C.green() : pc > 0.5 ? C.amber() : C.red());
    setText('rs-R', R > 0 ? R.toFixed(3) : 'FALHA');
    setColor('rs-R', R > 0.3 ? C.green() : R > 0.1 ? C.amber() : C.red());
  }

  /* ══════════════ CONFIDENCE INTERVAL SIMULATION ══════════════ */
  function updateCI() {
    const N = num('ci-n');
    const phat = num('ci-p') / 100;
    const sigma = num('ci-sigma') / 100;
    setText('ci-n-val', N);
    setText('ci-p-val', Math.round(phat * 100) + '%');
    setText('ci-sigma-val', sigma.toFixed(2));

    const Z = 3.29; // 99.9% confidence
    const se = Math.sqrt((phat * (1 - phat)) / N);
    const pLow = Math.max(0, phat - Z * se);
    const rObs = phat > 0.5 ? sigma * probit(phat) : 0;
    const rCert = pLow > 0.5 ? sigma * probit(pLow) : 0;

    setText('ci-phat', (phat * 100).toFixed(1) + '%');
    setText('ci-plow', (pLow * 100).toFixed(1) + '%');
    setColor('ci-plow', pLow > 0.5 ? C.amber() : C.red());
    setText('ci-R-obs', rObs.toFixed(3));
    setColor('ci-R-obs', C.blue());
    setText('ci-R-cert', rCert > 0 ? rCert.toFixed(3) : 'FALHA');
    setColor('ci-R-cert', rCert > 0.3 ? C.green() : rCert > 0.1 ? C.amber() : C.red());

    const { ctx, W, H } = canvas2d('ci-canvas');
    const dk = isDark();
    ctx.fillStyle = dk ? '#1e1e1c' : '#f1efe8';
    ctx.fillRect(0, 0, W, H);

    const chartLeft = 60,
      chartRight = W - 30,
      chartTop = 30,
      chartBottom = H - 40;
    const chartW = chartRight - chartLeft;

    ctx.strokeStyle = dk ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chartLeft, chartBottom);
    ctx.lineTo(chartRight, chartBottom);
    ctx.stroke();

    ctx.font = '11px "DM Sans",system-ui,sans-serif';
    ctx.fillStyle = C.text3();
    for (let v = 0; v <= 100; v += 10) {
      const x = chartLeft + (v / 100) * chartW;
      ctx.beginPath();
      ctx.moveTo(x, chartTop);
      ctx.lineTo(x, chartBottom);
      ctx.strokeStyle = dk ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
      ctx.stroke();
      if (v % 20 === 0) ctx.fillText(v + '%', x - 12, chartBottom + 16);
    }

    // p = 0.5 line
    const x50 = chartLeft + 0.5 * chartW;
    ctx.beginPath();
    ctx.moveTo(x50, chartTop);
    ctx.lineTo(x50, chartBottom);
    ctx.strokeStyle = dk ? 'rgba(226,75,74,0.3)' : 'rgba(226,75,74,0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '10px "DM Sans"';
    ctx.fillStyle = C.red();
    ctx.fillText('p=0.5', x50 - 15, chartTop - 5);

    // observed p̂
    const barY1 = chartTop + 30,
      barH = 35;
    const xPhat = chartLeft + phat * chartW;
    ctx.fillStyle = dk ? 'rgba(186,117,23,0.3)' : 'rgba(186,117,23,0.15)';
    ctx.fillRect(chartLeft, barY1, phat * chartW, barH);
    ctx.fillStyle = C.amber();
    ctx.fillRect(xPhat - 2, barY1, 4, barH);
    ctx.font = 'bold 11px "DM Sans"';
    ctx.fillText('p̂=' + (phat * 100).toFixed(0) + '%', xPhat - 20, barY1 - 6);

    // worst-case lower bound
    const barY2 = barY1 + barH + 20;
    const xPLow = chartLeft + Math.max(0, pLow) * chartW;
    ctx.fillStyle = dk ? 'rgba(226,75,74,0.2)' : 'rgba(226,75,74,0.1)';
    ctx.fillRect(chartLeft, barY2, Math.max(0, pLow) * chartW, barH);
    ctx.fillStyle = C.red();
    ctx.fillRect(xPLow - 2, barY2, 4, barH);
    ctx.font = 'bold 11px "DM Sans"';
    ctx.fillText('p̲=' + (pLow * 100).toFixed(1) + '%', xPLow - 22, barY2 - 6);

    // uncertainty range
    ctx.fillStyle = dk ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
    ctx.fillRect(xPLow, barY1 + barH + 5, xPhat - xPLow, 12);
    ctx.font = '10px "DM Sans"';
    ctx.fillStyle = C.text3();
    if (xPhat - xPLow > 30) ctx.fillText('incerteza', xPLow + (xPhat - xPLow) / 2 - 24, barY1 + barH + 14);

    ctx.font = '11px "DM Sans"';
    ctx.fillStyle = C.text2();
    ctx.fillText('Observado', 5, barY1 + barH / 2 + 4);
    ctx.fillText('Pior caso', 5, barY2 + barH / 2 + 4);

    ctx.font = 'bold 12px "JetBrains Mono"';
    ctx.fillStyle = C.blue();
    ctx.fillText('R=' + rObs.toFixed(3), W - 100, barY1 + barH / 2 + 4);
    ctx.fillStyle = rCert > 0 ? C.green() : C.red();
    ctx.fillText('R=' + (rCert > 0 ? rCert.toFixed(3) : 'FALHA'), W - 100, barY2 + barH / 2 + 4);
  }

  /* ══════════════ TRADEOFF SIMULATION ══════════════ */
  function updateTO() {
    const sigma = num('to-sigma') / 100;
    setText('to-sigma-val', sigma.toFixed(2));

    const { ctx, W, H } = canvas2d('to-canvas');
    const dk = isDark();
    ctx.fillStyle = dk ? '#1e1e1c' : '#f1efe8';
    ctx.fillRect(0, 0, W, H);

    const chartLeft = 55,
      chartRight = W - 20,
      chartTop = 25,
      chartBottom = H - 45;
    const chartW = chartRight - chartLeft,
      chartH = chartBottom - chartTop;
    const gridColor = dk ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
    const xOf = (s: number) => chartLeft + (s / 1.5) * chartW;

    ctx.strokeStyle = dk ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chartLeft, chartTop);
    ctx.lineTo(chartLeft, chartBottom);
    ctx.lineTo(chartRight, chartBottom);
    ctx.stroke();

    ctx.font = '11px "DM Sans"';
    ctx.fillStyle = C.text3();
    [0.05, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5].forEach((s) => {
      const x = xOf(s);
      ctx.fillText(s.toFixed(2), x - 12, chartBottom + 16);
      ctx.beginPath();
      ctx.moveTo(x, chartTop);
      ctx.lineTo(x, chartBottom);
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    });
    ctx.fillText('σ', chartRight - 10, chartBottom + 16);

    for (let v = 0; v <= 100; v += 20) {
      const y = chartBottom - (v / 100) * chartH;
      ctx.fillText(v + '%', 10, y + 4);
      ctx.beginPath();
      ctx.moveTo(chartLeft, y);
      ctx.lineTo(chartRight, y);
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    const accuracy = (s: number) => 0.98 * Math.exp(-2.5 * Math.pow(s, 1.5));
    const near = (s: number) => Math.abs(s - sigma) < 0.004;

    // clean accuracy curve
    ctx.beginPath();
    let accAtSigma = 0;
    for (let i = 0; i <= 200; i++) {
      const s = (i / 200) * 1.5;
      const acc = accuracy(s);
      const y = chartBottom - acc * chartH;
      if (i === 0) ctx.moveTo(xOf(s), y);
      else ctx.lineTo(xOf(s), y);
      if (near(s)) accAtSigma = acc;
    }
    ctx.strokeStyle = C.blue();
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // certified radius curve: R = σ·Φ⁻¹(acc) when acc > 0.5 (normalised to max ~0.8)
    ctx.beginPath();
    let rAtSigma = 0,
      started = false;
    for (let i = 0; i <= 200; i++) {
      const s = (i / 200) * 1.5;
      const acc = accuracy(s);
      const R = acc > 0.5 ? s * probit(acc) : 0;
      const y = chartBottom - Math.min(1, R / 0.8) * chartH;
      if (!started && R > 0) {
        ctx.moveTo(xOf(s), y);
        started = true;
      } else if (started) ctx.lineTo(xOf(s), y);
      if (near(s)) rAtSigma = R;
    }
    ctx.strokeStyle = C.green();
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // % certifiable curve
    ctx.beginPath();
    let certAtSigma = 0;
    for (let i = 0; i <= 200; i++) {
      const s = (i / 200) * 1.5;
      const acc = accuracy(s);
      const certPct = acc > 0.55 ? Math.min(100, (acc - 0.1) * 100 * Math.exp(-0.8 * s)) : 0;
      const y = chartBottom - (certPct / 100) * chartH;
      if (i === 0) ctx.moveTo(xOf(s), y);
      else ctx.lineTo(xOf(s), y);
      if (near(s)) certAtSigma = certPct;
    }
    ctx.strokeStyle = C.purple();
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // current σ
    const sx = xOf(sigma);
    ctx.beginPath();
    ctx.moveTo(sx, chartTop);
    ctx.lineTo(sx, chartBottom);
    ctx.strokeStyle = dk ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    const dot = (y: number, color: string) => {
      ctx.beginPath();
      ctx.arc(sx, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    };
    dot(chartBottom - accAtSigma * chartH, C.blue());
    if (rAtSigma > 0) dot(chartBottom - Math.min(1, rAtSigma / 0.8) * chartH, C.green());

    // legend
    const lx = chartLeft + 10,
      ly = chartTop + 10;
    ctx.font = '11px "DM Sans"';
    ctx.fillStyle = C.blue();
    ctx.fillRect(lx, ly, 12, 3);
    ctx.fillText('Clean Accuracy', lx + 18, ly + 5);
    ctx.fillStyle = C.green();
    ctx.fillRect(lx, ly + 18, 12, 3);
    ctx.fillText('Raio R medio', lx + 18, ly + 23);
    ctx.fillStyle = C.purple();
    ctx.fillRect(lx, ly + 36, 12, 3);
    ctx.fillText('% certificavel', lx + 18, ly + 41);

    setText('to-acc', (accAtSigma * 100).toFixed(1) + '%');
    setColor('to-acc', accAtSigma > 0.8 ? C.green() : accAtSigma > 0.5 ? C.amber() : C.red());
    setText('to-R', rAtSigma.toFixed(3));
    setColor('to-R', rAtSigma > 0.3 ? C.green() : rAtSigma > 0.1 ? C.amber() : C.red());
    setText('to-cert', certAtSigma.toFixed(1) + '%');
    setColor('to-cert', certAtSigma > 50 ? C.green() : certAtSigma > 20 ? C.amber() : C.red());
  }

  /* ══════════════ SCROLL SPY ══════════════ */
  scrollSpy(life, {
    linkSelector: '.nav-link', dataKey: 'section', activeClass: 'active', offset: 120,
    ids: ['intro', 'lipschitz', 'lip-def', 'lip-cert', 'lip-viz', 'lip-limits', 'smoothing', 'smooth-mech', 'smooth-math',
      'smooth-viz', 'practice', 'montecarlo', 'conf-viz', 'tradeoff', 'tradeoff-viz', 'advantages', 'resumo'],
    navMap: {
      intro: 'intro', lipschitz: 'lipschitz', 'lip-def': 'lipschitz', 'lip-cert': 'lipschitz', 'lip-viz': 'lipschitz',
      'lip-limits': 'lipschitz', smoothing: 'smoothing', 'smooth-mech': 'smoothing', 'smooth-math': 'smoothing',
      'smooth-viz': 'smoothing', practice: 'practice', montecarlo: 'practice', 'conf-viz': 'practice',
      tradeoff: 'tradeoff', 'tradeoff-viz': 'tradeoff', advantages: 'tradeoff', resumo: 'resumo',
    },
  });

  /* INIT */
  updateLip();
  updateFG();
  updateRS();
  updateCI();
  updateTO();

  return { actions: { updateLip, updateFG, updateRS, updateCI, updateTO } };
};
