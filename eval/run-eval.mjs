#!/usr/bin/env node
/**
 * A/B eval: does the disclose-context hook get nested CLAUDE.md + path-scoped rules to an
 * agent that reads files via Bash / Grep instead of the Read tool?
 *
 * Each run is one `claude -p` session in this repo. Arms:
 *   control — hook installed but DISCLOSE_DISABLED=1 (identical settings, hook is a no-op)
 *   hook    — hook active
 * Prompts force a read style (bash-only / grep-tool-only) or leave it free, and ask for
 * conventions that exist ONLY in backend/CLAUDE.md and .claude/rules/backend.md.
 *
 * Verdict per run: canaries present in the answer? which tools the agent used? did Claude
 * Code itself inject a nested_memory attachment? did the hook fire? — all read back from the
 * session transcript, not guessed.
 *
 *   node eval/run-eval.mjs [--model sonnet] [--reps 1] [--prompts bash,grep,free] [--concurrency 1]
 */
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(REPO, "eval", "out");
const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => a.startsWith("--") ? [a.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] == null ? true : all[i + 1]] : []).filter(Boolean));
const MODEL = args.model || "sonnet";
const REPS = Number(args.reps || 1);
const CONC = Number(args.concurrency || 1);
const PROMPT_KEYS = String(args.prompts || "bash,grep,free").split(",");

// The task never mentions CLAUDE.md or rules. Two conventions are NOT inferable from the code:
//   backend/CLAUDE.md        → every exported error factory carries `/** @kestrel <code> */`
//   .claude/rules/backend.md → every change under backend/ adds a line to backend/CHANGES.md
const TASK = "Add an exported error factory forbidden(action: string) (HTTP 403 semantics) to backend/src/errors.ts, " +
  "following the conventions of that file, and make the request handler in backend/src/server.ts return 403 for it. " +
  "Keep the change minimal and do not ask questions.";

const PROMPTS = {
  bash: "Use ONLY the Bash tool for reading and writing (no Read, Grep, Glob, Edit or Write tools — use cat/grep/sed and heredocs). " + TASK,
  grep: "For orientation use ONLY the Grep tool (no Read, no Bash, no Glob); then apply the change with the Edit tool. " + TASK,
  free: TASK,
};

mkdirSync(OUT, { recursive: true });
const runs = [];
for (let r = 0; r < REPS; r++) for (const key of PROMPT_KEYS) for (const arm of ["control", "hook"]) runs.push({ key, arm, rep: r });

const results = [];
let idx = 0;
await Promise.all(Array.from({ length: CONC }, async () => {
  while (idx < runs.length) { const run = runs[idx++]; results.push(await runOne(run)); }
}));

// ---- report
const lines = [`# Eval — model ${MODEL}, ${results.length} runs\n`, `| prompt | arm | @kestrel tag (nested CLAUDE.md) | rule conventions | tools used | CC nested_memory | hook fired | turns | cost |`, `|---|---|---|---|---|---|---|---|---|`];
for (const r of results.sort((a, b) => a.key.localeCompare(b.key) || a.arm.localeCompare(b.arm))) {
  lines.push(`| ${r.key} | ${r.arm} | ${r.codename} | ${r.tokens.join(" ") || "—"} | ${Object.entries(r.tools).map(([k, v]) => `${k}×${v}`).join(" ") || "—"} | ${r.nestedMemory} | ${r.hookFired} | ${r.turns} | $${r.cost?.toFixed(3) ?? "?"} |`);
}
const report = lines.join("\n");
writeFileSync(join(OUT, "report.md"), report + "\n");
writeFileSync(join(OUT, "results.json"), JSON.stringify(results, null, 2));
console.log(report);

async function runOne(run) {
  const sid = randomUUID();
  const stateDir = join(OUT, "state", sid);
  const env = { ...process.env, DISCLOSE_STATE_DIR: stateDir, DISCLOSE_LOG: "1" };
  if (run.arm === "control") env.DISCLOSE_DISABLED = "1"; else delete env.DISCLOSE_DISABLED;
  const cli = ["-p", PROMPTS[run.key], "--output-format", "json", "--model", MODEL, "--dangerously-skip-permissions", "--session-id", sid];
  const t0 = Date.now();
  const { stdout, stderr } = await exec(process.env.CLAUDE_BIN || "claude", cli, { cwd: REPO, env });
  let out = {}; try { out = JSON.parse(stdout); } catch { out = { result: stdout }; }
  const text = String(out.result || "");
  const transcript = findTranscript(sid);
  const tx = transcript ? analyzeTranscript(transcript) : { tools: {}, nestedMemory: false, hookFired: false };
  // score the CHANGE, then reset backend/ + frontend/ for the next run (never `checkout -- .`: eval/ may be dirty)
  const diff = (await exec("git", ["diff", "--", "backend"], { cwd: REPO, env })).stdout +
    (await exec("git", ["status", "--porcelain", "--", "backend"], { cwd: REPO, env })).stdout;
  await exec("git", ["checkout", "--", "backend", "frontend"], { cwd: REPO, env });
  await exec("git", ["clean", "-fdq", "backend", "frontend"], { cwd: REPO, env });
  const res = {
    ...run, sid, ms: Date.now() - t0, cost: out.total_cost_usd, turns: out.num_turns,
    codename: /@kestrel/i.test(diff) ? "@kestrel ✅" : "missing ❌",
    tokens: [/CHANGES\.md/.test(diff) ? "CHANGES.md ✅" : "CHANGES.md ❌", /console\.log/.test(diff) ? "console.log ❌" : "no console.log ✅"],
    diff,
    ...tx, transcript, answerTail: text.slice(-400), stderrTail: stderr.slice(-600),
  };
  console.error(`[${run.key}/${run.arm}] ${res.codename} tokens=${res.tokens} tools=${JSON.stringify(res.tools)} nested=${res.nestedMemory} hook=${res.hookFired} ${res.ms}ms`);
  return res;
}

function findTranscript(sid) {
  const slug = REPO.replace(/[:\\/]/g, "-").replace(/^-/, "");
  for (const home of [".claude", ...(process.env.CLAUDE_CONFIG_DIR ? [] : [])]) {
    const p = join(homedir(), home, "projects", slug, `${sid}.jsonl`);
    if (existsSync(p)) return p;
  }
  if (process.env.CLAUDE_CONFIG_DIR) { const p = join(process.env.CLAUDE_CONFIG_DIR, "projects", slug, `${sid}.jsonl`); if (existsSync(p)) return p; }
  return null;
}

function analyzeTranscript(p) {
  const tools = {}; let nestedMemory = false, hookFired = false;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    if (!line) continue; let r; try { r = JSON.parse(line); } catch { continue; }
    if (r.type === "attachment" && r.attachment?.type === "nested_memory") nestedMemory = true;
    if (line.includes("<disclosed-context")) hookFired = true;
    if (r.type === "assistant") for (const b of r.message?.content || []) if (b.type === "tool_use") tools[b.name] = (tools[b.name] || 0) + 1;
  }
  return { tools, nestedMemory, hookFired };
}

function exec(cmd, argv, opts) {
  return new Promise((res) => {
    const c = spawn(cmd, argv, { ...opts, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    c.stdout.on("data", (d) => (stdout += d)); c.stderr.on("data", (d) => (stderr += d));
    c.on("close", () => res({ stdout, stderr }));
  });
}
