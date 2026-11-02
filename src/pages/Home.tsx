import { Link } from 'react-router';
import { useDocumentTitle, useStyleSheet } from '../hooks/usePageSetup';
import { MODULES, type CourseModule } from '../lessons/catalog';
import { QUESTIONS } from '../quiz/questions';
import css from './home.css?inline';

function ModuleCard({ module }: { module: CourseModule }) {
  const { number, title, lesson } = module;
  const body = (
    <>
      <span className="chapter-number">Módulo {number}</span>
      <h2>{title}</h2>
      <div className="status">
        <span className="status-icon">{lesson ? '✓' : '⏳'}</span>
        <span>{lesson ? 'Disponível' : 'Em breve'}</span>
      </div>
    </>
  );
  return lesson ? (
    <Link to={`/aulas/${lesson.slug}`} className="card">
      {body}
    </Link>
  ) : (
    <div className="card disabled" aria-disabled="true">
      {body}
    </div>
  );
}

export function Home() {
  useStyleSheet(css);
  useDocumentTitle('Sécurité des IA - Aulas');

  return (
    <>
      <div className="blob blob-1" />
      <div className="blob blob-2" />

      <header>
        <h1>Sécurité des IA</h1>
        <p className="subtitle">
          Acesso rápido aos materiais, slides e anotações do curso de Segurança em Inteligência Artificial.
        </p>
      </header>

      <main className="grid-container">
        {MODULES.map((m) => (
          <ModuleCard key={m.number} module={m} />
        ))}
        <Link to="/quiz" className="card">
          <span className="chapter-number">Revisão</span>
          <h2>QCM d'entraînement</h2>
          <div className="status">
            <span className="status-icon">✓</span>
            <span>{QUESTIONS.length} questions</span>
          </div>
        </Link>
      </main>

      <footer className="home-footer">
        Material de estudo baseado no curso de Frédéric Jurie — ENSICAEN, 2026.
      </footer>
    </>
  );
}
