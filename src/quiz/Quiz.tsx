import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useDocumentTitle, useStyleSheet } from '../hooks/usePageSetup';
import { CH_COLORS, MENU } from './chapters';
import { byChapter, gradeFor, shuffle, validQuestions } from './engine';
import { QUESTIONS } from './questions';
import { S } from './styles';
import type { Answer, ChapterFilter, Question } from './types';

type Mode = 'menu' | 'quiz' | 'review';

const PAGE_CSS = 'body{margin:0;background:#0b0f19}';

export function Quiz() {
  useStyleSheet(PAGE_CSS);
  useDocumentTitle("QCM d'entraînement — Sécurité des IA");

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
  };

  const confirm = () => {
    if (selected === null) return;
    const question = questions[current];
    setConfirmed(true);
    setAnswers((prev) => [...prev, { question, selected, correct: selected === question.ans }]);
  };

  const next = () => {
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
    return (
      <div style={S.root} lang="fr">
        <div style={S.menuContainer}>
          <Link to="/" style={{ ...S.btnGhost, display: 'inline-block', padding: '4px 0', textDecoration: 'none' }}>
            ← Índice
          </Link>
          <div style={S.menuHeader}>
            <div style={S.menuIcon}>🔐</div>
            <h1 style={S.menuTitle}>Sécurité des IA</h1>
            <p style={S.menuSub}>QCM d'entraînement — {bank.length} questions</p>
            <p style={S.menuProf}>Prof. Frédéric Jurie — ENSICAEN 2026</p>
          </div>
          <div style={S.chGrid}>
            {MENU.map((ch) => {
              const count = byChapter(bank, ch.key).length;
              const colors = ch.key === 'all' ? CH_COLORS[0] : CH_COLORS[ch.key];
              return (
                <button
                  key={ch.key}
                  type="button"
                  onClick={() => startQuiz(ch.key)}
                  disabled={count === 0}
                  style={{
                    ...S.chCard,
                    background: `linear-gradient(135deg, ${colors.bg}, ${colors.light})`,
                    borderLeft: `3px solid ${colors.accent}`,
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)')}
                  onMouseOut={(e) => (e.currentTarget.style.transform = 'none')}
                >
                  <span style={S.chEmoji}>{ch.emoji}</span>
                  <div>
                    <div style={{ ...S.chLabel, color: colors.accent }}>{ch.label}</div>
                    <div style={S.chCount}>
                      {count} question{count > 1 ? 's' : ''}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'review') {
    const wrong = answers.filter((a) => !a.correct);
    const { grade, msg } = gradeFor(pct);

    return (
      <div style={S.root} lang="fr">
        <div style={S.reviewContainer}>
          <div style={S.scoreCard}>
            <div style={S.scoreGrade}>{grade}</div>
            <div style={S.scoreNum}>
              {score}/{total}
            </div>
            <div style={S.scorePct}>{pct}%</div>
            <div style={S.scoreMsg}>{msg}</div>
            <div style={S.scoreBar}>
              <div style={{ ...S.scoreBarFill, width: `${pct}%`, background: pct >= 60 ? '#34d399' : '#f87171' }} />
            </div>
          </div>

          {wrong.length > 0 && (
            <div style={S.wrongSection}>
              <h3 style={S.wrongTitle}>Questions ratées ({wrong.length})</h3>
              {wrong.map(({ question: q, selected: sel }) => {
                const colors = CH_COLORS[q.ch];
                return (
                  <div key={q.q} style={{ ...S.wrongCard, borderLeft: `3px solid ${colors.accent}` }}>
                    <div style={{ ...S.wrongChip, background: colors.bg, color: colors.accent }}>{colors.name}</div>
                    <p style={S.wrongQ}>{q.q}</p>
                    <div style={S.wrongAns}>
                      <span style={{ color: '#f87171' }}>✗ Ta réponse : {q.opts[sel]}</span>
                    </div>
                    <div style={S.wrongAns}>
                      <span style={{ color: '#34d399' }}>✓ Bonne réponse : {q.opts[q.ans]}</span>
                    </div>
                    <p style={S.wrongExpl}>{q.expl}</p>
                  </div>
                );
              })}
            </div>
          )}

          <div style={S.btnRow}>
            <button type="button" onClick={() => startQuiz(filter)} style={S.btnPrimary}>
              🔄 Recommencer
            </button>
            <button type="button" onClick={() => setMode('menu')} style={S.btnSecondary}>
              📋 Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  // QUIZ MODE
  const q = questions[current];
  const colors = CH_COLORS[q.ch];

  return (
    <div style={S.root} lang="fr">
      <div style={S.quizContainer}>
        <div style={S.progressRow}>
          <span style={S.progressText}>
            {current + 1}/{questions.length}
          </span>
          <div style={S.progressBar}>
            <div style={{ ...S.progressFill, width: `${((current + 1) / questions.length) * 100}%` }} />
          </div>
          <span style={S.scoreSmall}>
            {score}✓ {total - score}✗
          </span>
        </div>

        <div style={{ ...S.qCard, borderTop: `3px solid ${colors.accent}` }}>
          <div style={{ ...S.qChip, background: colors.bg, color: colors.accent }}>{colors.name}</div>
          <p style={S.qText}>{q.q}</p>
        </div>

        <div style={S.optsGrid}>
          {q.opts.map((opt, i) => {
            let bg = '#1e293b';
            let border = '#334155';
            let textColor = '#e2e8f0';
            if (confirmed) {
              if (i === q.ans) {
                bg = '#064e3b';
                border = '#34d399';
                textColor = '#34d399';
              } else if (i === selected) {
                bg = '#450a0a';
                border = '#f87171';
                textColor = '#f87171';
              }
            } else if (i === selected) {
              bg = '#1e3a5f';
              border = colors.accent;
              textColor = '#fff';
            }
            return (
              <button
                key={opt}
                type="button"
                onClick={() => !confirmed && setSelected(i)}
                disabled={confirmed}
                aria-pressed={i === selected}
                style={{
                  ...S.optBtn,
                  background: bg,
                  borderColor: border,
                  color: textColor,
                  cursor: confirmed ? 'default' : 'pointer',
                  opacity: confirmed && i !== q.ans && i !== selected ? 0.4 : 1,
                }}
              >
                <span style={{ ...S.optLetter, borderColor: border, color: textColor }}>{String.fromCharCode(65 + i)}</span>
                <span style={S.optText}>{opt}</span>
                {confirmed && i === q.ans && <span style={S.optIcon}>✓</span>}
                {confirmed && i === selected && i !== q.ans && <span style={S.optIcon}>✗</span>}
              </button>
            );
          })}
        </div>

        {confirmed && (
          <div style={S.explCard}>
            <div style={S.explTitle}>💡 Explication</div>
            <p style={S.explText}>{q.expl}</p>
          </div>
        )}

        <div style={S.btnRow}>
          {!confirmed ? (
            <button
              type="button"
              onClick={confirm}
              disabled={selected === null}
              style={{ ...S.btnPrimary, opacity: selected === null ? 0.4 : 1 }}
            >
              Confirmer
            </button>
          ) : (
            <button type="button" onClick={next} style={S.btnPrimary}>
              {current + 1 >= questions.length ? 'Voir résultats →' : 'Suivant →'}
            </button>
          )}
          <button type="button" onClick={() => setMode('menu')} style={S.btnGhost}>
            Quitter
          </button>
        </div>
      </div>
    </div>
  );
}
