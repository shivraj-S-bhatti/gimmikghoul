# Gimmikghoul

Find the gaps in the meta that give your unemployed favourites a job.

## User story

I like Alcremie. Almost nobody runs it. I ask the agent: where does Alcremie have work right now?

1. The agent checks the meta in the graph. It identifies sleep pressure as a question to investigate in the selected usage snapshot.
2. It finds that Alcremie's Sweet Veil keeps itself and its partner awake, and that Decorate gives the partner +2 Attack and Special Attack.
3. It runs the damage calculator: with Decorate, Mega Garchomp Z's Draco Meteor now one-shots Rillaboom, Incineroar, Archaludon and Mega Charizard Y.
4. It lists what the pilot has to play around: Follow Me and Rage Powder users, Fairy types, faster Garchomp.
5. I get a core, its leads, and what it is weak to. I decide which bad matchups I accept.

A real player took this exact core to top 16 at Louisville Regionals. This demo reconstructs an attributed team with engine-derived candidates and selected calculator checks.

## System

```text
  you ──"make my favourite work"──▶  agent (Claude Code / Codex)
                                       │
          ┌────────────────────────────┼─────────────────────────────┐
          ▼                            ▼                             ▼
   FalkorDB (MCP)               damage calculator              set validator
   ├ catalog graph              (Smogon, Champions)            (Showdown, Champions)
   │  mons, moves, abilities
   │  usage, teammates
   └ idea graph (gk_gimmikghoul)  ◀── agent writes what it finds
          │
          ▼
   FalkorDB Browser  ──▶  you watch the idea graph grow
```

The agent does the reasoning. The graph holds the meta and the idea being built. The calculator and validator answer the questions the agent can't eyeball.

## Files

```text
pokemon-core-lab/
├─ compose.yaml                     FalkorDB + Browser
├─ scripts/
│  ├─ prepare.mjs, ingest.mjs       pull Showdown data and Smogon usage into the catalog graph
│  ├─ graph.mjs                     query or reset a graph from the shell
│  └─ experiment-sprites.mjs        put sprites on graph nodes
├─ data/
│  ├─ meta-sets.json                common sets for the top 60 per format
│  └─ sprites/
├─ workbench/
│  ├─ mcp/                          FalkorDB MCP server for the agent
│  ├─ tools/calculator.mjs          damage calculator adapter
│  ├─ tools/set-legality.mjs        set validator adapter
│  └─ jit/build-jit.mjs             the demo: builds the idea graph step by step
└─ research/experiments/            E1-E7: meta holes, gimmick mining, combo chains
```

## Left out on purpose

Claim ledgers, receipt hashes, locks, stale-evidence tracking, scores, the custom web UI and the authored dependency engine. They exist in the repo from earlier iterations and are not part of this submission.
