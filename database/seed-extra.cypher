// =============================================================================
// KaLI Extra Seed Data — Additional farmers for richer demo
// Run automatically by seed.js after seed.cypher completes
// =============================================================================

// --- Additional Chamas ---
MERGE (ch7:Chama {id: "CHAMA-KSM-01"})
SET ch7.name = "Kisumu Women's Table Banking", ch7.repayment_rate_pct = 92.0;

MERGE (ch8:Chama {id: "CHAMA-NYR-02"})
SET ch8.name = "Nyeri Youth Agri-Group", ch8.repayment_rate_pct = 85.5;

MERGE (ch9:Chama {id: "CHAMA-MCK-01"})
SET ch9.name = "Machakos Merry-Go-Round", ch9.repayment_rate_pct = 99.0;

// --- Additional Farmers ---
MERGE (f7:Farmer {id: "F-1047"})
SET f7.national_id = "34567123",
    f7.name = "Faith Njoki",
    f7.phone_number = "+254722334456",
    f7.demographic_group = "Women",
    f7.vulnerability_tag = "Female-headed HH",
    f7.has_land_ownership = true,
    f7.lease_duration_months = 0,
    f7.chama_months_consistent = 36,
    f7.mobile_money_inflows_kes = 185000,
    f7.cooperative_delivery_years = 6,
    f7.requested_kes = 75000,
    f7.acreage = 3.5,
    f7.crop_type = "Coffee",
    f7.harvest_month = "October",
    f7.status = "ready_for_review",
    f7.registered_via = "Cooperative roster",
    f7.submitted_iso = toString(datetime() - duration({hours: 2}));
MERGE (f7)-[:DELIVERS_TO {delivery_years: 6, volume_tons: 8.5}]->(c5);
MERGE (f7)-[:MEMBER_OF]->(ch7);
MERGE (p7:FarmPlot {id: "PLOT-F-1047"}) SET p7.acreage = 3.5;
MERGE (f7)-[:LOCATED_IN]->(p7);

MERGE (f8:Farmer {id: "F-1048"})
SET f8.national_id = "35678234",
    f8.name = "Samuel Otieno",
    f8.phone_number = "+254701234567",
    f8.demographic_group = "Youth",
    f8.vulnerability_tag = "Youth",
    f8.has_land_ownership = false,
    f8.lease_duration_months = 12,
    f8.chama_months_consistent = 8,
    f8.mobile_money_inflows_kes = 52000,
    f8.cooperative_delivery_years = 1,
    f8.requested_kes = 25000,
    f8.acreage = 0.5,
    f8.crop_type = "Tomatoes",
    f8.harvest_month = "February",
    f8.status = "ready_for_review",
    f8.registered_via = "USSD",
    f8.submitted_iso = toString(datetime() - duration({hours: 5}));
MERGE (f8)-[:DELIVERS_TO {delivery_years: 1, volume_tons: 0.8}]->(c4);
MERGE (f8)-[:MEMBER_OF]->(ch8);
MERGE (p8:FarmPlot {id: "PLOT-F-1048"}) SET p8.acreage = 0.5;
MERGE (f8)-[:LOCATED_IN]->(p8);

MERGE (f9:Farmer {id: "F-1049"})
SET f9.national_id = "36789123",
    f9.name = "Grace Wambui",
    f9.phone_number = "+254734567890",
    f9.demographic_group = "PWD",
    f9.vulnerability_tag = "PWD",
    f9.has_land_ownership = true,
    f9.lease_duration_months = 0,
    f9.chama_months_consistent = 42,
    f9.mobile_money_inflows_kes = 220000,
    f9.cooperative_delivery_years = 8,
    f9.requested_kes = 95000,
    f9.acreage = 4,
    f9.crop_type = "Dairy",
    f9.harvest_month = "Continuous",
    f9.status = "ready_for_review",
    f9.registered_via = "Walk-in",
    f9.submitted_iso = toString(datetime() - duration({hours: 4}));
MERGE (f9)-[:DELIVERS_TO {delivery_years: 8, volume_tons: 12.0}]->(c5);
MERGE (f9)-[:MEMBER_OF]->(ch5);
MERGE (p9:FarmPlot {id: "PLOT-F-1049"}) SET p9.acreage = 4;
MERGE (f9)-[:LOCATED_IN]->(p9);

MERGE (f10:Farmer {id: "F-1050"})
SET f10.national_id = "37890123",
    f10.name = "John Kamau",
    f10.phone_number = "+254712398765",
    f10.demographic_group = "General",
    f10.vulnerability_tag = "Smallholder",
    f10.has_land_ownership = false,
    f10.lease_duration_months = 6,
    f10.chama_months_consistent = 4,
    f10.mobile_money_inflows_kes = 28000,
    f10.cooperative_delivery_years = 0,
    f10.requested_kes = 15000,
    f10.acreage = 0.3,
    f10.crop_type = "Kale",
    f10.harvest_month = "April",
    f10.status = "ready_for_review",
    f10.registered_via = "USSD",
    f10.submitted_iso = toString(datetime() - duration({hours: 1}));
MERGE (f10)-[:DELIVERS_TO {delivery_years: 0, volume_tons: 0}]->(c1);
MERGE (p10:FarmPlot {id: "PLOT-F-1050"}) SET p10.acreage = 0.3;
MERGE (f10)-[:LOCATED_IN]->(p10);

MERGE (f11:Farmer {id: "F-1051"})
SET f11.national_id = "38901234",
    f11.name = "Sarah Chepkoech",
    f11.phone_number = "+254722345678",
    f11.demographic_group = "Women",
    f11.vulnerability_tag = "Female-headed HH",
    f11.has_land_ownership = false,
    f11.lease_duration_months = 48,
    f11.chama_months_consistent = 28,
    f11.mobile_money_inflows_kes = 145000,
    f11.cooperative_delivery_years = 4,
    f11.requested_kes = 60000,
    f11.acreage = 2,
    f11.crop_type = "Maize",
    f11.harvest_month = "August",
    f11.status = "ready_for_review",
    f11.registered_via = "Cooperative roster",
    f11.submitted_iso = toString(datetime() - duration({hours: 6}));
MERGE (f11)-[:DELIVERS_TO {delivery_years: 4, volume_tons: 6.0}]->(c2);
MERGE (f11)-[:MEMBER_OF]->(ch2);
MERGE (p11:FarmPlot {id: "PLOT-F-1051"}) SET p11.acreage = 2;
MERGE (f11)-[:LOCATED_IN]->(p11);

MERGE (f12:Farmer {id: "F-1052"})
SET f12.national_id = "39012345",
    f12.name = "Patrick Omondi",
    f12.phone_number = "+254733456789",
    f12.demographic_group = "General",
    f12.vulnerability_tag = "Smallholder",
    f12.has_land_ownership = true,
    f12.lease_duration_months = 0,
    f12.chama_months_consistent = 15,
    f12.mobile_money_inflows_kes = 78000,
    f12.cooperative_delivery_years = 3,
    f12.requested_kes = 40000,
    f12.acreage = 2.5,
    f12.crop_type = "Sugarcane",
    f12.harvest_month = "June",
    f12.status = "ready_for_review",
    f12.registered_via = "Walk-in",
    f12.submitted_iso = toString(datetime() - duration({hours: 8}));
MERGE (f12)-[:DELIVERS_TO {delivery_years: 3, volume_tons: 8.0}]->(c4);
MERGE (f12)-[:MEMBER_OF]->(ch4);
MERGE (p12:FarmPlot {id: "PLOT-F-1052"}) SET p12.acreage = 2.5;
MERGE (f12)-[:LOCATED_IN]->(p12);

MERGE (f13:Farmer {id: "F-1053"})
SET f13.national_id = "40123456",
    f13.name = "Esther Nyambura",
    f13.phone_number = "+254711122233",
    f13.demographic_group = "Women",
    f13.vulnerability_tag = "Female-headed HH",
    f13.has_land_ownership = false,
    f13.lease_duration_months = 24,
    f13.chama_months_consistent = 20,
    f13.mobile_money_inflows_kes = 92000,
    f13.cooperative_delivery_years = 2,
    f13.requested_kes = 35000,
    f13.acreage = 1.5,
    f13.crop_type = "French Beans",
    f13.harvest_month = "March",
    f13.status = "awaiting_climate",
    f13.registered_via = "USSD",
    f13.submitted_iso = toString(datetime() - duration({hours: 1}));
MERGE (f13)-[:DELIVERS_TO {delivery_years: 2, volume_tons: 2.5}]->(c1);
MERGE (f13)-[:MEMBER_OF]->(ch1);
MERGE (p13:FarmPlot {id: "PLOT-F-1053"}) SET p13.acreage = 1.5;
MERGE (f13)-[:LOCATED_IN]->(p13);

MERGE (f14:Farmer {id: "F-1054"})
SET f14.national_id = "41234567",
    f14.name = "David Kiprop",
    f14.phone_number = "+254723344556",
    f14.demographic_group = "Youth",
    f14.vulnerability_tag = "Youth",
    f14.has_land_ownership = false,
    f14.lease_duration_months = 0,
    f14.chama_months_consistent = 3,
    f14.mobile_money_inflows_kes = 15000,
    f14.cooperative_delivery_years = 0,
    f14.requested_kes = 20000,
    f14.acreage = 0.4,
    f14.crop_type = "Beans",
    f14.harvest_month = "July",
    f14.status = "ready_for_review",
    f14.registered_via = "USSD",
    f14.submitted_iso = toString(datetime() - duration({hours: 12}));
MERGE (f14)-[:DELIVERS_TO {delivery_years: 0, volume_tons: 0}]->(c6);
MERGE (f14)-[:MEMBER_OF]->(ch9);
MERGE (p14:FarmPlot {id: "PLOT-F-1054"}) SET p14.acreage = 0.4;
MERGE (f14)-[:LOCATED_IN]->(p14);

MERGE (f15:Farmer {id: "F-1055"})
SET f15.national_id = "42345678",
    f15.name = "Margaret Akinyi",
    f15.phone_number = "+254701112233",
    f15.demographic_group = "PWD",
    f15.vulnerability_tag = "PWD",
    f15.has_land_ownership = true,
    f15.lease_duration_months = 0,
    f15.chama_months_consistent = 10,
    f15.mobile_money_inflows_kes = 67000,
    f15.cooperative_delivery_years = 2,
    f15.requested_kes = 30000,
    f15.acreage = 1,
    f15.crop_type = "Vegetables",
    f15.harvest_month = "May",
    f15.status = "ready_for_review",
    f15.registered_via = "Walk-in",
    f15.submitted_iso = toString(datetime() - duration({hours: 10}));
MERGE (f15)-[:DELIVERS_TO {delivery_years: 2, volume_tons: 1.5}]->(c4);
MERGE (f15)-[:MEMBER_OF]->(ch7);
MERGE (p15:FarmPlot {id: "PLOT-F-1055"}) SET p15.acreage = 1;
MERGE (f15)-[:LOCATED_IN]->(p15);

MERGE (f16:Farmer {id: "F-1056"})
SET f16.national_id = "43456789",
    f16.name = "James Mburu",
    f16.phone_number = "+254734455667",
    f16.demographic_group = "General",
    f16.vulnerability_tag = "Smallholder",
    f16.has_land_ownership = true,
    f16.lease_duration_months = 0,
    f16.chama_months_consistent = 14,
    f16.mobile_money_inflows_kes = 88000,
    f16.cooperative_delivery_years = 5,
    f16.requested_kes = 55000,
    f16.acreage = 3,
    f16.crop_type = "Tea",
    f16.harvest_month = "Continuous",
    f16.status = "disbursed",
    f16.registered_via = "Cooperative roster",
    f16.submitted_iso = toString(datetime() - duration({hours: 120}));
MERGE (f16)-[:DELIVERS_TO {delivery_years: 5, volume_tons: 10.0}]->(c5);
MERGE (f16)-[:MEMBER_OF]->(ch5);
MERGE (p16:FarmPlot {id: "PLOT-F-1056"}) SET p16.acreage = 3;
MERGE (f16)-[:LOCATED_IN]->(p16);

// --- Additional audit entries for the new disbursed farmer ---
MATCH (f16:Farmer {id: "F-1056"})
MERGE (a4:AuditEntry {id: "A-9004"})
SET a4.decision = "Approved",
    a4.stance = "approve_flexible",
    a4.notes = "5 years tea delivery with Nyeri Dairy - strong cooperative history",
    a4.officer = "Jane Mwangi",
    a4.score = 82,
    a4.timestamp_iso = toString(datetime() - duration({hours: 96}))
MERGE (f16)-[:DECIDED]->(a4)
WITH f16
MERGE (sms4:SmsMessage {id: "SMS-2204"})
SET sms4.to = "+254734455667",
    sms4.body = "KaLI Rating: 82/100. Approved. KES 55,000 disbursed. Continuous tea harvest supports flexible repayment.",
    sms4.category = "decision",
    sms4.sent_iso = toString(datetime() - duration({hours: 96}))
MERGE (f16)-[:NOTIFIED]->(sms4);

// --- Peer guarantees for additional farmers ---
MATCH (f11:Farmer {id: "F-1051"})
MATCH (guarantor1:Farmer {id: "F-1046"})
MERGE (guarantor1)-[:GUARANTEES]->(f11);

MATCH (f9:Farmer {id: "F-1049"})
MATCH (guarantor2:Farmer {id: "F-1031"})
MERGE (guarantor2)-[:GUARANTEES]->(f9);

MATCH (f7:Farmer {id: "F-1047"})
MATCH (guarantor3:Farmer {id: "20104829"})
MERGE (guarantor3)-[:GUARANTEES]->(f7);
