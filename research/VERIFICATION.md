# Repository split verification

Observed 2026-10-18 in the standalone checkout.

- `npm ci`: 10 packages installed; audit reported zero vulnerabilities at install time.
- `npm test`: 9 tests passed, covering theory revisions/receipts and the native Browser sprite patch.
- `npm run prepare:data`: freshly fetched the pinned Showdown archive, usage snapshot and roster; 387 files transpiled.
- `node workbench/tools/prepare-calculator.mjs`: prepared calculator revision `c1eb09be483f0bbf65132bf3703ee677195132f3`.
- JIT steps 1 through 6 ran against a separate `gk_gimmikghoul` graph on the existing local server: 48 Mon, 18 Move, 7 Threat, 1 Source, 157 relationships. All 48 Mon received exact sprite metadata.
- Step 3 regenerated [the native-calculator receipt](../workbench/jit/checks/step3-decorate.json): 14 paired comparisons; Sylveon partial results remain explicit.
- `node workbench/theory.mjs read ...`: read the existing theory and receipts successfully.
- Three SVGs rendered to PNG and were visually inspected. The local gallery switches image, description and download target for all three boards. Narrow-screen view uses horizontal scrolling for readable boards.
- Original lab still has only the pre-existing dirty `canvas/master.excalidraw`; its files and `gk_jit` were not edited.

Fresh Docker provisioning was not repeated because the existing database was reused. This validates the code split and local demo, not the proposed full workbench or a teambuilding performance gain.
