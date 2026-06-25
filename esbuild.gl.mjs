// Bundles the @kineviz/gl React scenes into a single browser script the static
// pages load. Run locally (`npm run build:gl`) and commit assets/gl/bundle.js —
// GitHub Pages just serves the file, so no build/token is needed in CI.
import * as esbuild from 'esbuild';
import { rmSync, mkdirSync, cpSync, existsSync } from 'node:fs';

const watch = process.argv.includes('--watch');
const OUTDIR = 'assets/gl';

rmSync(OUTDIR, { recursive: true, force: true });
mkdirSync(OUTDIR, { recursive: true });

// Copy any runtime assets @kineviz/gl ships (fonts/textures/tiles) next to the
// bundle so the lib can fetch them with a relative base.
const glAssets = 'node_modules/@kineviz/gl/assets';
if (existsSync(glAssets)) {
  cpSync(glAssets, `${OUTDIR}/assets`, { recursive: true });
  console.log('copied @kineviz/gl/assets →', `${OUTDIR}/assets`);
}

/** @type {import('esbuild').BuildOptions} */
const opts = {
  entryPoints: ['gl-src/index.tsx'],
  outfile: `${OUTDIR}/bundle.js`,
  bundle: true,
  format: 'iife',
  target: 'es2020',
  platform: 'browser',
  minify: !watch,
  sourcemap: false,
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': watch ? '"development"' : '"production"' },
  loader: { '.css': 'css', '.png': 'dataurl', '.jpg': 'dataurl', '.svg': 'dataurl', '.woff': 'dataurl', '.woff2': 'dataurl', '.ttf': 'dataurl', '.glsl': 'text', '.wgsl': 'text' },
  logLevel: 'info',
};

if (watch) {
  const ctx = await esbuild.context(opts);
  await ctx.watch();
  console.log('watching gl-src …');
} else {
  await esbuild.build(opts);
  console.log('built', `${OUTDIR}/bundle.js`);
}
