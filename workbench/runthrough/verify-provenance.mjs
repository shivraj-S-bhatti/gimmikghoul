#!/usr/bin/env node
// Read-only audit of the shared cache against the pinned source archive.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';

const root = fileURLToPath(new URL('../../', import.meta.url));
const revision = 'a833737d8408322c8b1e821dee16af07b1fd9234';
const archiveSha256 = 'c255b7b1acc707b398a602f1ec071548ae40a9a9528eeac33cfe118fd985f971';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const archive = path.join(root, '.cache/showdown.tar.gz');
assert.equal(hash(await fs.readFile(archive)), archiveSha256, 'Pinned archive hash mismatch');
const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'champions-provenance-'));
try {
  execFileSync('tar', ['-xzf', archive, '--strip-components=1', '-C', scratch]);
  const files = [];
  async function walk(dir) {
    for (const entry of await fs.readdir(path.join(scratch, dir), {withFileTypes: true})) {
      const relative = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(relative);
      else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) files.push(relative);
    }
  }
  for (const dir of ['sim', 'data', 'lib']) await walk(dir);
  files.push('config/formats.ts');
  files.sort();
  const source = [];
  for (const file of files) {
    const archived = await fs.readFile(path.join(scratch, file));
    const current = await fs.readFile(path.join(root, '.cache/showdown', file));
    assert.deepEqual(current, archived, `Source mismatch: ${file}`);
    source.push({path: file, archiveSha256: hash(archived), currentSha256: hash(current)});
  }
  // Build only in memory from the independent extracted archive, never over the shared dist.
  const result = await build({entryPoints: files.map(f => path.join(scratch, f)), outbase: scratch,
    outdir: path.join(scratch, 'dist'), platform: 'node', format: 'cjs', target: 'node22',
    logLevel: 'warning', write: false});
  const compiled = [];
  for (const file of result.outputFiles) {
    const relative = path.relative(scratch, file.path);
    const current = await fs.readFile(path.join(root, '.cache/showdown', relative));
    assert.deepEqual(current, Buffer.from(file.contents), `Compiled mismatch: ${relative}`);
    compiled.push({path: relative, rebuiltSha256: hash(file.contents), currentSha256: hash(current)});
  }
  compiled.sort((a, b) => a.path.localeCompare(b.path, 'en'));
  const receipt = {revision, archiveSha256, sourceCount: source.length, compiledCount: compiled.length,
    sourceReceiptSha256: hash(JSON.stringify(source)), compiledReceiptSha256: hash(JSON.stringify(compiled)),
    result: 'all source and compiled bytes match',
    method: 'Independent archive extraction and in-memory esbuild; shared source/dist unchanged.'};
  const evidence = path.join(root, '.artifacts/runthrough-check');
  await fs.mkdir(evidence, {recursive: true});
  await fs.writeFile(path.join(evidence, 'provenance-files.json'), JSON.stringify({receipt, source, compiled}, null, 2) + '\n');
  await fs.writeFile(new URL('provenance.json', import.meta.url), JSON.stringify(receipt, null, 2) + '\n');
  console.log(`Verified ${source.length} source and ${compiled.length} compiled files against ${revision}`);
} finally {
  await fs.rm(scratch, {recursive: true, force: true});
}
