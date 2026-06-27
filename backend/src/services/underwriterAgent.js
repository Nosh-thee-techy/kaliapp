import { parseIncomingIntent } from "./featherlessService.js";
import { executeGraphScoreQuery } from "./growAsiaScoring.js";
import { transitionAgentState } from "./masumiService.js";
import { sendSms } from "./africasTalking.js";
import { registerFarmerFromUssd, setFarmerUnderwritingState } from "./farmerService.js";
import { broadcastEvent } from "./eventBus.js";
import { createMasumiPaymentIntent } from "./masumiService.js";

const APPROVE_THRESHOLD = Number(process.env.GROW_ASIA_APPROVE_THRESHOLD) || 0.65;

const SMS = {
  approved: {
    en: "Hello, your loan request has been APPROVED! You will receive an M-Pesa confirmation shortly.",
    sw: "Habari, mkopo wako umeidhinishwa! Utapokea ujumbe wa M-Pesa hivi punde.",
  },
  declined: {
    en: "Sorry, your loan request could not be completed based on current group cluster metrics.",
    sw: "Samahani, ombi lako halijafaulu wakati huu kulingana na vigezo vya kikundi chako.",
  },
};

/**
 * Masumi-aligned loan application workflow — all channels normalize here.
 */
export async function handleLoanApplicationWorkflow(payload) {
  const trace = [];
  const lang = payload.lang === "sw" ? "sw" : "en";
  const channel = payload.channel || "unknown";
  const applicationId = payload.id || `APP-${Date.now().toString(36).toUpperCase()}`;

  trace.push({ step: "ingest", channel, applicationId });

  let structured = payload.structured || null;
  if (payload.text && !structured) {
    structured = await parseIncomingIntent(payload.text, lang);
    trace.push({ step: "featherless_parse", structured });
  }

  if (payload.nationalId && payload.coopCode && payload.phone) {
    await registerFarmerFromUssd({
      nationalId: payload.nationalId,
      phoneNumber: payload.phone,
      coopCode: payload.coopCode,
      acreage: payload.acreage ?? structured?.volume_expectation ?? structured?.acreage,
      cropType: payload.cropType ?? structured?.crop ?? structured?.crop_type ?? "Maize",
      requestedKes: payload.requestedKes,
    });
    trace.push({ step: "neo4j_register", nationalId: payload.nationalId });
  }

  await setFarmerUnderwritingState(payload.phone || payload.lookup, "PENDING_INGESTION");
  await transitionAgentState(applicationId, "PENDING_INGESTION", { channel, phone: payload.phone });
  trace.push({ step: "state", state: "PENDING_INGESTION" });

  await setFarmerUnderwritingState(payload.phone || payload.lookup, "EVALUATING_RISK");
  await transitionAgentState(applicationId, "EVALUATING_RISK");

  const systemScore = await executeGraphScoreQuery({
    phone: payload.phone,
    lookup: payload.lookup || payload.farmerId || payload.nationalId,
  });

  if (!systemScore) {
    await setFarmerUnderwritingState(payload.phone || payload.lookup, "FLAGGED_FOR_REVIEW");
    await transitionAgentState(applicationId, "FLAGGED_FOR_REVIEW", { reason: "farmer_not_found" });
    broadcastEvent("application_updated", {
      applicationId,
      state: "FLAGGED_FOR_REVIEW",
      channel,
      phone: payload.phone,
      error: "Farmer not found in graph",
    });
    return { ok: false, applicationId, state: "FLAGGED_FOR_REVIEW", trace };
  }

  trace.push({ step: "grow_asia_score", systemScore: systemScore.systemScore });

  const approved = systemScore.systemScore >= APPROVE_THRESHOLD;
  const finalState = approved ? "APPROVED" : "DECLINED";

  await setFarmerUnderwritingState(systemScore.farmerId, finalState);
  await transitionAgentState(applicationId, finalState, {
    systemScore: systemScore.systemScore,
    farmerId: systemScore.farmerId,
  });

  const smsBody = approved ? SMS.approved[lang] : SMS.declined[lang];
  if (payload.phone) {
    try {
      await sendSms({ to: payload.phone, message: smsBody });
    } catch (err) {
      console.warn("[underwriter] SMS failed:", err.message);
    }
  }

  let disbursement = null;
  if (approved && process.env.AUTO_DISBURSE_ON_APPROVE === "true") {
    disbursement = await createMasumiPaymentIntent({
      farmerId: systemScore.farmerId,
      farmerName: systemScore.name,
      amount: payload.requestedKes || 35000,
      officerId: payload.officerId || "masumi-agent",
      loanId: `LN-${systemScore.farmerId}-${Date.now().toString(36).toUpperCase()}`,
    });
    trace.push({ step: "masumi_disburse", disbursement });
  }

  const mapEvent = {
    applicationId,
    state: finalState,
    channel,
    farmerId: systemScore.farmerId,
    name: systemScore.name,
    phone: systemScore.phone,
    systemScore: systemScore.systemScore,
    riskTier: systemScore.riskTier,
    chama_id: systemScore.chama_id,
    chama_name: systemScore.chama_name,
    zone_code: systemScore.zone_code,
    structured,
    timestamp: new Date().toISOString(),
  };

  broadcastEvent("application_updated", mapEvent);
  broadcastEvent("map_pin_updated", mapEvent);

  return {
    ok: true,
    applicationId,
    state: finalState,
    approved,
    systemScore,
    structured,
    disbursement,
    trace,
  };
}
