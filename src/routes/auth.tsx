import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Sprout, Eye, EyeOff, ArrowRight, ShieldCheck, Leaf, Smartphone, CloudRain } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — KaLI Branch Portal" },
      { name: "description", content: "Officer sign-in for the KaLI branch portal." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => navigate({ to: "/dashboard" }), 600);
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-0 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:gap-10">
        {/* FORM SIDE */}
        <div className="flex flex-col">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-forest text-primary-foreground shadow-glow">
              <Sprout className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <div className="font-display text-lg font-semibold">KaLI</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Branch Portal</div>
            </div>
          </Link>

          <div className="my-auto max-w-md py-12">
            <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {mode === "signin" ? "Welcome back, officer!" : "Create your officer account"}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {mode === "signin"
                ? "Sign in to triage today's queue, review climate alerts, and disburse with confidence."
                : "Register your branch credentials. A regional admin will activate your account."}
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              {mode === "register" && (
                <Field label="Full name" placeholder="Jane Mwangi" />
              )}
              <Field label="Officer email" type="email" placeholder="jane.mwangi@kali.co.ke" />
              <div>
                <label className="text-xs font-medium text-muted-foreground">Password</label>
                <div className="relative mt-1.5">
                  <input
                    type={show ? "text" : "password"}
                    placeholder="••••••••"
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
                    <a href="#" className="text-xs font-medium text-accent hover:underline">Forgot password?</a>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground py-3 text-sm font-semibold text-background shadow-card transition-all hover:bg-primary hover:shadow-glow disabled:opacity-60"
              >
                {loading ? "Signing in…" : mode === "signin" ? "Sign in" : "Create account"}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </form>

            <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or continue with
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="flex justify-center gap-3">
              {["G", ""].map((l, i) => (
                <button
                  key={i}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-foreground text-background transition-transform hover:scale-105"
                >
                  {i === 0 ? <span className="font-display text-base font-semibold">G</span> : (
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M16.365 1.43c0 1.14-.44 2.22-1.18 3.02-.75.84-1.99 1.5-3.18 1.4-.13-1.12.42-2.28 1.13-3.04.78-.84 2.13-1.5 3.23-1.38zM20.7 17.34c-.55 1.27-.82 1.84-1.54 2.97-1 1.55-2.41 3.48-4.16 3.5-1.55.02-1.95-1.01-4.06-1-2.1.01-2.55 1.02-4.1.99C5.1 23.78 3.77 22.04 2.77 20.5c-2.79-4.3-3.08-9.34-1.36-12.02 1.22-1.9 3.15-3.01 4.96-3.01 1.84 0 3 1.01 4.52 1.01 1.47 0 2.37-1.01 4.5-1.01 1.61 0 3.32.88 4.53 2.4-3.98 2.18-3.34 7.87.78 9.47z"/></svg>
                  )}
                </button>
              ))}
              <button className="flex h-11 w-11 items-center justify-center rounded-full bg-foreground text-background transition-transform hover:scale-105">
                <Smartphone className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-8 text-center text-sm text-muted-foreground">
              {mode === "signin" ? "Not registered yet?" : "Already have an account?"}{" "}
              <button
                onClick={() => setMode(mode === "signin" ? "register" : "signin")}
                className="font-semibold text-accent hover:underline"
              >
                {mode === "signin" ? "Register now" : "Sign in"}
              </button>
            </p>
          </div>
        </div>

        {/* ILLUSTRATION SIDE */}
        <div className="relative hidden overflow-hidden rounded-[2rem] bg-gradient-forest p-8 text-primary-foreground texture-leaf lg:flex lg:flex-col">
          <div className="relative z-10 flex items-center justify-between text-xs text-primary-foreground/70">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" /> Pilot · Naivasha branch
            </span>
            <span>v0.4 · Offline-ready</span>
          </div>

          <div className="relative z-10 my-auto">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-glow">
                <Leaf className="h-5 w-5" />
              </div>
              <div className="font-display text-xl font-semibold">A field-first lending desk.</div>
            </div>
            <p className="mt-3 max-w-sm text-primary-foreground/80">
              Approve loans that move with the rain, not against it.
            </p>

            {/* Floating cards collage */}
            <div className="relative mt-10 h-[26rem]">
              <FloatCard
                className="left-0 top-0 w-64 -rotate-3"
                eyebrow="Scorecard"
                title="Mary Wanjiku · 78/100"
                body="French Beans · Co-op 3y · M-Pesa KES 128k"
                tone="primary"
              />
              <FloatCard
                className="right-0 top-16 w-60 rotate-2"
                eyebrow="Climate signal"
                title="SPI -1.6 in Naivasha"
                body="Fall armyworm 18km NE — scout in 72h"
                tone="accent"
                icon={CloudRain}
              />
              <FloatCard
                className="bottom-10 left-6 w-72 rotate-1"
                eyebrow="USSD session"
                title="*483# · 342 sessions / 24h"
                body="2 women-led co-ops, 1 youth chama just queued"
                tone="ghost"
                icon={Smartphone}
              />
              <FloatCard
                className="bottom-0 right-4 w-56 -rotate-2"
                eyebrow="Audit"
                title="Override logged"
                body="J. Mwangi · referred · 2m ago"
                tone="ghost"
                icon={ShieldCheck}
              />
            </div>
          </div>

          <div className="relative z-10 mt-auto flex items-center gap-2 text-xs text-primary-foreground/70">
            <span className="h-1.5 w-6 rounded-full bg-accent" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground/40" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground/40" />
            <span className="ml-auto">Climate-smart credit, made in Kenya.</span>
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

function FloatCard({
  className,
  eyebrow,
  title,
  body,
  tone,
  icon: Icon,
}: {
  className: string;
  eyebrow: string;
  title: string;
  body: string;
  tone: "primary" | "accent" | "ghost";
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const tones = {
    primary: "bg-background text-foreground border-background/20",
    accent: "bg-accent text-accent-foreground border-accent/30",
    ghost: "bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 backdrop-blur",
  } as const;
  return (
    <div className={`absolute rounded-2xl border p-4 shadow-elevated ${tones[tone]} ${className}`}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider opacity-80">
        {Icon && <Icon className="h-3 w-3" />}
        {eyebrow}
      </div>
      <div className="mt-1.5 font-display text-base font-semibold leading-tight">{title}</div>
      <div className="mt-1 text-xs opacity-80">{body}</div>
    </div>
  );
}
