# A fabric of possible plans

A player asks: “What would have to be true for this Pokémon to have a job?” Gimmikghoul should help them answer through mechanisms, alternatives and concrete tests. The point is to make room for the interaction they have not thought of yet.

Imagine selecting Torterra and asking for ways to create a setup turn. The agent expands distinct routes: redirect a relevant attack, alter turn order, discourage a response, trade a teammate, or use an immunity on a later switch. Each route has its own conditions. These mechanisms are not interchangeable; their applicability depends on move targeting, timing, field, format and exact sets. The player keeps promising routes and dismisses matchups they are willing to concede.

The graph on screen is a discussion surface. It need not expose the raw mechanics catalog, every source document, or the internal graph an agent constructs for one search. A small route node can stand for several jointly necessary facts. Expanding it shows the details when they matter.

## Four useful lenses

- **Possibility:** species, forms, moves, abilities, items and executable effects under a pinned ruleset. Candidate relationships become more specific when conditions are supplied.
- **Experience:** team reports, videos, battle observations and metagame snapshots. Keep who claimed what, the observed period, format and publication date. Frequency can suggest a question; it does not establish why a team won.
- **Intent:** desired roles, selected opposing sets, acceptable concessions, alternative plans and costs. A successful team has several ways to play and some bad matchups.
- **Intervention:** what changes when an item, move, partner, spread or assumption changes? Reuse existing calculators and engines for selected questions. Preserve unexplored routes and failed ideas.

These can be views over shared records. Separate databases are a deployment choice, not a conceptual requirement. Runtime hypergraphs, planning graphs or learned embeddings can be experiments behind a stable human-facing view.

## Things worth trying

**Mechanism analogies.** Ask for other ways to accomplish the same job, even if they use different moves or less popular Pokémon. A route must carry its prerequisites; a label such as “protection” cannot erase the difference between redirection, damage reduction and switching into an immunity.

**Check selection.** Let agents propose many ideas cheaply, then spend computation on the question most likely to change the player's choice. Rank the relevance of a test before trying to rank every Pokémon.

**A shifting metagame.** Move a time slider and see which premises changed: new threats, different partner frequencies, changed rules, or a formerly unusual set becoming familiar. Keep past interpretations available without pretending that popularity measures strength.

**Offline exploration.** Agents can search for overlooked connections and leave small theory cards for a person to accept, revise or discard. Each card should explain its mechanism and unresolved question. “Dreaming” is a way to generate candidates, not a reason to manufacture confidence.

## First scenes

BSS: Mega Sableye with Galarian Slowking, exploring which specific Fairy threats the latter might handle, what switching costs, and what else the team needs. A resistance alone is not a counter.

Doubles: Torterra with Mega Raichu Y and Milotic, exploring whether the proposed partners create a useful setup or attacking route. Begin with the ruleset and the interaction to check; do not assume the trio is legal, effective or a discovered core.

The existing Alcremie example is a smaller working foothold. Neither example bounds the eventual vocabulary. We can invent representations freely, then find out which ones deserve to survive.
