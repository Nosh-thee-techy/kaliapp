/**
 * Unified scoring — Grow Asia (0–1) + KaLI graph (0–100) with one canonical stance.
 */

const GROW_ASIA_APPROVE = Number(process.env.GROW_ASIA_APPROVE_THRESHOLD) || 0.65;
const GRAPH_APPROVE = 65;
const GRAPH_REFER = 50;

export function growAsiaToPercent(score) {
  return Math.round((score || 0) * 100);
}

export function unifiedStance({ growAsiaScore, graphScore }) {
  const ga = growAsiaScore ?? 0;
  const gs = graphScore ?? 0;
  const canonical = Math.round(growAsiaToPercent(ga) * 0.45 + gs * 0.55);

  let band = "Refer";
  let recommendation = "REFER TO FIELD AUDIT COMMITTEE";
  if (ga >= GROW_ASIA_APPROVE || gs >= GRAPH_APPROVE) {
    band = "Approve";
    recommendation = "APPROVED (Unified Graph + Grow Asia)";
  } else if (ga < 0.45 && gs < GRAPH_REFER) {
    band = "Decline";
    recommendation = "DECLINE — REVIEW DRAGS";
  }

  return {
    canonical_score: Math.min(Math.max(canonical, 0), 100),
    band,
    recommendation,
    grow_asia_percent: growAsiaToPercent(ga),
    graph_score: gs,
    grow_asia_approved: ga >= GROW_ASIA_APPROVE,
    graph_approved: gs >= GRAPH_APPROVE,
    primary_engine: "KaLI Unified (Grow Asia 45% · Graph 55%)",
  };
}

export function stanceLabel(unified) {
  if (unified.band === "Approve") return "APPROVED";
  if (unified.band === "Decline") return "DECLINE";
  return "REFER";
}
