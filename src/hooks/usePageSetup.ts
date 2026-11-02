import { useEffect, useLayoutEffect } from 'react';

/**
 * Mounts a page's own stylesheet while the page is shown. Each original page was a
 * standalone document styling `body`, `nav`, `section`..., so the sheets cannot coexist.
 * Layout effect: the CSS must be applied before lesson scripts read CSS variables.
 */
export function useStyleSheet(css: string): void {
  useLayoutEffect(() => {
    const el = document.createElement('style');
    el.textContent = css;
    document.head.appendChild(el);
    return () => el.remove();
  }, [css]);
}

export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
