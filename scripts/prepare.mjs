import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';

export const revision = 'a833737d8408322c8b1e821dee16af07b1fd9234';
const root = path.resolve('.cache');
await fs.mkdir(root, {recursive: true});
const sources = [
  ['showdown.tar.gz', `https://codeload.github.com/smogon/pokemon-showdown/tar.gz/${revision}`],
  ['usage.json', 'https://www.smogon.com/stats/2026-09/chaos/gen9championsvgc2026regmc-1500.json'],
  ['official-roster.html', 'https://web-view.app.pokemonchampions.jp/battle/pages/events/rs178955680104qaiodg/en/pokemon.html'],
];
const manifest = [];
for (const [file, url] of sources) {
  const target = path.join(root, file);
  let cached = true;
  try { await fs.access(target); } catch {
    cached = false;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    await fs.writeFile(target, Buffer.from(await response.arrayBuffer()));
  }
  const bytes = await fs.readFile(target);
  manifest.push({file, url, cached, inspectedAt: new Date().toISOString(), bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex')});
}
await fs.mkdir(path.join(root, 'showdown'), {recursive: true});
execFileSync('tar', ['-xzf', path.join(root, 'showdown.tar.gz'), '--strip-components=1', '-C', path.join(root, 'showdown')]);
const base = path.join(root, 'showdown');
const entries = [];
async function walk(dir) {
  for (const entry of await fs.readdir(dir, {withFileTypes: true})) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(p);
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) entries.push(p);
  }
}
for (const dir of ['sim', 'data', 'lib']) await walk(path.join(base, dir));
entries.push(path.join(base, 'config/formats.ts'));
await build({entryPoints: entries, outbase: base, outdir: path.join(base, 'dist'),
  platform: 'node', format: 'cjs', target: 'node22', logLevel: 'warning'});
await fs.mkdir('.artifacts', {recursive: true});
await fs.writeFile('.artifacts/source-manifest.json', JSON.stringify({revision, sources: manifest}, null, 2));
console.log(JSON.stringify({revision, filesTranspiled: entries.length, sources: manifest.map(s => ({file:s.file, bytes:s.bytes}))}));
