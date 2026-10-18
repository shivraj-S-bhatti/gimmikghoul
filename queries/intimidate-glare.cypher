MATCH (:Ability {id:'Ability:intimidate'})<-[:HAS_ABILITY]-(s:Species)-[:LEARNS]->(:Move {id:'Move:glare'}) WHERE s.sampleSetValidated = true RETURN DISTINCT s.name
