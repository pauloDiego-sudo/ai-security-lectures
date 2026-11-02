/**
 * Tracks everything a lesson attaches to the page (listeners, timers) so the
 * React page can undo it on unmount. Without this, navigating between lessons
 * would leak scroll handlers bound to elements that no longer exist.
 */
export class Lifecycle {
  private cleanups: Array<() => void> = [];

  listen<E extends Event = Event>(
    target: EventTarget,
    type: string,
    handler: (event: E) => void,
    options?: AddEventListenerOptions,
  ): void {
    const listener = handler as EventListener;
    target.addEventListener(type, listener, options);
    this.cleanups.push(() => target.removeEventListener(type, listener, options));
  }

  timeout(fn: () => void, ms: number): void {
    const id = window.setTimeout(fn, ms);
    this.cleanups.push(() => window.clearTimeout(id));
  }

  dispose(): void {
    for (const cleanup of this.cleanups.splice(0)) cleanup();
  }
}
