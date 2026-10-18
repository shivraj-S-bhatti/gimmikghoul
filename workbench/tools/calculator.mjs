/** Input/output adapter only. All stats, damage, and KO results come from Smogon. */
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateSetRow, DEFAULT_FORMAT} from './champions-engine.mjs';

const require = createRequire(import.meta.url);
const {Dex} = require('../../.cache/showdown/dist/sim/dex.js');
const dex = Dex.mod('champions');
const REVISION = 'c1eb09be483f0bbf65132bf3703ee677195132f3';
let calc;
function loadCalculator() {
  if (calc) return calc;
  const base = new URL('../../.cache/champions-calculator/', import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL('manifest.json', base)));
  check(manifest.revision === REVISION, 'Wrong calculator revision; run prepare-calculator.mjs');
  check(manifest.sha256 === createHash('sha256').update(readFileSync(new URL('calculator.cjs', base))).digest('hex'), 'Calculator bundle hash mismatch; run prepare-calculator.mjs');
  calc = require(new URL('calculator.cjs', base).pathname);
  return calc;
}
function check(ok, message) { if (!ok) throw Error(message); }
function keys(object, allowed, label) {
  check(object && typeof object === 'object' && !Array.isArray(object), `${label} must be an object`);
  for (const key of Object.keys(object)) check(allowed.includes(key), `Unsupported ${label} field: ${key}`);
}
function integer(value, min, max, label) { check(Number.isInteger(value) && value >= min && value <= max, `${label} must be an integer ${min}..${max}`); }
const statKeys = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
function nativeName(table, value, label) {
  check(typeof value === 'string', `${label} must be a string`);
  const entry = table.get(Dex.toID(value));
  check(entry, `Unknown Champions calculator ${label}: ${value}`);
  return entry.name;
}
function actor(input, format, gen, label) {
  // Flat candidate.set values and explicit {set, canonicalSpecies, state} are accepted.
  const wrapped = input && Object.hasOwn(input, 'set');
  if (wrapped) keys(input, ['set', 'canonicalSpecies', 'state'], label);
  const set = wrapped ? input.set : input;
  keys(set, ['species', 'canonicalSpecies', 'name', 'level', 'ability', 'item', 'moves', 'nature', 'evs', 'ivs', 'gender'], `${label}.set`);
  check(set.level === undefined || set.level === 50, 'Champions calculator requires level 50');
  if (set.evs !== undefined) { keys(set.evs, statKeys, 'evs'); for (const value of Object.values(set.evs)) integer(value, 0, 32, 'stat points'); }
  if (set.ivs !== undefined) { keys(set.ivs, statKeys, 'ivs'); for (const iv of Object.values(set.ivs)) check(iv === 31, 'Champions calculator requires perfect IVs'); }
  if (wrapped && input.canonicalSpecies !== undefined && set.canonicalSpecies !== undefined) check(Dex.toID(input.canonicalSpecies) === Dex.toID(set.canonicalSpecies), `${label}: conflicting canonicalSpecies declarations`);
  const canonicalSpecies = (wrapped && input.canonicalSpecies) || set.canonicalSpecies || set.species;
  const selected = dex.species.get(canonicalSpecies);
  const original = dex.species.get(set.species);
  check(selected.exists && original.exists, `${label}: unknown species`);
  check(selected.id === original.id || selected.isMega && selected.baseSpecies === original.name, `${label}: canonicalSpecies must identify this species or its Mega form`);
  if (selected.isMega) check(dex.items.get(set.item).megaStone?.[selected.baseSpecies] === selected.name, `${label}: Mega form requires its matching stone`);
  const validationSet = {...set}; delete validationSet.canonicalSpecies;
  const validation = validateSetRow({format, set: validationSet});
  check(validation.status === 'valid', `${label}: ${validation.errors.join('; ')}`);
  // Do not use normalizedSet.species: TeamValidator normalizes Megas to their base form.
  const species = nativeName(gen.species, selected.name, 'species');
  const ability = nativeName(gen.abilities, selected.id !== original.id ? selected.abilities['0'] : set.ability, 'ability');
  check(Object.values(selected.abilities).includes(ability), `${label}: ability does not belong to the requested battle form`);
  const state = wrapped ? input.state ?? {} : {};
  check(!wrapped || input.state !== null, `${label}.state must be an object`);
  keys(state, ['boosts', 'curHP', 'status', 'toxicCounter', 'abilityOn', 'alliesFainted'], `${label}.state`);
  if (state.boosts) { keys(state.boosts, statKeys.slice(1), 'boosts'); for (const n of Object.values(state.boosts)) integer(n, -6, 6, 'boost'); }
  if (state.status !== undefined) check(['', 'slp', 'psn', 'brn', 'frz', 'par', 'tox'].includes(state.status), 'Unsupported status');
  if (state.toxicCounter !== undefined) integer(state.toxicCounter, 0, 15, 'toxicCounter');
  if (state.alliesFainted !== undefined) integer(state.alliesFainted, 0, 5, 'alliesFainted');
  if (state.abilityOn !== undefined) check(typeof state.abilityOn === 'boolean', 'abilityOn must be boolean');
  const pokemon = new calc.Pokemon(gen, species, {
    level: 50, ability, item: set.item ? nativeName(gen.items, set.item, 'item') : undefined,
    nature: nativeName(gen.natures, set.nature || 'Serious', 'nature'),
    evs: set.evs, ivs: set.ivs, gender: set.gender || undefined,
    moves: set.moves.map(move => nativeName(gen.moves, move, 'move')), ...state,
  });
  if (state.curHP !== undefined) integer(state.curHP, 1, pokemon.maxHP(), 'curHP');
  return {pokemon, validation};
}
const fieldFlags = ['isMagicRoom', 'isWonderRoom', 'isGravity', 'isAuraBreak', 'isFairyAura', 'isDarkAura', 'isBeadsOfRuin', 'isSwordOfRuin', 'isTabletsOfRuin', 'isVesselOfRuin'];
const sideFlags = ['isSR', 'isReflect', 'isLightScreen', 'isProtected', 'isSeeded', 'isNightmared', 'isSaltCured', 'isForesight', 'isCharge', 'isTailwind', 'isHelpingHand', 'isFlowerGift', 'isPowerTrick', 'isFriendGuard', 'isAuroraVeil', 'isBattery', 'isPowerSpot', 'isSteelySpirit'];
function fieldInput(input, format) {
  keys(input, ['gameType', 'weather', 'terrain', 'attackerSide', 'defenderSide', ...fieldFlags], 'field');
  const gameType = Dex.formats.get(format).gameType === 'doubles' ? 'Doubles' : 'Singles';
  check(input.gameType === undefined || input.gameType === gameType, 'field.gameType conflicts with format');
  if (input.weather !== undefined) check(['Sun', 'Rain', 'Sand', 'Snow', 'Harsh Sunshine', 'Heavy Rain', 'Strong Winds'].includes(input.weather), 'Unsupported weather; use native calculator names');
  if (input.terrain !== undefined) check(['Grassy', 'Electric', 'Psychic', 'Misty'].includes(input.terrain), 'Unsupported terrain; use native calculator names');
  for (const key of fieldFlags) if (input[key] !== undefined) check(typeof input[key] === 'boolean', `${key} must be boolean`);
  for (const side of ['attackerSide', 'defenderSide']) if (input[side] !== undefined) {
    keys(input[side], [...sideFlags, 'spikes', 'isSwitching'], side);
    for (const key of sideFlags) if (input[side][key] !== undefined) check(typeof input[side][key] === 'boolean', `${key} must be boolean`);
    if (input[side].spikes !== undefined) integer(input[side].spikes, 0, 3, 'spikes');
    if (input[side].isSwitching !== undefined) check(['in', 'out'].includes(input[side].isSwitching), 'isSwitching must be in/out');
  }
  return new calc.Field({...input, gameType});
}
function snapshot(pokemon) {
  return {species: pokemon.name, ability: pokemon.ability, item: pokemon.item, level: pokemon.level, stats: pokemon.rawStats, statPoints: pokemon.evs, boosts: pokemon.boosts, currentHP: pokemon.curHP()};
}
export function calculateRow(row) {
  try {
    keys(row, ['id', 'format', 'attacker', 'defender', 'move', 'moveOptions', 'field'], 'row');
    loadCalculator();
    const format = row.format === undefined ? DEFAULT_FORMAT : row.format;
    const gen = calc.Generations.get(0);
    const attacker = actor(row.attacker, format, gen, 'attacker');
    const defender = actor(row.defender, format, gen, 'defender');
    const moveName = nativeName(gen.moves, row.move, 'move');
    check(attacker.pokemon.moves.includes(moveName), 'Move must belong to the supplied attacker set');
    const options = row.moveOptions === undefined ? {} : row.moveOptions;
    keys(options, ['isCrit', 'hits', 'timesUsed', 'timesUsedWithMetronome'], 'moveOptions');
    if (options.isCrit !== undefined) check(typeof options.isCrit === 'boolean', 'isCrit must be boolean');
    for (const key of ['hits', 'timesUsed', 'timesUsedWithMetronome']) if (options[key] !== undefined) integer(options[key], 1, 10, key);
    if (options.hits !== undefined) {
      const count = gen.moves.get(Dex.toID(moveName)).multihit;
      check(count, 'hits is supported only for native multi-hit moves');
      if (Array.isArray(count)) integer(options.hits, count[0], count[1], 'hits');
      else integer(options.hits, 1, count, 'hits');
    }
    const field = fieldInput(row.field === undefined ? {} : row.field, format);
    const move = new calc.Move(gen, moveName, {ability: attacker.pokemon.ability, item: attacker.pokemon.item, species: attacker.pokemon.name, ...options});
    const result = calc.calculate(gen, attacker.pokemon, defender.pokemon, move, field);
    // Preserve native objects/text, including approximation wording. No roll enumeration.
    const native = {damage: result.damage, range: result.range()};
    const errors = {};
    for (const method of ['fullDesc', 'kochance']) {
      try { native[method] = result[method](); }
      catch (error) { native[method] = null; errors[method] = error.message; }
    }
    return {id: row.id, status: Object.keys(errors).length ? 'partial' : 'calculated',
      calculator: {repository: 'smogon/damage-calc', revision: REVISION, generation: 0},
      format, input: structuredClone(row), attacker: snapshot(attacker.pokemon), defender: snapshot(defender.pokemon),
      field, move: {name: move.name, hits: move.hits, isCrit: move.isCrit, timesUsed: move.timesUsed},
      native, ...(Object.keys(errors).length ? {errors} : {}),
      legality: {attacker: attacker.validation, defender: defender.validation},
      scope: 'Native calculator snapshot. KO text and chance retain upstream assumptions; accuracy, establishing the position, and battle win probability are not inferred.'};
  } catch (error) { return {id: row?.id, status: 'invalid_or_unsupported', reason: error.message, native: null}; }
}
