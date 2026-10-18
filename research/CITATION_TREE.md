# Gimmikghoul research lineage

Gimmikghoul asks how a player and an agent can turn a favourite Pokémon into a team idea, inspect why it might work, and explore alternatives when a premise changes. These sources give us methods to borrow and experiments to attempt. The community can propose ideas beyond this reading list.

This is a conceptual lineage map. An edge means the source informs the named question; it does not assert that one paper cites another. **Inspiration**, **evaluation reference**, and **implemented dependency** describe different relationships to this project.

## The tree

```text
Gimmikghoul: make team ideas explorable
|
+-- Which teams are worth exploring?
|   `-- [1] Sahovic: team objectives and pairwise interactions [inspiration]
|
+-- What must happen for an idea to work?
|   +-- [2] Graphplan: preconditions, effects, mutual exclusions [inspiration]
|   `-- [3] Directed hypergraphs: joint prerequisites / AND-OR structure [inspiration]
|       `-- Proposed: alternative conditional routes to a player's goal
|
+-- How could an agent test and revise those ideas?
|   +-- [4] PokeChamp: language models inside adversarial search [inspiration]
|   `-- [5] VGC-Bench: evaluate generalization across teams [evaluation reference]
|
+-- Where did a belief come from, and when did it apply?
|   +-- [6] PROV-O: attribution and derivation [inspiration]
|   `-- [7] Graphiti: evolving facts and temporal context [optional inspiration]
|
`-- What machinery does the current demo call?
    +-- [8] Pokemon Showdown: mechanics data and set validation [implemented dependency]
    `-- [9] Smogon damage-calc: selected damage checks [implemented dependency]
```

The current demo's local call chain is `workbench/jit/build-jit.mjs` to the prepared Showdown Dex and `workbench/tools/calculator.mjs`. The preparation scripts pin their upstream revisions. Graphplan, Graphiti, PokéChamp and VGC-Bench are research references here; this tree does not imply their algorithms or software are installed.

## What each source contributes

| Source | Contribution we can use | Question it opens for Gimmikghoul |
|---|---|---|
| **[1] Haris Sahovic, [Algorithmic Pokémon Teambuilding](https://sahovic.fr/algorithmic-pokemon-teambuilding.html), 2025.** | Separates counter-team, metagame and equilibrium objectives; contrasts individual-strength and pairwise-interaction models. Its experiments use simplified Gen 1 sets and a fixed heuristic pilot. | Can explicit mechanisms explain when a pairing helps, and help propose useful alternatives to that pairing? Transferring learned values to Champions would require a new experiment. |
| **[2] Avrim Blum and Merrick Furst, [Fast Planning Through Planning Graph Analysis](https://www.cs.cmu.edu/~avrim/graphplan.html), 1997.** | A planning graph exposes constraints before separate plan extraction. Preconditions, effects and mutual exclusions provide a vocabulary for actions that enable or obstruct each other. | Can timing and action-slot constraints reject impossible combos before expensive checks? Pokémon adds uncertainty and an opponent beyond the paper's STRIPS-style setting. |
| **[3] Giorgio Gallo, Giustino Longo, Sang Nguyen and Stefano Pallottino, [Directed Hypergraphs and Applications](https://static.aminer.org/pdf/PDF/000/836/884/directed_hypergraphs_and_applications.pdf), 1993.** | Formalizes directed hyperedges and develops connections to AND-OR reasoning. The linked manuscript was revised in 1992; the [author's publication list](https://pages.di.unipi.it/gallo/papers.html) records the 1993 journal article. | Can one route require several conditions together while several routes offer different ways to achieve a goal? A route node in a property graph can encode that structure, provided the evaluator preserves the AND semantics. |
| **[4] Seth Karten, Andy Luu Nguyen and Chi Jin, [PokéChamp: an Expert-level Minimax Language Agent](https://arxiv.org/abs/2503.04094v1), 2025.** | Uses language models for action sampling, opponent modeling and value estimation inside minimax search, evaluated in Gen 9 OU. | Could a selected idea graph help an agent choose useful battle checks or opponent responses? That would be a new integration to test. |
| **[5] Cameron Angliss et al., [VGC-Bench: Towards Mastering Diverse Team Strategies in Competitive Pokémon](https://arxiv.org/abs/2506.10326v3), 2026 revision.** | Supplies infrastructure, data and baselines for evaluating battle policies across different teams. The revised analysis distinguishes performance within the training setting from generalization to unseen teams. | If we later evaluate battling, do proposed teams or agents remain useful outside the teams used during development? Team ideation and battle-policy quality need separate evaluations. |
| **[6] W3C, [PROV-O: The PROV Ontology](https://www.w3.org/TR/prov-o/), 2013.** | Supplies concepts for entities, activities, attribution and derivation. | Can a player trace a recommendation to a source or calculation and revise its assumptions? These concepts can inform simple records without adopting the entire ontology. |
| **[7] Zep, [Graphiti](https://github.com/getzep/graphiti), ongoing software.** | Models episodes, entities and relationships with temporal validity and provenance. | Could the workbench recover an older metagame interpretation without overwriting later evidence? Temporal memory is an optional research direction beyond the current demo. |
| **[8] Pokémon Showdown contributors, [Pokémon Showdown](https://github.com/smogon/pokemon-showdown).** | Provides simulator mechanics and data. `scripts/prepare.mjs` fetches revision `a833737d8408322c8b1e821dee16af07b1fd9234`; `workbench/tools/set-legality.mjs` is the validation adapter. | Which interesting move or ability relationships survive targeting, legality and execution checks under the chosen rules? |
| **[9] Smogon calculator contributors, [Pokémon Damage Calculator](https://github.com/smogon/damage-calc).** | Provides executable damage calculations. `workbench/tools/prepare-calculator.mjs` pins revision `c1eb09be483f0bbf65132bf3703ee677195132f3`. | What does a proposed support effect change against a specified target set and field? Estimating team win rate would require a separate battle evaluation. |

## Experiments this lineage suggests

**Search by purpose.** Give the agent a goal such as keeping an attacker alive long enough to act. Compare direct teammate retrieval with a search across mechanisms such as redirection, mitigation and speed control. Inspect whether the alternatives meet the goal under their stated conditions and whether they preserve the player's preferred core.

**Revise a conditional plan.** Change an item, target set or move order. Compare an agent reading the same evidence as text with one that also receives explicit route dependencies. Check which conclusions need revision, which still hold, and which remain unknown. Hold model, evidence and tool budget constant so the representation is the variable being tested.

**Let the graph choose a useful check.** Present several plausible routes with unresolved conditions. Ask the agent to choose the calculation or battle trace that would distinguish them, then revise the idea using its result. Inspect whether that check changes a real decision. Compare storage backends separately if database performance becomes a question.

These are proposed experiments. Their contribution would be demonstrated by reproducible cases and comparisons; novelty and a graph advantage remain open questions.

## Reading paths

For a player contributing an idea, start with [1] and the demo's explanation of its calculator inputs. For someone implementing conditional routes, read [2] and [3]. For evaluation, start with [4] and [5]. For historical evidence and attribution, read [6] and [7]. Machine-readable references are in [references.bib](references.bib).
