#!/usr/bin/env node
// Deploys the astrox-api Worker only from a clean, pushed commit so production always matches Git.
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const fail = message => { console.error(`deploy-worker: ${message}`); process.exit(1); };
const dryRun = process.argv.includes("--dry-run");

const dirty = git("status", "--porcelain", "--untracked-files=normal", "--", "services", "migrations", "functions");
if (dirty) fail(`working tree has uncommitted changes under services/, migrations/ or functions/:\n${dirty}\nCommit or stash them first.`);

const head = git("rev-parse", "HEAD");
if (!dryRun) {
  for (const remote of ["origin", "upstream"]) {
    const contains = spawnSync("git", ["branch", "-r", "--contains", head, "--list", `${remote}/*`], { cwd: root, encoding: "utf8" });
    if (!contains.stdout.trim()) fail(`commit ${head.slice(0, 7)} is not on ${remote}. Push to both remotes before deploying.`);
  }
}

const args = ["wrangler", "deploy", "--config", "services/backend/wrangler.jsonc", "--keep-vars", "--message", `git ${head}`];
if (dryRun) args.push("--dry-run", "--outdir", "/tmp/astrox-worker-dry-run");
console.log(`deploy-worker: ${dryRun ? "dry run of" : "deploying"} ${head.slice(0, 7)}`);
const result = spawnSync("npx", args, { cwd: root, stdio: "inherit" });
process.exit(result.status ?? 1);
