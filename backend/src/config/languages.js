/** Supported farmer-facing languages — Kenya + Uganda (eSusFarm). */
export const SUPPORTED_LANGS = {
  en: { code: "en", label: "English", featherless: "English" },
  sw: { code: "sw", label: "Kiswahili", featherless: "Kiswahili" },
  lg: { code: "lg", label: "Luganda", featherless: "Luganda" },
};

export const USSD_LANG_MENU =
  "CON KaLI Core Engine\n" +
  "Chagua Lugha / Select Language\n" +
  "1. English\n" +
  "2. Kiswahili\n" +
  "3. Luganda";

export function normalizeLang(code) {
  if (!code) return "en";
  const c = String(code).toLowerCase();
  if (c === "sw" || c === "kiswahili") return "sw";
  if (c === "lg" || c === "luganda") return "lg";
  return "en";
}

export function langFromUssdStep(step) {
  if (step === "2") return "sw";
  if (step === "3") return "lg";
  return "en";
}
