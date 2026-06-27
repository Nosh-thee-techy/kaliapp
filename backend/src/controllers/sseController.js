import { subscribeSse, activeSubscriberCount } from "../services/eventBus.js";
import { verifyOfficerToken } from "../services/jwtService.js";

/**
 * SSE stream for officer dashboard — map pin live updates.
 * EventSource cannot send Authorization header; pass ?token=JWT
 */
export async function getEventStream(req, res) {
  const token = req.query.token || (req.headers.authorization || "").replace(/^Bearer\s+/i, "");

  if (!token) {
    return res.status(401).json({ error: "token query param required for SSE" });
  }

  try {
    verifyOfficerToken(token);
  } catch {
    return res.status(401).json({ error: "invalid token" });
  }

  subscribeSse(res);

  const heartbeat = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
    } catch {
      clearInterval(heartbeat);
    }
  }, 25000);

  res.on("close", () => clearInterval(heartbeat));
}

export function getEventStreamStatus(_req, res) {
  return res.json({
    subscribers: activeSubscriberCount(),
    events: ["application_updated", "map_pin_updated"],
  });
}
