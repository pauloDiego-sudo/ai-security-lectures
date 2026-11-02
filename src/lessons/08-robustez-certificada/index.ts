import html from './content.html?raw';
import css from './style.css?inline';
import { setup } from './interactive';
import type { LessonModule } from '../types';

export default { html, css, setup } satisfies LessonModule;
