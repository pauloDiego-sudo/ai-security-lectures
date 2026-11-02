import type { Chapter, ChapterFilter } from './types';

export const CHAPTER_NAMES: Readonly<Record<Chapter, string>> = {
  0: 'Transversal',
  2: 'Fondements du ML',
  3: "Attaques d'évasion",
  4: 'Attaques white-box',
  5: 'Attaques black-box',
  6: 'Défenses',
  8: 'Robustesse certifiée',
  9: 'Confidentialité',
};

export const chapterLabel = (ch: Chapter): string =>
  ch === 0 ? CHAPTER_NAMES[0] : `Ch. ${ch} — ${CHAPTER_NAMES[ch]}`;

export const isChapter = (v: unknown): v is Chapter =>
  typeof v === 'number' && Object.prototype.hasOwnProperty.call(CHAPTER_NAMES, v);

/** Menu order: everything first, then each chapter, then the cross-chapter questions. */
export const MENU: readonly ChapterFilter[] = ['all', 2, 3, 4, 5, 6, 8, 9, 0];
