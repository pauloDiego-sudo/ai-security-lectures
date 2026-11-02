/// <reference types="vitest/config" />
import { readdirSync } from 'node:fs';
import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/** Client-side routes; each lesson folder (src/lessons/NN-slug) is served at /aulas/NN-slug. */
function appRoutes(root: string): string[] {
  const lessons = readdirSync(resolve(root, 'src/lessons')).filter((d) => /^\d{2}-/.test(d));
  return ['quiz', ...lessons.map((slug) => `aulas/${slug}`)];
}

// GitHub Pages is a static host: a deep link like /aulas/04-white-box only works if a
// file exists there. Copy the SPA shell to every known route (served with 200) and to
// 404.html (served for anything else, which the router renders as "not found").
function staticRoutes(): Plugin {
  let root = '.';
  let outDir = 'dist';
  return {
    name: 'static-routes',
    apply: 'build',
    configResolved(config) {
      root = config.root;
      outDir = resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      const shell = resolve(outDir, 'index.html');
      await copyFile(shell, resolve(outDir, '404.html'));
      for (const route of appRoutes(root)) {
        await mkdir(resolve(outDir, route), { recursive: true });
        await copyFile(shell, resolve(outDir, route, 'index.html'));
      }
    },
  };
}

export default defineConfig({
  // Project pages live under /<repo>/; the deploy workflow sets BASE_PATH accordingly.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), staticRoutes()],
  test: {
    environment: 'jsdom',
  },
});
