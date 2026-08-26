#!/usr/bin/env node
// Fires N concurrent synthetic PostToolUse payloads for ONE session id at the hook and counts
// how many of them inject guidance. Correct answer is exactly 1 — Claude Code runs the hooks
// of parallel tool calls in one turn concurrently, and before the mkdir-lock the pre-fix hook
// injected 5 of 8 here (eval run grep/hook rep1 showed the same guidance twice, 63 ms apart).
//
//   node eval/race-test.mjs [N]        (run from the repo root)
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const N = Number(process.argv[2] || 8);
const stateDir = join(tmpdir(), `disclose-race-${process.pid}`);
const payload = JSON.stringify({
  session_id: `race-${process.pid}`, tool_name: "Grep", cwd: process.cwd(),
  tool_input: { pattern: "AppError", path: "backend/src" },
  tool_response: { filenames: ["backend/src/errors.ts", "backend/src/server.ts"] },
});
let done = 0, injected = 0;
for (let i = 0; i < N; i++) {
  const p = spawn(process.execPath, [".claude/hooks/disclose-context.mjs"], { windowsHide: true, env: { ...process.env, DISCLOSE_STATE_DIR: stateDir } });
  let out = ""; p.stdout.on("data", (d) => (out += d));
  p.on("close", () => {
    if (out.includes("disclosed-context")) injected++;
    if (++done === N) {
      rmSync(stateDir, { recursive: true, force: true });
      console.log(`concurrent=${N} injected=${injected} ${injected === 1 ? "OK" : "FAIL (expected exactly 1)"}`);
      process.exit(injected === 1 ? 0 : 1);
    }
  });
  p.stdin.end(payload);
}
