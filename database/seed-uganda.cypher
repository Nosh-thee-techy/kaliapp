// Uganda eSusFarm extension — climate zones, cooperatives, demo smallholders
// Loaded after seed-extra.cypher

MERGE (uz1:ClimateZone {id: "UG-CEN-01"})
SET uz1.name = "Central Buganda",
    uz1.current_spi_index = -0.4,
    uz1.pest_proximity_km = 35,
    uz1.rainfall_mm_last_30d = 62,
    uz1.advisory = "Second-season rains below normal — stagger bean planting by 10 days.",
    uz1.last_sync_iso = toString(datetime());

MERGE (uz2:ClimateZone {id: "UG-EAS-02"})
SET uz2.name = "Mbale Eastern Highlands",
    uz2.current_spi_index = 0.6,
    uz2.pest_proximity_km = 28,
    uz2.rainfall_mm_last_30d = 95,
    uz2.advisory = "Coffee berry borer risk elevated — scout weekly in lower slopes.",
    uz2.last_sync_iso = toString(datetime());

MERGE (uz3:ClimateZone {id: "UG-NOR-01"})
SET uz3.name = "Gulu Northern Belt",
    uz3.current_spi_index = -1.1,
    uz3.pest_proximity_km = 55,
    uz3.rainfall_mm_last_30d = 34,
    uz3.advisory = "Dry spell — prioritize drought-tolerant sorghum varieties.",
    uz3.last_sync_iso = toString(datetime());

MERGE (uz4:ClimateZone {id: "UG-WES-03"})
SET uz4.name = "Mbarara Western Dairy",
    uz4.current_spi_index = 0.3,
    uz4.pest_proximity_km = 72,
    uz4.rainfall_mm_last_30d = 71,
    uz4.last_sync_iso = toString(datetime());

MERGE (uz5:ClimateZone {id: "UG-SWE-02"})
SET uz5.name = "Masaka Coffee Belt",
    uz5.current_spi_index = 0.1,
    uz5.pest_proximity_km = 22,
    uz5.rainfall_mm_last_30d = 88,
    uz5.advisory = "Leaf rust watch — apply recommended fungicide if yellow spots appear.",
    uz5.last_sync_iso = toString(datetime());

MERGE (uz6:ClimateZone {id: "UG-NE-01"})
SET uz6.name = "Karamoja Pastoral",
    uz6.current_spi_index = -1.8,
    uz6.pest_proximity_km = 45,
    uz6.rainfall_mm_last_30d = 12,
    uz6.advisory = "Severe dryness — reduce herd pressure on communal grazing.",
    uz6.last_sync_iso = toString(datetime());

MERGE (uc1:Cooperative {id: "COOP-UG-KLA-01"})
SET uc1.name = "Wakiso Women Farmers SACCO";
MERGE (uc1)-[:OPERATES_IN]->(uz1);

MERGE (uc2:Cooperative {id: "COOP-UG-MBL-02"})
SET uc2.name = "Mbale Arabica Growers";
MERGE (uc2)-[:OPERATES_IN]->(uz2);

MERGE (uc3:Cooperative {id: "COOP-UG-GLU-01"})
SET uc3.name = "Gulu Sorghum Collective";
MERGE (uc3)-[:OPERATES_IN]->(uz3);

MERGE (uc4:Cooperative {id: "COOP-UG-MBR-03"})
SET uc4.name = "Ankole Dairy Alliance";
MERGE (uc4)-[:OPERATES_IN]->(uz4);

MERGE (uc5:Cooperative {id: "COOP-UG-MSK-02"})
SET uc5.name = "Masaka Coffee Union";
MERGE (uc5)-[:OPERATES_IN]->(uz5);

MERGE (uch:Chama {id: "CH-UG-MSK-01"})
SET uch.name = "Bakyala Twegatte",
    uch.repayment_rate_pct = 94,
    uch.status = "VERIFIED",
    uch.months_consistent = 22;

MERGE (uf1:Farmer {id: "F-UG-1001"})
SET uf1.national_id = "UG-2019-88421",
    uf1.name = "Nakato Grace",
    uf1.phone_number = "+256712345678",
    uf1.demographic_group = "Women Smallholder",
    uf1.vulnerability_tag = "Thin-file",
    uf1.has_land_ownership = false,
    uf1.lease_duration_months = 36,
    uf1.chama_months_consistent = 18,
    uf1.mobile_money_inflows_kes = 42000,
    uf1.status = "ready_for_review",
    uf1.submitted_iso = toString(datetime()),
    uf1.registered_via = "USSD",
    uf1.requested_kes = 28000,
    uf1.crop_type = "Coffee",
    uf1.acreage = 1.5,
    uf1.harvest_month = "October",
    uf1.resident_years = 4,
    uf1.cooperative_delivery_years = 2;

MERGE (uf1)-[ud1:DELIVERS_TO]->(uc5)
SET ud1.delivery_years = 2, ud1.volume_tons = 0.8, ud1.consistency_score = 0.4;

MERGE (uf1)-[:MEMBER_OF]->(uch);

MERGE (uf2:Farmer {id: "F-UG-1002"})
SET uf2.national_id = "UG-2020-55102",
    uf2.name = "Achieng Proscovia",
    uf2.phone_number = "+256778901234",
    uf2.demographic_group = "Women Smallholder",
    uf2.vulnerability_tag = "Climate-exposed",
    uf2.has_land_ownership = true,
    uf2.lease_duration_months = 0,
    uf2.chama_months_consistent = 24,
    uf2.mobile_money_inflows_kes = 68000,
    uf2.status = "ready_for_review",
    uf2.submitted_iso = toString(datetime() - duration({days: 2})),
    uf2.registered_via = "Voice",
    uf2.requested_kes = 45000,
    uf2.crop_type = "Beans",
    uf2.acreage = 2,
    uf2.harvest_month = "June",
    uf2.resident_years = 6,
    uf2.cooperative_delivery_years = 3;

MERGE (uf2)-[ud2:DELIVERS_TO]->(uc2)
SET ud2.delivery_years = 3, ud2.volume_tons = 1.2, ud2.consistency_score = 0.6;

MERGE (uf2)-[:MEMBER_OF]->(uch);
