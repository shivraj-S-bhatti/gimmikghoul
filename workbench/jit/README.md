# Gimmikghoul demo: a team theory graph built just in time

**Thesis:** an agent with a graph of Pokémon mechanics can take a team idea, find what it needs, check what a support move actually buys against chosen targets, list what breaks it, and keep alternatives, in minutes. The graph is built per idea, from engine data, calculator results and attributed source claims, and it grows as the theory is revised.

It does not promise the agent invents winning teams, and no edge is a win rate.

## Run (about 30 seconds of compute)

Prerequisites: `docker compose --profile explore up -d --build --wait` (FalkorDB on 6388, Browser on http://localhost:4319), the Showdown cache (`npm run prepare:data`) and the native calculator (`node workbench/tools/prepare-calculator.mjs`).

```sh
node workbench/jit/build-jit.mjs 1   # resets gk_gimmikghoul
node workbench/jit/build-jit.mjs 2
node workbench/jit/build-jit.mjs 3
node workbench/jit/build-jit.mjs 4
node workbench/jit/build-jit.mjs 5
node workbench/jit/build-jit.mjs 6
node scripts/experiment-sprites.mjs gk_gimmikghoul
```

Each step prints what it added and a Browser query. In the Browser pick graph `gk_gimmikghoul`, paste the query, and record the graph growing.

## Edge legend (relationship types)

No edge type means "good matchup" or "bad matchup". Edges record what was found and how.

| Edge | Meaning | Status values |
|---|---|---|
| `CORE` | The pair the source says the team is built around | `source_claim` |
| `CAN_LEARN` | Move is in the Champions learnset (or on the source's rental set); the set is not validated | `learnset_candidate`, `on_source_set` |
| `ENABLES` | A move feeds a partner: Decorate's +2, or a stat drop that Contrary would invert | `source_claim_and_move_data`, `rule_candidate` (ability present, targeting and set not checked) |
| `OHKO_AT_PLUS2` / `NOT_OHKO_AT_PLUS2` | Native calculator at +0 and +2; carries `move`, `at0`, `atPlus2`, `decorateFlips`, `attackerSet`, `defenderSet`, `field`, `conditions`, `receipt` | `native_checked` |
| `CALC_NOT_COMPLETED` | The calculator returned a non-`calculated` status (for example `partial` with damage [0,0]); kept as returned, not turned into a verdict | `native_partial` |
| `NO_EFFECT` | Attacker's move does nothing to the target (Garchomp `NO_EFFECT` Fairy: Draco Meteor), from the engine type chart | `engine_typechart` |
| `COUNTERPLAY` | A condition the pilot plays around, not a dismissal; carriers linked by `CARRIES`; redirection edges carry the source's `policy` | `source_claim`, `meta_candidate_set` |
| `BLOCKS` / `HELMET_OPPORTUNITY` | Sweet Veil versus sleep; meta sets whose contact attacks would trigger Rocky Helmet if they hit Alcremie | `engine_ability_text`, `engine_move_flags` |
| `OTHER_SUPPORT` | Another ally-support move with its stat vector and `raisesSpecialAttack`; a different support, not a substitute for Decorate | `move_data` |
| `OTHER_PLAN` | A different plan for the same team slot (Memento into Mega Staraptor for the one-Mega slot) | `hypothesis` |

Team sets come from the source's rental screen (`Mon.setSource`). Step 3 writes `workbench/jit/checks/step3-decorate.json`: every calculator input and full output at +0 and +2, with the calculator revision and bundle hash and the engine revision. Edges point at their row. Target sets are `data/meta-sets.json` candidates, constructed from usage, not observed full sets.

## Six beats for the video

1. **Seed** (`MATCH p=(:Mon)-[:CORE]->(:Mon) RETURN p`). A real top-16 team from Louisville Regionals: Alcremie, Mega Garchomp Z, Trick Room Torkoal. The cores come from the creator's explanation and are labeled as his claims.
2. **Index** (`MATCH p=(:Mon)-[:CAN_LEARN]->(:Move)-[:ENABLES]->(:Mon) RETURN p`). From engine data alone, every status move whose engine target type can reach an adjacent ally (`normal`, `adjacentAlly`, `allies`, ...) and raises stats is an ally booster (Decorate, Coaching, Aromatic Mist, Howl, plus Swagger and Flatter flagged as confusing). Every ally-targetable move that lowers a target by 2 or more becomes a candidate boost for a Contrary ally; `allAdjacentFoes` moves such as Growl or Cotton Spore are excluded (Memento or Charm into Mega Staraptor, Malamar, Serperior). No hand-written list. These are learnset and rule candidates, not validated sets or traced interactions.
3. **What +2 buys** (`MATCH p=(:Mon {onTeam:true})-[r:OHKO_AT_PLUS2|NOT_OHKO_AT_PLUS2|CALC_NOT_COMPLETED]->(:Mon) RETURN p`). Native Smogon Champions calculator, eight chosen targets. Decorate turns Draco Meteor into a guaranteed OHKO on Rillaboom (31.3% at +0), Incineroar (2HKO at +0), Archaludon (93.8%) and Mega Charizard Y (2HKO at +0). Kingambit and Gholdengo are still 2HKOs, which is not a lost matchup, just no OHKO. Sylveon: the calculator returns `partial` with damage [0, 0], kept as returned. Torkoal's sun Eruption already OHKOs Rillaboom, Kingambit and Gholdengo at +0.
4. **What breaks it** (`MATCH p=()-[:COUNTERPLAY]->(:Mon {onTeam:true}) RETURN p UNION MATCH p=(:Mon {onTeam:true})-[:NO_EFFECT]->() RETURN p`). Redirection carriers in the meta (Indeedee-F, Sinistcha, Volcarona, Maushold) steal Decorate. Fairy types blank Draco. The creator's own warnings stay as source claims: faster Garchomp, specially bulky Charizard, Focus Sash, rain against Torkoal, Taunt against Trick Room. The creator's bulky-Charizard warning is about Power Gem from an unboosted Garchomp; our calc is +2 Draco Meteor into the common Charizard candidate set. They answer different questions, so neither contradicts the other. Redirection is a condition the pilot plays around (the source uses Helping Hand or attacks instead of Decorate, or skips the Alcremie lead into Indeedee), not a reason to drop the plan.
5. **Why Alcremie, specifically** (`MATCH p=(:Mon {id:'alcremie'})-[:BLOCKS|HELMET_OPPORTUNITY]->() RETURN p`). Sweet Veil blocks sleep for itself and its partner, which answers the meta's sleep hole (Venusaur). Rocky Helmet: 10 of the top 30 meta candidate sets carry 2 or more contact attacks (Rillaboom, Sneasler, Incineroar, Kingambit, Basculegion...), from engine move flags. These are chip opportunities, not matchup results: they only trigger if that move targets Alcremie and connects, and target choice, Protect, Protective Pads and differing sets are not checked.
6. **Other supports** (`MATCH p=(:Mon)-[:OTHER_SUPPORT]->(:Move {id:'decorate'}) RETURN p`). Coaching (+1 Atk/Def), Aromatic Mist (+1 SpD) and Howl (+1 Atk) are shown with their stat vectors. None raises Special Attack, so none does Decorate's job for special Garchomp or Torkoal; they are different supports, not substitutes. Mega Staraptor's Memento line sits beside Garchomp as a different plan for the one-Mega slot.

Close on: every strategy has counterplay; the graph makes it explicit so the pilot can play around it.

## Numbers observed

48 Mon, 18 Move, 7 Threat nodes, 1 Source; 45 CAN_LEARN, 49 ENABLES, 8 OHKO_AT_PLUS2, 5 NOT_OHKO_AT_PLUS2, 1 CALC_NOT_COMPLETED, 6 NO_EFFECT, 9 COUNTERPLAY, 5 CARRIES, 1 BLOCKS, 10 HELMET_OPPORTUNITY, 8 OTHER_SUPPORT, 1 OTHER_PLAN, 2 CORE edges. 28 native calculator calls (neutral field; sun for Eruption), all stored in the step 3 receipt. Learnsets are Champions mod data, not a full validator.
