import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(root, "..");
const standaloneRoot = path.join(appRoot, ".next", "standalone");
const staticSrc = path.join(appRoot, ".next", "static");
const staticDest = path.join(standaloneRoot, ".next", "static");
const publicSrc = path.join(appRoot, "public");
const publicDest = path.join(standaloneRoot, "public");

if (!existsSync(standaloneRoot)) {
  console.log("[prepare-standalone] No .next/standalone found — skipping.");
  process.exit(0);
}

mkdirSync(path.dirname(staticDest), { recursive: true });

if (existsSync(staticSrc)) {
  cpSync(staticSrc, staticDest, { recursive: true });
  console.log("[prepare-standalone] Copied .next/static → standalone");
}

if (existsSync(publicSrc)) {
  cpSync(publicSrc, publicDest, { recursive: true });
  console.log("[prepare-standalone] Copied public → standalone/public");
}

console.log("[prepare-standalone] Ready. Deploy .next/standalone and run: node server.js");
