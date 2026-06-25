/**
 * Africa's Talking integration — USSD callback + outbound SMS.
 * Set AT_API_KEY, AT_USERNAME, AT_SENDER_ID in .env to enable live delivery.
 * @see https://africastalking.com
 */

const ENABLED = Boolean(process.env.AT_API_KEY && process.env.AT_USERNAME);

export function isAfricasTalkingEnabled() {
  return ENABLED;
}

/**
 * Send SMS via Africa's Talking REST API (sandbox or production).
 */
export async function sendSms({ to, message }) {
  if (!ENABLED) {
    console.log(`[africas-talking:stub] SMS → ${to}: ${message}`);
    return { status: "stub", to, message };
  }

  const username = process.env.AT_USERNAME;
  const apiKey = process.env.AT_API_KEY;
  const from = process.env.AT_SENDER_ID || "KaLI";

  const body = new URLSearchParams({
    username,
    to,
    message,
    from,
  });

  const base =
    process.env.AT_ENV === "production"
      ? "https://api.africastalking.com/version1/messaging"
      : "https://api.sandbox.africastalking.com/version1/messaging";

  const res = await fetch(base, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      apiKey,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Africa's Talking SMS failed: ${res.status} ${text}`);
  }

  return res.json();
}

/**
 * Parse Africa's Talking USSD webhook body (form-encoded or JSON).
 * AT sends: sessionId, phoneNumber, text, serviceCode
 */
export function parseAfricasTalkingUssd(req) {
  const body = req.body || {};
  return {
    phoneNumber: body.phoneNumber || body.msisdn || "",
    text: body.text ?? "",
    sessionId: body.sessionId || body.session_id,
    serviceCode: body.serviceCode || body.service_code,
  };
}
