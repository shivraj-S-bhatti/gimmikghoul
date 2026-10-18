MATCH (:Move {id:'Move:bodypress'})<-[:LEARNS]-(s:Species)-[:LEARNS]->(:Move {id:'Move:icebeam'}) WHERE s.sampleSetValidated = true RETURN DISTINCT s.name
