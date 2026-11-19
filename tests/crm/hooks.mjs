import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const STUBS = {
  "server-only": "stubs/empty.mjs",
  "next/server": "stubs/next-server.mjs",
  "@/lib/supabase/admin": "stubs/supabase-admin.mjs"
};

export async function resolve(specifier, context, next) {
  if (STUBS[specifier]) return { url: pathToFileURL(join(here, STUBS[specifier])).href, shortCircuit: true };
  if (specifier.startsWith("@/") || (specifier.startsWith(".") && context.parentURL?.startsWith("file:") && !context.parentURL.includes("/node_modules/"))) {
    const base = specifier.startsWith("@/") ? join(root, specifier.slice(2)) : fileURLToPath(new URL(specifier, context.parentURL));
    const candidates = [`${base}.ts`, `${base}.tsx`, join(base, "index.ts")];
    if (/\.(m?js|tsx?)$/.test(base)) candidates.unshift(base);
    const found = candidates.find((candidate) => existsSync(candidate));
    if (found) return { url: pathToFileURL(found).href, shortCircuit: true };
  }
  return next(specifier, context);
}
