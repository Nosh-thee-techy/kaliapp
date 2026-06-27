import type { OfficerRole } from "./roles";
import { normalizeRole } from "./roles";

const STORAGE_KEY = "kali-officer-session";

export type OfficerSession = {
  name: string;
  email: string;
  branch?: string;
  role: OfficerRole;
  token: string;
};

export function getOfficer(): OfficerSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OfficerSession;
    if (!parsed.token) return null;
    return { ...parsed, role: normalizeRole(parsed.role) };
  } catch {
    return null;
  }
}

export function getAuthToken(): string | null {
  return getOfficer()?.token ?? null;
}

export function setOfficer(session: OfficerSession) {
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...session, role: normalizeRole(session.role) }),
  );
}

export function clearOfficer() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function getOfficerInitials(name?: string) {
  const n = name || getOfficer()?.name || "Officer";
  return n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
