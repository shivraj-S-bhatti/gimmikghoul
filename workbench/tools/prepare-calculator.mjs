#!/usr/bin/env node
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
export const REVISION = 'c1eb09be483f0bbf65132bf3703ee677195132f3';
const root = fileURLToPath(new URL('../../', import.meta.url));
const source = `${root}.cache/damage-calc`;
const output = `${root}.cache/champions-calculator`;
const git = (...args) => execFileSync('git', args, {encoding: 'utf8'}).trim();
if (!existsSync(source)) {
  git('clone', '--no-checkout', 'https://github.com/smogon/damage-calc.git', source);
  git('-C', source, 'checkout', '--detach', REVISION);
}
if (git('-C', source, 'rev-parse', 'HEAD') !== REVISION || git('-C', source, 'status', '--porcelain', '--untracked-files=no')) {
  throw Error(`Calculator checkout must be clean at ${REVISION}: ${source}`);
}
mkdirSync(output, {recursive: true});
const outfile = `${output}/calculator.cjs`;
await build({entryPoints: [`${source}/calc/src/index.ts`], outfile, bundle: true, platform: 'node', format: 'cjs', target: 'node20', legalComments: 'eof'});
writeFileSync(`${output}/manifest.json`, JSON.stringify({repository: 'https://github.com/smogon/damage-calc', revision: REVISION, sha256: createHash('sha256').update(readFileSync(outfile)).digest('hex')}, null, 2) + '\n');
console.log(`Prepared native Champions calculator at ${REVISION}`);
