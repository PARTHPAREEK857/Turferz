#!/usr/bin/env node
/**
 * Command launcher that adds the --experimental-sqlite flag only when the
 * current Node needs it (Node 22 gates node:sqlite behind the flag; Node 24
 * has it stable and may reject the flag). Keeps one codebase runnable on
 * local dev (Node 22) and on Vercel (Node 24) without script changes.
 */

const { spawnSync } = require("node:child_process");

let needsFlag = false;
try {
  require("node:sqlite");
} catch {
  needsFlag = true;
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("usage: node scripts/launcher.cjs <command> [args...]");
  process.exit(1);
}

const env = { ...process.env };
if (needsFlag) {
  env.NODE_OPTIONS = `${env.NODE_OPTIONS || ""} --experimental-sqlite`.trim();
}

const result = spawnSync(args[0], args.slice(1), {
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
