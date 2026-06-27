import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Sprout, Eye, EyeOff, ArrowRight, Globe } from "lucide-react";
import farmerImg from "@/assets/farmer.jpg";
import { useI18n, LANGS, type Lang } from "@/lib/i18n";
import { getOfficer, setOfficer } from "@/lib/officer-session";
import { loginOfficer, registerOfficer } from "@/lib/api-core";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && getOfficer()?.token) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "Sign in — KaLI" },
      { name: "description", content: "Officer sign-in for the KaLI branch portal." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "signin") {
      setEmail((e) => e || "jane.mwangi@kali.co.ke");
      setPassword((p) => p || "KaliBranch2026!");
    }
  }, [mode]);

  function switchMode(next: "signin" | "register") {
    setMode(next);
    setError(null);
    if (next === "register") {
      setName("");
      setEmail("");
      setPassword("");
    } else {
      setEmail("jane.mwangi@kali.co.ke");
      setPassword("KaliBranch2026!");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result =
        mode === "signin"
          ? await loginOfficer(email, password)
          : await registerOfficer({ name, email, password, branch: "Naivasha" });
      setOfficer({
        name: result.officer.name,
        email: result.officer.email,
        branch: result.officer.branch,
        token: result.token,
      });
      toast.success(mode === "signin" ? "Signed in" : "Account created");
      await navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      let msg = err instanceof Error ? err.message : "Sign-in failed";
      if (msg.includes("already exists")) {
        msg = "This email is already registered. Sign in instead, or use a different email.";
      } else if (msg.includes("at least 8")) {
        msg = "Password must be at least 8 characters.";
      } else if (
        msg.includes("Failed to fetch") ||
        msg.includes("NetworkError") ||
        msg.includes("timed out") ||
        msg.includes("404")
      ) {
        msg = "Cannot reach the API on port 4000. In a separate terminal run: cd backend && npm run dev";
      }
      setError(msg);
      toast.error(msg);
      console.error("[auth]", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-0 px-4 py-6 sm:px-6 lg:grid-cols-2 lg:gap-10 lg:py-8">
        {/* FORM SIDE */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-charcoal text-primary-foreground">
                <Sprout className="h-4 w-4 text-accent" />
              </div>
              <div className="leading-tight">
                <div className="font-display text-lg font-semibold text-foreground">KaLI</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Branch Portal</div>
              </div>
            </Link>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground"
              aria-label="Language"
            >
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.label}
                </option>
              ))}
            </select>
          </div>

          <div className="my-auto max-w-md py-10">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent-foreground">
              <Globe className="h-3 w-3" /> {LANGS.find((l) => l.code === lang)?.label}
            </div>
            <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {mode === "signin" ? t("auth.welcome") : "Create your account"}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              {t("auth.subtitle")}
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              {mode === "register" && (
                <Field label="Name" placeholder="Jane Mwangi" value={name} onChange={(e) => setName(e.target.value)} />
              )}
              <Field
                label={t("auth.email")}
                type="email"
                placeholder="jane.mwangi@kali.co.ke"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("auth.password")}</label>
                <div className="relative mt-1.5">
                  <input
                    type={show ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    className="w-full rounded-full border border-input bg-card px-5 py-3 pr-12 text-sm placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {mode === "signin" && (
                  <div className="mt-2 text-right">
                    <a href="#" onClick={(e) => { e.preventDefault(); toast.info("Contact your branch administrator to reset your password."); }} className="text-xs font-semibold text-primary hover:underline">
                      {t("auth.forgot")}
                    </a>
                  </div>
                )}
              </div>

              {error && (
                <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:bg-primary/90 disabled:opacity-60"
              >
                {loading ? "Signing in…" : mode === "signin" ? t("auth.signin") : "Create account"}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </form>

            {mode === "register" && (
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Seeded demo emails already exist — register with a new address (e.g. you@branch.co.ke).
              </p>
            )}

            <p className="mt-8 text-center text-sm text-muted-foreground">
              {mode === "signin" ? t("auth.noAccount") : "Already have an account?"}{" "}
              <button
                onClick={() => switchMode(mode === "signin" ? "register" : "signin")}
                className="font-semibold text-primary hover:underline"
              >
                {mode === "signin" ? t("auth.register") : t("auth.signin")}
              </button>
            </p>
          </div>
        </div>

        {/* FARMER PHOTO SIDE */}
        <div className="relative hidden overflow-hidden rounded-[2.5rem] bg-secondary lg:block">
          <img
            src={farmerImg}
            alt="A Kenyan smallholder farmer smiling in her field"
            width={1024}
            height={1536}
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Gradient + frosted info card */}
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/20 to-transparent" />
          <div className="absolute left-6 top-6 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground shadow-lime">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-charcoal" />
            Pilot · Naivasha
          </div>
          <div className="absolute inset-x-6 bottom-6 rounded-3xl border border-white/15 bg-white/10 p-5 text-primary-foreground backdrop-blur-xl">
            <div className="font-display text-2xl font-semibold leading-tight">
              {t("auth.tagline")}
            </div>
            <div className="mt-2 text-sm text-primary-foreground/80">
              Mary Wanjiku · Naivasha Horticulture Co-op · French beans, 1.5 acres
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
                Score 78 / 100
              </span>
              <span className="rounded-full border border-white/25 px-2.5 py-1 text-[11px] text-primary-foreground/85">
                3 years co-op history
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({ label, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        {...rest}
        className="mt-1.5 w-full rounded-full border border-input bg-card px-5 py-3 text-sm placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
      />
    </div>
  );
}
