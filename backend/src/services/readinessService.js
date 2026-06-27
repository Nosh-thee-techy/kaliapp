import { buildScoringContext, routeExplainability } from "./explainabilityService.js";
import { findFarmerByLookup } from "./farmerLookup.js";
import { listSmsMessages } from "./farmerService.js";
import { generateReadinessActions } from "./featherlessService.js";
import { normalizeLang } from "../config/languages.js";
import {
  syncActionPlan,
  getMitigationBonus,
  getGroundTruthTrail,
  completeAction,
} from "./groundTruthService.js";

const ACTION_COPY = {
  en: {
    "No cooperative history": "Deliver every harvest to your society — aim for 2+ seasons of records.",
    "No collateral or substitute": "Join a verified chama or keep a longer land lease on file.",
    "Climate stress": "Follow your zone climate tip and protect inputs this season.",
    "Low mobile money activity": "Use M-Pesa regularly so lenders can see your cash flow.",
    "Weak chama savings": "Save with your chama every month — 6 months builds trust.",
    default: "Keep co-op deliveries steady and stay in your chama meetings.",
  },
  sw: {
    "No cooperative history": "Wasilisha mavuno kila msimu kwa ushirika — lenga rekodi za miaka 2+.",
    "No collateral or substitute": "Jiunge na chama kilichothibitishwa au ongeza muda wa kukodisha shamba.",
    "Climate stress": "Fuata ushauri wa hali ya hewa na Linda pembejeo zako.",
    "Low mobile money activity": "Tumia M-Pesa mara kwa mara ili mwenendo wa fedha uonekane.",
    "Weak chama savings": "Okoa na chama kila mwezi — miezi 6 huongeza uaminifu.",
    default: "Endelea kusafirisha mazao na kuhudhuria chama.",
  },
  lg: {
    "No cooperative history": "Waayo ebirime buli sizoni mu kibiina — tandika emyaka 2+.",
    "No collateral or substitute": "Weegatte ku kibiina eky'okwesiga oba wongere obukalu bwa ttaka.",
    "Climate stress": "Goberera amagezi g'obudde era kuma ebirime byo.",
    "Low mobile money activity": "Kozesa mobile money buli kiseera.",
    "Weak chama savings": "Tereka ne chama buli mwezi.",
    default: "Sigala ng'owa ebirime mu kibiina.",
  },
};

const MISSING_COPY = {
  en: {
    cooperative: "Verified cooperative delivery history",
    chama: "Consistent chama savings (6+ months)",
    mpesa: "Regular mobile money inflows",
    land: "Land title or long-term lease",
    climate: "Climate-resilient input plan for your zone",
  },
  sw: {
    cooperative: "Historia ya usafirishaji kwa ushirika",
    chama: "Akiba ya chama kwa muda (miezi 6+)",
    mpesa: "Mtiririko wa M-Pesa",
    land: "Hati ya ardhi au kukodisha kwa muda mrefu",
    climate: "Mpango wa pembejeo endelevu kwa eneo lako",
  },
  lg: {
    cooperative: "Ebyafaayo by'okuwaayo ebirime mu kibiina",
    chama: "Okutereka mu chama (emyezi 6+)",
    mpesa: "Ensimbi eziyita ku ssimu",
    land: "Obwannannyini bw'ettaka oba okupangisa okw'omu BBanga",
    climate: "Enteekateeka y'ebirime ezigumira obudde",
  },
};

function localizeAction(dragLabel, lang) {
  const bucket = ACTION_COPY[lang] || ACTION_COPY.en;
  return bucket[dragLabel] || bucket.default;
}

function buildMissingSignals(context, lang) {
  const copy = MISSING_COPY[lang] || MISSING_COPY.en;
  const missing = [];

  if ((context.cooperative_delivery_years ?? 0) < 2) {
    missing.push({ id: "cooperative", label: copy.cooperative });
  }
  if ((context.chama_months_consistent ?? 0) < 6) {
    missing.push({ id: "chama", label: copy.chama });
  }
  if ((context.mobile_money_inflows_kes ?? 0) < 50000) {
    missing.push({ id: "mpesa", label: copy.mpesa });
  }
  if (!context.has_land_ownership && (context.lease_duration_months ?? 0) < 24) {
    missing.push({ id: "land", label: copy.land });
  }
  if (context.climate?.spi <= -0.5 || context.climate?.advisory) {
    missing.push({ id: "climate", label: copy.climate });
  }

  return missing.slice(0, 4);
}

function dragsToActions(drags, lang) {
  return (drags || []).slice(0, 3).map((d, i) => ({
    id: `drag-${i}`,
    title: localizeAction(d.label, lang),
    source: d.label,
    priority: i === 0 ? "high" : "medium",
    done: false,
  }));
}

function driversToStrengths(drivers, lang) {
  const prefix = lang === "sw" ? "Imara" : lang === "lg" ? "Kikakamu" : "Strong";
  return (drivers || []).slice(0, 2).map((d) => ({
    label: d.label,
    summary: `${prefix}: ${d.detail}`,
  }));
}

/**
 * Farmer-facing credit readiness — digitizes SMS action points into a simple profile.
 */
export async function getFarmerReadiness(rawLookup, lang = "en") {
  const language = normalizeLang(lang);
  const farmer = await findFarmerByLookup(rawLookup);
  if (!farmer) {
    return { ok: false, error: "not_found" };
  }

  const lookup = farmer.id || farmer.national_id;
  const context = await buildScoringContext(lookup);
  if (!context) {
    return { ok: false, error: "not_found" };
  }

  const explained = await routeExplainability(lookup, language, {
    channel: "readiness",
    skipOfficer: true,
  });

  let aiActions = [];
  try {
    aiActions = await generateReadinessActions(context, language);
  } catch {
    /* fallback below */
  }

  const dragActions = dragsToActions(context.drags, language);
  let actionPoints =
    aiActions.length > 0
      ? aiActions.map((text, i) => ({
          id: `ai-${i}`,
          title: text,
          source: "featherless",
          priority: i === 0 ? "high" : "medium",
          done: false,
        }))
      : dragActions;

  const advisory = context.climate?.advisory || null;
  const zoneCode = context.climate?.zone_code || context.zone_code || null;
  actionPoints = await syncActionPlan(farmer.id, zoneCode, actionPoints, advisory);

  const mitigation = await getMitigationBonus(farmer.id);
  const groundTruth = await getGroundTruthTrail(farmer.id);

  const [latestSms] = await listSmsMessages({ farmerId: farmer.id, limit: 1 });

  const baseScore = context.unified?.canonical_score ?? context.aggregate_score ?? 0;
  const readinessScore = Math.min(100, baseScore + (mitigation.bonusPoints || 0));
  const band =
    context.stance === "APPROVED"
      ? "ready"
      : context.stance === "DECLINE"
        ? "building"
        : "almost";

  return {
    ok: true,
    farmer: {
      id: farmer.id,
      name: farmer.name,
      crop: farmer.crop_type || context.crop_type,
      cooperative: context.cooperative,
      zone: context.zone_name,
      ktdaId: farmer.ktda_id || null,
      phoneMasked: maskPhone(farmer.phone_number),
    },
    readiness: {
      score: readinessScore,
      baseScore,
      mitigationBonus: mitigation.bonusPoints,
      band,
      stance: context.stance,
      label:
        band === "ready"
          ? language === "sw"
            ? "Uko tayari zaidi"
            : language === "lg"
              ? "Olina obukakafu"
              : "Credit ready"
          : band === "almost"
            ? language === "sw"
              ? "Karibu tayari"
              : language === "lg"
                ? "Oli kumpi"
                : "Almost there"
            : language === "sw"
              ? "Jenga uaminifu"
              : language === "lg"
                ? "Zimba obwesige"
                : "Building trust",
    },
    whyMessage: explained.farmer?.sms || null,
    headline: explained.farmer?.sms || null,
    macroAdvisory: groundTruth?.advisory || advisory,
    actionPoints,
    groundTruth: {
      hadActiveAlert: mitigation.hadActiveAlert,
      verifiedCount: mitigation.verifiedCount,
      verifications: groundTruth?.verifications || [],
    },
    strengths: driversToStrengths(context.drivers, language),
    missing: buildMissingSignals(context, language),
    latestMessage: latestSms
      ? { body: latestSms.body, sentAt: latestSms.sentIso, category: latestSms.category }
      : null,
    lang: language,
    updatedAt: new Date().toISOString(),
  };
}

function maskPhone(phone) {
  if (!phone || phone.length < 6) return "••••";
  return `${phone.slice(0, 4)}•••${phone.slice(-3)}`;
}

export async function markReadinessActionComplete(lookup, actionId) {
  const farmer = await findFarmerByLookup(lookup);
  if (!farmer) return { ok: false, error: "not_found" };
  const ok = await completeAction(farmer.id, actionId);
  return { ok, farmerId: farmer.id };
}
