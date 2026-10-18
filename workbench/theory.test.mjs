import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {fingerprintTheory, readTheory, checkTheory} from './theory.mjs';

// Tiny local runtime fixtures exercise provenance/state behavior, not Pokémon math.
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'theory-check-'));
  t.after(() => fs.rm(root, {recursive: true, force: true}));
  const file = 'data/theories/example/theory.json';
  const theory = {id: 'example', format: 'gen9championsvgc2026regmc',
    claims: [{id: 'threshold', text: 'Selected threshold question'}],
    sets: {attacker: {species: 'Mudsdale', evs: {def: 32}}},
    references: {source: 'research/source.txt'}, generatedAt: 'old'};
  const adapter = `import fs from 'node:fs';
    const theory = new URL('../../data/theories/example/theory.json', import.meta.url);
    export function calculateRow(input) {
      if (input.id === 'edit-theory') {
        const value = JSON.parse(fs.readFileSync(theory)); value.purpose = 'changed during check';
        fs.writeFileSync(theory, JSON.stringify(value));
      }
      if (input.id === 'edit-runtime') fs.appendFileSync(new URL('../../.cache/showdown/dist/sim/dex.js', import.meta.url), 'changed');
      if (input.id === 'unsupported') return {status:'invalid_or_unsupported', reason:'fixture unsupported', native:null};
      return {status:'calculated', native:{damage:[1], fullDesc:'fixture observation', kochance:{text:'fixture only'}}, input};
    }`;
  const bundle = 'fixture bundle';
  const files = {
    [file]: JSON.stringify(theory), 'research/source.txt': 'original source',
    'workbench/theory.mjs': await fs.readFile(new URL('./theory.mjs', import.meta.url), 'utf8'),
    'workbench/tools/calculator.mjs': adapter, 'workbench/tools/champions-engine.mjs': 'fixture validator',
    '.cache/champions-calculator/calculator.cjs': bundle,
    '.cache/champions-calculator/manifest.json': JSON.stringify({revision: 'fixture-calc', sha256: createHash('sha256').update(bundle).digest('hex')}),
    '.cache/showdown/dist/sim/dex.js': 'fixture dex',
    '.cache/showdown/dist/sim/team-validator.js': 'fixture team validator',
    '.cache/showdown/dist/config/formats.js': 'fixture formats',
    '.artifacts/source-manifest.json': JSON.stringify({revision: 'fixture-engine', inspectedAt: 'volatile'}),
    'package-lock.json': '{}',
  };
  for (const [relative, content] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(root, relative)), {recursive: true});
    await fs.writeFile(path.join(root, relative), content);
  }
  const request = {claimId: 'threshold', question: 'What does this selected input return?', decision: 'Keep or revise the candidate',
    checker: 'damage', input: {attacker: {species: 'Mudsdale'}, defender: {species: 'Raichu'}, move: 'Body Press'}};
  return {root, file, theory, request, options: {root}, writeTheory: value => fs.writeFile(path.join(root, file), JSON.stringify(value))};
}

test('fingerprint ignores key order and only declared top-level timestamps', async t => {
  const f = await fixture(t);
  const before = await fingerprintTheory(f.file, f.options);
  await f.writeTheory({...Object.fromEntries(Object.entries(f.theory).reverse()), generatedAt: 'new', updatedAt: 'new'});
  assert.equal((await fingerprintTheory(f.file, f.options)).fingerprint, before.fingerprint);
  await f.writeTheory({...f.theory, source: {publishedAt: '2026-10-18'}});
  assert.notEqual((await fingerprintTheory(f.file, f.options)).fingerprint, before.fingerprint);
});

test('receipts retain input/reference snapshots; new receipts do not stale old ones', async t => {
  const f = await fixture(t);
  const first = await checkTheory(f.file, f.request, f.options);
  assert.equal(first.status, 'current');
  assert.equal(first.receipt.outcome, 'completed');
  assert.equal(first.receipt.request.input.format, f.theory.format);
  assert.equal(Buffer.from(first.receipt.snapshot.references.source.content, 'base64').toString(), 'original source');
  await checkTheory(f.file, {...f.request, question: 'A separately recorded question'}, f.options);
  const read = await readTheory(f.file, f.options);
  assert.equal(read.receipts.length, 2);
  assert.ok(read.receipts.every(r => r.status === 'current' && r.integrity === 'valid'));
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(f.root, f.file))), f.theory);
  await fs.writeFile(path.join(f.root, 'research/source.txt'), 'changed source');
  const changed = await readTheory(f.file, f.options);
  assert.ok(changed.receipts.every(r => r.status === 'stale' && r.reasons.includes('theory_or_reference_changed')));
  assert.equal(changed.receipts[0].receipt.snapshot.references.source.content, first.receipt.snapshot.references.source.content);
});

test('edited theory and modified runtime invalidate receipts independently', async t => {
  const f = await fixture(t);
  await checkTheory(f.file, f.request, f.options);
  await f.writeTheory({...f.theory, purpose: 'New selected matchup'});
  assert.equal((await readTheory(f.file, f.options)).receipts[0].status, 'stale');
  await f.writeTheory(f.theory);
  await fs.appendFile(path.join(f.root, '.cache/showdown/dist/sim/dex.js'), 'new engine');
  const read = await readTheory(f.file, f.options);
  assert.ok(read.receipts[0].reasons.includes('runtime_changed'));
  assert.equal(read.receipts[0].status, 'stale');
});

test('offline read reports unavailable runtime and preserves historical receipts', async t => {
  const f = await fixture(t);
  await checkTheory(f.file, f.request, f.options);
  await fs.rename(path.join(f.root, '.cache'), path.join(f.root, '.cache-offline'));
  const read = await readTheory(f.file, f.options);
  assert.equal(read.theory.id, 'example');
  assert.equal(read.runtime.status, 'unavailable');
  assert.equal(read.receipts[0].integrity, 'valid');
  assert.equal(read.receipts[0].status, 'unverifiable');
  assert.ok(read.receipts[0].reasons.includes('runtime_unavailable'));
  const failed = await checkTheory(f.file, f.request, f.options);
  assert.equal(failed.receipt.outcome, 'failed');
  assert.equal(failed.status, 'unverifiable');
  assert.match(failed.receipt.error, /Runtime unavailable/);
});

test('tampered receipt is never returned as a valid observation', async t => {
  const f = await fixture(t);
  const result = await checkTheory(f.file, f.request, f.options);
  const altered = structuredClone(result.receipt); altered.output.native.fullDesc = 'invented claim';
  await fs.writeFile(path.join(f.root, result.file), JSON.stringify(altered));
  const read = await readTheory(f.file, f.options);
  assert.equal(read.receipts[0].integrity, 'invalid');
  assert.equal(read.receipts[0].status, 'invalid');
  assert.equal(read.receipts[0].receipt, undefined);
  assert.match(read.receipts[0].reasons.join(' '), /hash mismatch/);
});

test('unknown claims/formats are rejected; unsupported calculator result is retained', async t => {
  const f = await fixture(t);
  await assert.rejects(checkTheory(f.file, {...f.request, claimId: 'missing'}, f.options), /Unknown claim/);
  await assert.rejects(checkTheory(f.file, {...f.request, input: {...f.request.input, format: 'gen9ou'}}, f.options), /differs from theory/);
  await assert.rejects(fs.access(path.join(f.root, 'data/theories/example/checks')), /ENOENT/);
  const unsupported = await checkTheory(f.file, {...f.request, input: {...f.request.input, id: 'unsupported'}}, f.options);
  assert.equal(unsupported.receipt.outcome, 'unsupported');
  assert.equal(unsupported.receipt.output.reason, 'fixture unsupported');
  assert.equal((await readTheory(f.file, f.options)).receipts[0].status, 'current');
});

test('theory or runtime edited during calculation cannot receive a current receipt', async t => {
  const f = await fixture(t);
  const changed = await checkTheory(f.file, {...f.request, input: {...f.request.input, id: 'edit-theory'}}, f.options);
  assert.equal(changed.status, 'stale');
  assert.deepEqual(changed.receipt.snapshot.theory, f.theory);
  assert.ok(changed.reasons.includes('theory_or_reference_changed'));
  const runtime = await checkTheory(f.file, {...f.request, input: {...f.request.input, id: 'edit-runtime'}}, f.options);
  assert.equal(runtime.status, 'stale');
  assert.equal(runtime.receipt.execution.runtimeStable, false);
  assert.ok(runtime.reasons.includes('runtime_changed_during_check'));
});
