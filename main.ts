import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRadar } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

function option(name: string, fallback: string) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] ?? fallback;
}

const here = fileURLToPath(new URL('.', import.meta.url));
const input = option('--input', '/input/snapshot.json');
const output = option('--output', process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
const radar = buildRadar(JSON.parse(readFileSync(input, 'utf8')));

mkdirSync(output, { recursive: true });
writeFileSync(join(output, 'board.json'), JSON.stringify({ rows: radar.rows }));
writeFileSync(join(output, 'data.js'), `window.radarData = ${JSON.stringify(radar)};\n`);
cpSync(join(here, 'dashboard'), join(output, 'dashboard'), { recursive: true });

if (!process.argv.includes('--preview')) {
  cpSync(join(here, 'screenshots'), join(output, 'screenshots'), { recursive: true });
  writeFileSync(join(output, 'dossier.json'), buildDossier(output, {
    text_max_bytes: 65_536,
    screenshots: { max: 4, max_bytes: 524_288 },
    dashboard: { max_files: 400, max_bytes: 4_194_304 },
  }));
}

console.log(`Ranked ${radar.rows.length} protocols, including ${radar.watchlistCount} watchlist names, from ${radar.comparableCount} token comparables.`);
