import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "sw" | "fr";

export const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "sw", label: "Kiswahili", flag: "🇰🇪" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
];

type Dict = Record<string, string>;

const dictionaries: Record<Lang, Dict> = {
  en: {
    "nav.portfolio": "Home",
    "nav.farmer": "Farmer Phone",
    "nav.logs": "Activity",
    "nav.dashboard": "Dashboard",
    "nav.settings": "Settings",
    "nav.signout": "Sign out",
    "common.synced": "All up to date",
    "common.offline": "Works offline",
    "dashboard.greeting": "Hello, Jane",
    "dashboard.subtitle": "Here is what is happening at your branch today.",
    "dashboard.queue": "Loans waiting for you",
    "dashboard.ready": "Ready to review",
    "dashboard.waiting": "Waiting for weather",
    "dashboard.escalated": "Needs a closer look",
    "dashboard.disbursed": "Money sent out",
    "dashboard.search": "Search by name, ID, or phone…",
    "dashboard.allStatus": "All",
    "dashboard.weeklyTrend": "Loans this week",
    "dashboard.equity": "Who is applying",
    "dashboard.rainfall": "Rainfall by area",
    "dashboard.assess": "Review",
    "dashboard.profile": "Profile",
    "table.farmer": "Farmer",
    "table.segment": "Group",
    "table.coop": "Cooperative",
    "table.zone": "Area",
    "table.status": "Status",
    "table.requested": "Asking for",
    "table.submitted": "Sent in",
    "auth.welcome": "Welcome back!",
    "auth.subtitle": "Sign in to review today's loan requests.",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.signin": "Sign in",
    "auth.forgot": "Forgot password?",
    "auth.register": "Register now",
    "auth.noAccount": "Not a member?",
    "auth.tagline": "Make work easier and fairer with KaLI.",
  },
  sw: {
    "nav.portfolio": "Nyumbani",
    "nav.farmer": "Simu ya Mkulima",
    "nav.logs": "Shughuli",
    "nav.dashboard": "Dashibodi",
    "nav.settings": "Mipangilio",
    "nav.signout": "Toka",
    "common.synced": "Imesasishwa",
    "common.offline": "Inafanya bila intaneti",
    "dashboard.greeting": "Habari, Jane",
    "dashboard.subtitle": "Haya ndiyo yanayoendelea kwenye tawi lako leo.",
    "dashboard.queue": "Mikopo inayokungoja",
    "dashboard.ready": "Tayari kupitiwa",
    "dashboard.waiting": "Inasubiri hali ya hewa",
    "dashboard.escalated": "Yahitaji uchunguzi zaidi",
    "dashboard.disbursed": "Pesa zilizotumwa",
    "dashboard.search": "Tafuta kwa jina, kitambulisho au simu…",
    "dashboard.allStatus": "Zote",
    "dashboard.weeklyTrend": "Mikopo wiki hii",
    "dashboard.equity": "Wanaoomba",
    "dashboard.rainfall": "Mvua kwa eneo",
    "dashboard.assess": "Pitia",
    "dashboard.profile": "Wasifu",
    "table.farmer": "Mkulima",
    "table.segment": "Kundi",
    "table.coop": "Ushirika",
    "table.zone": "Eneo",
    "table.status": "Hali",
    "table.requested": "Anaomba",
    "table.submitted": "Iliwasilishwa",
    "auth.welcome": "Karibu tena!",
    "auth.subtitle": "Ingia ili kupitia maombi ya leo.",
    "auth.email": "Barua pepe",
    "auth.password": "Nenosiri",
    "auth.signin": "Ingia",
    "auth.forgot": "Umesahau nenosiri?",
    "auth.register": "Jisajili sasa",
    "auth.noAccount": "Si mwanachama?",
    "auth.tagline": "Rahisisha kazi yako na KaLI.",
  },
  fr: {
    "nav.portfolio": "Accueil",
    "nav.farmer": "Téléphone Agri",
    "nav.logs": "Activité",
    "nav.dashboard": "Tableau de bord",
    "nav.settings": "Paramètres",
    "nav.signout": "Se déconnecter",
    "common.synced": "Tout est à jour",
    "common.offline": "Fonctionne hors-ligne",
    "dashboard.greeting": "Bonjour, Jane",
    "dashboard.subtitle": "Voici ce qui se passe dans votre agence aujourd'hui.",
    "dashboard.queue": "Demandes en attente",
    "dashboard.ready": "Prêt à examiner",
    "dashboard.waiting": "En attente météo",
    "dashboard.escalated": "À examiner de près",
    "dashboard.disbursed": "Fonds envoyés",
    "dashboard.search": "Rechercher par nom, ID ou téléphone…",
    "dashboard.allStatus": "Tous",
    "dashboard.weeklyTrend": "Demandes cette semaine",
    "dashboard.equity": "Qui demande",
    "dashboard.rainfall": "Pluie par zone",
    "dashboard.assess": "Examiner",
    "dashboard.profile": "Profil",
    "table.farmer": "Agriculteur",
    "table.segment": "Groupe",
    "table.coop": "Coopérative",
    "table.zone": "Zone",
    "table.status": "Statut",
    "table.requested": "Demande",
    "table.submitted": "Envoyé",
    "auth.welcome": "Bon retour !",
    "auth.subtitle": "Connectez-vous pour examiner les demandes du jour.",
    "auth.email": "Email",
    "auth.password": "Mot de passe",
    "auth.signin": "Se connecter",
    "auth.forgot": "Mot de passe oublié ?",
    "auth.register": "S'inscrire",
    "auth.noAccount": "Pas encore membre ?",
    "auth.tagline": "Simplifiez votre travail avec KaLI.",
  },
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string };
const I18nContext = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (k) => k });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? (localStorage.getItem("kali.lang") as Lang | null) : null;
    if (saved && dictionaries[saved]) setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("kali.lang", l);
  };

  const t = (key: string) => dictionaries[lang][key] ?? dictionaries.en[key] ?? key;

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
