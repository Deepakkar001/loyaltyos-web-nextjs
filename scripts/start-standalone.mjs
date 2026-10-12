import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.PORT = process.env.PORT || "3001";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const server = path.join(root, ".next", "standalone", "server.js");

const child = spawn(process.execPath, [server], {
  stdio: "inherit",
  env: process.env,
  cwd: path.join(root, ".next", "standalone"),
});

child.on("exit", (code) => process.exit(code ?? 0));
