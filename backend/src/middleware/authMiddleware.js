import { verifyOfficerToken } from "../services/jwtService.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    req.officer = verifyOfficerToken(header.slice(7));
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}
