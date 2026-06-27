import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import { Sprout, Home, Smartphone, Activity, Share2, Puzzle, LogOut, Search, Globe, Bell, Map as MapIcon, Leaf } from "lucide-react";

import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/fraunces/500.css";
import "@fontsource/fraunces/600.css";

import appCss from "../styles.css?url";
import { I18nProvider, useI18n, LANGS, type Lang } from "../lib/i18n";
import { Toaster } from "../components/ui/sonner";
import { fetchGraphHealth } from "../lib/api-core";
import { getOfficer, getOfficerInitials, clearOfficer } from "../lib/officer-session";
import { isAgronomist } from "../lib/roles";
import { SadnessErrorPage } from "../components/SadnessErrorPage";
import { OfficerChromeProvider, useOfficerChrome } from "../lib/officer-chrome";
import { PipelineSyncStrip } from "../components/PipelineSyncStrip";

function NotFoundComponent() {
  return <SadnessErrorPage variant="404" />;
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <SadnessErrorPage
      variant="error"
      error={error}
      onRetry={() => {
        router.invalidate();
        reset();
      }}
    />
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "KaLI — Fair credit for farmers" },
      { name: "description", content: "KaLI helps branch officers approve farmer loans fairly using cooperative history, mobile money and live weather signals." },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function LanguageSwitch() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const current = LANGS.find((l) => l.code === lang)!;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
      >
        <Globe className="h-3.5 w-3.5" />
        <span>{current.flag}</span>
        <span className="hidden sm:inline">{current.label}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-xl border border-border bg-popover shadow-elevated">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLang(l.code as Lang);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-secondary ${
                l.code === lang ? "bg-secondary font-medium" : ""
              }`}
            >
              <span>{l.flag}</span>
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Sidebar() {
  const { t } = useI18n();
  const officer = getOfficer();
  const agronomist = isAgronomist(officer?.role);

  const branchItems = [
    { to: "/dashboard", label: t("nav.portfolio"), icon: Home },
    { to: "/map", label: "Map", icon: MapIcon },
    { to: "/farmer", label: t("nav.farmer"), icon: Smartphone },
    { to: "/logs", label: t("nav.logs"), icon: Activity },
    { to: "/graph", label: "Graph", icon: Share2 },
    { to: "/partners", label: "Tech", icon: Puzzle },
  ];

  const fieldItems = [{ to: "/agronomist", label: "Field", icon: Leaf }];
  const items = agronomist ? fieldItems : branchItems;
  return (
    <aside className="sticky top-0 z-30 flex h-screen w-20 flex-col items-center gap-1 border-r border-border bg-charcoal py-6 text-primary-foreground lg:w-24">
      <Link to="/" className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-lime">
        <Sprout className="h-5 w-5" />
      </Link>
      <nav className="flex flex-1 flex-col items-center gap-2">
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="group flex h-12 w-12 flex-col items-center justify-center rounded-2xl text-primary-foreground/60 transition-all hover:bg-white/10 hover:text-primary-foreground"
            activeProps={{ className: "flex h-12 w-12 flex-col items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-lime" }}
          >
            <item.icon className="h-5 w-5" />
            <span className="mt-0.5 text-[9px] font-medium opacity-80">{item.label.split(" ")[0]}</span>
          </Link>
        ))}
      </nav>
      <button
        onClick={() => {
          clearOfficer();
          window.location.href = "/";
        }}
        className="flex h-12 w-12 items-center justify-center rounded-2xl text-primary-foreground/50 hover:bg-white/10 hover:text-primary-foreground"
      >
        <LogOut className="h-5 w-5" />
      </button>
    </aside>
  );
}

function TopBar() {
  const { t } = useI18n();
  const [graphOk, setGraphOk] = useState<boolean | null>(null);
  const officer = getOfficer();
  const agronomist = isAgronomist(officer?.role);
  const { searchQuery, setSearchQuery, searchInputRef } = useOfficerChrome();

  useEffect(() => {
    fetchGraphHealth().then(setGraphOk);
    const id = setInterval(() => fetchGraphHealth().then(setGraphOk), 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-20 items-center gap-4 border-b border-border bg-background/85 px-6 backdrop-blur-md sm:px-8">
      <div className="relative hidden flex-1 max-w-md md:block">
        {!agronomist && (
          <>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`${t("dashboard.search")} (/)`}
              className="w-full rounded-full border border-border bg-card py-2.5 pl-11 pr-4 text-sm shadow-card focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </>
        )}
        {agronomist && (
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Leaf className="h-4 w-4 text-primary" />
            Field Intelligence
            <span className="text-muted-foreground">· {officer?.branch || "Naivasha"}</span>
          </div>
        )}
      </div>
      <div className="ml-auto flex items-center gap-3">
        <PipelineSyncStrip />
        {!agronomist && <LanguageSwitch />}
        <span
          className={`hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs md:inline-flex ${
            graphOk
              ? "border-success/30 bg-success/10 text-success-foreground"
              : graphOk === false
                ? "border-warning/30 bg-warning/15 text-warning-foreground"
                : "border-border bg-card text-muted-foreground"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${graphOk ? "animate-pulse bg-success" : graphOk === false ? "bg-warning" : "bg-muted-foreground"}`}
          />
          {graphOk ? t("common.synced") : graphOk === false ? t("common.offline") : "…"}
        </span>
        <button
          onClick={() => toast.info("No new notifications. Check the audit log for updates.")}
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-secondary"
        >
          <Bell className="h-4 w-4" />
        </button>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-sm font-semibold text-primary-foreground"
          title={officer?.name || "Officer"}
        >
          {getOfficerInitials(officer?.name)}
        </div>
      </div>
    </header>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isChromeless = pathname === "/" || pathname.startsWith("/auth") || pathname.startsWith("/readiness");

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <Toaster richColors position="top-right" />
        {isChromeless ? (
          <div className="min-h-screen text-foreground">
            <Outlet />
          </div>
        ) : (
          <OfficerChromeProvider>
            <div className="flex min-h-screen text-foreground">
              <Sidebar />
              <div className="flex-1 min-w-0">
                <TopBar />
                <Outlet />
              </div>
            </div>
          </OfficerChromeProvider>
        )}
      </I18nProvider>
    </QueryClientProvider>
  );
}
