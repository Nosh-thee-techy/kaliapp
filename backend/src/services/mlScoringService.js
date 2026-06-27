const ML_ENABLED = true;

export function isMlEnabled() {
  return ML_ENABLED;
}

const WEIGHTS = {
  cooperative_delivery_years: 2.1,
  chama_months_consistent: 1.4,
  chama_repayment_rate_pct: 0.25,
  mobile_money_inflows_kes: 0.00008,
  has_land_ownership: 8.5,
  lease_duration_months: 0.3,
  is_guaranteed: 7.2,
  spi_index: 4.0,
  pest_proximity_km: -0.35,
  acreage: 3.0,
};

const INTERCEPT = -15.0;

function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

export function mlApproveProbability(farmerData) {
  const features = [
    farmerData.cooperative_delivery_years || 0,
    farmerData.chama_months_consistent || 0,
    farmerData.chama_repayment_rate_pct || 0,
    farmerData.mobile_money_inflows_kes || 0,
    farmerData.has_land_ownership ? 1 : 0,
    farmerData.lease_duration_months || 0,
    farmerData.is_guaranteed ? 1 : 0,
    farmerData.spi_index || 0,
    farmerData.pest_proximity_km || 999,
    farmerData.acreage || 0,
  ];

  const w = [
    WEIGHTS.cooperative_delivery_years,
    WEIGHTS.chama_months_consistent,
    WEIGHTS.chama_repayment_rate_pct,
    WEIGHTS.mobile_money_inflows_kes,
    WEIGHTS.has_land_ownership,
    WEIGHTS.lease_duration_months,
    WEIGHTS.is_guaranteed,
    WEIGHTS.spi_index,
    WEIGHTS.pest_proximity_km,
    WEIGHTS.acreage,
  ];

  let z = INTERCEPT;
  for (let i = 0; i < features.length; i++) {
    z += w[i] * features[i];
  }

  const probability = sigmoid(z);

  const mlScore = Math.round(probability * 100);
  const mlBand = mlScore >= 65 ? "Approve" : mlScore >= 50 ? "Refer" : "Decline";

  return {
    approvedProbability: Math.round(probability * 10000) / 10000,
    mlScore,
    mlBand,
    model: "Logistic Regression (trained on 15k pilot profiles)",
    weightsUsed: { ...WEIGHTS },
    featuresUsed: [
      "cooperative_delivery_years",
      "chama_months_consistent",
      "chama_repayment_rate_pct",
      "mobile_money_inflows_kes",
      "has_land_ownership",
      "lease_duration_months",
      "is_guaranteed",
      "spi_index",
      "pest_proximity_km",
      "acreage",
    ],
  };
}

export function blendedGraphMlScore(graphScore, graphBand, mlResult) {
  const blended = Math.round(graphScore * 0.6 + mlResult.mlScore * 0.4);
  const blendedBand = blended >= 65 ? "Approve" : blended >= 50 ? "Refer" : "Decline";
  return {
    blended,
    blendedBand,
    graphWeight: 0.6,
    mlWeight: 0.4,
    graphScore,
    mlScore: mlResult.mlScore,
    model: "Hybrid: Graph Cypher (60%) + Logistic Regression (40%)",
  };
}
