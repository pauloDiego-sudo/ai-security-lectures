import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { MODULES } from './catalog';
import { Lifecycle } from './shared/lifecycle';

/** jsdom has no canvas: a 2D context whose drawing calls are no-ops. */
function fakeContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const imageData = (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
  const special: Record<string, unknown> = {
    canvas,
    createImageData: imageData,
    getImageData: (_x: number, _y: number, w: number, h: number) => imageData(w, h),
    createRadialGradient: () => ({ addColorStop() {} }),
    createLinearGradient: () => ({ addColorStop() {} }),
    measureText: () => ({ width: 0 }),
  };
  const state: Record<string | symbol, unknown> = {};
  return new Proxy({} as CanvasRenderingContext2D, {
    get: (_t, prop) => (prop in special ? special[prop as string] : prop in state ? state[prop] : () => {}),
    set: (_t, prop, value) => {
      state[prop] = value;
      return true;
    },
  });
}

beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    return fakeContext(this);
  } as never);
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(() => {
  document.body.innerHTML = '';
});

const lessons = MODULES.flatMap((m) => (m.lesson ? [m.lesson] : []));

describe.each(lessons)('aula $slug', (entry) => {
  it('o script inicializa sobre o HTML e cobre todos os handlers', async () => {
    const { default: lesson } = await entry.load();
    document.body.innerHTML = lesson.html;
    const life = new Lifecycle();
    const { actions } = lesson.setup(life);

    const handlers = [...document.querySelectorAll<HTMLElement>('[data-click], [data-input]')];
    expect(handlers.length).toBeGreaterThan(0);
    for (const el of handlers) {
      const name = el.dataset.click ?? el.dataset.input ?? '';
      expect(actions, `handler "${name}" sem ação`).toHaveProperty(name);
      expect(() => actions[name](el.dataset.arg)).not.toThrow();
    }
    life.dispose();
  });

  it('tem link de volta para o índice e barra de progresso', async () => {
    const { default: lesson } = await entry.load();
    document.body.innerHTML = lesson.html;
    expect(document.querySelector('a[data-route="/"]')).not.toBeNull();
    expect(document.getElementById('progress')).not.toBeNull();
  });
});
