import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useHref, useNavigate, useParams } from 'react-router';
import { useDocumentTitle, useStyleSheet } from '../hooks/usePageSetup';
import { findLesson } from '../lessons/catalog';
import { Lifecycle } from '../lessons/shared/lifecycle';
import type { LessonModule } from '../lessons/types';
import { NotFound } from './NotFound';

export function LessonPage() {
  const { slug } = useParams();
  const entry = findLesson(slug);
  const [loaded, setLoaded] = useState<{ slug: string; lesson: LessonModule } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!entry) return;
    let alive = true;
    setFailed(false);
    entry
      .load()
      .then((m) => alive && setLoaded({ slug: entry.slug, lesson: m.default }))
      .catch((err: unknown) => {
        console.error(err);
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [entry]);

  if (!entry) return <NotFound />;
  if (failed) return <p style={{ padding: 24 }}>Não foi possível carregar a aula. Recarregue a página.</p>;
  if (loaded?.slug !== entry.slug) return null;
  return <LessonView key={entry.slug} lesson={loaded.lesson} title={entry.docTitle} />;
}

function LessonView({ lesson, title }: { lesson: LessonModule; title: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const homeHref = useHref('/');
  const markup = useMemo(() => ({ __html: lesson.html }), [lesson]);

  useStyleSheet(lesson.css);
  useDocumentTitle(title);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [lesson]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const life = new Lifecycle();

    root.querySelectorAll<HTMLAnchorElement>('a[data-route]').forEach((a) => {
      a.href = homeHref;
    });

    const { actions } = lesson.setup(life);

    // The lesson HTML names its handlers (data-click / data-input); dispatch them here.
    const dispatch = (attr: 'click' | 'input') => (e: Event) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>(`[data-${attr}]`);
      if (!el || !root.contains(el)) return;
      const name = el.dataset[attr] ?? '';
      const action = actions[name];
      if (action) action(el.dataset.arg);
      else console.error(`Ação "${name}" não existe nesta aula`);
    };

    life.listen<MouseEvent>(root, 'click', (e) => {
      const link = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[data-route]');
      if (link && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        navigate(link.dataset.route ?? '/');
        return;
      }
      dispatch('click')(e);
    });
    life.listen(root, 'input', dispatch('input'));

    return () => life.dispose();
  }, [lesson, homeHref, navigate]);

  return <div ref={rootRef} dangerouslySetInnerHTML={markup} />;
}
