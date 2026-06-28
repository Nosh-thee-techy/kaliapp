/** Supported farmer-facing languages — Kenya + Uganda (eSusFarm). Featherless handles all; ElevenLabs STT uses native code or fallback. */
export const SUPPORTED_LANGS = {
  en: {
    code: "en",
    label: "English",
    flag: "🇬🇧",
    featherless: "English",
    elevenLabsStt: "eng",
    region: "ke",
  },
  sw: {
    code: "sw",
    label: "Kiswahili",
    flag: "🇰🇪",
    featherless: "Kiswahili",
    elevenLabsStt: "swa",
    region: "ke",
  },
  ki: {
    code: "ki",
    label: "Gikuyu",
    flag: "🇰🇪",
    featherless: "Kikuyu (Gikuyu)",
    elevenLabsStt: "swa",
    sttFallback: "swa",
    region: "ke",
  },
  luo: {
    code: "luo",
    label: "Dholuo",
    flag: "🇰🇪",
    featherless: "Luo (Dholuo)",
    elevenLabsStt: "luo",
    region: "ke",
  },
  kam: {
    code: "kam",
    label: "Kikamba",
    flag: "🇰🇪",
    featherless: "Kamba (Kikamba)",
    elevenLabsStt: "swa",
    sttFallback: "swa",
    region: "ke",
  },
  so: {
    code: "so",
    label: "Somali",
    flag: "🇸🇴",
    featherless: "Somali",
    elevenLabsStt: "som",
    region: "ke",
  },
  sheng: {
    code: "sheng",
    label: "Sheng",
    flag: "🇰🇪",
    featherless: "Sheng (Kenyan urban Swahili-English mix)",
    elevenLabsStt: "swa",
    sttFallback: "swa",
    region: "ke",
  },
  lg: {
    code: "lg",
    label: "Luganda",
    flag: "🇺🇬",
    featherless: "Luganda",
    elevenLabsStt: "lug",
    region: "ug",
  },
};

/** USSD step → language code (step 1 = language pick). */
export const USSD_LANG_STEPS = {
  1: "en",
  2: "sw",
  3: "ki",
  4: "luo",
  5: "kam",
  6: "so",
  7: "sheng",
  8: "lg",
};

export const USSD_LANG_MENU =
  "CON KaLI Core Engine\n" +
  "Chagua Lugha / Select Language\n" +
  "1. English\n" +
  "2. Kiswahili\n" +
  "3. Gikuyu\n" +
  "4. Dholuo\n" +
  "5. Kikamba\n" +
  "6. Somali\n" +
  "7. Sheng\n" +
  "8. Luganda";

const LANG_ALIASES = {
  english: "en",
  en: "en",
  kiswahili: "sw",
  sw: "sw",
  swahili: "sw",
  kikuyu: "ki",
  gikuyu: "ki",
  ki: "ki",
  luo: "luo",
  dholuo: "luo",
  kamba: "kam",
  kikamba: "kam",
  kam: "kam",
  somali: "so",
  so: "so",
  sheng: "sheng",
  luganda: "lg",
  lg: "lg",
};

export function normalizeLang(code) {
  if (!code) return "en";
  const c = String(code).toLowerCase().trim();
  return LANG_ALIASES[c] || (SUPPORTED_LANGS[c] ? c : "en");
}

export function langFromUssdStep(step) {
  return USSD_LANG_STEPS[String(step)] || "sw";
}

/** ElevenLabs Scribe language_code — uses native STT or Kenyan fallback (swa). */
export function getElevenLabsSttCode(lang) {
  const meta = SUPPORTED_LANGS[normalizeLang(lang)];
  if (!meta) return "eng";
  return meta.elevenLabsStt || meta.sttFallback || "eng";
}

/** Pick localized copy bucket — exact lang, then Kiswahili, then English. */
export function copyBucket(lang, copies) {
  const code = normalizeLang(lang);
  return copies[code] || copies.sw || copies.en;
}

export function listSupportedLanguages() {
  return Object.values(SUPPORTED_LANGS);
}
