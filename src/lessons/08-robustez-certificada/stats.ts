/** Standard normal sample (Box–Muller). */
export function gaussRand(): number {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const A = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
const B = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
const Cc = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
const D = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];

const tail = (q: number) =>
  (((((Cc[0] * q + Cc[1]) * q + Cc[2]) * q + Cc[3]) * q + Cc[4]) * q + Cc[5]) /
  ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1);

/** Inverse standard normal CDF Φ⁻¹(p) (Acklam's rational approximation), clamped to ±3.5. */
export function probit(p: number): number {
  if (p <= 0) return -3.5;
  if (p >= 1) return 3.5;
  if (p === 0.5) return 0;
  const pLow = 0.02425,
    pHigh = 1 - pLow;
  if (p < pLow) return tail(Math.sqrt(-2 * Math.log(p)));
  if (p <= pHigh) {
    const q = p - 0.5,
      r = q * q;
    return (
      ((((((A[0] * r + A[1]) * r + A[2]) * r + A[3]) * r + A[4]) * r + A[5]) * q) /
      (((((B[0] * r + B[1]) * r + B[2]) * r + B[3]) * r + B[4]) * r + 1)
    );
  }
  return -tail(Math.sqrt(-2 * Math.log(1 - p)));
}
