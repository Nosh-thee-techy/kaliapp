import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "frontend", ".vercel", "output");
const dest = path.join(root, ".vercel", "output");

if (!existsSync(src)) {
  console.log("[vercel] No frontend/.vercel/output — skipping (local node-server build)");
  process.exit(0);
}

rmSync(path.join(root, ".vercel"), { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log("[vercel] Prepared", dest);
