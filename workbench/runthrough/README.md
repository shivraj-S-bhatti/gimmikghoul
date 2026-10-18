# Runthrough execution experiment

These scripts reproduce the seven controlled branches described in [RUNTHROUGH_CHECK.md](https://github.com/shivraj-S-bhatti/pokemon-battle-lab/blob/6e9aa7d76643d6af3974023d902a647db48a9502/workbench/RUNTHROUGH_CHECK.md). They exercise normal battle choices and full-team validation; they do not estimate matchup strength or calculate damage probabilities.

With the repository dependencies installed and its Showdown cache prepared:

```sh
node workbench/runthrough/verify-provenance.mjs
node workbench/runthrough/check.cjs
```

For a fresh checkout, run `npm ci` and `npm run prepare:data` first. The provenance script checks the pinned archive hash, extracts it into temporary storage, compares source bytes, and compiles independently in memory. It never rewrites the shared Showdown cache. Its temporary extraction is removed afterward.

`check.cjs` contains the complete fixture sets, selected moves, seed, and assertions. Running it refreshes [summary.json](summary.json), a compact record of state changes and move order. Full teams and logs are regenerated under ignored `.artifacts/runthrough-check/results.json`.

[provenance.json](provenance.json) records the revision, archive hash, comparison counts, and aggregate hashes of the per-file receipts. The provenance script regenerates the detailed receipts at `.artifacts/runthrough-check/provenance-files.json`. The compact receipts contain no timestamps, so an unchanged engine and fixture produce stable versionable output.
