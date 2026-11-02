import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useDocumentTitle, useStyleSheet } from '../hooks/usePageSetup';
import baseCss from '../pages/home.css?inline';
import { CHAPTER_NAMES, MENU, chapterLabel } from './chapters';
import { byChapter, gradeFor, shuffle, validQuestions } from './engine';
import { QUESTIONS } from './questions';
import css from './quiz.css?inline';
import type { Answer, ChapterFilter, Question } from './types';

type Mode = 'menu' | 'quiz' | 'review';

const plural = (n: number) => `${n} question${n > 1 ? 's' : ''}`;
const pad = (n: number) => String(n).padStart(2, '0');

export function Quiz() {
  useStyleSheet(baseCss);
  useStyleSheet(css);
  useDocumentTitle("QCM d'entraînement — Segurança em IA");

  const bank = useMemo(() => validQuestions(QUESTIONS), []);
  const [mode, setMode] = useState<Mode>('menu');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [filter, setFilter] = useState<ChapterFilter>('all');

  const startQuiz = (filterCh: ChapterFilter) => {
    const qs = shuffle(byChapter(bank, filterCh));
    if (qs.length === 0) return;
    setFilter(filterCh);
    setQuestions(qs);
    setCurrent(0);
    setSelected(null);
    setConfirmed(false);
    setAnswers([]);
    setMode('quiz');
    window.scrollTo(0, 0);
  };

  const confirm = () => {
    if (selected === null) return;
    const question = questions[current];
    setConfirmed(true);
    setAnswers((prev) => [...prev, { question, selected, correct: selected === question.ans }]);
  };

  const next = () => {
    window.scrollTo(0, 0);
    if (current + 1 >= questions.length) {
      setMode('review');
      return;
    }
    setCurrent((prev) => prev + 1);
    setSelected(null);
    setConfirmed(false);
  };

  const score = answers.filter((a) => a.correct).length;
  const total = answers.length;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

  if (mode === 'menu') {
    const chapters = MENU.filter((key) => key !== 'all');
    return (
      <div className="page" lang="fr">
        <Link to="/" className="back">
          ← Índice
        </Link>
        <header className="masthead">
          <p className="eyebrow">Segurança em IA</p>
          <h1>QCM d'entraînement</h1>
          <p className="subtitle">
            {plural(bank.length)} à choix multiple, avec explication après chaque réponse.
          </p>
        </header>

        <button type="button" className="quiz" onClick={() => startQuiz('all')}>
          <span>
            <span className="quiz-title">Toutes les questions</span>
            <span className="quiz-meta">{plural(bank.length)}, dans un ordre aléatoire</span>
          </span>
          <span className="quiz-cta">Commencer</span>
        </button>

        <section>
          <div className="section-head">
            <h2>Par chapitre</h2>
          </div>
          <ol className="modules">
            {chapters.map((ch) => {
              const count = byChapter(bank, ch).length;
              return (
                <li key={ch}>
                  <button
                    type="button"
                    className={count === 0 ? 'row disabled' : 'row'}
                    onClick={() => startQuiz(ch)}
                    disabled={count === 0}
                  >
                    <span className="row-number">{ch === 0 ? '—' : pad(ch)}</span>
                    <span className="row-title">{CHAPTER_NAMES[ch]}</span>
                    <span className="row-status">{plural(count)}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    );
  }

  if (mode === 'review') {
    const wrong = answers.filter((a) => !a.correct);
    const { msg } = gradeFor(pct);

    return (
      <div className="page" lang="fr">
        <header className="masthead">
          <p className="eyebrow">Résultat</p>
          <h1>
            {score} <span className="score-total">/ {total}</span>
          </h1>
          <p className="subtitle">
            {pct} % — {msg}
          </p>
          <div className="meter" aria-hidden="true">
            <div className="meter-fill" style={{ width: `${pct}%` }} />
          </div>
        </header>

        {wrong.length > 0 && (
          <section>
            <div className="section-head">
              <h2>Questions ratées</h2>
              <span className="section-meta">{wrong.length}</span>
            </div>
            <ol className="missed">
              {wrong.map(({ question: q, selected: sel }) => (
                <li key={q.q}>
                  <p className="tag">{chapterLabel(q.ch)}</p>
                  <p className="missed-q">{q.q}</p>
                  <p className="answer is-wrong">
                    <span className="answer-mark">✗</span> {q.opts[sel]}
                  </p>
                  <p className="answer is-correct">
                    <span className="answer-mark">✓</span> {q.opts[q.ans]}
                  </p>
                  <p className="missed-expl">{q.expl}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={() => startQuiz(filter)}>
            Recommencer
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setMode('menu')}>
            Menu
          </button>
        </div>
      </div>
    );
  }

  // QUIZ MODE
  const q = questions[current];
  const optionClass = (i: number) => {
    if (!confirmed) return i === selected ? 'option is-selected' : 'option';
    if (i === q.ans) return 'option is-correct';
    if (i === selected) return 'option is-wrong';
    return 'option is-dim';
  };

  return (
    <div className="page" lang="fr">
      <div className="topbar">
        <button type="button" className="back" onClick={() => setMode('menu')}>
          ← Quitter
        </button>
        <span className="section-meta">
          {score} ✓ · {total - score} ✗
        </span>
      </div>

      <div className="progress">
        <span className="section-meta">
          {pad(current + 1)} / {pad(questions.length)}
        </span>
        <div className="meter" aria-hidden="true">
          <div className="meter-fill" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
        </div>
      </div>

      <p className="tag">{chapterLabel(q.ch)}</p>
      <h1 className="question">{q.q}</h1>

      <div className="options">
        {q.opts.map((opt, i) => (
          <button
            key={opt}
            type="button"
            className={optionClass(i)}
            onClick={() => !confirmed && setSelected(i)}
            disabled={confirmed}
            aria-pressed={i === selected}
          >
            <span className="option-letter">{String.fromCharCode(65 + i)}</span>
            <span className="option-text">{opt}</span>
            {confirmed && i === q.ans && <span className="option-mark">✓</span>}
            {confirmed && i === selected && i !== q.ans && <span className="option-mark">✗</span>}
          </button>
        ))}
      </div>

      {confirmed && (
        <aside className="explanation">
          <h2>Explication</h2>
          <p>{q.expl}</p>
        </aside>
      )}

      <div className="actions">
        {!confirmed ? (
          <button type="button" className="btn btn-primary" onClick={confirm} disabled={selected === null}>
            Confirmer
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={next}>
            {current + 1 >= questions.length ? 'Voir les résultats →' : 'Suivant →'}
          </button>
        )}
      </div>
    </div>
  );
}
