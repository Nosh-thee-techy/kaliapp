import { calculateGraphScore } from "../services/scoringEngine.js";
import {
  registerFarmerFromUssd,
  findFarmerByPhone,
} from "../services/farmerService.js";
import { parseAfricasTalkingUssd } from "../services/africasTalking.js";

/**
 * USSD handler — used by:
 * - Browser simulator (JSON body)
 * - Africa's Talking webhook (form-encoded: sessionId, phoneNumber, text, serviceCode)
 */
export async function handleUssd(req, res) {
  const parsed = parseAfricasTalkingUssd(req);
  let text = parsed.text;
  if (text === "") text = undefined;
  const phoneNumber = parsed.phoneNumber || req.body?.phoneNumber || "";
  const steps = text ? text.split("*").filter(Boolean) : [];
  let response = "";

  try {
    const known = phoneNumber ? await findFarmerByPhone(phoneNumber) : null;

    if (!text) {
      if (known) {
        response =
          "CON KaLI Core Engine\n" +
          `Karibu, ${known.name?.split(" ")[0] || "farmer"}.\n` +
          "1. Request Input Credit\n" +
          "2. Check Loan Status\n" +
          "3. Climate Advisory\n" +
          "0. Exit";
      } else {
        response =
          "CON KaLI Core Engine\n" +
          "Welcome. Register or check status.\n" +
          "1. Register via Cooperative ID\n" +
          "2. Check Loan Status (enter ID)\n" +
          "0. Exit";
      }
    } else if (steps[0] === "0") {
      response = "END Asante. KaLI — Kilimo Loans.";
    } else if (steps[0] === "1" && known && steps.length === 1) {
      response = "CON Enter Cooperative Code (e.g. COOP-NVS-04):";
    } else if (steps[0] === "1" && known && steps.length === 2) {
      response = "CON Enter Acreage & Crop (e.g. 2*Maize):";
    } else if (steps[0] === "1" && known && steps.length >= 3) {
      const coopCode = steps[1];
      const acreageCrop = steps[2].split("*");
      await registerFarmerFromUssd({
        nationalId: known.national_id,
        phoneNumber,
        coopCode,
        acreage: acreageCrop[0],
        cropType: acreageCrop[1] || "Maize",
      });
      response =
        "END Metrics compiling.\n" +
        "You will receive an SMS breakdown shortly.\n" +
        "Your request is in the branch queue.";
    } else if (steps[0] === "1" && !known && steps.length === 1) {
      response = "CON Enter your National ID number:";
    } else if (steps[0] === "1" && !known && steps.length === 2) {
      response = "CON Enter Cooperative Code (e.g. COOP-NSH-01):";
    } else if (steps[0] === "1" && !known && steps.length === 3) {
      response = "CON Enter Acreage & Crop (e.g. 2*French Beans):";
    } else if (steps[0] === "1" && !known && steps.length >= 4) {
      const nationalId = steps[1];
      const coopCode = steps[2];
      const acreageCrop = steps[3].split("*");
      await registerFarmerFromUssd({
        nationalId,
        phoneNumber,
        coopCode,
        acreage: acreageCrop[0],
        cropType: acreageCrop[1] || "Maize",
      });
      response =
        "END Metrics compiling.\n" +
        "You will receive an SMS breakdown shortly.\n" +
        "Your application is now in the branch queue.";
    } else if (steps[0] === "2" && known && steps.length === 1) {
      const result = await calculateGraphScore(known.id || known.national_id);
      if (!result) {
        response = "END No application found for your number.";
      } else {
        const stance =
          result.aggregate_score >= 65 ? "APPROVED" : result.aggregate_score >= 50 ? "REFER" : "DECLINE";
        response =
          `END Name: ${result.name}\n` +
          `Status: ${result.status}\n` +
          `KaLI Score: ${result.aggregate_score}/100\n` +
          `Stance: ${stance}\n` +
          `Key Flag: ${result.drivers[0]?.label || result.drags[0]?.label || "Baseline Context"}`;
      }
    } else if (steps[0] === "2" && steps.length === 1) {
      response = "CON Enter Farmer National ID:";
    } else if (steps[0] === "2" && steps.length >= 2) {
      const nationalId = steps[1];
      const result = await calculateGraphScore(nationalId);
      if (!result) {
        response = "END System Error: No matching cooperative registry found.";
      } else {
        const stance =
          result.aggregate_score >= 65 ? "APPROVED" : result.aggregate_score >= 50 ? "REFER" : "DECLINE";
        response =
          `END Name: ${result.name}\n` +
          `KaLI Score: ${result.aggregate_score}/100\n` +
          `Stance: ${stance}\n` +
          `Key Flag: ${result.drivers[0]?.label || result.drags[0]?.label || "Baseline Context"}`;
      }
    } else if (steps[0] === "3" && steps.length === 1) {
      if (!known) {
        response = "CON Enter National ID for climate zone lookup:";
      } else {
        const result = await calculateGraphScore(known.id || known.national_id);
        const adv = result?.climate?.advisory || "No active advisories in your zone.";
        response = `END Climate Advisory:\n${adv}`;
      }
    } else if (steps[0] === "3" && steps.length >= 2) {
      const result = await calculateGraphScore(steps[1]);
      const adv = result?.climate?.advisory || "No active advisories in your zone.";
      response = `END Climate Advisory:\n${adv}`;
    } else {
      response = "END Invalid selection. Dial *483*100# to restart.";
    }
  } catch (error) {
    console.error("[ussd]", error);
    response = "END System temporarily unavailable. Try again later.";
  }

  res.set("Content-Type", "text/plain");
  res.send(response);
}
