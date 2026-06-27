/**
 * ML visit-priority model for agronomist field queue.
 * Logistic-style scoring over climate stress + unverified farmer actions.
 */

const WEIGHTS = {
  spi_stress: 18,
  pest_risk: 14,
  active_alert: 22,
  unverified_actions: 20,
  refer_band: 12,
  days_since_report: 8,
  cooperative_years: -4,
};

const INTERCEPT = -28;

function sigmoid(z) {
  return 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, z))));
}

function spiStress(spi) {
  const s = Number(spi) || 0;
  if (s <= -1.5) return 1;
  if (s <= -0.5) return 0.65;
  if (s <= 0) return 0.35;
  return 0.1;
}

function pestRisk(km) {
  const d = Number(km) || 999;
  if (d < 10) return 1;
  if (d < 25) return 0.7;
  if (d < 50) return 0.35;
  return 0.05;
}

/**
 * @param {object} row — farmer + zone context from verification queue
 */
export function scoreVisitPriority(row) {
  const spi = spiStress(row.spi);
  const pest = pestRisk(row.pestProximityKm);
  const alert = row.hasActiveAlert ? 1 : 0;
  const unverified = Math.min(1, (row.pendingActions || 0) / 3);
  const refer = row.creditBand === "Refer" || row.creditBand === "Decline" ? 1 : 0;
  const days = Math.min(1, (row.daysSinceSelfReport || 0) / 14);
  const coopNorm = Math.min(1, (row.cooperativeDeliveryYears || 0) / 5);

  const features = { spi, pest, alert, unverified, refer, days, coopNorm };
  let z = INTERCEPT;
  z += WEIGHTS.spi_stress * spi;
  z += WEIGHTS.pest_risk * pest;
  z += WEIGHTS.active_alert * alert;
  z += WEIGHTS.unverified_actions * unverified;
  z += WEIGHTS.refer_band * refer;
  z += WEIGHTS.days_since_report * days;
  z += WEIGHTS.cooperative_years * coopNorm;

  const probability = sigmoid(z);
  const priorityScore = Math.round(probability * 100);
  const tier = priorityScore >= 70 ? "urgent" : priorityScore >= 45 ? "soon" : "routine";

  const drivers = [];
  if (alert) drivers.push({ label: "Active zone advisory", weight: "high" });
  if (unverified >= 0.33) drivers.push({ label: `${row.pendingActions} action(s) awaiting verification`, weight: "high" });
  if (spi >= 0.65) drivers.push({ label: "Drought stress (SPI)", weight: "medium" });
  if (pest >= 0.7) drivers.push({ label: "Pest proximity", weight: "medium" });
  if (refer) drivers.push({ label: "Credit refer / audit path", weight: "medium" });

  return {
    priorityScore,
    tier,
    visitProbability: Math.round(probability * 1000) / 1000,
    model: "Field Priority Regressor v1 (climate + ground-truth features)",
    drivers: drivers.slice(0, 4),
    features,
  };
}

export function rankQueue(rows) {
  return rows
    .map((row) => ({
      ...row,
      ml: scoreVisitPriority(row),
    }))
    .sort((a, b) => b.ml.priorityScore - a.ml.priorityScore);
}
