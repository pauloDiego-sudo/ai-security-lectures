import { describe, expect, it } from 'vitest';
import { entropy, softmax } from './06-defesas/interactive';
import { probit } from './08-robustez-certificada/stats';
import { laplacePdf, rrEstimate } from './09-privacidade/interactive';

describe('probit (Φ⁻¹)', () => {
  it.each([
    [0.5, 0],
    [0.975, 1.959964],
    [0.8413447, 1],
    [0.01, -2.326348],
    [0.999, 3.090232],
  ])('probit(%f) ≈ %f', (p, z) => {
    expect(probit(p)).toBeCloseTo(z, 4);
  });

  it('é antissimétrica e limitada a ±3.5', () => {
    expect(probit(0.3)).toBeCloseTo(-probit(0.7), 10);
    expect(probit(0)).toBe(-3.5);
    expect(probit(1)).toBe(3.5);
  });
});

describe('softmax com temperatura', () => {
  it('soma 1 e achata com T alto', () => {
    const logits = [5, 2, 0.5];
    const cold = softmax(logits, 1);
    const hot = softmax(logits, 100);
    expect(cold.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(Math.max(...hot)).toBeLessThan(Math.max(...cold));
    expect(entropy(hot)).toBeGreaterThan(entropy(cold));
  });
});

describe('privacidade', () => {
  it('Laplace integra ~1', () => {
    let area = 0;
    for (let x = -50; x <= 50; x += 0.01) area += laplacePdf(x, 0, 2) * 0.01;
    expect(area).toBeCloseTo(1, 2);
  });

  it('randomised response é não-enviesado na esperança', () => {
    // E[raw] = (0.5+γ)p + (0.5−γ)(1−p)
    const p = 0.3,
      g = 0.25;
    const raw = (0.5 + g) * p + (0.5 - g) * (1 - p);
    expect(rrEstimate(raw, g)).toBeCloseTo(p, 10);
  });
});
