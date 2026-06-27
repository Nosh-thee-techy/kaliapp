import { calculateGraphScore } from "../services/scoringEngine.js";
import { findFarmerByPhone } from "../services/farmerService.js";
import { parseAfricasTalkingUssd } from "../services/africasTalking.js";
import { handleLoanApplicationWorkflow } from "../services/underwriterAgent.js";

const sessionLang = new Map();

function getLang(sessionId, steps) {
  if (steps?.[0] === "2") return "sw";
  if (steps?.[0] === "1") return "en";
  return sessionLang.get(sessionId) || "sw";
}

function setLang(sessionId, lang) {
  if (sessionId) sessionLang.set(sessionId, lang);
}

function triggerIngestWorkflow(payload) {
  handleLoanApplicationWorkflow(payload).catch((err) => {
    console.error("[ussd→ingest]", err);
  });
}

export async function handleUssd(req, res) {
  const parsed = parseAfricasTalkingUssd(req);
  let text = parsed.text;
  if (text === "") text = undefined;
  const phoneNumber = parsed.phoneNumber || req.body?.phoneNumber || "";
  const sessionId = parsed.sessionId || phoneNumber || "local";
  const steps = text ? text.split("*").filter(Boolean) : [];
  let response = "";

  try {
    const known = phoneNumber ? await findFarmerByPhone(phoneNumber) : null;

    if (!text) {
      response =
        "CON KaLI Core Engine\n" +
        "Chagua Lugha / Select Language\n" +
        "1. English\n" +
        "2. Kiswahili";
    } else if (steps.length === 1) {
      setLang(sessionId, steps[0] === "2" ? "sw" : "en");
      const L = getLang(sessionId, steps);
      if (known) {
        response =
          L === "sw"
            ? "CON KaLI Core Engine\n" +
              `Karibu, ${known.name?.split(" ")[0] || "mkulima"}.\n` +
              "1. Omba Mkopo wa Pembejeo\n" +
              "2. Angalia Hali ya Mkopo\n" +
              "3. Ushauri wa Hali ya Hewa\n" +
              "0. Toka"
            : "CON KaLI Core Engine\n" +
              `Welcome, ${known.name?.split(" ")[0] || "farmer"}.\n` +
              "1. Request Input Credit\n" +
              "2. Check Loan Status\n" +
              "3. Climate Advisory\n" +
              "0. Exit";
      } else {
        response =
          L === "sw"
            ? "CON KaLI Core Engine\nKaribu.\n1. Jisajili kupitia Ushirika\n2. Angalia Hali\n0. Toka"
            : "CON KaLI Core Engine\nWelcome.\n1. Register via Cooperative\n2. Check Status\n0. Exit";
      }
    } else {
      const lang = getLang(sessionId, steps);
      const menu = steps[1];

      if (menu === "0") {
        response = lang === "sw" ? "END Asante. KaLI — Kilimo Loans." : "END Thank you. KaLI — Kilimo Loans.";
      } else if (menu === "1" && known && steps.length === 3) {
        response =
          lang === "sw"
            ? "CON Ingiza Msimbo wa Ushirika (mf. COOP-NVS-04):"
            : "CON Enter Cooperative Code (e.g. COOP-NVS-04):";
      } else if (menu === "1" && known && steps.length === 4) {
        response =
          lang === "sw"
            ? "CON Ingiza Ekari na Mazao (mf. 2*Mahindi):"
            : "CON Enter Acreage & Crop (e.g. 2*Maize):";
      } else if (menu === "1" && known && steps.length >= 5) {
        const coopCode = steps[2];
        const acreageCrop = steps[3].split("*");
        triggerIngestWorkflow({
          channel: "ussd",
          phone: phoneNumber,
          lang,
          nationalId: known.national_id,
          coopCode,
          acreage: Number(acreageCrop[0]) || 1,
          cropType: acreageCrop[1] || "Maize",
          text: `${acreageCrop[1] || "Maize"} ekari ${acreageCrop[0]} ${coopCode}`,
        });
        response =
          lang === "sw"
            ? "END Takwimu zinakusanywa.\nUtapokea SMS hivi punde."
            : "END Metrics compiling.\nYou will receive an SMS breakdown shortly.";
      } else if (menu === "1" && !known && steps.length === 3) {
        response =
          lang === "sw" ? "CON Ingiza Nambari ya Kitambulisho:" : "CON Enter your National ID:";
      } else if (menu === "1" && !known && steps.length === 4) {
        response =
          lang === "sw"
            ? "CON Ingiza Msimbo wa Ushirika:"
            : "CON Enter Cooperative Code:";
      } else if (menu === "1" && !known && steps.length === 5) {
        response =
          lang === "sw"
            ? "CON Ingiza Ekari na Mazao (mf. 2*Mahindi):"
            : "CON Enter Acreage & Crop (e.g. 2*Maize):";
      } else if (menu === "1" && !known && steps.length >= 6) {
        const nationalId = steps[2];
        const coopCode = steps[3];
        const acreageCrop = steps[4].split("*");
        triggerIngestWorkflow({
          channel: "ussd",
          phone: phoneNumber,
          lang,
          nationalId,
          coopCode,
          acreage: Number(acreageCrop[0]) || 1,
          cropType: acreageCrop[1] || "Maize",
          text: `${acreageCrop[1] || "Maize"} ekari ${acreageCrop[0]} ${coopCode}`,
        });
        response =
          lang === "sw"
            ? "END Takwimu zinakusanywa.\nUtapokea SMS hivi punde."
            : "END Metrics compiling.\nYou will receive an SMS breakdown shortly.";
      } else if (menu === "2" && known && steps.length === 2) {
        const result = await calculateGraphScore(known.id || known.national_id);
        if (!result) {
          response = lang === "sw" ? "END Hakuna ombi." : "END No application found.";
        } else {
          const stance =
            result.aggregate_score >= 65 ? "APPROVED" : result.aggregate_score >= 50 ? "REFER" : "DECLINE";
          response = `END KaLI Score: ${result.aggregate_score}/100\n${stance}`;
        }
      } else if (menu === "2" && steps.length === 3) {
        response =
          lang === "sw" ? "CON Ingiza Kitambulisho:" : "CON Enter National ID:";
      } else if (menu === "2" && steps.length >= 4) {
        const result = await calculateGraphScore(steps[3]);
        if (!result) {
          response = lang === "sw" ? "END Hakuna rekodi." : "END No matching registry.";
        } else {
          const stance =
            result.aggregate_score >= 65 ? "APPROVED" : result.aggregate_score >= 50 ? "REFER" : "DECLINE";
          response = `END ${result.name}\nScore: ${result.aggregate_score}/100\n${stance}`;
        }
      } else if (menu === "3" && known && steps.length === 2) {
        const result = await calculateGraphScore(known.id || known.national_id);
        const adv = result?.climate?.advisory || (lang === "sw" ? "Hakuna ushauri." : "No advisories.");
        response = `END ${adv}`;
      } else if (menu === "3" && steps.length >= 3) {
        const result = await calculateGraphScore(steps[3] || steps[2]);
        const adv = result?.climate?.advisory || (lang === "sw" ? "Hakuna ushauri." : "No advisories.");
        response = `END ${adv}`;
      } else {
        response =
          lang === "sw"
            ? "END Chaguo batili. Piga *483*100# kuanza upya."
            : "END Invalid selection. Dial *483*100# to restart.";
      }
    }
  } catch (error) {
    console.error("[ussd]", error);
    response = "END System temporarily unavailable. Try again later.";
  }

  res.set("Content-Type", "text/plain");
  res.send(response);
}

export async function handleVoiceIngest(req, res) {
  try {
    const { phone, transcript, lang = "sw" } = req.body;
    if (!phone || !transcript) {
      return res.status(400).json({ error: "phone and transcript are required" });
    }
    const result = await handleLoanApplicationWorkflow({
      channel: "voice",
      phone,
      text: transcript,
      lang,
    });
    return res.status(result.ok ? 200 : 422).json(result);
  } catch (error) {
    console.error("[voice]", error);
    return res.status(500).json({ error: error.message });
  }
}
