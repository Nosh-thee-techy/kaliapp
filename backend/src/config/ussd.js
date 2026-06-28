/** KaLI USSD gateway constants — Africa's Talking shortcode + session policy. */
export const USSD_SHORTCODE = process.env.USSD_SHORTCODE || "*384*11400#";

/** Session TTL — 30 minutes for data safety (PII cleared automatically). */
export const USSD_SESSION_TTL_SEC = Number(process.env.USSD_SESSION_TTL_SEC) || 30 * 60;

export const USSD_SESSION_PREFIX = "kali:ussd:session:";
