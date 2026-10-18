# Reuse calculator results; spend our work on team discovery

The former custom damage path has been replaced with a thin adapter to the pinned native Smogon Champions calculator. The old path called Showdown for damage but still implemented roll enumeration, KO counting, snapshot setup, and its own mechanics support list. Exact-format set validation remains as a thin Showdown adapter.

## What to reuse

Smogon's damage calculator has a dedicated Champions implementation at generation index `0`. Its stat code uses Champions stat points directly. An integration should pin a Champions-capable revision and call that implementation, with no vanilla Gen 9 substitution or homegrown stat conversion. Reviewed upstream revision: `c1eb09be483f0bbf65132bf3703ee677195132f3`. [Dispatch](https://github.com/smogon/damage-calc/blob/c1eb09be483f0bbf65132bf3703ee677195132f3/calc/src/calc.ts), [stats](https://github.com/smogon/damage-calc/blob/c1eb09be483f0bbf65132bf3703ee677195132f3/calc/src/stats.ts).

Pass through the calculator's `damage`, `range()`, `fullDesc()`, and `kochance()` results. Preserve the complete input sets, field, current HP, requested move/hit settings, and calculator revision with each result. Preserve unsupported outcomes and approximation wording. This is a calculator result for supplied conditions, not a prediction that a team can establish those conditions. [Result API](https://github.com/smogon/damage-calc/blob/c1eb09be483f0bbf65132bf3703ee677195132f3/calc/src/result.ts).

`kochance()` returns a selected KO description with `chance`, `n`, and `text`; it does not return a complete OHKO/2HKO probability table. The implementation considers hazards and end-of-turn effects and can label multi-hit results approximate. Keep that returned object intact. If a downstream table needs a probability the public result did not provide, leave it absent rather than filling it with our own enumeration. [KO implementation](https://github.com/smogon/damage-calc/blob/c1eb09be483f0bbf65132bf3703ee677195132f3/calc/src/desc.ts#L269).

`prepare-calculator.mjs` builds that pinned upstream source using the repo's existing bundler. `damage.mjs` and `calculator.mjs` now provide batch input/output mapping. Base-form, Mega, and field smoke checks passed using candidate sets from `data/meta-sets.json`, with native OHKO and 2HKO descriptions. Application and graph integration remain with the integration owner.

## What to drop or replace

| Work | Decision |
| --- | --- |
| Former `damageRow`, randomizer override, conditional KO counter | Removed. `damage.mjs` now calls only the native calculator adapter. |
| `tools/set-legality.mjs` | Retained; calls the exact Champions format's `TeamValidator`. |
| Earlier damage smoke ranges | Do not promote as accepted calculator evidence; rerun any useful question through the chosen calculator. |
| E3 custom 16/256/4096-combination KO enumeration | Replace through the integration owner. Its downstream threat/core rankings need fresh calculator evidence before reuse. |

The E3 dependency is recorded in [E3-matchups-cores.md](https://github.com/shivraj-S-bhatti/pokemon-battle-lab/blob/6e9aa7d76643d6af3974023d902a647db48a9502/research/experiments/E3-matchups-cores.md), under its calculation method. That experiment and its graph data were not edited here.

## Where exploration should go next

The visible symbolic graph should connect candidate team plans to supporting mechanics, opposing responses, alternative partners, and sourced checks. An agent runtime graph describes execution; it should remain separate. Hypothesis edges must remain distinguishable from observed evidence.

Before requesting calculations, each plan should name its target matchups, tolerated losses or matchups outside its goals, and dealbreaker threats. Investigate thresholds that could change a team choice. Do not run the whole species pool and treat the resulting matrix as an objective definition of success. Keep speed versus damage tradeoffs visible, along with the partner that makes each choice useful. Preserve rejected alternatives and revision history: replacing a teammate or choosing Modest over Timid is a decision with consequences, not a final fact that erases the earlier option.

For the [Mudsdale investigation](https://github.com/shivraj-S-bhatti/pokemon-battle-lab/blob/6e9aa7d76643d6af3974023d902a647db48a9502/workbench/DISCOVERY_RECOVERY.md), the next questions are ranked by whether their answers change the team choice:

1. **Can a different partner rescue a failed opening?** Retrieve opposing Fake Out, redirection, and special-pressure leads, then compare Maushold, Alolan Persian, and Whimsicott against the same named board. A successful alternative creates a new plan; merely restating that Beat Up enables Stamina does not.
2. **Which remaining teammates create a second viable opening?** Search for partners that address the failed opening while supporting another lead when Mudsdale setup is denied. Rank candidates by distinct useful plans and unresolved failure conditions, not just coverage-edge count.
3. **Which quantitative check changes that ranking?** Request existing-calculator output only for the survival or damage threshold separating the leading candidates. Attach the result to the exact conditional claim it tests.

These are investigation priorities, not claims of a novel or successful finished team. The next useful deliverable is a concrete team candidate, its surprising useful opening, and an opposing response that would reject it.
