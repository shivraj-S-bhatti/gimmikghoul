# From community experiments to a paper

The first public output should be useful to a player: an inspectable idea, its alternatives, and a practical account of what we tried. A technical blog can explain the representation and publish the resulting cases. A paper becomes worthwhile if a comparison reveals a generalizable result.

## Questions to investigate

1. Do conditional routes help an agent propose a wider range of mechanically valid alternatives than text or pairwise synergy edges?
2. Can a goal-directed search find support mechanisms across different roles without hardcoding each team combination?
3. Can an agent choose fewer, more useful checks by modeling which uncertainty could change the player's choice?
4. Can temporal context help a person distinguish a newly useful idea from a stale one?

Start with a handful of player-submitted problems and expert critiques. Retain the same sources and calculator access across representations. Record model/version, prompt, tools, time and computation spent so that a stronger model or extra evidence does not masquerade as a graph benefit. Judge mechanistic errors, useful alternatives and decision quality; do not substitute edge count or confident prose for team quality.

Useful comparison ladder: text + tools, indexed structured records + tools, pairwise graph, conditional route representation. Test the storage backend separately when traversal performance is the actual question. A relational store can encode the same information; the graph's value has to come from the representation, queries, algorithms or interaction it makes useful.

## Three layers of validation

A learnset lookup finds a candidate. Exact-format validation and a controlled engine trace test a particular interaction. Actual battles or expert play examine whether the plan is worth using. Damage calculations support selected supplied states and should use upstream OHKO/2HKO results. They do not establish that an opening can reach the state or that a whole team wins.

## Small first release

Ship one coherent loop: propose an idea, inspect its conditional route, choose a test, revise the idea, preserve an alternative. Publish several examples and invite corrections. The community can contribute an unusual core, a counterexample, or a better representation. Experiments can then determine whether the paper is about planning, representation, information acquisition, human-agent collaboration, or a negative result about graphs.
