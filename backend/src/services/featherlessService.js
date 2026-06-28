import { SUPPORTED_LANGS, normalizeLang } from "../config/languages.js";

const FEATHERLESS_BASE = process.env.FEATHERLESS_BASE_URL || "https://api.featherless.ai/v1";
const FEATHERLESS_MODEL = process.env.FEATHERLESS_MODEL || "NousResearch/Hermes-3-Llama-3.1-8B";
const FEATHERLESS_API_KEY = process.env.FEATHERLESS_API_KEY || "";

const ENABLED = Boolean(FEATHERLESS_API_KEY);

const PARSE_SYSTEM = `You are an expert multilingual agricultural risk analyzer for East Africa.
Languages: English, Kiswahili, Gikuyu, Dholuo, Kikamba, Somali, Sheng, and Luganda.
Extract data from the user input. Output ONLY strict JSON.
Format: { "crop": string|null, "volume_expectation": number|null, "group_name": string|null, "location": string|null, "confidence_score": number }`;

export function isFeatherlessEnabled() {
  return ENABLED;
}

async function chatCompletion(messages, { json = false, maxTokens = 300 } = {}) {
  const body = {
    model: FEATHERLESS_MODEL,
    messages,
    temperature: 0.2,
    max_tokens: maxTokens,
  };
  if (json) body.response_format = { type: "json_object" };

  const res = await fetch(`${FEATHERLESS_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${FEATHERLESS_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Featherless ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

/**
 * Multi-lingual intent parsing — Swahili, Sheng, English.
 * @param {string} rawInput
 * @param {'en'|'sw'|'sheng'} language
 */
export async function parseIncomingIntent(rawInput, language = "en") {
  if (!rawInput?.trim()) {
    return { crop: null, volume_expectation: null, group_name: null, location: null, confidence_score: 0 };
  }

  if (!ENABLED) {
    return parseIncomingIntentLocal(rawInput, language);
  }

  try {
    const content = await chatCompletion(
      [
        { role: "system", content: PARSE_SYSTEM },
        { role: "user", content: `Language context: ${language}. Input: ${rawInput}` },
      ],
      { json: true },
    );
    return JSON.parse(content);
  } catch (err) {
    console.warn("[featherless] parse failed:", err.message);
    return parseIncomingIntentLocal(rawInput, language);
  }
}

function parseIncomingIntentLocal(rawInput, language) {
  const text = rawInput.toLowerCase();
  let crop = null;
  if (/mahindi|maize|corn|kasooli/.test(text)) crop = "Maize";
  else if (/maharagwe|beans|ebijanjaalo/.test(text)) crop = "French Beans";
  else if (/nyanya|tomato|ennyaanya/.test(text)) crop = "Tomatoes";

  const acreMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:ekari|acre|acres|akaalo)/i) || text.match(/ekari\s*(\d+)/i);
  const volume_expectation = acreMatch ? Number(acreMatch[1]) : null;

  const chamaMatch = text.match(/chama\s+(\w+)/i);
  const group_name = chamaMatch ? chamaMatch[1] : null;

  const locations = [
    "naivasha", "nakuru", "garissa", "eldoret", "nyeri",
    "kampala", "mbale", "gulu", "mbarara", "masaka", "wakiso",
  ];
  const location = locations.find((l) => text.includes(l)) || null;

  return {
    crop,
    volume_expectation,
    group_name,
    location,
    confidence_score: crop || volume_expectation ? 0.72 : 0.4,
    provider: "KaLI Local Parser",
    language,
  };
}

export async function generateCreditNarrative(farmerData) {
  if (!ENABLED) {
    return generateMockNarrative(farmerData);
  }

  const prompt = buildPrompt(farmerData);

  try {
    const narrative = await chatCompletion(
      [
        {
          role: "system",
          content:
            "You are a credit risk assessment officer for KaLI, a graph-native agricultural lending platform in Kenya. Analyze farmer data and generate a concise, insightful credit narrative. Be specific about numbers. Respond in clear English. Max 4 sentences.",
        },
        { role: "user", content: prompt },
      ],
      { maxTokens: 300 },
    );

    return {
      narrative: narrative || generateMockNarrative(farmerData).narrative,
      model: FEATHERLESS_MODEL,
      provider: "Featherless AI",
    };
  } catch (err) {
    console.warn("[featherless] narrative failed:", err.message);
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

  const coopLine =
    deliveryYrs >= 3
      ? `${deliveryYrs}-year delivery history with ${coop} demonstrates reliable supply chain engagement`
      : deliveryYrs > 0
        ? `Emerging ${deliveryYrs}-year relationship with ${coop}`
        : "No verifiable cooperative delivery history";

  const chamaLine =
    chamaMos >= 18
      ? `${chamaMos} months of consistent chama savings show strong financial discipline`
      : chamaMos > 0
        ? `${chamaMos} months of chama savings`
        : "No chama savings history";

  const mpesaLine =
    mpesa >= 100000
      ? `M-Pesa inflows of KES ${mpesa.toLocaleString()} confirm substantive cash-based economic activity`
      : `Limited M-Pesa inflows of KES ${mpesa.toLocaleString()}`;

  const climateLine =
    spi <= -1.5
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

const FARMER_EXPLAINER_SYSTEM = `You are KaLI's farmer-facing explainability agent for eSusFarm smallholders.
You receive graph-based credit signals (scores, cooperative history, chama, climate).
NEVER mention SHAP, machine learning, algorithms, or model internals.
Write ONE short SMS in the requested language that explains WHY the score or decision is what it is.
For DECLINE or REFER: lead with the main reason lenders are cautious — use plain language from the top gap.
For APPROVED: confirm positively and briefly say what worked (e.g. co-op history).
Do NOT list step-by-step actions, bullet points, or a to-do checklist — those live on the My Readiness portal only.
You may end with "Steps on My Readiness" only if it fits within the character limit.
Max 155 characters. No quotes. Plain text only.`;

/**
 * Compress complex graph scoring into a localized ≤160 char farmer SMS (eSusFarm explainability).
 */
export async function generateFarmerExplainer(context, lang = "en", { maxChars = 160, channel = "readiness" } = {}) {
  const language = normalizeLang(lang);
  const langName = SUPPORTED_LANGS[language]?.featherless || "English";

  if (!ENABLED) {
    return mockFarmerExplainer(context, language, maxChars, channel);
  }

  const topDriver = context.drivers?.[0];
  const topDrag = context.drags?.[0];
  const stance = context.stance || context.band || "REFER";
  const score = context.unified?.canonical_score ?? context.aggregate_score ?? 0;

  const payload = `Language: ${langName}
Channel: ${channel}
Stance: ${stance}
Score: ${score}/100
Crop: ${context.crop_type || "unknown"}
Cooperative: ${context.cooperative || "none"}
Top strength: ${topDriver ? `${topDriver.label} — ${topDriver.detail || ""} (+${topDriver.points})` : "building history"}
Top gap (explain this in plain language): ${topDrag ? `${topDrag.label} — ${topDrag.detail || ""} (-${topDrag.points})` : "none critical"}
Climate SPI: ${context.climate?.spi ?? "n/a"}
Climate advisory: ${context.climate?.advisory || "none"}

Write the WHY-only SMS now. No action checklist.`;

  try {
    const raw = await chatCompletion(
      [
        { role: "system", content: FARMER_EXPLAINER_SYSTEM },
        { role: "user", content: payload },
      ],
      { maxTokens: 120, temperature: 0.35 },
    );

    const message = compressSms(raw, maxChars);
    return {
      message,
      actionHint: topDrag?.label || topDriver?.label || null,
      model: FEATHERLESS_MODEL,
      provider: "Featherless AI",
    };
  } catch (err) {
    console.warn("[featherless] farmer explainer failed:", err.message);
    return mockFarmerExplainer(context, language, maxChars, channel);
  }
}

function compressSms(text, max) {
  if (!text) return "";
  const cleaned = text.replace(/^["']|["']$/g, "").replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trim()}…`;
}

function plainWhyFromDrag(drag, lang) {
  if (!drag) {
    return lang === "sw"
      ? "taarifa za mkopo bado ni chache kwa wakopeshaji"
      : lang === "lg"
        ? "ebikwata ku ssente tebimala eri abawola"
        : "lenders still need more trust signals on your profile";
  }
  if (drag.detail) return drag.detail;
  const label = drag.label || "";
  const maps = {
    en: {
      "No cooperative history": "no verified co-op delivery history yet",
      "No collateral or substitute": "no collateral or chama substitute on file",
      "Climate stress": "climate stress in your zone affects repayment risk",
      "Low mobile money activity": "M-Pesa activity is too low for lenders to verify income",
      "Weak chama savings": "chama savings history is still short",
    },
    sw: {
      "No cooperative history": "hakuna historia ya usafirishaji kwa ushirika",
      "No collateral or substitute": "hakuna dhamana au chama kilichothibitishwa",
      "Climate stress": "hali ya hewa inaongeza hatari ya malipo",
      "Low mobile money activity": "M-Pesa haitoshi kuonyesha mapato",
      "Weak chama savings": "historia fupi ya akiba ya chama",
    },
    lg: {
      "No cooperative history": "tewali byafaayo by'okuwaayo ebirime mu kibiina",
      "No collateral or substitute": "tewali buwazizo oba chama eky'okwesiga",
      "Climate stress": "obudde obuzibu bukendeeza obwesige",
      "Low mobile money activity": "ensimbi ku ssimu ntono okulaga income",
      "Weak chama savings": "okutereka mu chama tekunnaba kumala",
    },
  };
  const bucket = maps[lang] || maps.en;
  return bucket[label] || label.toLowerCase();
}

function mockFarmerExplainer(context, lang, maxChars, channel = "readiness") {
  const score = context.unified?.canonical_score ?? context.aggregate_score ?? 50;
  const stance = context.stance || "REFER";
  const topDrag = context.drags?.[0];
  const topDriver = context.drivers?.[0];
  const why = plainWhyFromDrag(topDrag, lang);
  const strength = topDriver?.detail || topDriver?.label || "";
  const isDecision = channel === "decision";

  const templates = {
    en: {
      APPROVED: isDecision
        ? `KaLI: Approved (${score}/100). ${strength ? `Because ${strength.slice(0, 45)}.` : "Strong profile."} Disbursement next.`
        : `KaLI: ${score}/100 — ready. ${strength ? strength.slice(0, 50) : "Co-op history looks good."}`,
      DECLINE: isDecision
        ? `KaLI: Not approved (${score}/100). Main reason: ${why.slice(0, 55)}. Steps on My Readiness.`
        : `KaLI: ${score}/100 — not ready yet. Why: ${why.slice(0, 55)}. Steps on My Readiness.`,
      REFER: isDecision
        ? `KaLI: Under review (${score}/100). Why: ${why.slice(0, 55)}. We will SMS you soon.`
        : `KaLI: ${score}/100 — under review. Why: ${why.slice(0, 55)}. We will update you by SMS.`,
    },
    sw: {
      APPROVED: isDecision
        ? `KaLI: Imeidhinishwa (${score}/100). ${strength ? strength.slice(0, 40) : "Wasifu imara."} Malipo yanakuja.`
        : `KaLI: Alama ${score}/100 — uko tayari. ${strength ? strength.slice(0, 45) : "Historia ya ushirika nzuri."}`,
      DECLINE: isDecision
        ? `KaLI: Haijaidhinishwa (${score}/100). Sababu: ${why.slice(0, 48)}. Hatua kwenye My Readiness.`
        : `KaLI: Alama ${score}/100 — bado hauko tayari. Kwa nini: ${why.slice(0, 48)}. Hatua kwenye My Readiness.`,
      REFER: isDecision
        ? `KaLI: Inakaguliwa (${score}/100). Kwa nini: ${why.slice(0, 48)}. Tutakutumia SMS.`
        : `KaLI: Alama ${score}/100 — inakaguliwa. Kwa nini: ${why.slice(0, 48)}. Tutakujulisha kwa SMS.`,
    },
    lg: {
      APPROVED: isDecision
        ? `KaLI: Kkiriziddwa (${score}/100). ${strength ? strength.slice(0, 40) : "Profile nnungi."} Ensimbi ejja.`
        : `KaLI: Obubonero ${score}/100 — oli bulungi. ${strength ? strength.slice(0, 45) : "Eby'okukola mu kibiina birungi."}`,
      DECLINE: isDecision
        ? `KaLI: Tekikkiriziddwa (${score}/100). Ensonga: ${why.slice(0, 48)}. Emirimu ku My Readiness.`
        : `KaLI: Obubonero ${score}/100 — tonnaba. Lwaki: ${why.slice(0, 48)}. Emirimu ku My Readiness.`,
      REFER: isDecision
        ? `KaLI: Kikeberwa (${score}/100). Lwaki: ${why.slice(0, 48)}. Tujja kukusindika SMS.`
        : `KaLI: Obubonero ${score}/100 — kikeberwa. Lwaki: ${why.slice(0, 48)}. Tujja kukutegeeza.`,
    },
  };

  const bucket = stance === "APPROVED" ? "APPROVED" : stance === "DECLINE" ? "DECLINE" : "REFER";
  const langTemplates = templates[lang] || templates.sw || templates.en;
  const message = compressSms(langTemplates[bucket] || templates.en[bucket], maxChars);

  return {
    message,
    actionHint: topDrag?.label || null,
    model: "KaLI Local Explainer",
    provider: "KaLI Fallback",
  };
}

const READINESS_ACTIONS_SYSTEM = `You help smallholder farmers improve credit readiness on the My Readiness portal.
Output ONLY JSON: { "actions": ["step1", "step2", "step3"] }
Rules: max 3 actions, each under 90 characters, practical, encouraging, no ML jargon.
These are portal checklist items ONLY — never format as SMS text.
Language must match the user request exactly.`;

const KALI_VOICE_SYSTEM = `You are Kali, KaLI's voice assistant for East African smallholder farmers.
You speak warmly in the farmer's language: English, Kiswahili, Gikuyu, Dholuo, Kikamba, Somali, Sheng, or Luganda.
If greeted casually (hi, habari, moro), greet back by name then offer help with credit readiness, scores, or next steps.
Help them understand credit readiness, scores, and next actions from their profile.
NEVER mention SHAP, machine learning, algorithms, or model internals.
Keep replies to 2–4 short spoken sentences. Plain text only — no markdown, no quotes.`;

/** Conversational voice reply for the Kali readiness portal. */
export async function generateKaliVoiceReply(userMessage, lang = "en", context = {}) {
  const language = normalizeLang(lang);
  const langName = SUPPORTED_LANGS[language]?.featherless || "English";

  if (!ENABLED) {
    return mockKaliVoiceReply(userMessage, language, context);
  }

  const nextAction =
    context.actionPoints?.find((a) => !a.done)?.title ||
    context.macroAdvisory ||
    null;

  const payload = `Language: ${langName}
Farmer: ${context.farmerName || "farmer"}
Readiness score: ${context.score ?? "unknown"}/100
Status: ${context.label || context.stance || "building"}
Crop: ${context.crop || "mixed"}
Cooperative: ${context.cooperative || "none"}
Why message (SMS-style, no actions): ${context.whyMessage || context.headline || "none"}
Next portal action: ${nextAction || "see action list on My Readiness"}
Zone advisory: ${context.macroAdvisory || "none"}

Farmer asked: "${userMessage}"

Reply as Kali in ${langName}.`;

  try {
    const raw = await chatCompletion(
      [
        { role: "system", content: KALI_VOICE_SYSTEM },
        { role: "user", content: payload },
      ],
      { maxTokens: 180, temperature: 0.4 },
    );
    return raw.replace(/^["']|["']$/g, "").replace(/\s+/g, " ").trim();
  } catch (err) {
    console.warn("[featherless] kali voice failed:", err.message);
    return mockKaliVoiceReply(userMessage, language, context);
  }
}

function mockKaliVoiceReply(_message, lang, context) {
  const name = context.farmerName || "friend";
  const score = context.score ?? 50;
  const next = context.actionPoints?.find((a) => !a.done)?.title;
  const templates = {
    en: `Hello ${name}, your readiness score is ${score} out of 100. ${next ? `Your next step is: ${next}.` : "Keep delivering to your cooperative every season."} Ask me anything about your profile.`,
    sw: `Habari ${name}, alama yako ya uwezo wa mkopo ni ${score} kati ya 100. ${next ? `Hatua yako inayofuata: ${next}.` : "Endelea kusafirisha mazao kwa ushirika kila msimu."} Uliza chochote kuhusu wasifu wako.`,
    lg: `Oli ${name}, obubonero bwo okwesiga ssente bwe ${score} ku 100. ${next ? `Ekintu ekiddako: ${next}.` : "Sigala ng'owa ebirime mu kibiina buli sizoni."} Buuza ekintu kyonna ku by'okukola.`,
  };
  return templates[lang] || templates.sw || templates.en;
}

/** 2–3 digitized action points for the farmer readiness portal. */
export async function generateReadinessActions(context, lang = "en") {
  const language = normalizeLang(lang);
  const langName = SUPPORTED_LANGS[language]?.featherless || "English";

  if (!ENABLED) {
    return (context.drags || []).slice(0, 3).map((d) => d.detail || d.label);
  }

  const dragSummary = (context.drags || []).map((d) => d.label).join("; ") || "building history";
  const driverSummary = (context.drivers || []).map((d) => d.label).join("; ") || "none";

  try {
    const raw = await chatCompletion(
      [
        { role: "system", content: READINESS_ACTIONS_SYSTEM },
        {
          role: "user",
          content: `Language: ${langName}
Readiness score: ${context.unified?.canonical_score ?? context.aggregate_score}/100
Crop: ${context.crop_type || "mixed"}
Strengths: ${driverSummary}
Gaps: ${dragSummary}
Climate: SPI ${context.climate?.spi ?? "n/a"}`,
        },
      ],
      { json: true, maxTokens: 220, temperature: 0.35 },
    );
    const parsed = JSON.parse(raw);
    const actions = Array.isArray(parsed.actions) ? parsed.actions : [];
    return actions.filter(Boolean).slice(0, 3);
  } catch (err) {
    console.warn("[featherless] readiness actions failed:", err.message);
    return [];
  }
}
