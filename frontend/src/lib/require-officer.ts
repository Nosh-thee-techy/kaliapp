import { redirect } from "@tanstack/react-router";
import { getOfficer } from "./officer-session";
import { homeRouteForRole, isAgronomist } from "./roles";

/** Redirect to /auth when no JWT is stored (client-side navigation guard). */
export function requireOfficerSession() {
  if (typeof window === "undefined") return;
  if (!getOfficer()?.token) {
    throw redirect({ to: "/auth" });
  }
}

/** Branch portal only — agronomists go to Field Intelligence. */
export function requireBranchOfficerSession() {
  requireOfficerSession();
  const officer = getOfficer();
  if (officer && isAgronomist(officer.role)) {
    throw redirect({ to: "/agronomist" });
  }
}

/** Field Intelligence — agronomists only. */
export function requireAgronomistSession() {
  requireOfficerSession();
  const officer = getOfficer();
  if (officer && !isAgronomist(officer.role)) {
    throw redirect({ to: "/dashboard" });
  }
}

export { homeRouteForRole };
