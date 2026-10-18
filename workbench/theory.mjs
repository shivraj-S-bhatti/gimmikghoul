#!/usr/bin/env node
/**
 * Git owns history; one writer is assumed. No calculator imports on read/fingerprint.
 * Theory: {id, format, claims:[{id,text}], sets:{id:set}, references:{id:repoRelativePath}, ...prose}
 * Check: {claimId, question, decision, checker:'damage', input:<calculateRow input>}
 * Omitted input.format is filled from theory.format; a mismatch is rejected.
 * Only top-level generatedAt/updatedAt are volatile. Nested source dates remain semantic.
 * References are snapshotted as base64 bytes. Adjacent checks/ receipts cannot be references.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const FORMAT_VERSION = 1;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const requireValue = (ok, message) => { if (!ok) throw Error(message); };

export function canonicalJSON(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalJSON).join(',') + ']';
  if (object(value)) return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalJSON(value[key])).join(',') + '}';
  requireValue(value === null || ['string', 'boolean'].includes(typeof value) || typeof value === 'number' && Number.isFinite(value), 'Expected JSON data');
  return JSON.stringify(value);
}
const digest = value => sha(canonicalJSON(value));
const semanticTheory = theory => Object.fromEntries(Object.entries(theory).filter(([key]) => !['generatedAt', 'updatedAt'].includes(key)));
const within = (root, file) => file === root || file.startsWith(root + path.sep);

function validateTheory(theory) {
  requireValue(object(theory), 'Theory must be an object');
  for (const key of ['id', 'format']) requireValue(typeof theory[key] === 'string' && theory[key].trim(), `Theory ${key} is required`);
  requireValue(Array.isArray(theory.claims), 'Theory claims must be an array');
  const ids = new Set();
  for (const claim of theory.claims) {
    requireValue(object(claim) && typeof claim.id === 'string' && claim.id.trim() && typeof claim.text === 'string', 'Each claim needs id and text');
    requireValue(!ids.has(claim.id), `Duplicate claim: ${claim.id}`); ids.add(claim.id);
  }
  requireValue(object(theory.sets), 'Theory sets must be an object');
  requireValue(Object.values(theory.sets).every(object), 'Theory sets must contain set objects');
  requireValue(theory.references === undefined || object(theory.references), 'Theory references must be an object');
}
async function location(theoryFile, root) {
  root = await fs.realpath(root);
  const file = path.resolve(root, theoryFile);
  requireValue(within(root, file), 'Theory must be inside the repository root');
  // Resolve the parent as well, so checks cannot be written through an escaping symlink.
  const directory = await fs.realpath(path.dirname(file));
  requireValue(within(root, directory), 'Theory directory escapes the repository root');
  return {root, file, directory, checks: path.join(directory, 'checks')};
}
function snapshotFingerprint(snapshot) {
  const references = Object.fromEntries(Object.entries(snapshot.references).map(([id, ref]) => [id, {path: ref.path, sha256: ref.sha256}]));
  return digest({theory: semanticTheory(snapshot.theory), references});
}
async function capture(loc) {
  const realTheory = await fs.realpath(loc.file);
  requireValue(within(loc.root, realTheory), 'Theory file escapes the repository root');
  const theory = JSON.parse(await fs.readFile(realTheory, 'utf8')); validateTheory(theory);
  const references = {};
  for (const [id, relative] of Object.entries(theory.references || {}).sort(([a], [b]) => a.localeCompare(b))) {
    requireValue(typeof relative === 'string' && relative && !path.isAbsolute(relative), `Reference ${id} must be repository-relative`);
    const file = path.resolve(loc.root, relative);
    requireValue(within(loc.root, file) && !within(loc.checks, file), `Reference ${id} escapes the repository or refers to a receipt`);
    const real = await fs.realpath(file);
    requireValue(within(loc.root, real) && !within(loc.checks, real) && real !== realTheory, `Invalid reference ${id}`);
    const bytes = await fs.readFile(real);
    Object.defineProperty(references, id, {enumerable: true, value: {path: relative, sha256: sha(bytes), encoding: 'base64', content: bytes.toString('base64')}});
  }
  const snapshot = {theory, references};
  return {...snapshot, fingerprint: snapshotFingerprint(snapshot)};
}

/** No runtime is required for the semantic fingerprint. */
export async function fingerprintTheory(theoryFile, {root = ROOT} = {}) {
  const snapshot = await capture(await location(theoryFile, root));
  return {id: snapshot.theory.id, format: snapshot.theory.format, fingerprint: snapshot.fingerprint,
    references: Object.fromEntries(Object.entries(snapshot.references).map(([id, {path, sha256}]) => [id, {path, sha256}]))};
}

async function treeHashes(root, directory) {
  const files = [];
  async function walk(dir) {
    for (const entry of await fs.readdir(dir, {withFileTypes: true})) {
      const file = path.join(dir, entry.name);
      requireValue(!entry.isSymbolicLink(), `Runtime symlink is unsupported: ${path.relative(root, file)}`);
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile()) files.push(file);
    }
  }
  await walk(path.join(root, directory));
  requireValue(files.length, `Empty runtime directory: ${directory}`);
  return Promise.all(files.sort().map(async file => ({path: path.relative(root, file), sha256: sha(await fs.readFile(file))})));
}
async function runtimeIdentity(root) {
  try {
    const adapterPaths = ['workbench/theory.mjs', 'workbench/tools/calculator.mjs', 'workbench/tools/champions-engine.mjs'];
    const [adapters, engineFiles, bundle, calcManifestText, engineManifestText, dependencyLock] = await Promise.all([
      Promise.all(adapterPaths.map(async file => ({path: file, sha256: sha(await fs.readFile(path.join(root, file)))}))),
      treeHashes(root, '.cache/showdown/dist'),
      fs.readFile(path.join(root, '.cache/champions-calculator/calculator.cjs')),
      fs.readFile(path.join(root, '.cache/champions-calculator/manifest.json'), 'utf8'),
      fs.readFile(path.join(root, '.artifacts/source-manifest.json'), 'utf8'),
      fs.readFile(path.join(root, 'package-lock.json')),
    ]);
    const calculator = JSON.parse(calcManifestText), engine = JSON.parse(engineManifestText);
    requireValue(typeof calculator.revision === 'string' && typeof engine.revision === 'string', 'Missing runtime revision');
    requireValue(calculator.sha256 === sha(bundle), 'Calculator bundle does not match its manifest hash');
    for (const file of ['sim/dex.js', 'sim/team-validator.js', 'config/formats.js']) {
      requireValue(engineFiles.some(entry => entry.path === `.cache/showdown/dist/${file}`), `Missing engine file: ${file}`);
    }
    const identity = {adapters, calculator: {revision: calculator.revision, bundleSha256: sha(bundle)},
      engine: {declaredRevision: engine.revision, distSha256: digest(engineFiles), fileCount: engineFiles.length},
      dependencyLockSha256: sha(dependencyLock), node: process.versions.node, platform: process.platform, arch: process.arch};
    return {status: 'available', fingerprint: digest(identity), identity};
  } catch (error) { return {status: 'unavailable', reason: error.message}; }
}

function verifyReceipt(receipt, filename) {
  requireValue(/^[a-f0-9]{64}\.json$/.test(filename) && digest(receipt) === filename.slice(0, -5), 'Receipt filename/content hash mismatch');
  requireValue(receipt.schemaVersion === FORMAT_VERSION && receipt.origin === 'executed', 'Unsupported receipt schema or origin');
  const snapshot = receipt.snapshot;
  requireValue(object(snapshot) && object(snapshot.references), 'Missing receipt snapshot');
  validateTheory(snapshot.theory);
  requireValue(canonicalJSON(Object.keys(snapshot.references).sort()) === canonicalJSON(Object.keys(snapshot.theory.references || {}).sort()), 'Reference snapshot IDs differ from theory');
  for (const [id, ref] of Object.entries(snapshot.references)) {
    requireValue(ref.encoding === 'base64' && typeof ref.content === 'string' && ref.path === snapshot.theory.references[id], 'Invalid reference snapshot');
    const bytes = Buffer.from(ref.content, 'base64');
    requireValue(bytes.toString('base64') === ref.content && sha(bytes) === ref.sha256, `Reference snapshot hash mismatch: ${id}`);
  }
  requireValue(snapshot.fingerprint === snapshotFingerprint(snapshot), 'Theory snapshot fingerprint mismatch');
  requireValue(receipt.runtime?.status === 'available' || receipt.runtime?.status === 'unavailable', 'Missing runtime identity');
  if (receipt.runtime.status === 'available') requireValue(digest(receipt.runtime.identity) === receipt.runtime.fingerprint, 'Runtime identity hash mismatch');
  validateRequest(snapshot.theory, receipt.request);
}
function applicability(receipt, snapshot, runtime) {
  const reasons = [];
  let stale = false;
  if (!snapshot) reasons.push('theory_unavailable');
  else if (snapshot.fingerprint !== receipt.snapshot.fingerprint) { reasons.push('theory_or_reference_changed'); stale = true; }
  if (receipt.runtime.status !== 'available' || runtime.status !== 'available') reasons.push('runtime_unavailable');
  else if (runtime.fingerprint !== receipt.runtime.fingerprint) { reasons.push('runtime_changed'); stale = true; }
  if (receipt.execution?.runtimeStable === false) { reasons.push('runtime_changed_during_check'); stale = true; }
  return {status: stale ? 'stale' : reasons.length ? 'unverifiable' : 'current', reasons};
}

/** Freshness describes a stored observation, never the truth of its claim. */
export async function readTheory(theoryFile, {root = ROOT} = {}) {
  const loc = await location(theoryFile, root);
  let snapshot, inputError;
  try { snapshot = await capture(loc); } catch (error) { inputError = error.message; }
  const runtime = await runtimeIdentity(loc.root);
  let files;
  try { files = await fs.readdir(loc.checks); } catch (error) { if (error.code !== 'ENOENT') throw error; files = []; }
  const receipts = [];
  for (const file of files.filter(file => file.endsWith('.json')).sort()) {
    try {
      const receipt = JSON.parse(await fs.readFile(path.join(loc.checks, file), 'utf8'));
      verifyReceipt(receipt, file);
      receipts.push({file: path.relative(loc.root, path.join(loc.checks, file)), integrity: 'valid', ...applicability(receipt, snapshot, runtime), receipt});
    } catch (error) { receipts.push({file: path.relative(loc.root, path.join(loc.checks, file)), integrity: 'invalid', status: 'invalid', reasons: [error.message]}); }
  }
  return {theory: snapshot?.theory ?? null, fingerprint: snapshot?.fingerprint ?? null, ...(inputError ? {inputError} : {}), runtime, receipts,
    scope: 'Receipt integrity and freshness only; no claim, matchup, or team is certified.'};
}
function validateRequest(theory, request) {
  requireValue(object(request), 'Check request must be an object');
  for (const key of Object.keys(request)) requireValue(['claimId', 'question', 'decision', 'checker', 'input'].includes(key), `Unknown check request field: ${key}`);
  for (const key of ['claimId', 'question', 'decision']) requireValue(typeof request[key] === 'string' && request[key].trim(), `${key} is required`);
  requireValue(theory.claims.some(claim => claim.id === request.claimId), `Unknown claim: ${request.claimId}`);
  requireValue(request.checker === 'damage', 'Only checker damage is supported');
  requireValue(object(request.input), 'Check input must be an object');
  requireValue(request.input.format === undefined || request.input.format === theory.format, 'Check input.format differs from theory.format');
}
function executeDamage(root, input) {
  // A fresh process avoids cached ESM/CommonJS code being attributed to newly hashed files.
  const moduleURL = pathToFileURL(path.join(root, 'workbench/tools/calculator.mjs')).href;
  const program = "let input=''; for await(const part of process.stdin) input+=part; const {calculateRow}=await import(process.argv[1]); process.stdout.write(JSON.stringify(await calculateRow(JSON.parse(input))));";
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', program, moduleURL], {cwd: root, stdio: ['pipe', 'pipe', 'pipe']});
    let stdout = '', stderr = '';
    child.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.stdin.on('error', error => { if (error.code !== 'EPIPE') reject(error); });
    child.on('close', code => {
      if (code !== 0) return reject(Error(`Calculator process failed (${code}): ${stderr.trim()}`));
      try { resolve(JSON.parse(stdout)); } catch (error) { reject(Error(`Invalid calculator output: ${error.message}`)); }
    });
    child.stdin.end(JSON.stringify(input));
  });
}

export async function checkTheory(theoryFile, request, {root = ROOT} = {}) {
  const loc = await location(theoryFile, root);
  const snapshot = await capture(loc);
  validateRequest(snapshot.theory, request);
  request = JSON.parse(canonicalJSON({...request, input: {...request.input, format: snapshot.theory.format}}));
  const runtime = await runtimeIdentity(loc.root);
  const startedAt = new Date().toISOString();
  let output = null, outcome = 'failed', error;
  try {
    requireValue(runtime.status === 'available', `Runtime unavailable: ${runtime.reason}`);
    output = await executeDamage(loc.root, request.input);
    requireValue(object(output) && typeof output.status === 'string', 'Calculator did not return a status');
    outcome = output.status === 'calculated' ? 'completed' : output.status === 'partial' ? 'partial' : 'unsupported';
  } catch (failure) { error = failure.message; }
  const runtimeAfter = await runtimeIdentity(loc.root);
  let after, inputError;
  try { after = await capture(loc); } catch (failure) { inputError = failure.message; }
  const receipt = {schemaVersion: FORMAT_VERSION, origin: 'executed', snapshot, request, runtime,
    execution: {startedAt, finishedAt: new Date().toISOString(), runtimeAfter,
      runtimeStable: runtime.status !== 'available' ? null : runtimeAfter.status === 'available' && runtime.fingerprint === runtimeAfter.fingerprint},
    outcome, output, ...(error ? {error} : {})};
  const id = digest(receipt);
  await fs.mkdir(loc.checks, {recursive: true});
  requireValue(within(loc.root, await fs.realpath(loc.checks)), 'Receipt directory escapes the repository');
  // Exclusive creation preserves prior receipts. A single writer owns this directory.
  const target = path.join(loc.checks, id + '.json');
  await fs.writeFile(target, JSON.stringify(receipt, null, 2) + '\n', {flag: 'wx'});
  return {file: path.relative(loc.root, target), integrity: 'valid', ...applicability(receipt, after, runtimeAfter),
    ...(inputError ? {inputError} : {}), receipt};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [operation, file, ...extra] = process.argv.slice(2);
    requireValue(file && !extra.length && ['fingerprint', 'read', 'check'].includes(operation), 'Usage: node workbench/theory.mjs fingerprint|read|check THEORY.json; check reads JSON stdin');
    let result;
    if (operation === 'fingerprint') result = await fingerprintTheory(file);
    else if (operation === 'read') result = await readTheory(file);
    else { let raw = ''; for await (const part of process.stdin) raw += part; result = await checkTheory(file, JSON.parse(raw)); }
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } catch (error) { process.stderr.write(JSON.stringify({error: error.message}) + '\n'); process.exitCode = 1; }
}
