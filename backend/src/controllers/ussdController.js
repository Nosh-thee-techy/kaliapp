import { findFarmerByPhone } from "../services/farmerService.js";
import { parseAfricasTalkingUssd } from "../services/africasTalking.js";
import { runUssdFsm } from "../services/ussdFsm.js";
import { handleLoanApplicationWorkflow } from "../services/underwriterAgent.js";

export async function handleUssd(req, res) {
  const parsed = parseAfricasTalkingUssd(req);
  let text = parsed.text;
  if (text === "") text = undefined;

  const phoneNumber = parsed.phoneNumber || req.body?.phoneNumber || "";
  const sessionId = parsed.sessionId || phoneNumber || "local";

  try {
    const farmer = phoneNumber ? await findFarmerByPhone(phoneNumber) : null;
    const response = await runUssdFsm({
      sessionId,
      phoneNumber,
      text,
      farmer,
    });
    res.set("Content-Type", "text/plain");
    res.send(response);
  } catch (error) {
    console.error("[ussd]", error);
    res.set("Content-Type", "text/plain");
    res.send("END System temporarily unavailable. Try again later.");
  }
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
