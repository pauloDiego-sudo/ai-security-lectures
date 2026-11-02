import { BrowserRouter, Route, Routes } from 'react-router';
import { Home } from './pages/Home';
import { LessonPage } from './pages/LessonPage';
import { NotFound } from './pages/NotFound';
import { Quiz } from './quiz/Quiz';

export function App() {
  return (
    // BASE_URL is "/<repo>/" on GitHub Pages and "/" locally.
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/aulas/:slug" element={<LessonPage />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
