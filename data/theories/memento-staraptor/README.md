# One theory, a selected check, and a revision

This example asks whether a +2 Mega Staraptor attack crosses a selected Garchomp damage threshold, and keeps the donor timing question separate. The Garchomp target is proposed; the user has not selected accepted bad matchups. It is not a complete team recommendation.

Run from the repository root:

```sh
node workbench/theory.mjs fingerprint data/theories/memento-staraptor/theory.json
node workbench/theory.mjs read data/theories/memento-staraptor/theory.json
node workbench/theory.mjs check data/theories/memento-staraptor/theory.json < data/theories/memento-staraptor/selected-check.json
```

`read` consumes saved evidence without importing the calculator. `check` uses the existing native calculator and needs the prepared dependencies described in [the adapter guide](../../../workbench/tools/README.md). It adds a receipt; it does not rewrite the theory or approve its conclusions.

## What the files mean

- `theory.json`: an editable question, specific sets, alternatives, costs, counterplay and unresolved decisions. Git preserves revisions.
- `selected-check.json`: one exact native-calculator request and the choice it could inform.
- `execution-evidence.json`: previously executed controlled fixtures, copied with their source revision, teams and event logs. Importing them did not execute another simulation. The original fixture is [check.cjs](../../../workbench/runthrough/check.cjs).
- `checks/`: saved calculator receipts, including the theory/input snapshots that were used. A successful calculation supports only its supplied conditions.

A theory or referenced-file edit makes older receipts stale for the current document. They remain inspectable. Adding a receipt does not change the theory fingerprint. Runtime availability and evidence integrity are reported separately: a missing local calculator installation is not evidence that an old recorded result was wrong.

To try a different target spread, edit that set and the selected request together. Read before rerunning. The old result should remain visible as stale; ask whether the new threshold could change the plan before requesting another check. Restore experiments with normal Git review, not by deleting history.

The opening fixture and damage calculation deliberately use separately named Staraptor sets. They share the attack/speed investment relevant here, but their full move sets differ. A calculation is not a whole-team legality check or proof that the opening survives opposition.

## Recorded revision

Commit `2f3b6be` saves the unscarfed theory and its first calculator receipt. The next revision adds the exact Choice Scarf donor from the earlier controlled opening, retaining the failed unscarfed assumption and its costs. The execution log places Memento before Brave Bird; opposing Protect means this observation establishes timing, not a successful hit.

Reading after that revision marked the original `935d0476…` receipt stale. A fresh selected check produced `b48b9be6…`, current for the revised document. Both calculations return the same native result: 226–267 damage against the selected 185-HP Garchomp, described upstream as a guaranteed OHKO. The input already assumes +2 Attack. Neither result establishes that a player can create that position against active opposition.

This is deliberately conservative invalidation: changing the donor plan stales the whole document's receipts even though this damage input did not change. The rerun demonstrates revision handling; it supplies no new strategic evidence. Avoid repeating checks when the decision has not changed.

“Current” means the recorded inputs and local runtime still match. Check `receipt.outcome` separately: an unsupported or failed attempt can be current. Receipt hashes detect changed contents under the recorded filename; they are not signatures proving who ran a calculation.

## Boundaries

One assigned agent writes a theory at a time. Files and Git are the persistence layer; there is no automatic merge, orchestrator, or database migration. The native FalkorDB Browser remains available for exploring candidates. This first increment does not yet regenerate its discussion board from theory files.
