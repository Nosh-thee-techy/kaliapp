import { normalizeRole, ROLES } from "../config/roles.js";

export function requireAgronomist(req, res, next) {
  const role = normalizeRole(req.officer?.role);
  if (role !== ROLES.AGRONOMIST) {
    return res.status(403).json({ error: "Field Intelligence access requires an agronomist account" });
  }
  next();
}

export function requireBranchOfficer(req, res, next) {
  const role = normalizeRole(req.officer?.role);
  if (role === ROLES.AGRONOMIST) {
    return res.status(403).json({ error: "Branch portal access is not available for agronomist accounts" });
  }
  next();
}
