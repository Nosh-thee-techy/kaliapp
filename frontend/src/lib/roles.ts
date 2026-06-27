export type OfficerRole = "officer" | "agronomist";

export function normalizeRole(role?: string | null): OfficerRole {
  const r = String(role || "").toLowerCase().trim();
  if (r === "agronomist" || r === "field") return "agronomist";
  return "officer";
}

export function isAgronomist(role?: string | null): boolean {
  return normalizeRole(role) === "agronomist";
}

export function homeRouteForRole(role?: string | null): "/agronomist" | "/dashboard" {
  return isAgronomist(role) ? "/agronomist" : "/dashboard";
}

export const ROLE_LABELS: Record<OfficerRole, string> = {
  officer: "Branch loan officer",
  agronomist: "Field agronomist",
};
