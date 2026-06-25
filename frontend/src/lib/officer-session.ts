const STORAGE_KEY = "kali-officer-session";

export type OfficerSession = {
  name: string;
  email: string;
  branch?: string;
  token: string;
};

export function getOfficer(): OfficerSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OfficerSession;
    if (!parsed.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getAuthToken(): string | null {
  return getOfficer()?.token ?? null;
}

export function setOfficer(session: OfficerSession) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
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
