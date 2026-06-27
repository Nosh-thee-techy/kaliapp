import { createFileRoute } from "@tanstack/react-router";

const API_BASE = process.env.VITE_API_CORE_URL || "http://localhost:4000";

async function proxyToBackend(body: string, contentType: string): Promise<Response | null> {
  try {
    const res = await fetch(`${API_BASE}/ussd/callback`, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body,
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return new Response(await res.text(), { headers: { "Content-Type": "text/plain" } });
  } catch {
    /* backend unreachable — fall through to standalone handler */
  }
  return null;
}

function standaloneHandler(phoneNumber: string, text: string): string {
  const steps = text ? text.split("*").filter(Boolean) : [];

  if (!text) {
    return (
      "CON KaLI Core Engine\n" +
      "Karibu. Registers farmers & scores loans.\n" +
      "1. Register for Input Credit\n" +
      "2. Check Loan Status\n" +
      "3. Climate Advisory\n" +
      "0. Exit"
    );
  }

  if (steps[0] === "0") return "END Asante. KaLI — Kilimo Loans.";

  if (steps[0] === "1" && steps.length === 1) return "CON Enter your National ID number:";
  if (steps[0] === "1" && steps.length === 2) return "CON Enter Cooperative Code (e.g. COOP-NSH-01):";
  if (steps[0] === "1" && steps.length === 3) return "CON Enter Acreage & Crop (e.g. 2*Maize):";
  if (steps[0] === "1" && steps.length >= 4) {
    return (
      "END Registration submitted.\n" +
      "You will receive an SMS with your KaLI score.\n" +
      "Your application is in the branch queue."
    );
  }

  if (steps[0] === "2" && steps.length === 1) return "CON Enter Farmer National ID:";
  if (steps[0] === "2" && steps.length >= 2) {
    const id = steps[1];
    return (
      `END KaLI Score for ID ${id}:\n` +
      `Status: Ready for Review\n` +
      `Score: 78/100\n` +
      `Stance: APPROVED\n` +
      `Key Flag: Strong cooperative history\n\n` +
      `Reply with "HELP" to speak to an officer.`
    );
  }

  if (steps[0] === "3" && steps.length === 1) return "CON Enter National ID for climate zone lookup:";
  if (steps[0] === "3" && steps.length >= 2) {
    return (
      "END Climate Advisory for your zone:\n" +
      "Rainfall: Below average (SPI -1.2)\n" +
      "Pest Alert: Fall armyworm reported 18km NE\n" +
      "Advisory: Scout maize plots within 72h.\n" +
      "Next expected rain: 5-7 days."
    );
  }

  return "END Invalid selection. Dial *483# to restart.";
}

export const Route = createFileRoute("/api/ussd-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const contentType = request.headers.get("content-type") || "";
        const body = await request.text();

        let phoneNumber = "";
        let text = "";

        if (contentType.includes("application/json")) {
          try {
            const json = JSON.parse(body);
            phoneNumber = json.phoneNumber || json.msisdn || "";
            text = json.text ?? "";
          } catch {
            /* fall through */
          }
        } else {
          const params = new URLSearchParams(body);
          phoneNumber = params.get("phoneNumber") || params.get("msisdn") || "";
          text = params.get("text") ?? "";
        }

        const proxied = await proxyToBackend(body, contentType);
        if (proxied) return proxied;

        const response = standaloneHandler(phoneNumber, text);
        return new Response(response, {
          headers: { "Content-Type": "text/plain" },
        });
      },
    },
  },
});
