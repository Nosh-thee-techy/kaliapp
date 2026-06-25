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
import { useState, type ReactNode } from "react";
import { Sprout, Home, Smartphone, Activity, Settings, LogOut, Bell, Search, Globe } from "lucide-react";

import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/fraunces/500.css";
import "@fontsource/fraunces/600.css";

import appCss from "../styles.css?url";
import { I18nProvider, useI18n, LANGS, type Lang } from "../lib/i18n";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-semibold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Try again or head back home.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-input bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Home
          </a>
        </div>
      </div>
    </div>
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
  const items = [
    { to: "/dashboard", label: t("nav.portfolio"), icon: Home },
    { to: "/farmer", label: t("nav.farmer"), icon: Smartphone },
    { to: "/logs", label: t("nav.logs"), icon: Activity },
  ];
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
      <button className="flex h-12 w-12 items-center justify-center rounded-2xl text-primary-foreground/50 hover:bg-white/10 hover:text-primary-foreground">
        <Settings className="h-5 w-5" />
      </button>
      <Link
        to="/auth"
        className="flex h-12 w-12 items-center justify-center rounded-2xl text-primary-foreground/50 hover:bg-white/10 hover:text-primary-foreground"
      >
        <LogOut className="h-5 w-5" />
      </Link>
    </aside>
  );
}

function TopBar() {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-20 flex h-20 items-center gap-4 border-b border-border bg-background/85 px-6 backdrop-blur-md sm:px-8">
      <div className="relative hidden flex-1 max-w-md md:block">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder={t("dashboard.search")}
          className="w-full rounded-full border border-border bg-card py-2.5 pl-11 pr-4 text-sm shadow-card focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
        />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <LanguageSwitch />
        <span className="hidden items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1.5 text-xs text-success-foreground md:inline-flex">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
          {t("common.synced")}
        </span>
        <button className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-secondary">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
        </button>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-sm font-semibold text-primary-foreground">
          JM
        </div>
      </div>
    </header>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isChromeless = pathname === "/" || pathname.startsWith("/auth");

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        {isChromeless ? (
          <div className="min-h-screen text-foreground">
            <Outlet />
          </div>
        ) : (
          <div className="flex min-h-screen text-foreground">
            <Sidebar />
            <div className="flex-1 min-w-0">
              <TopBar />
              <Outlet />
            </div>
          </div>
        )}
      </I18nProvider>
    </QueryClientProvider>
  );
}
