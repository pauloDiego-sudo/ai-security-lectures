/** Chapter number; 0 is "Transversal" (questions spanning several chapters). */
export type Chapter = 0 | 2 | 3 | 4 | 5 | 6 | 8 | 9;

export interface Question {
  ch: Chapter;
  topic: string;
  q: string;
  opts: readonly string[];
  /** Index into `opts` of the correct answer. */
  ans: number;
  expl: string;
}

export interface Answer {
  question: Question;
  selected: number;
  correct: boolean;
}

export type ChapterFilter = Chapter | 'all';
