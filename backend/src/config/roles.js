export const ROLES = {
  OFFICER: "officer",
  AGRONOMIST: "agronomist",
};

export function normalizeRole(role) {
  const r = String(role || "").toLowerCase().trim();
  if (r === ROLES.AGRONOMIST || r === "field" || r === "agronomist") return ROLES.AGRONOMIST;
  return ROLES.OFFICER;
}
