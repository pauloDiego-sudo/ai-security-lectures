import type { LessonModule } from './types';

export interface LessonEntry {
  slug: string;
  /** Tab title, from the original page. */
  docTitle: string;
  load: () => Promise<{ default: LessonModule }>;
}

export interface CourseModule {
  number: number;
  title: string;
  /** Absent while the module has no material yet ("Em breve"). */
  lesson?: LessonEntry;
}

export const MODULES: readonly CourseModule[] = [
  { number: 1, title: 'Introdução à IA e Segurança' },
  {
    number: 2,
    title: 'Fundamentos de Machine Learning',
    lesson: {
      slug: '02-fundamentos-ml',
      docTitle: 'Fundamentos Matematicos e Vulnerabilidades Tecnicas do ML — Aula Completa',
      load: () => import('./02-fundamentos-ml'),
    },
  },
  {
    number: 3,
    title: 'Ataques de Evasão (Evasion Attacks)',
    lesson: {
      slug: '03-ataques-evasao',
      docTitle: 'Ataques de Evasao — Security of AI, Chap 3',
      load: () => import('./03-ataques-evasao'),
    },
  },
  {
    number: 4,
    title: 'Ataques White-Box',
    lesson: {
      slug: '04-white-box',
      docTitle: 'Ataques de Evasão White-Box — Material Completo',
      load: () => import('./04-white-box'),
    },
  },
  {
    number: 5,
    title: 'Ataques Black-Box',
    lesson: {
      slug: '05-black-box',
      docTitle: 'Ataques Black-Box de Evasao — Material Completo',
      load: () => import('./05-black-box'),
    },
  },
  {
    number: 6,
    title: 'Estratégias Defensivas',
    lesson: {
      slug: '06-defesas',
      docTitle: 'Estrategias de Defesa contra Ataques Adversariais — Material Completo',
      load: () => import('./06-defesas'),
    },
  },
  { number: 7, title: 'Tópicos Avançados & Direções Futuras' },
  {
    number: 8,
    title: 'Robustesse Certifiée',
    lesson: {
      slug: '08-robustez-certificada',
      docTitle: 'Robustez Certificada — Material Completo',
      load: () => import('./08-robustez-certificada'),
    },
  },
  {
    number: 9,
    title: 'Privacy',
    lesson: {
      slug: '09-privacidade',
      docTitle: 'Privacidade em Machine Learning — Material Completo',
      load: () => import('./09-privacidade'),
    },
  },
];

export function findLesson(slug: string | undefined): LessonEntry | undefined {
  return MODULES.find((m) => m.lesson?.slug === slug)?.lesson;
}
