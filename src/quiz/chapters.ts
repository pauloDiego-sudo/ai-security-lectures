import type { Chapter, ChapterFilter } from './types';

export interface ChapterColors {
  bg: string;
  accent: string;
  light: string;
  name: string;
}

export const CH_COLORS: Readonly<Record<Chapter, ChapterColors>> = {
  0: { bg: '#1e293b', accent: '#94a3b8', light: '#334155', name: 'Transversal' },
  2: { bg: '#064e3b', accent: '#34d399', light: '#065f46', name: 'Ch.2 — Fundamentos' },
  3: { bg: '#7c2d12', accent: '#fb923c', light: '#9a3412', name: 'Ch.3 — Evasion Intro' },
  4: { bg: '#991b1b', accent: '#f87171', light: '#b91c1c', name: 'Ch.4 — White-Box' },
  5: { bg: '#4c1d95', accent: '#a78bfa', light: '#5b21b6', name: 'Ch.5 — Black-Box' },
  6: { bg: '#134e4a', accent: '#2dd4bf', light: '#115e59', name: 'Ch.6 — Défenses' },
  8: { bg: '#831843', accent: '#f472b6', light: '#9d174d', name: 'Ch.8 — Certifiée' },
  9: { bg: '#1e3a5f', accent: '#60a5fa', light: '#1e40af', name: 'Ch.9 — Privacité' },
};

export const isChapter = (v: unknown): v is Chapter =>
  typeof v === 'number' && Object.prototype.hasOwnProperty.call(CH_COLORS, v);

export const MENU: ReadonlyArray<{ key: ChapterFilter; label: string; emoji: string }> = [
  { key: 'all', label: 'Toutes les questions', emoji: '🎯' },
  { key: 2, label: 'Fundamentos ML', emoji: '🧠' },
  { key: 3, label: 'Evasion Intro', emoji: '⚡' },
  { key: 4, label: 'White-Box Attacks', emoji: '🗡️' },
  { key: 5, label: 'Black-Box Attacks', emoji: '🕶️' },
  { key: 6, label: 'Défenses', emoji: '🛡️' },
  { key: 8, label: 'Robustesse Certifiée', emoji: '📐' },
  { key: 9, label: 'Privacité', emoji: '🔒' },
  { key: 0, label: 'Transversal', emoji: '🔗' },
];
