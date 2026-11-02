/** Small typed DOM helpers shared by the lesson simulations. */

export type RGB = readonly [number, number, number];

export interface Canvas2D {
  cv: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
}

/** Fails loudly: a missing id means the content and the script drifted apart. */
export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento #${id} não encontrado na aula`);
  return el as T;
}

export function canvas2d(id: string): Canvas2D {
  const cv = byId<HTMLCanvasElement>(id);
  const ctx = cv.getContext('2d');
  if (!ctx) throw new Error(`Canvas #${id} sem contexto 2D`);
  return { cv, ctx, W: cv.width, H: cv.height };
}

/** Numeric value of an `<input>` (sliders). */
export function num(id: string): number {
  return Number(byId<HTMLInputElement>(id).value);
}

export function setText(id: string, value: string | number): void {
  byId(id).textContent = String(value);
}

export function setColor(id: string, color: string): void {
  byId(id).style.color = color;
}

export function isDark(): boolean {
  return matchMedia('(prefers-color-scheme:dark)').matches;
}

/** Reader for the CSS custom properties of the lesson theme (canvas cannot use var()). */
export function cssVars(): (name: string) => string {
  const cs = getComputedStyle(document.documentElement);
  return (name) => cs.getPropertyValue(name).trim();
}

/** Click position in canvas pixel coordinates (the canvas is scaled by CSS). */
export function canvasPoint(cv: HTMLCanvasElement, e: MouseEvent): { x: number; y: number } {
  const r = cv.getBoundingClientRect();
  return {
    x: Math.round((e.clientX - r.left) * (cv.width / r.width)),
    y: Math.round((e.clientY - r.top) * (cv.height / r.height)),
  };
}

/** Writes one RGBA pixel blended between two colours (shared by the decision-surface plots). */
export function blendPixel(data: Uint8ClampedArray, i: number, a: RGB, b: RGB, t: number, alpha: number): void {
  data[i] = Math.round(a[0] * (1 - t) + b[0] * t);
  data[i + 1] = Math.round(a[1] * (1 - t) + b[1] * t);
  data[i + 2] = Math.round(a[2] * (1 - t) + b[2] * t);
  data[i + 3] = alpha;
}
