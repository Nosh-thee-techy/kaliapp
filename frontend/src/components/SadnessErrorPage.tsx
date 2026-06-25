import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import sadnessImg from "@/assets/sadness.png";

export type SadnessErrorVariant = "404" | "error" | "network" | "missing";

const COPY: Record<
  SadnessErrorVariant,
  { headline: string; title: string; body: string }
> = {
  "404": {
    headline: "Awww… Don't cry.",
    title: "It's just a 404 Error!",
    body: "What you're looking for may have been misplaced in Long Term Memory.",
  },
  error: {
    headline: "Awww… Don't cry.",
    title: "Something went wrong!",
    body: "This page hit a snag on our end. Try again or head back home.",
  },
  network: {
    headline: "Awww… Don't cry.",
    title: "We lost the connection!",
    body: "KaLI can't reach the graph API right now. Make sure the backend is running on port 4000 and Neo4j is up.",
  },
  missing: {
    headline: "Awww… Don't cry.",
    title: "We couldn't find that record!",
    body: "This farmer isn't in the Neo4j agricultural network yet.",
  },
};

export function isNetworkError(error: Error): boolean {
  const msg = error.message.toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("graph api") ||
    msg.includes("econnrefused") ||
    msg.includes("connection") ||
    msg.includes("timeout") ||
    msg.includes("unavailable")
  );
}

type SadnessErrorPageProps = {
  variant?: SadnessErrorVariant;
  error?: Error;
  onRetry?: () => void;
  actions?: ReactNode;
};

export function SadnessErrorPage({
  variant = "error",
  error,
  onRetry,
  actions,
}: SadnessErrorPageProps) {
  const resolved = error && isNetworkError(error) ? "network" : variant;
  const copy = COPY[resolved];

  return (
    <div className="min-h-screen bg-white text-[#1a1a1a]">
      <header className="border-b border-black/5 px-6 py-5 sm:px-10">
        <Link to="/" className="font-display text-xl font-semibold tracking-tight text-[#1a1a1a]">
          KaLI
        </Link>
      </header>

      <main className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-10 sm:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16 lg:py-16">
        <div className="flex justify-center lg:justify-start">
          <img
            src={sadnessImg}
            alt="Sadness looking distressed"
            className="h-auto w-full max-w-md object-contain"
            width={640}
            height={640}
          />
        </div>

        <div className="text-center lg:text-left">
          <p className="text-lg font-medium text-[#333] sm:text-xl">{copy.headline}</p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-[#444] sm:text-lg">{copy.body}</p>

          {error && resolved !== "network" && import.meta.env.DEV && (
            <p className="mt-4 max-w-lg break-words rounded-lg bg-black/5 px-3 py-2 text-left font-mono text-xs text-[#666]">
              {error.message}
            </p>
          )}

          <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
            {actions ?? (
              <>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex items-center justify-center rounded-full bg-[#1a1a1a] px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                  >
                    Try again
                  </button>
                )}
                <Link
                  to="/"
                  className="inline-flex items-center justify-center rounded-full border border-[#ccc] bg-white px-6 py-2.5 text-sm font-medium text-[#1a1a1a] transition-colors hover:bg-[#f5f5f5]"
                >
                  Go home
                </Link>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export function renderSadnessErrorHtml(variant: SadnessErrorVariant = "error"): string {
  const copy = COPY[variant];
  const showRetry = variant === "error" || variant === "network";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${copy.title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      * { box-sizing: border-box; }
      body { font: 16px/1.5 "Segoe UI", system-ui, -apple-system, sans-serif; background: #fff; color: #1a1a1a; margin: 0; min-height: 100vh; }
      header { border-bottom: 1px solid rgba(0,0,0,.05); padding: 1.25rem 2.5rem; }
      header a { color: #1a1a1a; font-weight: 600; font-size: 1.25rem; text-decoration: none; }
      main { max-width: 72rem; margin: 0 auto; padding: 2.5rem 2.5rem 4rem; display: grid; gap: 2.5rem; align-items: center; }
      @media (min-width: 1024px) { main { grid-template-columns: 1fr 1.1fr; gap: 4rem; padding-top: 4rem; } }
      img { width: 100%; max-width: 28rem; height: auto; display: block; margin: 0 auto; }
      @media (min-width: 1024px) { img { margin: 0; } .copy { text-align: left; } }
      .copy { text-align: center; }
      .headline { font-size: 1.125rem; color: #333; margin: 0; }
      h1 { font-size: clamp(1.75rem, 4vw, 2.75rem); font-weight: 600; line-height: 1.15; margin: .75rem 0 0; }
      p { color: #444; font-size: 1.05rem; max-width: 32rem; margin: 1rem 0 0; }
      .actions { display: flex; flex-wrap: wrap; gap: .75rem; justify-content: center; margin-top: 2rem; }
      @media (min-width: 1024px) { .actions { justify-content: flex-start; } }
      a, button { padding: .625rem 1.5rem; border-radius: 9999px; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; font-size: .875rem; font-weight: 500; }
      .primary { background: #1a1a1a; color: #fff; }
      .secondary { background: #fff; color: #1a1a1a; border-color: #ccc; }
    </style>
  </head>
  <body>
    <header><a href="/">KaLI</a></header>
    <main>
      <img src="/sadness.png" alt="Sadness looking distressed" width="640" height="640" />
      <div class="copy">
        <p class="headline">${copy.headline}</p>
        <h1>${copy.title}</h1>
        <p>${copy.body}</p>
        <div class="actions">
          ${showRetry ? '<button class="primary" onclick="location.reload()">Try again</button>' : ""}
          <a class="secondary" href="/">Go home</a>
        </div>
      </div>
    </main>
  </body>
</html>`;
}
