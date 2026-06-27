import type { FarmerReadiness } from "@/lib/api-core";

export type KaliVoiceLang = "en" | "sw" | "lg";

export function speechLang(code: KaliVoiceLang): string {
  if (code === "sw") return "sw-KE";
  if (code === "lg") return "en-UG";
  return "en-KE";
}

export function buildKaliGreeting(data: FarmerReadiness, lang: KaliVoiceLang): string {
  const { name } = data.farmer;
  const { score, label } = data.readiness;
  const next = data.actionPoints.find((a) => !a.done)?.title;

  const templates: Record<KaliVoiceLang, string> = {
    en: `Hello ${name}. I'm Kali, your credit readiness guide. Your score is ${score} out of 100 — ${label}.${next ? ` Your next step is: ${next}.` : ""} Tap speak when you're ready to ask me anything.`,
    sw: `Habari ${name}. Mimi ni Kali, msaidizi wako wa uwezo wa mkopo. Alama yako ni ${score} kati ya 100 — ${label}.${next ? ` Hatua yako inayofuata: ${next}.` : ""} Bonyeza kuongea ukiwa tayari kuuliza.`,
    lg: `Oli ${name}. Nze Kali, omukyala akuyamba okutegeera obubonero bwo. Obubonero bwo bwe ${score} ku 100 — ${label}.${next ? ` Ekintu ekiddako: ${next}.` : ""} Koona okwogera bw'oba olina ekibuuzo.`,
  };

  return templates[lang] || templates.en;
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

export function readinessCopy(lang: KaliVoiceLang) {
  const c: Record<
    KaliVoiceLang,
    {
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
    }
  > = {
    en: {
      greeting: (n) => `Hello, ${n.split(" ")[0]} 👋`,
      subtitle: "Your credit readiness — one step at a time",
      speakKali: "Speak with Kali",
      speakKaliHint: "Ask in English, Kiswahili, or Luganda — she knows your profile",
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
      speakKaliHint: "Uliza kwa Kiswahili, Kiingereza, au Luganda — anajua wasifu wako",
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
      speakKaliHint: "Buza mu Luganda, Kiswahili, oba English — amanyi profile yo",
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
  return c[lang] || c.en;
}

export function whySectionTitle(stance: string | undefined, copy: ReturnType<typeof readinessCopy>): string {
  if (stance === "DECLINE") return copy.whyNotApproved;
  if (stance === "REFER") return copy.whyUnderReview;
  if (stance === "APPROVED") return copy.whyApproved;
  return copy.whyScore;
}

export function voiceCopy(lang: KaliVoiceLang): VoiceUiCopy {
  const copy: Record<KaliVoiceLang, VoiceUiCopy> = {
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
  return copy[lang] || copy.en;
}
