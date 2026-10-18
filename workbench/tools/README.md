# Champions calculator and legality adapters

This CLI delegates individual-set validation to the prepared Pokemon Showdown engine in `.cache/showdown/dist`. Run the repository's `npm run prepare:data` if the cache is missing.

```sh
node workbench/tools/set-legality.mjs < workbench/tools/legality-examples.json
```

Input is one row, an array, or `{"rows":[...]}`, with at most 500 rows. Each row has `id` (optional), `format` (optional), and a native Showdown `set`. Output is `{"results":[...]}`. Results carry status, validation errors, normalized set, and the engine revision declared by `.artifacts/source-manifest.json`.

The default format is `gen9championsvgc2026regmc`. Only existing canonical format IDs whose mod is `champions` are accepted, and the exact requested ID goes to `TeamValidator`. The set's `evs` fields represent Champions stat points. Team-wide clauses require separate full-team validation.

Rows report `valid`, `invalid`, or `invalid_input`. Invalid rows do not abort a batch; callers must inspect each status. Malformed JSON exits with code 2. Import `validateSetRow` from `champions-engine.mjs` for programmatic use.

## Native calculator

```sh
node workbench/tools/prepare-calculator.mjs
node workbench/tools/damage.mjs < workbench/tools/damage-examples.json
```

Preparation checks out Smogon's calculator at `c1eb09be483f0bbf65132bf3703ee677195132f3` in the ignored `.cache/damage-calc` directory and bundles its unmodified source with the repo's existing esbuild dependency. A checkout at another revision or with tracked modifications is refused. The generated bundle's revision and hash are checked when loaded. No root package edits or additional dependency installation are needed. Showdown preparation is also required for set validation and name mapping.

Damage input uses the same batch envelope. Each row has optional `id` and `format`, required `attacker`, `defender`, and `move`, plus optional `field` and `moveOptions`. Import `calculateRow` from `calculator.mjs` for programmatic use.

`attacker` and `defender` accept the **flat `candidate.set` from `data/meta-sets.json`**. For battle state or an explicit form, use this wrapper:

```json
{
  "set": {
    "species": "Salamence", "ability": "Intimidate", "item": "Salamencite",
    "moves": ["Hyper Voice"], "nature": "Timid", "evs": {"spa":32,"spe":32,"hp":2}
  },
  "canonicalSpecies": "Salamence-Mega",
  "state": {"boosts":{"spa":1}, "curHP":172}
}
```

Species, move, ability, and item IDs are mapped to native calculator names. `canonicalSpecies` can also be a field on the flat set. It selects the requested Mega form and its native ability when the supplied set describes the base form; it must match that species and stone. A Mega stone alone does not select Mega Evolution. Direct Mega species in `candidate.set` remain Mega in the calculation even though legality validation normalizes them to the base form. Conflicting form declarations are refused.

Set fields are `species`, `canonicalSpecies`, optional nickname `name`, `level`, `ability`, `item`, `moves`, `nature`, `evs`, `ivs`, and `gender`. Stat points go directly into the native Champions `evs` field, with no EV conversion or custom stat formula. Level must be 50 and supplied IVs must be 31.

Optional `state` supports native `boosts`, `curHP`, `status`, `toxicCounter`, `abilityOn`, and `alliesFainted`. Optional `moveOptions` supports native `isCrit`, `hits`, `timesUsed`, and `timesUsedWithMetronome`. The returned `move` records the effective native settings, including any upstream default hit count. A hit count is an assumption, not an accuracy distribution.

`field` uses **native calculator names**: weather such as `Rain` or `Sun`, terrain such as `Grassy`, and `attackerSide`/`defenderSide` objects such as `{"isLightScreen":true,"isFriendGuard":true}`. Game type comes from the exact format; a conflicting explicit `gameType` is refused. The bounded supported flags are listed in `calculator.mjs` as `fieldFlags` and `sideFlags`; unknown keys are errors. Supply the field and boosts for the intended position, including entry effects; this adapter does not simulate the opening.

Results pass through `native.damage`, `native.range`, `native.fullDesc`, and `native.kochance` without new formulas, roll enumeration, or probability aggregation. Upstream approximation wording stays intact. If native description/KO methods fail, status is `partial`, those fields are null, and `errors` records their messages. Invalid or unsupported inputs return `invalid_or_unsupported` with no native result. Neither result implies accuracy-adjusted KO odds or battle win probability.

The three checked examples use selected candidate sets: base Rillaboom into Primarina, Mega Salamence into Rillaboom, and that Mega matchup with Light Screen and Friend Guard. Native output includes an OHKO description and a 2HKO description. They are adapter smoke checks, not a recommendation of those matchups or an exhaustive matrix.

See [calculator reuse and exploration handoff](CALCULATOR_REUSE.md) for the E3 migration and plan-focused investigation priorities.
