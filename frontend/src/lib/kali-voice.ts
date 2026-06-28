import type { FarmerReadiness } from "@/lib/api-core";

/** Farmer-facing language code — synced with backend SUPPORTED_LANGS. */
export type KaliVoiceLang = "en" | "sw" | "lg" | "ki" | "luo" | "kam" | "so" | "sheng";

export const DEFAULT_FARMER_LANGS: { code: KaliVoiceLang; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "sw", label: "Kiswahili", flag: "🇰🇪" },
  { code: "ki", label: "Gikuyu", flag: "🇰🇪" },
  { code: "luo", label: "Dholuo", flag: "🇰🇪" },
  { code: "kam", label: "Kikamba", flag: "🇰🇪" },
  { code: "so", label: "Somali", flag: "🇸🇴" },
  { code: "sheng", label: "Sheng", flag: "🇰🇪" },
  { code: "lg", label: "Luganda", flag: "🇺🇬" },
];

export function normalizeFarmerLang(code: string | undefined): KaliVoiceLang {
  const c = (code || "en").toLowerCase();
  const found = DEFAULT_FARMER_LANGS.find((l) => l.code === c);
  return (found?.code ?? "en") as KaliVoiceLang;
}

export function speechLang(code: KaliVoiceLang | string): string {
  const lang = normalizeFarmerLang(code);
  if (lang === "sw" || lang === "sheng" || lang === "ki" || lang === "kam") return "sw-KE";
  if (lang === "luo") return "en-KE";
  if (lang === "so") return "so-SO";
  if (lang === "lg") return "en-UG";
  return "en-KE";
}

export function buildKaliGreeting(data: FarmerReadiness, lang: KaliVoiceLang | string): string {
  const { name } = data.farmer;
  const { score, label } = data.readiness;
  const next = data.actionPoints.find((a) => !a.done)?.title;
  const l = normalizeFarmerLang(lang);

  const templates: Partial<Record<KaliVoiceLang, string>> = {
    en: `Hello ${name}. I'm Kali, your credit readiness guide. Your score is ${score} out of 100 — ${label}.${next ? ` Your next step is: ${next}.` : ""} Tap speak when you're ready to ask me anything.`,
    sw: `Habari ${name}. Mimi ni Kali, msaidizi wako wa uwezo wa mkopo. Alama yako ni ${score} kati ya 100 — ${label}.${next ? ` Hatua yako inayofuata: ${next}.` : ""} Bonyeza kuongea ukiwa tayari kuuliza.`,
    lg: `Oli ${name}. Nze Kali, omukyala akuyamba okutegeera obubonero bwo. Obubonero bwo bwe ${score} ku 100 — ${label}.${next ? ` Ekintu ekiddako: ${next}.` : ""} Koona okwogera bw'oba olina ekibuuzo.`,
    ki: `Wanyua ${name}. Ni Kali, mũtetheri wa wĩra waku wa mkopo. Alama yaku ni ${score} kũrĩ 100 — ${label}.${next ? ` Ĩgũrũ rĩngĩ: ${next}.` : ""} Amba kwaria ndũkũre.`,
    luo: `Amosi ${name}. An Kali, jakony mari e wi mkopo. Pachu ni ${score} kuom 100 — ${label}.${next ? ` Gik mabiro: ${next}.` : ""} Wach kwayo ka iwinjo.`,
    kam: `Wikwatya ${name}. Ni Kali, mũtũmĩĩ wa wĩa waku wa mkopo. Alama yaku ni ${score} kũla 100 — ${label}.${next ? ` Ĩkũvĩnda: ${next}.` : ""} Amba kwasa.`,
    so: `Salaan ${name}. Waxaan ahay Kali, hagahaaga diyaar garowga deynta. Dhibcahaagu waa ${score} oo ka mid ah 100 — ${label}.${next ? ` Tallaabada xigta: ${next}.` : ""} Hadal markaad diyaar tahay.`,
    sheng: `Sasa ${name}. Mimi ni Kali, msaidizi wako wa score.${next ? ` Next step: ${next}.` : ""} Alama yako ni ${score}/100 — ${label}. Uliza anything.`,
  };

  return templates[l] || templates.sw || templates.en!;
}

export function voiceContextFromReadiness(data: FarmerReadiness) {
  return {
    farmerName: data.farmer.name,
    score: data.readiness.score,
    label: data.readiness.label,
    stance: data.readiness.stance,
    crop: data.farmer.crop,
    cooperative: data.farmer.cooperative,
    whyMessage: data.whyMessage ?? data.headline,
    headline: data.whyMessage ?? data.headline,
    macroAdvisory: data.macroAdvisory,
    actionPoints: data.actionPoints.map((a) => ({ title: a.title, done: a.done })),
  };
}

export type VoiceUiCopy = {
  tagline: string;
  taglineAccent: string;
  speak: string;
  listening: string;
  thinking: string;
  speaking: string;
  tapToClose: string;
  floatLabel: string;
  micDenied: string;
  unavailable: string;
};

type ReadinessCopyBundle = {
  greeting: (name: string) => string;
  subtitle: string;
  speakKali: string;
  speakKaliHint: string;
  nextStep: string;
  nextBadge: string;
  markDone: string;
  whyScore: string;
  whyNotApproved: string;
  whyUnderReview: string;
  whyApproved: string;
  lastSms: string;
  smsPortalHint: string;
  quickActions: string;
  talkKali: string;
  completeAction: string;
  climateTip: string;
  myScore: string;
  actionsLeft: (n: number) => string;
  pushKali: string;
};

const READINESS_COPY: Partial<Record<KaliVoiceLang, ReadinessCopyBundle>> = {
  en: {
    greeting: (n) => `Hello, ${n.split(" ")[0]} 👋`,
    subtitle: "Your credit readiness — one step at a time",
    speakKali: "Speak with Kali",
    speakKaliHint: "English, Kiswahili, Gikuyu, Dholuo, Kikamba, Somali, Sheng, or Luganda",
    nextStep: "Your next step",
    nextBadge: "Do this next",
    markDone: "Mark done",
    whyScore: "Why your score",
    whyNotApproved: "Why not approved yet",
    whyUnderReview: "Why we're still reviewing",
    whyApproved: "Why you're approved",
    lastSms: "Last SMS from KaLI",
    smsPortalHint: "SMS explains why — your action steps are on this page.",
    quickActions: "Quick actions",
    talkKali: "Ask Kali",
    completeAction: "Complete step",
    climateTip: "Zone tip",
    myScore: "My score",
    actionsLeft: (n) => `${n} step${n === 1 ? "" : "s"} left`,
    pushKali: "Not sure what to do? Kali will walk you through it.",
  },
  sw: {
    greeting: (n) => `Habari, ${n.split(" ")[0]} 👋`,
    subtitle: "Uwezo wako wa mkopo — hatua moja kwa moja",
    speakKali: "Ongea na Kali",
    speakKaliHint: "Lugha za Kenya na Uganda — anajua wasifu wako",
    nextStep: "Hatua yako inayofuata",
    nextBadge: "Fanya hii kwanza",
    markDone: "Weka imekamilika",
    whyScore: "Kwa nini alama yako",
    whyNotApproved: "Kwa nini bado haijaidhinishwa",
    whyUnderReview: "Kwa nini bado inakaguliwa",
    whyApproved: "Kwa nini umeidhinishwa",
    lastSms: "SMS ya mwisho kutoka KaLI",
    smsPortalHint: "SMS inaeleza sababu — hatua zako ziko hapa ukurasa huu.",
    quickActions: "Vitendo vya haraka",
    talkKali: "Uliza Kali",
    completeAction: "Kamilisha hatua",
    climateTip: "Ushauri wa eneo",
    myScore: "Alama yangu",
    actionsLeft: (n) => `Hatua ${n} zimesalia`,
    pushKali: "Hujui la kufanya? Kali atakuongoza.",
  },
  lg: {
    greeting: (n) => `Oli, ${n.split(" ")[0]} 👋`,
    subtitle: "Obubonero bwo okwesiga ssente — hatua ku hatua",
    speakKali: "Yogera ne Kali",
    speakKaliHint: "Luganda, Kiswahili, oba English — amanyi profile yo",
    nextStep: "Ekintu ekiddako",
    nextBadge: "Kola kino okusooka",
    markDone: "Maliiko kiwedde",
    whyScore: "Lwaki obubonero bwo",
    whyNotApproved: "Lwaki tonnaba kukkirizibwa",
    whyUnderReview: "Lwaki tukyekenneenya",
    whyApproved: "Lwaki okkiriziddwa",
    lastSms: "SMS esembayo okuva KaLI",
    smsPortalHint: "SMS ennyonnyola ensonga — emirimu gyo giri ku mukutu guno.",
    quickActions: "Ebintu by'amangu",
    talkKali: "Buza Kali",
    completeAction: "Maliiko ekintu",
    climateTip: "Amagezi g'obudde",
    myScore: "Obubonero bwange",
    actionsLeft: (n) => `Ebintu ${n} ebisigadde`,
    pushKali: "Totegeera kiki okukola? Kali akuyamba.",
  },
};

export function readinessCopy(lang: KaliVoiceLang | string): ReadinessCopyBundle {
  const l = normalizeFarmerLang(lang);
  return READINESS_COPY[l] || READINESS_COPY.sw || READINESS_COPY.en!;
}

export function whySectionTitle(stance: string | undefined, copy: ReadinessCopyBundle): string {
  if (stance === "DECLINE") return copy.whyNotApproved;
  if (stance === "REFER") return copy.whyUnderReview;
  if (stance === "APPROVED") return copy.whyApproved;
  return copy.whyScore;
}

const VOICE_UI_COPY: Partial<Record<KaliVoiceLang, VoiceUiCopy>> = {
  en: {
    tagline: "Talk to Kali —",
    taglineAccent: "your readiness guide",
    speak: "Speak with Kali",
    listening: "Listening…",
    thinking: "Kali is thinking…",
    speaking: "Kali is speaking…",
    tapToClose: "Close",
    floatLabel: "Talk to Kali",
    micDenied: "Microphone access denied. Allow mic in browser settings and try again.",
    unavailable: "Voice unavailable — check your connection.",
  },
  sw: {
    tagline: "Ongea na Kali —",
    taglineAccent: "msaidizi wako wa mkopo",
    speak: "Ongea na Kali",
    listening: "Nasikiliza…",
    thinking: "Kali anafikiria…",
    speaking: "Kali anaongea…",
    tapToClose: "Funga",
    floatLabel: "Ongea na Kali",
    micDenied: "Ruhusa ya kipaza sauti imekataliwa. Ruhusu kipaza sauti kwenye mipangilio ya kivinjari.",
    unavailable: "Sauti haipatikani — angalia muunganisho wako.",
  },
  lg: {
    tagline: "Yogera ne Kali —",
    taglineAccent: "omukyala akuyamba",
    speak: "Yogera ne Kali",
    listening: "Mpuliriza…",
    thinking: "Kali ategeera…",
    speaking: "Kali ayogera…",
    tapToClose: "Ggalawo",
    floatLabel: "Yogera ne Kali",
    micDenied: "Omikutu gy'eddoboozi tegikkiriziddwa. Kkiriza mu browser settings.",
    unavailable: "Edoboozi teririwo — kebera omukutu gwo.",
  },
};

export function voiceCopy(lang: KaliVoiceLang | string): VoiceUiCopy {
  const l = normalizeFarmerLang(lang);
  return VOICE_UI_COPY[l] || VOICE_UI_COPY.sw || VOICE_UI_COPY.en!;
}

/** IVR menu prompts — Featherless replies in the selected language. */
export const VOICE_MENU_PROMPTS: Record<string, Record<string, string>> = {
  en: {
    "1": "I want to apply for input credit through my cooperative.",
    "2": "What is my loan application status?",
    "3": "What is the climate advisory for my farm zone?",
    "4": "Explain my credit score — why is it what it is?",
  },
  sw: {
    "1": "Nataka kuomba mkopo wa pembejeo kupitia ushirika wangu.",
    "2": "Hali ya ombi langu la mkopo ni ipi?",
    "3": "Ushauri wa hali ya hewa kwa eneo langu ni upi?",
    "4": "Nieleze alama yangu ya mkopo — kwa nini iko hivyo?",
  },
  lg: {
    "1": "Njagala okusaba ssente z'ebirime okuyita mu kibiina kyange.",
    "2": "Embeera y'okusaba kwange eri etya?",
    "3": "Amagezi g'obudde ku kitundu kyange ge gaki?",
    "4": "Nnyonnyola obubonero bwange — lwaki buli bwe buli?",
  },
  ki: {
    "1": "Ndienda gũtongoria mkopo wa pembejeo kũgerera co-op yakwa.",
    "2": "Status ya loan yakwa nĩ ĩrĩ?",
    "3": "Climate advisory ya zone yakwa nĩ ĩrĩ?",
    "4": "Nĩ mbaure alama yakwa ya mkopo — nĩkĩĩ?",
  },
  luo: {
    "1": "Adwaro keto kwayo mar mkopo mar inputs kokalo e cooperative.",
    "2": "Status mar kwayo mara en mane?",
    "3": "Climate advisory mar zone mara en mane?",
    "4": "Nyisa pachu mara — ang'o moko?",
  },
  kam: {
    "1": "Nindĩenda kũkũlĩla mkopo wa pembejeo kũtesa co-op yakwa.",
    "2": "Status ya loan yakwa nĩ ũ?",
    "3": "Climate advisory ya zone yakwa nĩ ũ?",
    "4": "Ni eleza alama yakwa — nĩkĩ?",
  },
  so: {
    "1": "Waxaan rabaa inaan codsado deyn beeraha iyada oo loo marayo iskaashiga.",
    "2": "Xaaladda codsigayga waa maxay?",
    "3": "Talo cimilo ee deegaankayga waa maxay?",
    "4": "Ii sharax dhibcahayga — maxaa sababay?",
  },
  sheng: {
    "1": "Nataka loan ya inputs kupitia co-op yangu.",
    "2": "Status ya loan yangu ni nini?",
    "3": "Climate tip ya zone yangu ni gani?",
    "4": "Explain score yangu — kwa nini iko hivyo?",
  },
};

export function callGreeting(lang: KaliVoiceLang | string): string {
  const l = normalizeFarmerLang(lang);
  const copy: Partial<Record<KaliVoiceLang, string>> = {
    en: "KaLI connected. Press 1 apply, 2 status, 3 climate, 4 explain score. Or press Speak and ask.",
    sw: "KaLI imeunganishwa. 1 omba, 2 hali, 3 hewa, 4 eleza alama. Au bonyeza Ongea.",
    lg: "KaLI yungiddwa. 1 saba, 2 embeera, 3 obudde, 4 nnyonnyola. Oba koona Yogera.",
    ki: "KaLI nĩ ĩgwatanĩtio. 1 omba, 2 status, 3 climate, 4 eleza. Kana kwaria.",
    luo: "KaLI otimore. 1 kwayo, 2 status, 3 climate, 4 nyisa pachu. Wach kwayo.",
    kam: "KaLI nĩyĩkwatanĩtwe. 1 omba, 2 status, 3 climate, 4 eleza. Kwasa.",
    so: "KaLI waa la xiriiray. 1 codso, 2 xaalad, 3 cimilo, 4 sharax. Hadal.",
    sheng: "KaLI connected. 1 omba, 2 status, 3 climate, 4 explain. Ongea tu.",
  };
  return copy[l] || copy.sw || copy.en!;
}

export function menuPrompt(lang: KaliVoiceLang | string, key: string): string | undefined {
  const l = normalizeFarmerLang(lang);
  return VOICE_MENU_PROMPTS[l]?.[key] || VOICE_MENU_PROMPTS.en?.[key];
}
