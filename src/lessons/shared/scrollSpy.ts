import { byId } from './dom';
import type { Lifecycle } from './lifecycle';

export interface ScrollSpyOptions {
  /** Selector of the nav links that get highlighted. */
  linkSelector: string;
  /** `data-*` key on each link holding its section id (`s` or `section`). */
  dataKey: string;
  activeClass: string;
  /** Element ids checked in order; the last one above the fold wins. */
  ids: readonly string[];
  /** Maps a sub-section id to the nav entry it belongs to. */
  navMap?: Readonly<Record<string, string>>;
  offset: number;
}

/** Reading-progress bar (#progress) plus active-section highlight in the sticky nav. */
export function scrollSpy(life: Lifecycle, opts: ScrollSpyOptions): void {
  const links = document.querySelectorAll<HTMLElement>(opts.linkSelector);
  const bar = byId('progress');

  const onScroll = () => {
    const sy = window.scrollY;
    const dh = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = Math.min(100, (sy / dh) * 100) + '%';
    let cur = 'intro';
    for (const id of opts.ids) {
      const el = document.getElementById(id);
      if (el && el.offsetTop - opts.offset <= sy) cur = id;
    }
    const target = opts.navMap?.[cur] ?? cur;
    links.forEach((l) => l.classList.toggle(opts.activeClass, l.dataset[opts.dataKey] === target));
  };

  life.listen(window, 'scroll', onScroll, { passive: true });
  onScroll();
}
