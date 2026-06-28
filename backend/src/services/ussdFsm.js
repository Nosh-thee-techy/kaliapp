import { USSD_LANG_MENU, langFromUssdStep, normalizeLang } from "../config/languages.js";
import { USSD_SHORTCODE } from "../config/ussd.js";
import { calculateGraphScore } from "./scoringEngine.js";
import { routeExplainability } from "./explainabilityService.js";
import { handleLoanApplicationWorkflow } from "./underwriterAgent.js";
import { recordSmsSent } from "./farmerService.js";
import { getUssdSession, saveUssdSession, clearUssdSession } from "./ussdSessionStore.js";

/** @typedef {'AWAIT_LANG'|'MAIN'|'APPLY_COOP'|'APPLY_ACREAGE'|'APPLY_NID'|'APPLY_COOP_NEW'|'APPLY_ACREAGE_NEW'|'CHECK_NID'} UssdState */

function restartHint(lang) {
  return lang === "sw"
    ? `END Muda umeisha au chaguo batili. Piga ${USSD_SHORTCODE} kuanza upya.`
    : lang === "lg"
      ? `END Obudde buwedde oba okulondamu tekikola. Ddamu ${USSD_SHORTCODE}.`
      : `END Session expired or invalid. Dial ${USSD_SHORTCODE} to restart.`;
}

function mainMenu(lang, firstName, known) {
  const name = firstName || (lang === "sw" ? "mkulima" : lang === "lg" ? "omulimi" : "farmer");
  if (known) {
    if (lang === "lg") {
      return (
        "CON KaLI Core Engine\n" +
        `Nkulamusizza, ${name}.\n` +
        "1. Saba Ebbanja\n2. Kebera Embeera\n3. Obubaka bw'Obudde\n4. Nnannyonnyola Obubonero\n0. Fuluma"
      );
    }
    if (lang === "sw") {
      return (
        "CON KaLI Core Engine\n" +
        `Karibu, ${name}.\n` +
        "1. Omba Mkopo wa Pembejeo\n2. Angalia Hali ya Mkopo\n3. Ushauri wa Hali ya Hewa\n4. Eleza Alama Yangu\n0. Toka"
      );
    }
    return (
      "CON KaLI Core Engine\n" +
      `Welcome, ${name}.\n` +
      "1. Request Input Credit\n2. Check Loan Status\n3. Climate Advisory\n4. Explain My Score\n0. Exit"
    );
  }
  return lang === "sw"
    ? "CON KaLI Core Engine\nKaribu.\n1. Jisajili kupitia Ushirika\n2. Angalia Hali\n0. Toka"
    : "CON KaLI Core Engine\nWelcome.\n1. Register via Cooperative\n2. Check Status\n0. Exit";
}

function triggerIngest(payload) {
  handleLoanApplicationWorkflow(payload).catch((err) => {
    console.error("[ussd→ingest]", err);
  });
}

async function deliverSms(lookup, body, category = "explainability") {
  if (!lookup || !body) return;
  try {
    await recordSmsSent(lookup, { body, category });
  } catch (err) {
    console.warn("[ussd→sms]", err.message);
  }
}

async function explainAndReply(lookup, lang) {
  const result = await routeExplainability(lookup, lang, { channel: "ussd", skipOfficer: true });
  if (!result?.ok) {
    return lang === "lg" ? "END Tewali kukubisa." : lang === "sw" ? "END Hakuna rekodi." : "END No record found.";
  }
  await deliverSms(lookup, result.farmer.sms);
  return `END ${result.farmer.sms}`;
}

function createSession(sessionId, phoneNumber, farmer) {
  return {
    state: "AWAIT_LANG",
    lang: "sw",
    phone: phoneNumber,
    farmerId: farmer?.id || null,
    nationalId: farmer?.national_id || null,
    farmerName: farmer?.name?.split(" ")[0] || null,
    known: Boolean(farmer),
    draft: {},
  };
}

/**
 * Redis-backed finite state machine for USSD (30 min TTL on session store).
 * @param {{ sessionId: string, phoneNumber: string, text?: string, farmer: object|null }} ctx
 */
export async function runUssdFsm({ sessionId, phoneNumber, text, farmer }) {
  const segments = text ? text.split("*").filter(Boolean) : [];
  const input = segments.length ? segments[segments.length - 1] : null;
  const isFreshDial = segments.length === 0;

  if (isFreshDial) {
    await clearUssdSession(sessionId);
    return USSD_LANG_MENU;
  }

  let session = await getUssdSession(sessionId);

  // Stale telco payload without matching session — force safe restart
  if (!session && segments.length > 1) {
    return restartHint("sw");
  }

  if (!session) {
    session = createSession(sessionId, phoneNumber, farmer);
  }

  const lang = normalizeLang(session.lang);
  const known = session.known;
  const lookup = session.farmerId || session.nationalId;

  try {
    switch (session.state) {
      case "AWAIT_LANG": {
        session.lang = langFromUssdStep(input);
        session.state = "MAIN";
        await saveUssdSession(sessionId, session);
        return mainMenu(session.lang, session.farmerName, known);
      }

      case "MAIN": {
        if (input === "0") {
          await clearUssdSession(sessionId);
          return lang === "sw" ? "END Asante. KaLI — Kilimo Loans." : "END Thank you. KaLI — Kilimo Loans.";
        }

        if (input === "1") {
          if (known) {
            session.state = "APPLY_COOP";
            await saveUssdSession(sessionId, session);
            return lang === "sw"
              ? "CON Ingiza Msimbo wa Ushirika (mf. COOP-NVS-04):"
              : "CON Enter Cooperative Code (e.g. COOP-NVS-04):";
          }
          session.state = "APPLY_NID";
          await saveUssdSession(sessionId, session);
          return lang === "sw" ? "CON Ingiza Nambari ya Kitambulisho:" : "CON Enter your National ID:";
        }

        if (input === "2") {
          if (known && lookup) {
            await clearUssdSession(sessionId);
            return explainAndReply(lookup, lang);
          }
          session.state = "CHECK_NID";
          await saveUssdSession(sessionId, session);
          return lang === "sw" ? "CON Ingiza Kitambulisho:" : "CON Enter National ID:";
        }

        if (input === "3") {
          if (known && lookup) {
            const result = await calculateGraphScore(lookup);
            const adv = result?.climate?.advisory || (lang === "sw" ? "Hakuna ushauri." : "No advisories.");
            await clearUssdSession(sessionId);
            return `END ${adv}`;
          }
          session.state = "CHECK_NID";
          session.draft = { ...session.draft, intent: "climate" };
          await saveUssdSession(sessionId, session);
          return lang === "sw" ? "CON Ingiza Kitambulisho:" : "CON Enter National ID:";
        }

        if (input === "4" && known && lookup) {
          await clearUssdSession(sessionId);
          return explainAndReply(lookup, lang);
        }

        await clearUssdSession(sessionId);
        return restartHint(lang);
      }

      case "APPLY_COOP": {
        session.draft.coopCode = input;
        session.state = "APPLY_ACREAGE";
        await saveUssdSession(sessionId, session);
        return lang === "sw"
          ? "CON Ingiza Ekari na Mazao (mf. 2*Mahindi):"
          : "CON Enter Acreage & Crop (e.g. 2*Maize):";
      }

      case "APPLY_ACREAGE": {
        const parts = input.split("*");
        const acreage = Number(parts[0]) || 1;
        const cropType = parts[1] || "Maize";
        triggerIngest({
          channel: "ussd",
          phone: phoneNumber,
          lang,
          nationalId: session.nationalId,
          coopCode: session.draft.coopCode,
          acreage,
          cropType,
          text: `${cropType} ekari ${acreage} ${session.draft.coopCode}`,
        });
        await clearUssdSession(sessionId);
        return lang === "sw"
          ? "END Takwimu zinakusanywa.\nUtapokea SMS hivi punde."
          : "END Metrics compiling.\nYou will receive an SMS breakdown shortly.";
      }

      case "APPLY_NID": {
        session.draft.nationalId = input;
        session.state = "APPLY_COOP_NEW";
        await saveUssdSession(sessionId, session);
        return lang === "sw" ? "CON Ingiza Msimbo wa Ushirika:" : "CON Enter Cooperative Code:";
      }

      case "APPLY_COOP_NEW": {
        session.draft.coopCode = input;
        session.state = "APPLY_ACREAGE_NEW";
        await saveUssdSession(sessionId, session);
        return lang === "sw"
          ? "CON Ingiza Ekari na Mazao (mf. 2*Mahindi):"
          : "CON Enter Acreage & Crop (e.g. 2*Maize):";
      }

      case "APPLY_ACREAGE_NEW": {
        const parts = input.split("*");
        const acreage = Number(parts[0]) || 1;
        const cropType = parts[1] || "Maize";
        triggerIngest({
          channel: "ussd",
          phone: phoneNumber,
          lang,
          nationalId: session.draft.nationalId,
          coopCode: session.draft.coopCode,
          acreage,
          cropType,
          text: `${cropType} ekari ${acreage} ${session.draft.coopCode}`,
        });
        await clearUssdSession(sessionId);
        return lang === "sw"
          ? "END Takwimu zinakusanywa.\nUtapokea SMS hivi punde."
          : "END Metrics compiling.\nYou will receive an SMS breakdown shortly.";
      }

      case "CHECK_NID": {
        if (session.draft?.intent === "climate") {
          const result = await calculateGraphScore(input);
          const adv = result?.climate?.advisory || (lang === "sw" ? "Hakuna ushauri." : "No advisories.");
          await clearUssdSession(sessionId);
          return `END ${adv}`;
        }
        await clearUssdSession(sessionId);
        return explainAndReply(input, lang);
      }

      default:
        await clearUssdSession(sessionId);
        return restartHint(lang);
    }
  } catch (err) {
    console.error("[ussd-fsm]", err);
    await clearUssdSession(sessionId);
    return "END System temporarily unavailable. Try again later.";
  }
}
