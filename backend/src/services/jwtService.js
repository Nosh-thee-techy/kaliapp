import jwt from "jsonwebtoken";
import { normalizeRole, ROLES } from "../config/roles.js";

const JWT_SECRET = process.env.JWT_SECRET || "kali-dev-jwt-secret-change-in-production";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "8h";

export function signOfficerToken(officer) {
  const role = normalizeRole(officer.role);
  return jwt.sign(
    {
      sub: officer.email,
      name: officer.name,
      email: officer.email,
      branch: officer.branch || "Naivasha",
      role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES },
  );
}

export function verifyOfficerToken(token) {
  const payload = jwt.verify(token, JWT_SECRET);
  return {
    email: payload.email,
    name: payload.name,
    branch: payload.branch,
    role: normalizeRole(payload.role),
  };
}

export { ROLES };
