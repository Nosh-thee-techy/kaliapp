import { redirect } from "@tanstack/react-router";
import { getOfficer } from "./officer-session";

/** Redirect to /auth when no JWT is stored (client-side navigation guard). */
export function requireOfficerSession() {
  if (typeof window === "undefined") return;
  if (!getOfficer()?.token) {
    throw redirect({ to: "/auth" });
  }
}
