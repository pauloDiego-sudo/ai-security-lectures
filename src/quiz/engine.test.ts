import { describe, expect, it, vi } from 'vitest';
import { MENU } from './chapters';
import { byChapter, gradeFor, questionProblem, shuffle, validQuestions } from './engine';
import { QUESTIONS } from './questions';
import type { Question } from './types';

const sample: Question = { ch: 2, topic: 't', q: 'Q ?', opts: ['a', 'b'], ans: 1, expl: 'e' };

describe('banco de questões', () => {
  it('todas as questões são válidas', () => {
    const problems = QUESTIONS.map((q, i) => [i, questionProblem(q)]).filter(([, p]) => p);
    expect(problems).toEqual([]);
  });

  it('enunciados não se repetem', () => {
    expect(new Set(QUESTIONS.map((q) => q.q)).size).toBe(QUESTIONS.length);
  });

  it('cada filtro do menu tem questões', () => {
    for (const { key } of MENU) expect(byChapter(QUESTIONS, key).length).toBeGreaterThan(0);
  });
});

describe('questionProblem', () => {
  it.each([
    [{ ...sample, ans: 2 }, /ans/],
    [{ ...sample, ans: -1 }, /ans/],
    [{ ...sample, opts: ['só uma'] }, /opções/],
    [{ ...sample, ch: 7 as Question['ch'] }, /capítulo/],
    [{ ...sample, q: '  ' }, /enunciado/],
  ])('rejeita questão malformada', (q, reason) => {
    expect(questionProblem(q)).toMatch(reason);
  });

  it('validQuestions descarta só as inválidas', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(validQuestions([sample, { ...sample, ans: 9 }])).toEqual([sample]);
    expect(warn).toHaveBeenCalledOnce();
  });
});

describe('shuffle', () => {
  it('é uma permutação e não altera a entrada', () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input);
    expect(out).not.toBe(input);
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('gradeFor', () => {
  it.each([
    [100, '🏆'],
    [60, '👍'],
    [40, '📚'],
    [0, '⚠️'],
  ])('%i%% → %s', (pct, grade) => {
    expect(gradeFor(pct).grade).toBe(grade);
  });
});
