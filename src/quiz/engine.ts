import { isChapter } from './chapters';
import type { ChapterFilter, Question } from './types';

/** Fisher–Yates shuffle; returns a new array. */
export function shuffle<T>(arr: readonly T[], random: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Reason a question is malformed, or null when it is usable. */
export function questionProblem(q: Question): string | null {
  if (!isChapter(q.ch)) return `capítulo desconhecido: ${String(q.ch)}`;
  if (!q.q?.trim()) return 'enunciado vazio';
  if (!Array.isArray(q.opts) || q.opts.length < 2) return 'menos de 2 opções';
  if (q.opts.some((o) => typeof o !== 'string' || !o.trim())) return 'opção vazia';
  if (!Number.isInteger(q.ans) || q.ans < 0 || q.ans >= q.opts.length) return `ans fora das opções: ${q.ans}`;
  return null;
}

/** Drops malformed questions so one bad entry cannot break the whole quiz. */
export function validQuestions(questions: readonly Question[]): Question[] {
  return questions.filter((q, i) => {
    const problem = questionProblem(q);
    if (problem) console.warn(`QCM: questão #${i} ignorada (${problem})`);
    return !problem;
  });
}

export function byChapter(questions: readonly Question[], filter: ChapterFilter): Question[] {
  return filter === 'all' ? [...questions] : questions.filter((q) => q.ch === filter);
}

export function gradeFor(pct: number): { grade: string; msg: string } {
  if (pct >= 80) return { grade: '🏆', msg: "Excellent ! Tu es prêt(e) pour l'examen !" };
  if (pct >= 60) return { grade: '👍', msg: 'Bon travail ! Revois les erreurs ci-dessous.' };
  if (pct >= 40) return { grade: '📚', msg: 'Pas mal, mais il faut encore réviser.' };
  return { grade: '⚠️', msg: 'Il faut revoir les chapitres en profondeur.' };
}
