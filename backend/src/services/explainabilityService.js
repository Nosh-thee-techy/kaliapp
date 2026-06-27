import { calculateGraphScore } from "./scoringEngine.js";
import { executeGraphScoreQuery } from "./growAsiaScoring.js";
import { unifiedStance, stanceLabel } from "./scoringUnified.js";
import {
  generateFarmerExplainer,
  generateCreditNarrative,
  isFeatherlessEnabled,
} from "./featherlessService.js";
import { normalizeLang, SUPPORTED_LANGS } from "../config/languages.js";

const SMS_MAX = Number(process.env.FARMER_SMS_MAX_CHARS) || 160;

/**
 * Build structured scoring context from graph — feeds both officer + farmer outputs.
 */
export async function buildScoringContext(lookup) {
  const [graph, growAsia] = await Promise.all([
    calculateGraphScore(lookup),
    executeGraphScoreQuery({ lookup }),
  ]);

  if (!graph) return null;

  const unified = unifiedStance({
    growAsiaScore: growAsia?.systemScore,
    graphScore: graph.aggregate_score,
  });

  return {
    farmerId: graph.id,
    name: graph.name,
    phone: graph.phone,
    crop_type: graph.crop_type,
    cooperative: graph.cooperative,
    zone_name: graph.zone_name,
    zone_code: graph.zone_code,
    aggregate_score: graph.aggregate_score,
    band: graph.band,
    drivers: graph.drivers || [],
    drags: graph.drags || [],
    climate: graph.climate,
    graph_context: graph.graph_context,
    grow_asia: growAsia
      ? {
          systemScore: growAsia.systemScore,
          riskTier: growAsia.riskTier,
        }
      : null,
    unified,
    stance: stanceLabel(unified),
    underwriting_state: graph.status,
    cooperative_delivery_years: graph.cooperative_delivery_years,
    chama_months_consistent: graph.chama_months_consistent,
    mobile_money_inflows_kes: graph.mobile_money_inflows_kes,
    has_land_ownership: graph.has_land_ownership,
    lease_duration_months: graph.lease_duration_months,
  };
}

/**
 * Dual-output explainability router (eSusFarm pattern).
 * - farmer: ≤160 char SMS, localized, explains WHY (not action checklist), privacy-safe
 * - officer: full narrative for MIS / scorecard audit
 */
export async function routeExplainability(lookup, lang = "en", options = {}) {
  const language = normalizeLang(lang);
  const context = await buildScoringContext(lookup);
  if (!context) {
    return { ok: false, error: "farmer_not_found" };
  }

  const channel = options.channel || "api";
  const stance = context.stance;

  const [farmerMessage, officerNarrative] = await Promise.all([
    generateFarmerExplainer(context, language, { maxChars: SMS_MAX }),
    options.skipOfficer
      ? null
      : generateCreditNarrative({ ...context, ...context.climate }),
  ]);

  return {
    ok: true,
    farmerId: context.farmerId,
    name: context.name,
    lang: language,
    langLabel: SUPPORTED_LANGS[language]?.label || language,
    channel,
    stance,
    unified: context.unified,
    farmer: {
      sms: farmerMessage.message,
      chars: farmerMessage.message.length,
      maxChars: SMS_MAX,
      provider: farmerMessage.provider,
      model: farmerMessage.model,
      actionHint: farmerMessage.actionHint,
    },
    officer: officerNarrative
      ? {
          narrative: officerNarrative.narrative,
          provider: officerNarrative.provider,
          model: officerNarrative.model,
          drivers: context.drivers,
          drags: context.drags,
          climate: context.climate,
          grow_asia: context.grow_asia,
        }
      : null,
    featherlessEnabled: isFeatherlessEnabled(),
    generatedAt: new Date().toISOString(),
  };
}

/** Truncate safely for GSM SMS segment. */
export function compressToSms(text, max = SMS_MAX) {
  if (!text) return "";
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trim()}…`;
}
