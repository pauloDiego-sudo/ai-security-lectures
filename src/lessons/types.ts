import type { Lifecycle } from './shared/lifecycle';

/**
 * Handler named in the lesson HTML. `data-click="setNorm" data-arg="inf"`
 * calls `actions.setNorm('inf')`; `data-input="updateFGSM"` fires on slider input.
 */
export type LessonAction = (arg?: string) => void;

export interface LessonController {
  actions: Readonly<Record<string, LessonAction>>;
}

/** Runs once the lesson HTML is in the DOM; registers listeners on `life`. */
export type LessonSetup = (life: Lifecycle) => LessonController;

export interface LessonModule {
  /** Static lesson body (text, formulas, canvases), extracted verbatim from the original page. */
  html: string;
  /** The lesson's own stylesheet, mounted only while the lesson is open. */
  css: string;
  setup: LessonSetup;
}
