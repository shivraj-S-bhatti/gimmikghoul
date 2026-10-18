MATCH (s:Species)-[:LEARNS]->(:Move {id:'Move:shellsmash'}) WHERE s.sampleSetValidated = true RETURN DISTINCT s.name
