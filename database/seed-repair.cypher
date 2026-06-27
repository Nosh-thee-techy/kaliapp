// Repairs graph after seed — chama links, Grow Asia fields, officer constraint.

CREATE CONSTRAINT unique_officer_email IF NOT EXISTS FOR (o:Officer) REQUIRE o.email IS UNIQUE;

// Chama verification flags for Grow Asia social weight
MATCH (ch:Chama)
WHERE coalesce(ch.repayment_rate_pct, 0) >= 90
SET ch.status = "VERIFIED";

// Delivery consistency for supply-chain weight
MATCH (f:Farmer)-[d:DELIVERS_TO]->(:Cooperative)
SET d.consistency_score = coalesce(d.consistency_score, toFloat(coalesce(d.delivery_years, 0)) / 5.0);

// Resident years proxy from cooperative tenure
MATCH (f:Farmer)
WHERE f.resident_years IS NULL
SET f.resident_years = coalesce(f.cooperative_delivery_years, 0);

// Link farmers missing chama membership (round-robin across chamas)
MATCH (f:Farmer)
WHERE NOT (f)-[:MEMBER_OF]->(:Chama)
WITH f ORDER BY f.id
WITH collect(f) AS farmers
MATCH (ch:Chama)
WITH farmers, collect(ch) AS chamas
WHERE size(farmers) > 0 AND size(chamas) > 0
UNWIND range(0, size(farmers) - 1) AS i
WITH farmers[i] AS f, chamas[i % size(chamas)] AS ch
MERGE (f)-[:MEMBER_OF]->(ch);
