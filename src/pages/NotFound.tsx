import { Link } from 'react-router';
import { useDocumentTitle, useStyleSheet } from '../hooks/usePageSetup';
import css from './home.css?inline';

export function NotFound() {
  useStyleSheet(css);
  useDocumentTitle('Página não encontrada — Segurança em IA');

  return (
    <div className="page">
      <header className="masthead">
        <h1>404</h1>
        <p className="subtitle">Esta página não existe.</p>
        <p className="subtitle">
          <Link to="/" style={{ color: 'var(--accent)' }}>
            ← Voltar ao índice
          </Link>
        </p>
      </header>
    </div>
  );
}
