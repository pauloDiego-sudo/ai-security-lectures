import { Link } from 'react-router';
import { useDocumentTitle, useStyleSheet } from '../hooks/usePageSetup';
import { MODULES, type CourseModule } from '../lessons/catalog';
import { QUESTIONS } from '../quiz/questions';
import css from './home.css?inline';

const pad = (n: number) => String(n).padStart(2, '0');

function ModuleRow({ module }: { module: CourseModule }) {
  const { number, title, lesson } = module;
  const body = (
    <>
      <span className="row-number">{pad(number)}</span>
      <span className="row-title">{title}</span>
      <span className="row-status">{lesson ? 'Ler' : 'Em breve'}</span>
    </>
  );
  return (
    <li>
      {lesson ? (
        <Link to={`/aulas/${lesson.slug}`} className="row">
          {body}
        </Link>
      ) : (
        <div className="row disabled" aria-disabled="true">
          {body}
        </div>
      )}
    </li>
  );
}

export function Home() {
  useStyleSheet(css);
  useDocumentTitle('Segurança em IA — Aulas');

  const available = MODULES.filter((m) => m.lesson).length;

  return (
    <div className="page">
      <header className="masthead">
        <p className="eyebrow">Material de estudo</p>
        <h1>Segurança em IA</h1>
        <p className="subtitle">
          Aulas interativas sobre ataques adversariais, defesas, robustez certificada e privacidade em
          machine learning.
        </p>
      </header>

      <main>
        <section>
          <div className="section-head">
            <h2>Módulos</h2>
            <span className="section-meta">
              {available} de {MODULES.length} disponíveis
            </span>
          </div>
          <ol className="modules">
            {MODULES.map((m) => (
              <ModuleRow key={m.number} module={m} />
            ))}
          </ol>
        </section>

        <section>
          <div className="section-head">
            <h2>Revisão</h2>
          </div>
          <Link to="/quiz" className="quiz">
            <span>
              <span className="quiz-title">QCM d'entraînement</span>
              <span className="quiz-meta">{QUESTIONS.length} questions, por capítulo</span>
            </span>
            <span className="quiz-cta">Começar</span>
          </Link>
        </section>
      </main>

      <footer className="home-footer">
        <h2>Sobre</h2>
        <p>
          Estas páginas nasceram como material de estudo pessoal, inspiradas no curso <i>Sécurité des IA</i>{' '}
          da ENSICAEN (2A, S8, 2026), ministrado por Frédéric Jurie e Benjamin Sykes. As referências
          de cada aula estão no rodapé da respectiva página.
        </p>
      </footer>
    </div>
  );
}
