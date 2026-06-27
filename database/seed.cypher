// =============================================================================
// KaLI Neo4j Graph Seed — Network Resilience Truth Model
// Run: cd backend && npm run seed
// =============================================================================

// --- Constraints & indexes ---
CREATE CONSTRAINT unique_farmer_id IF NOT EXISTS FOR (f:Farmer) REQUIRE f.id IS UNIQUE;
CREATE CONSTRAINT unique_farmer_national_id IF NOT EXISTS FOR (f:Farmer) REQUIRE f.national_id IS UNIQUE;
CREATE CONSTRAINT unique_coop_id IF NOT EXISTS FOR (c:Cooperative) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT unique_zone_id IF NOT EXISTS FOR (z:ClimateZone) REQUIRE z.id IS UNIQUE;
CREATE CONSTRAINT unique_chama_id IF NOT EXISTS FOR (ch:Chama) REQUIRE ch.id IS UNIQUE;

// --- Climate zones (Python pipeline targets) ---
MERGE (z1:ClimateZone {id: "KE-RIFT-04"})
SET z1.name = "Naivasha Basin",
    z1.current_spi_index = -1.2,
    z1.pest_proximity_km = 12.0,
    z1.rainfall_mm_last_30d = 22,
    z1.advisory = "Fall armyworm detected 18km NE — scout maize plots within 72h.",
    z1.last_sync_iso = toString(datetime());

MERGE (z2:ClimateZone {id: "KE-RIFT-02"})
SET z2.name = "Uasin Gishu Plateau",
    z2.current_spi_index = 0.4,
    z2.pest_proximity_km = 60,
    z2.rainfall_mm_last_30d = 78,
    z2.last_sync_iso = toString(datetime());

MERGE (z3:ClimateZone {id: "KE-NE-01"})
SET z3.name = "North Eastern Range",
    z3.current_spi_index = -2.1,
    z3.pest_proximity_km = 40,
    z3.rainfall_mm_last_30d = 8,
    z3.advisory = "Severe drought signal — destock advisory issued.",
    z3.last_sync_iso = toString(datetime());

MERGE (z4:ClimateZone {id: "KE-NYZ-03"})
SET z4.name = "Ahero Irrigation Belt",
    z4.current_spi_index = 0.9,
    z4.pest_proximity_km = 95,
    z4.rainfall_mm_last_30d = 110,
    z4.last_sync_iso = toString(datetime());

MERGE (z5:ClimateZone {id: "KE-CEN-01"})
SET z5.name = "Mt. Kenya South",
    z5.current_spi_index = 0.2,
    z5.pest_proximity_km = 80,
    z5.rainfall_mm_last_30d = 88,
    z5.last_sync_iso = toString(datetime());

MERGE (z6:ClimateZone {id: "KE-EAS-02"})
SET z6.name = "Machakos Lowlands",
    z6.current_spi_index = -0.3,
    z6.pest_proximity_km = 70,
    z6.rainfall_mm_last_30d = 54,
    z6.last_sync_iso = toString(datetime());

// --- Cooperatives ---
MERGE (c1:Cooperative {id: "COOP-NVS-04"})
SET c1.name = "Naivasha Horticulture Co-op";
MERGE (c1)-[:OPERATES_IN]->(z1);

MERGE (c2:Cooperative {id: "COOP-ELD-02"})
SET c2.name = "Eldoret Grain SACCO";
MERGE (c2)-[:OPERATES_IN]->(z2);

MERGE (c3:Cooperative {id: "COOP-GRS-01"})
SET c3.name = "Garissa Livestock Group";
MERGE (c3)-[:OPERATES_IN]->(z3);

MERGE (c4:Cooperative {id: "COOP-KSM-03"})
SET c4.name = "Kisumu Rice Growers";
MERGE (c4)-[:OPERATES_IN]->(z4);

MERGE (c5:Cooperative {id: "COOP-NYR-05"})
SET c5.name = "Nyeri Dairy Cooperative";
MERGE (c5)-[:OPERATES_IN]->(z5);

MERGE (c6:Cooperative {id: "COOP-MCK-02"})
SET c6.name = "Machakos Maize Co-op";
MERGE (c6)-[:OPERATES_IN]->(z6);

MERGE (c7:Cooperative {id: "COOP-NSH-01"})
SET c7.name = "Naivasha Horticulture Cooperative Hub";
MERGE (c7)-[:OPERATES_IN]->(z1);

// --- Chamas (social collateral layer) ---
MERGE (ch1:Chama {id: "CHAMA-TUMAINI-04"})
SET ch1.name = "Tumaini Women Savings Circle", ch1.repayment_rate_pct = 96.5;

MERGE (ch2:Chama {id: "CHAMA-ELD-02"})
SET ch2.name = "Eldoret Youth Circle", ch2.repayment_rate_pct = 88.0;

MERGE (ch3:Chama {id: "CHAMA-GRS-01"})
SET ch3.name = "Garissa Pastoralist Trust", ch3.repayment_rate_pct = 97.2;

MERGE (ch4:Chama {id: "CHAMA-KSM-03"})
SET ch4.name = "Ahero Rice Chama", ch4.repayment_rate_pct = 94.0;

MERGE (ch5:Chama {id: "CHAMA-NYR-05"})
SET ch5.name = "Nyeri Dairy Women", ch5.repayment_rate_pct = 96.0;

MERGE (ch6:Chama {id: "CHAMA-MCK-02"})
SET ch6.name = "Machakos Maize Circle", ch6.repayment_rate_pct = 98.5;

// --- Peer guarantor (network collateral) ---
MERGE (peer:Farmer {id: "20104829"})
SET peer.national_id = "20104829",
    peer.name = "David Koech",
    peer.credit_standing = "Excellent",
    peer.demographic_group = "General";

// --- Portfolio farmers (branch queue demo) ---
MERGE (f1:Farmer {id: "F-1042"})
SET f1.national_id = "29845112",
    f1.name = "Mary Wanjiku",
    f1.phone_number = "+254712345678",
    f1.demographic_group = "Women",
    f1.vulnerability_tag = "Female-headed HH",
    f1.has_land_ownership = false,
    f1.lease_duration_months = 36,
    f1.chama_months_consistent = 18,
    f1.mobile_money_inflows_kes = 128000,
    f1.cooperative_delivery_years = 3,
    f1.requested_kes = 45000,
    f1.acreage = 1.5,
    f1.crop_type = "French Beans",
    f1.harvest_month = "January",
    f1.status = "ready_for_review",
    f1.registered_via = "USSD",
    f1.submitted_iso = toString(datetime() - duration({hours: 3}));
MERGE (f1)-[:DELIVERS_TO {delivery_years: 3, volume_tons: 3.8}]->(c1);
MERGE (f1)-[:MEMBER_OF]->(ch1);
MERGE (p1:FarmPlot {id: "PLOT-F-1042"}) SET p1.acreage = 1.5;
MERGE (f1)-[:LOCATED_IN]->(p1);
MERGE (peer:Farmer {id: "20104829"})
MERGE (peer)-[:GUARANTEES]->(f1);

MERGE (f2:Farmer {id: "F-1043"})
SET f2.national_id = "31220984",
    f2.name = "Joseph Kiprono",
    f2.phone_number = "+254722110983",
    f2.demographic_group = "Youth",
    f2.vulnerability_tag = "Youth",
    f2.has_land_ownership = true,
    f2.lease_duration_months = 0,
    f2.chama_months_consistent = 6,
    f2.mobile_money_inflows_kes = 64000,
    f2.cooperative_delivery_years = 1,
    f2.requested_kes = 80000,
    f2.acreage = 3,
    f2.crop_type = "Maize",
    f2.harvest_month = "August",
    f2.status = "awaiting_climate",
    f2.registered_via = "Cooperative roster",
    f2.submitted_iso = toString(datetime() - duration({hours: 1}));
MERGE (f2)-[:DELIVERS_TO {delivery_years: 1, volume_tons: 2.0}]->(c2);
MERGE (f2)-[:MEMBER_OF]->(ch2);

MERGE (f3:Farmer {id: "F-1044"})
SET f3.national_id = "27331290",
    f3.name = "Amina Hassan",
    f3.phone_number = "+254733776201",
    f3.demographic_group = "Women",
    f3.vulnerability_tag = "Pastoralist",
    f3.has_land_ownership = false,
    f3.lease_duration_months = 0,
    f3.chama_months_consistent = 24,
    f3.mobile_money_inflows_kes = 41000,
    f3.cooperative_delivery_years = 2,
    f3.requested_kes = 60000,
    f3.acreage = 0,
    f3.crop_type = "Goat restocking",
    f3.harvest_month = "N/A",
    f3.status = "escalated",
    f3.registered_via = "Walk-in",
    f3.submitted_iso = toString(datetime() - duration({hours: 28}));
MERGE (f3)-[:DELIVERS_TO {delivery_years: 2, volume_tons: 0.5}]->(c3);
MERGE (f3)-[:MEMBER_OF]->(ch3);

MERGE (f4:Farmer {id: "F-1045"})
SET f4.national_id = "30119772",
    f4.name = "Peter Otieno",
    f4.phone_number = "+254700554120",
    f4.demographic_group = "General",
    f4.vulnerability_tag = "Smallholder",
    f4.has_land_ownership = false,
    f4.lease_duration_months = 12,
    f4.chama_months_consistent = 30,
    f4.mobile_money_inflows_kes = 96000,
    f4.cooperative_delivery_years = 4,
    f4.requested_kes = 35000,
    f4.acreage = 1.2,
    f4.crop_type = "Rice",
    f4.harvest_month = "March",
    f4.status = "ready_for_review",
    f4.registered_via = "USSD",
    f4.submitted_iso = toString(datetime() - duration({hours: 7}));
MERGE (f4)-[:DELIVERS_TO {delivery_years: 4, volume_tons: 2.5}]->(c4);
MERGE (f4)-[:MEMBER_OF]->(ch4);

MERGE (f5:Farmer {id: "F-1046"})
SET f5.national_id = "33445918",
    f5.name = "Daniel Mwangi",
    f5.phone_number = "+254710887234",
    f5.demographic_group = "PWD",
    f5.vulnerability_tag = "PWD",
    f5.has_land_ownership = true,
    f5.lease_duration_months = 0,
    f5.chama_months_consistent = 22,
    f5.mobile_money_inflows_kes = 110000,
    f5.cooperative_delivery_years = 4,
    f5.requested_kes = 52000,
    f5.acreage = 0.8,
    f5.crop_type = "Dairy",
    f5.harvest_month = "Continuous",
    f5.status = "ready_for_review",
    f5.registered_via = "Cooperative roster",
    f5.submitted_iso = toString(datetime() - duration({hours: 14}));
MERGE (f5)-[:DELIVERS_TO {delivery_years: 4, volume_tons: 1.2}]->(c5);
MERGE (f5)-[:MEMBER_OF]->(ch5);

MERGE (f6:Farmer {id: "F-1031"})
SET f6.national_id = "28774512",
    f6.name = "Grace Mutua",
    f6.phone_number = "+254711223344",
    f6.demographic_group = "Women",
    f6.vulnerability_tag = "Female-headed HH",
    f6.has_land_ownership = true,
    f6.lease_duration_months = 0,
    f6.chama_months_consistent = 36,
    f6.mobile_money_inflows_kes = 152000,
    f6.cooperative_delivery_years = 5,
    f6.requested_kes = 50000,
    f6.acreage = 2,
    f6.crop_type = "Maize",
    f6.harvest_month = "December",
    f6.status = "disbursed",
    f6.registered_via = "Walk-in",
    f6.submitted_iso = toString(datetime() - duration({hours: 96}));
MERGE (f6)-[:DELIVERS_TO {delivery_years: 5, volume_tons: 5.0}]->(c6);
MERGE (f6)-[:MEMBER_OF]->(ch6);

// --- Sample branch audit ledger (decision history in graph) ---
MATCH (f6:Farmer {id: "F-1031"})
MERGE (a1:AuditEntry {id: "A-9001"})
SET a1.decision = "Approved",
    a1.stance = "approve_flexible",
    a1.notes = "Strong 5y co-op delivery",
    a1.officer = "Jane Mwangi",
    a1.score = 78,
    a1.timestamp_iso = toString(datetime() - duration({hours: 72}))
MERGE (f6)-[:DECIDED]->(a1)
WITH f6
MERGE (sms1:SmsMessage {id: "SMS-2201"})
SET sms1.to = "+254711223344",
    sms1.body = "KaLI Rating: 78/100. Approved. KES 50,000 disbursed. Repayment set for December harvest.",
    sms1.category = "decision",
    sms1.sent_iso = toString(datetime() - duration({hours: 72}))
MERGE (f6)-[:NOTIFIED]->(sms1);

MATCH (f2:Farmer {id: "F-1043"})
SET f2.status = "escalated", f2.last_decision = "Referred"
MERGE (a2:AuditEntry {id: "A-9002"})
SET a2.decision = "Referred",
    a2.stance = "refer_committee",
    a2.notes = "Awaiting cooperative confirmation",
    a2.officer = "James Mwangi",
    a2.score = 54,
    a2.timestamp_iso = toString(datetime() - duration({hours: 48}))
MERGE (f2)-[:DECIDED]->(a2)
WITH f2
MERGE (sms2:SmsMessage {id: "SMS-2202"})
SET sms2.to = "+254722110983",
    sms2.body = "KaLI Rating: 54/100. Referred to regional committee. Your branch officer will contact you.",
    sms2.category = "decision",
    sms2.sent_iso = toString(datetime() - duration({hours: 48}))
MERGE (f2)-[:NOTIFIED]->(sms2);

MATCH (f3:Farmer {id: "F-1044"})
SET f3.last_decision = "Declined"
MERGE (a3:AuditEntry {id: "A-9003"})
SET a3.decision = "Declined",
    a3.stance = "decline_with_reason",
    a3.notes = "Drought zone + no co-op affiliation",
    a3.officer = "Jane Mwangi",
    a3.score = 38,
    a3.timestamp_iso = toString(datetime() - duration({hours: 24}))
MERGE (f3)-[:DECIDED]->(a3)
WITH f3
MERGE (sms3:SmsMessage {id: "SMS-2203"})
SET sms3.to = "+254733776201",
    sms3.body = "KaLI Rating: 38/100. Application declined. Contact your branch officer for details.",
    sms3.category = "decision",
    sms3.sent_iso = toString(datetime() - duration({hours: 24}))
MERGE (f3)-[:NOTIFIED]->(sms3);

// --- Pipeline run nodes (sync console) ---
MERGE (pr1:PipelineRun {source: "CHIRPS Rainfall Grids"})
SET pr1.status = "ok", pr1.message = "12 zones refreshed", pr1.last_run_iso = toString(datetime() - duration({hours: 4}));
MERGE (pr2:PipelineRun {source: "ICPAC SPI Index"})
SET pr2.status = "ok", pr2.message = "All zones in range", pr2.last_run_iso = toString(datetime() - duration({hours: 6}));
MERGE (pr3:PipelineRun {source: "Cooperative Delivery Ledger"})
SET pr3.status = "warn", pr3.message = "Delayed sync from Naivasha node", pr3.last_run_iso = toString(datetime() - duration({hours: 26}));
MERGE (pr4:PipelineRun {source: "M-Pesa Inflow Aggregator"})
SET pr4.status = "ok", pr4.message = "OK", pr4.last_run_iso = toString(datetime() - duration({hours: 2}));
MERGE (pr5:PipelineRun {source: "Pest Proximity Feed (KALRO)"})
SET pr5.status = "fail", pr5.message = "Endpoint timeout — retrying", pr5.last_run_iso = toString(datetime() - duration({hours: 48}));
MERGE (pr6:PipelineRun {source: "USSD Session Router"})
SET pr6.status = "ok", pr6.message = "342 sessions in last 24h", pr6.last_run_iso = toString(datetime() - duration({hours: 1}));
