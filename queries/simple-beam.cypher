MATCH (s:Species)-[:LEARNS]->(:Move {id:'Move:simplebeam'}) WHERE s.sampleSetValidated = true RETURN DISTINCT s.name
