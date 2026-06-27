const FEATHERLESS_BASE = "https://api.featherless.ai/v1";
const FEATHERLESS_MODEL = "NousResearch/Hermes-3-Llama-3.1-8B";
const FEATHERLESS_API_KEY = process.env.FEATHERLESS_API_KEY || "";

const ENABLED = Boolean(FEATHERLESS_API_KEY);

export function isFeatherlessEnabled() {
  return ENABLED;
}

export async function generateCreditNarrative(farmerData) {
  if (!ENABLED) {
    return generateMockNarrative(farmerData);
  }

  const prompt = buildPrompt(farmerData);

  try {
    const res = await fetch(`${FEATHERLESS_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FEATHERLESS_API_KEY}`,
      },
      body: JSON.stringify({
        model: FEATHERLESS_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a credit risk assessment officer for KaLI, a graph-native agricultural lending platform in Kenya. Analyze farmer data and generate a concise, insightful credit narrative. Be specific about numbers. Respond in clear English. Max 4 sentences.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn("[featherless] API error:", res.status, text);
      return generateMockNarrative(farmerData);
    }

    const data = await res.json();
    return {
      narrative: data.choices?.[0]?.message?.content || generateMockNarrative(farmerData).narrative,
      model: FEATHERLESS_MODEL,
      provider: "Featherless AI",
    };
  } catch (err) {
    console.warn("[featherless] API call failed:", err.message);
    return {
      ...generateMockNarrative(farmerData),
      provider: "KaLI Fallback (Featherless unavailable)",
    };
  }
}

function buildPrompt(farmer) {
  return `CREDIT APPLICATION ANALYSIS — KaLI Graph-Native Scoring Engine

Farmer: ${farmer.name} (ID: ${farmer.id})
Segment: ${farmer.segment || farmer.demographic || "General"}
Crop: ${farmer.crop_type || "N/A"}
Acreage: ${farmer.acreage || "N/A"} acres
Requested: KES ${(farmer.requested_kes || 0).toLocaleString()}

NETWORK SIGNALS:
- Cooperative: ${farmer.cooperative || "None"} (${farmer.cooperative_delivery_years || 0} years delivery history)
- Chama savings: ${farmer.chama_months_consistent || 0} months consistent
- M-Pesa inflows (12mo): KES ${(farmer.mobile_money_inflows_kes || 0).toLocaleString()}
- Land tenure: ${farmer.has_land_ownership ? "Owned" : `${farmer.lease_duration_months || 0}mo lease`}
- Peer guarantee: ${farmer.graph_context?.is_guaranteed ? "Active" : "None"}

CLIMATE CONTEXT:
- Zone: ${farmer.climate?.zone_code || farmer.zone_code || "Unknown"}
- SPI (drought index): ${farmer.climate?.spi || 0}
- Pest proximity: ${farmer.climate?.pest_proximity_km || 0}km

SCORE: ${farmer.aggregate_score || farmer.total || 0}/100
BAND: ${farmer.band || "N/A"}

Generate a 3-4 sentence credit narrative explaining the key risk factors and why this score was assigned. Be specific with numbers. Address the farmer's creditworthiness based on their network relationships and climate context.`;
}

function generateMockNarrative(farmer) {
  const score = farmer.aggregate_score || farmer.total || 50;
  const name = farmer.name || "the applicant";
  const coop = farmer.cooperative || "their cooperative";
  const crop = farmer.crop_type || "crop";
  const deliveryYrs = farmer.cooperative_delivery_years || 0;
  const chamaMos = farmer.chama_months_consistent || 0;
  const mpesa = farmer.mobile_money_inflows_kes || 0;
  const spi = farmer.climate?.spi ?? 0;
  const guaranteed = farmer.graph_context?.is_guaranteed;

  const coopLine = deliveryYrs >= 3
    ? `${deliveryYrs}-year delivery history with ${coop} demonstrates reliable supply chain engagement`
    : deliveryYrs > 0
      ? `Emerging ${deliveryYrs}-year relationship with ${coop}`
      : `No verifiable cooperative delivery history`;

  const chamaLine = chamaMos >= 18
    ? `${chamaMos} months of consistent chama savings show strong financial discipline`
    : chamaMos > 0
      ? `${chamaMos} months of chama savings`
      : "No chama savings history";

  const mpesaLine = mpesa >= 100000
    ? `M-Pesa inflows of KES ${mpesa.toLocaleString()} confirm substantive cash-based economic activity`
    : `Limited M-Pesa inflows of KES ${mpesa.toLocaleString()}`;

  const climateLine = spi <= -1.5
    ? `Severe drought risk (SPI ${spi}) in the zone is a material drag on repayment capacity`
    : spi <= -0.5
      ? `Below-normal rainfall (SPI ${spi}) warrants cautious monitoring`
      : `Favourable climate conditions (SPI ${spi}) support projected harvest`;

  const guaranteeLine = guaranteed
    ? "A peer guarantee from an Excellent-standing farmer further strengthens the credit case."
    : "";

  let narrative;
  if (score >= 65) {
    narrative = `${name} presents a strong credit case. ${coopLine}, ${chamaLine}, and ${mpesaLine}. ${climateLine}. ${guaranteeLine}Overall score of ${score}/100 supports approval with flexible terms aligned to ${crop} harvest cycle — network resilience is well-established.`;
  } else if (score >= 50) {
    narrative = `${name} shows moderate credit potential. ${coopLine}, but ${chamaLine}. ${mpesaLine}. ${climateLine}. ${guaranteeLine}With a score of ${score}/100, referral for field audit is recommended to verify cooperative records before final decision.`;
  } else {
    narrative = `${name} represents a higher-risk profile. ${coopLine}. ${chamaLine}. ${mpesaLine}. ${climateLine}. ${guaranteeLine}Score of ${score}/100 indicates significant gaps in credit history, collateral, or climate resilience. Decline recommended unless new guarantee or alternative data becomes available.`;
  }

  return {
    narrative,
    model: "KaLI Graph Narrative Engine",
    provider: "KaLI Fallback (Featherless API key not configured)",
  };
}
