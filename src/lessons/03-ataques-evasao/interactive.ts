import { blendPixel, byId, canvas2d, canvasPoint, isDark, num, setText, type RGB } from '../shared/dom';
import { scrollSpy } from '../shared/scrollSpy';
import type { LessonSetup } from '../types';

interface Point {
  x: number;
  y: number;
  c: number;
}
interface InfoCard {
  color: string;
  label: string;
  text: string;
}
interface BoxCard {
  cls: string;
  color: string;
  title: string;
  text: string;
}
type SpecKey = 'u' | 't' | 'c';
type BoxKey = 'w' | 'g' | 'b';
type Goal = 'targeted' | 'untargeted' | 'conf';
type Knowledge = 'whitebox' | 'blackbox' | 'graybox';
type Domain = 'car' | 'med' | 'bio' | 'spam' | 'mal';

/* ══════ SPEC EXPLORER DATA ══════ */
const specData: Record<SpecKey, InfoCard> = {
  u: { color: 'var(--red)', label: 'Untargeted', text: 'O atacante quer apenas que o modelo erre — qualquer classificacao incorreta serve. Exemplo: fazer um sistema de reconhecimento facial falhar em reconhecer qualquer pessoa. E mais facil de executar pois requer apenas cruzar a fronteira de decisao mais proxima, sem se preocupar com qual regiao cruzar.' },
  t: { color: 'var(--amber-d)', label: 'Targeted', text: 'O atacante quer um erro especifico: a entrada deve ser classificada como uma classe-alvo particular. Exemplo: forcando "carro" a ser classificado especificamente como "placa de STOP", ou malware a ser classificado como "benigno". E mais dificil pois exige navegacao para uma regiao especifica do espaco de decisao — nao apenas cruzar a fronteira mais proxima.' },
  c: { color: 'var(--blue-d)', label: 'Reducao de Confianca', text: 'O modelo mantem a predicao correta, mas com confianca muito menor. Exemplo: de 95% para 51% de confianca. Isso perturba sistemas downstream que dependem de limiares de confianca (ex: um sistema medico que so age quando confianca > 80%). E um ataque mais sutil e mais dificil de detectar.' },
};

/* ══════ BOX SELECTOR DATA ══════ */
const boxData: Record<BoxKey, BoxCard> = {
  w: { cls: 'sel-w', color: 'var(--red)', title: 'White-Box', text: 'O atacante tem acesso completo: arquitetura, pesos, gradientes e dados de treino. Pode calcular gradientes diretamente. Representa o pior cenario para o defensor — usado para avaliar cenarios worst-case e construir defesas. FGSM, PGD e C&W sao tipicamente white-box. Em producao, raramente e realista.' },
  g: { cls: 'sel-g', color: 'var(--amber-d)', title: 'Gray-Box', text: 'Conhecimento parcial: sabe o tipo de arquitetura (ex: ResNet), mas nao os pesos especificos. Ou tem acesso ao dataset de treino, mas nao a arquitetura exata. Relevante para sistemas onde a arquitetura e conhecida publicamente mas os pesos sao proprietarios.' },
  b: { cls: 'sel-b', color: 'var(--blue)', title: 'Black-Box', text: 'Apenas acesso via API — envia entradas e observa saidas (labels ou probabilidades). E o cenario mais realista para atacar servicos comerciais de IA. Usa transferibilidade (gera adversariais num modelo surrogate e os transfere) ou ataques baseados em queries (busca iterativa sem gradientes). Mais dificil mas muito mais pratico.' },
};

/* ══════ THREAT MODEL BUILDER DATA ══════ */
const tmGoals: Record<Goal, string> = { targeted: 'Targeted (erro especifico)', untargeted: 'Untargeted (qualquer erro)', conf: 'Reducao de confianca' };
const tmKnows: Record<Knowledge, string> = { whitebox: 'White-box', blackbox: 'Black-box', graybox: 'Gray-box' };
const tmDomains: Record<Domain, string> = { car: 'Carro autonomo', med: 'Diagnostico medico', bio: 'Biometria', spam: 'Filtro de spam', mal: 'Deteccao de malware' };
const tmOutputs: Partial<Record<`${Goal}_${Knowledge}_${Domain}`, string>> = {
  targeted_whitebox_car: '⚠️ Cenario de alto risco. Atacante com acesso total cria perturbacoes targeted para enganar o sistema de percepcao — ex: STOP → Velocidade 45. Ataques FGSM/PGD sao suficientes. Requer testes rigorosos de robustez fisica.',
  targeted_blackbox_car: 'Realista e perigoso. Atacante usa modelo surrogate para gerar exemplos adversariais e os imprime fisicamente (adesivos). Transferibilidade e a chave. Defesas: adversarial training, deteccao de patches anomalos.',
  untargeted_blackbox_car: 'Qualquer confusao do detector. Mais facil de executar, mas menos controlado. Pode causar falha generalizada do sistema. Defesas: ensemble de modelos, smoothing certificado.',
  targeted_whitebox_med: 'Cenario critico. Um adversario com acesso interno poderia forcar diagnosticos falsos. Muito mais dificil de executar na pratica (acesso ao modelo hospitalar). Mas alto impacto etico.',
  targeted_blackbox_med: 'O mais realista para sistemas medicos comerciais. Atacante usa API de diagnostico e usa ataques baseados em queries. Impacto: diagnostico errado sem acesso aos pesos do modelo.',
  conf_blackbox_med: 'Reduzir a confianca de diagnosticos corretos pode fazer o sistema nao agir (ex: confianca < limiar de alerta). Sutil, difícil de detectar, alto impacto clinico.',
  targeted_whitebox_bio: 'Bypassing de autenticacao com acesso total — o mais severo. Vetor: imagem de face perturbada digitalmente para ser reconhecida como outra pessoa.',
  targeted_blackbox_bio: 'Realista. Ataques fisicos com maquiagem adversarial ou oculos especiais. Pesquisas demonstraram eficacia real contra FaceID e sistemas similares.',
  untargeted_blackbox_spam: 'Spammer injeta palavras/caracteres para desviar o classificador — qualquer classificacao como nao-spam serve. Historico de gato e rato entre spammers e filtros.',
  targeted_blackbox_spam: 'Mais especifico: fazer um email especifico (phishing) passar. Uso de sinonimos, erros ortograficos intencionais, codificacao Unicode.',
  targeted_blackbox_mal: 'Malware e modificado para ser classificado como benigno. Tecnicas: adicionar codigo morto, renomear strings. Area muito ativa de pesquisa.',
  untargeted_whitebox_mal: 'Qualquer evasao do antivirus. White-box assume acesso ao modelo interno do AV — possivel em AVs com modelos publicos ou via engenharia reversa.',
};

export const setup: LessonSetup = (life) => {
  /* ══════ FGSM CANVAS ══════ */
  let fgsmX = 220,
    fgsmY = 140;

  function drawFGSM() {
    const { ctx, W, H } = canvas2d('fgsm-canvas');
    const dk = isDark();
    const eps = num('fgsm-eps');
    setText('fgsm-ev', (eps / 100).toFixed(2));

    // Background decision surface
    const img = ctx.createImageData(W, H);
    const cA: RGB = dk ? [10, 70, 56] : [29, 158, 117];
    const cB: RGB = dk ? [50, 42, 110] : [127, 119, 221];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const nx = x / W,
          ny = y / H;
        const bnd = 0.5 + 0.15 * Math.sin(ny * 5) + 0.07 * Math.cos(nx * 4) + 0.05 * Math.sin(nx * ny * 6);
        const bl = 1 / (1 + Math.exp(-(nx - bnd) * 22));
        blendPixel(img.data, (y * W + x) * 4, cA, cB, bl, dk ? 190 : 150);
      }
    }
    ctx.putImageData(img, 0, 0);

    // Simplified boundary curve
    ctx.beginPath();
    for (let y = 0; y <= H; y += 2) {
      const bnd = (0.5 + 0.15 * Math.sin((y / H) * 5)) * W;
      if (y === 0) ctx.moveTo(bnd, y);
      else ctx.lineTo(bnd, y);
    }
    ctx.strokeStyle = dk ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Compute class
    const nx = fgsmX / W,
      ny = fgsmY / H;
    const bnd = 0.5 + 0.15 * Math.sin(ny * 5) + 0.07 * Math.cos(nx * 4);
    const origClass = nx > bnd ? 1 : 0;

    // Gradient direction (simplified: horizontal towards boundary)
    const gradX = origClass === 0 ? 1 : -1;
    const advX = Math.max(0, Math.min(W - 1, Math.round(fgsmX + gradX * eps * 2.2)));
    const advNx = advX / W;
    const advBnd = 0.5 + 0.15 * Math.sin(ny * 5) + 0.07 * Math.cos(advNx * 4);
    const advClass = advNx > advBnd ? 1 : 0;

    if (eps > 0) {
      ctx.beginPath();
      ctx.moveTo(fgsmX, fgsmY);
      ctx.lineTo(advX, fgsmY);
      ctx.strokeStyle = '#E24B4A';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // arrowhead
      const dir = advX > fgsmX ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(advX, fgsmY);
      ctx.lineTo(advX - dir * 8, fgsmY - 5);
      ctx.lineTo(advX - dir * 8, fgsmY + 5);
      ctx.closePath();
      ctx.fillStyle = '#E24B4A';
      ctx.fill();
      // adv point
      ctx.beginPath();
      ctx.arc(advX, fgsmY, 6, 0, Math.PI * 2);
      ctx.fillStyle = origClass !== advClass ? '#E24B4A' : '#1D9E75';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Original point
    ctx.beginPath();
    ctx.arc(fgsmX, fgsmY, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const labels = ['A (verde)', 'B (roxo)'];
    setText('fgsm-orig', labels[origClass]);
    setText('fgsm-adv', eps > 0 ? labels[advClass] : '—');
    const succ = eps > 0 && origClass !== advClass;
    const el = byId('fgsm-succ');
    el.textContent = eps === 0 ? '—' : succ ? 'Sim ✓' : 'Nao ✗';
    el.style.color = eps === 0 ? 'var(--text3)' : succ ? 'var(--red)' : 'var(--teal)';
  }

  const fgsmCanvas = byId<HTMLCanvasElement>('fgsm-canvas');
  life.listen<MouseEvent>(fgsmCanvas, 'click', (e) => {
    ({ x: fgsmX, y: fgsmY } = canvasPoint(fgsmCanvas, e));
    drawFGSM();
  });

  /* ══════ DECISION BOUNDARY CANVAS ══════ */
  let dbPts: Point[] = [];
  let dbClass = 0;

  function setDBC(c: number) {
    dbClass = c;
    byId('db-c0').className = 'bt' + (c === 0 ? ' on-p' : '');
    byId('db-c1').className = 'bt' + (c === 1 ? ' on-p' : '');
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
            const v = 1 / (1 + Math.exp(-dot * 0.06));
            blendPixel(img.data, (y * W + x) * 4, cA, cB, v, 55);
          }
        }
        ctx.putImageData(img, 0, 0);
        const len = Math.max(W, H) * 2;
        const nn = Math.sqrt(dx * dx + dy * dy);
        ctx.beginPath();
        ctx.moveTo(mx - (dy / nn) * len, my + (dx / nn) * len);
        ctx.lineTo(mx + (dy / nn) * len, my - (dx / nn) * len);
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

  /* ══════ SPEC EXPLORER ══════ */
  function showSpec(k: SpecKey) {
    (Object.keys(specData) as SpecKey[]).forEach((s) => {
      byId('sp-btn-' + s).className = 'bt' + (s === k ? ' on-a' : '');
    });
    const d = specData[k];
    byId('spec-info').innerHTML = `<div style="font-weight:600;color:${d.color};margin-bottom:6px">${d.label}</div><p style="margin:0;color:var(--text)">${d.text}</p>`;
  }

  /* ══════ BOX SELECTOR ══════ */
  function selectBox(k: BoxKey) {
    (['w', 'g', 'b'] as const).forEach((s) => {
      byId('bk-' + s).className = 'bk' + (s === k ? ' ' + boxData[s].cls : '');
    });
    const d = boxData[k];
    const info = byId('box-info');
    info.innerHTML = `<strong style="color:${d.color}">${d.title}:</strong> ${d.text}`;
    info.className = 'co co-b';
  }

  /* ══════ THREAT MODEL BUILDER ══════ */
  const tmState: { g: Goal; k: Knowledge; d: Domain } = { g: 'targeted', k: 'blackbox', d: 'med' };

  function setupTMChips() {
    (['g', 'k', 'd'] as const).forEach((key) => {
      const chips = document.querySelectorAll<HTMLElement>(`[data-${key}]`);
      chips.forEach((el) => {
        life.listen(el, 'click', () => {
          chips.forEach((c) => c.classList.remove('active'));
          el.classList.add('active');
          (tmState as Record<typeof key, string>)[key] = el.dataset[key] ?? '';
          renderTM();
        });
      });
    });
  }

  function renderTM() {
    const key = `${tmState.g}_${tmState.k}_${tmState.d}` as const;
    const text =
      tmOutputs[key] ??
      `<em style="color:var(--text3)">Threat model: objetivo <strong>${tmGoals[tmState.g]}</strong>, atacante <strong>${tmKnows[tmState.k]}</strong>, aplicacao <strong>${tmDomains[tmState.d]}</strong>.<br>Analise: este cenario e tecnicamente possivel. Recomenda-se adversarial training e monitoramento de distribuicao de entradas.</em>`;
    byId('tm-output').innerHTML = text;
  }

  /* ══════ SCROLL SPY ══════ */
  const secs = ['intro', 'adv', 'world', 'why', 'tax', 'threat', 'formal', 'papers'];
  const navMap: Record<string, string> = {
    intro: 'intro', adv: 'adv', 'adv-def': 'adv', 'adv-fgsm': 'adv', world: 'world', 'world-phys': 'world',
    'world-domains': 'world', why: 'why', 'why-geom': 'why', 'why-root': 'why', tax: 'tax', 'tax-spec': 'tax',
    'tax-know': 'tax', threat: 'threat', 'threat-builder': 'threat', 'threat-norms': 'threat', formal: 'formal',
    papers: 'papers',
  };
  scrollSpy(life, {
    linkSelector: '.nl', dataKey: 's', activeClass: 'on', offset: 140,
    ids: [...secs, ...Object.keys(navMap)], navMap,
  });

  /* INIT */
  drawFGSM();
  drawDB();
  setDBC(0);
  showSpec('u');
  setupTMChips();
  renderTM();

  return {
    actions: {
      drawFGSM,
      setDBC: (c) => setDBC(Number(c)),
      resetDB,
      showSpec: (k) => showSpec(k as SpecKey),
      selectBox: (k) => selectBox(k as BoxKey),
    },
  };
};
