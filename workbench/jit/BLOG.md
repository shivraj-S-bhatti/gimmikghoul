> Historical technical walkthrough, imported from the original lab. This repository uses `gk_gimmikghoul` as the demo graph name. The broader community direction is in [the vision](../../docs/VISION.md).

# Your favourite Pokémon is unemployed. Can a graph find it a job?

I wanted help making strange teams work. A list of popular Pokémon wasn't enough. Neither was a type-coverage chart. I wanted an agent to follow an idea: what enables it, which matchups make it worthwhile, what it costs, and what I can choose to lose against.

That became Gimmikghoul, a Pokémon team-exploration workspace built around FalkorDB. A person reasons with Claude or Codex while a graph keeps the mechanics, candidate plans and selected calculations visible.

## Start with one question

Our demo starts with London Faust's Alcremie team, presented by Aaron Zheng (Cybertron) in a video supplied for analysis. We reconstruct the explanation rather than claim we invented the core. The question is concrete: what does Alcremie's Decorate actually buy Mega Garchomp Z?

Decorate raises its target's Attack and Special Attack by two stages. The agent can retrieve other ally-support moves from engine target and stat-effect data, then compare their jobs. Coaching raises Attack and Defense. Aromatic Mist raises Special Defense. Neither replaces Decorate's Special Attack boost for this attacker.

The graph makes that difference inspectable:

```text
Alcremie --CAN_LEARN--> Decorate --ENABLES--> Mega Garchomp Z
                           |
                     +2 Atk / +2 SpA

Mega Garchomp Z --OHKO_AT_PLUS2--> chosen target set
                       |
              move, field, +0 result,
              +2 result, calculator receipt
```

We reuse a pinned Champions-aware community damage calculator. On the selected candidate sets, +2 turns Draco Meteor into a guaranteed one-hit KO on Rillaboom, Incineroar, Archaludon and Mega Charizard Y. Every comparison retains its inputs and full output in the [calculator receipt](checks/step3-decorate.json). Those results answer an attack-threshold question. The opponent still gets to play.

## Counterplay belongs beside the plan

Follow Me or Rage Powder can redirect Decorate. Fairy types are immune to Draco Meteor. A player may choose a different lead, use Helping Hand, or attack immediately. Treating each obstacle as a reason to reject the team would miss the point of creative teambuilding.

Alcremie also brings Sweet Veil's sleep protection. Rocky Helmet gives another question to investigate: which opposing contact attacks might hit it? Our graph records contact opportunities, not guaranteed chip or won matchups. The human decides whether those advantages justify the slot.

## Why a graph?

For a single lookup, ordinary tables would work. The useful part appears when a question grows across relationships: find a support move, find its legal learners, inspect a recipient's ability, identify the payoff, and follow the evidence back to its source.

We keep a catalog graph and smaller exploration graphs. The visible idea graph is a map for the person; it need not contain every structure used during computation. FalkorDB's MCP connection lets the coding agent query and extend that map, and the native Browser displays Pokémon sprites on its nodes.

In a separate [boost-chain experiment](https://github.com/shivraj-S-bhatti/pokemon-battle-lab/blob/6e9aa7d76643d6af3974023d902a647db48a9502/research/experiments/E6-boost-chains.md), a bounded Cypher path query enumerated 4,422 effect paths in roughly 110 milliseconds in the recorded local run. One candidate connected Simple Beam, Stockpile, Psych Up and Body Press. It matched a community strategy. That result suggests a useful candidate-generation method; it does not establish independent discovery or competitive strength.

We also tried [community detection on teammate co-usage](https://github.com/shivraj-S-bhatti/pokemon-battle-lab/blob/6e9aa7d76643d6af3974023d902a647db48a9502/research/experiments/E4-archetypes-gaps.md). It grouped familiar structures such as rain and Trick Room, giving the agent neighborhoods to investigate. Low co-usage can suggest an unusual combination, but it can also indicate that the combination is bad. It is a question, not a recommendation.

## What we cut

Early versions spent too much effort checking dependencies in hand-written cases. I wanted exploration. We parked the custom website and moved the demo beside the native graph Browser.

The loop is now small: choose an idea, retrieve alternatives, request the calculation that could change a decision, and revise the plan. We do not calculate every Pokémon by default. We keep chosen targets and accepted bad matchups explicit.

The next useful test is whether players leave with a better idea and can explain why they changed their team. More nodes alone would not tell us that.

[Run the six-step demo](README.md) · [Source code and setup](https://github.com/shivraj-S-bhatti/pokemon-battle-lab) · [System diagram](SYSTEM.md)

Built for Graph Hacks with FalkorDB. Claude Code and Codex assisted with implementation and analysis; Shivraj chose the problem, scope and cases and reviewed the agents' reasoning.
