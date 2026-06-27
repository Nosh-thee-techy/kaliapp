const MASUMI_ENABLED = process.env.MASUMI_API_KEY ? true : false;

const MASUMI_BASE = process.env.MASUMI_API_URL || "https://api.masumi.network/v1";

export function isMasumiEnabled() {
  return MASUMI_ENABLED;
}

/** Masumi workflow state transition (live API or stub log). */
export async function transitionAgentState(applicationId, state, meta = {}) {
  const payload = {
    applicationId,
    state,
    agentId: process.env.MASUMI_AGENT_ID || "kali-underwriter-agent",
    timestamp: new Date().toISOString(),
    ...meta,
  };

  if (!MASUMI_ENABLED) {
    console.log(`[masumi:stub] ${applicationId} → ${state}`, meta);
    return { ok: true, stub: true, ...payload };
  }

  try {
    const res = await fetch(`${MASUMI_BASE}/agents/workflow/transition`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MASUMI_API_KEY}`,
        "X-Agent-Id": process.env.MASUMI_AGENT_ID || "kali-underwriter-agent",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn("[masumi] transition failed:", res.status, text);
      return { ok: false, ...payload, error: text };
    }

    const data = await res.json();
    return { ok: true, ...payload, ...data };
  } catch (err) {
    console.warn("[masumi] transition error:", err.message);
    return { ok: false, ...payload, error: err.message };
  }
}

export async function createMasumiPaymentIntent({ farmerId, farmerName, amount, currency = "KES", officerId, loanId }) {
  if (!MASUMI_ENABLED) {
    console.log(`[masumi:stub] Payment intent created (STUB):
  Amount: ${amount} ${currency}
  Recipient: ${farmerName} (${farmerId})
  Officer: ${officerId}
  Loan ref: ${loanId}
  Status: pending_disbursement`);

    return {
      ok: true,
      paymentId: `MASUMI-${Date.now().toString(36).toUpperCase()}`,
      status: "pending_disbursement",
      amount,
      currency,
      recipient: farmerName,
      farmerId,
      loanId,
      provider: "Masumi Payment Network (STUB)",
      note: "Configure MASUMI_API_KEY and MASUMI_API_URL in .env for live disbursement",
    };
  }

  try {
    const res = await fetch(`${MASUMI_BASE}/payments/intent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MASUMI_API_KEY}`,
        "X-Agent-Id": process.env.MASUMI_AGENT_ID || "kali-branch-agent",
      },
      body: JSON.stringify({
        amount,
        currency,
        recipientId: farmerId,
        reference: loanId,
        description: `Loan disbursement to ${farmerName} via KaLI graph scoring`,
        metadata: {
          officerId,
          farmerId,
          loanId,
          platform: "KaLI",
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Masumi API error: ${res.status} ${text}`);
    }

    const data = await res.json();
    return {
      ok: true,
      paymentId: data.paymentId || data.id,
      status: data.status || "pending",
      amount,
      currency,
      recipient: farmerName,
      farmerId,
      loanId,
      provider: "Masumi Payment Network",
    };
  } catch (err) {
    console.error("[masumi] Disbursement failed:", err.message);
    return {
      ok: false,
      error: err.message,
      farmerId,
      loanId,
      provider: "Masumi Payment Network",
    };
  }
}
