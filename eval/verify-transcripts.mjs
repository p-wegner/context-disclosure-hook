// Verifies from the eval session transcripts that the hook fired, which tool triggered it, which
// guidance it disclosed, and that no file was injected more than once per session.
//   node eval/verify-transcripts.mjs [eval/results/<run>.json]   (from the repo root)
import fs from "fs";
const r = JSON.parse(fs.readFileSync(process.argv[2] || "eval/results/2026-08-26-sonnet-reps2.json", "utf8"));
for (const run of r) {
  const lines = fs.readFileSync(run.transcript, "utf8").split("\n").filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  let lastTool = "?", seq = 0; const inj = []; const errs = []; const perSrc = {};
  for (const e of lines) {
    if (e.type === "assistant") for (const c of e.message?.content || []) if (c.type === "tool_use") { seq++; lastTool = `${c.name}#${seq}`; }
    const a = e.attachment; if (!a) continue;
    if (a.type === "hook_non_blocking_error") { errs.push(lastTool); continue; }
    if (a.type !== "hook_additional_context") continue;
    const txt = Array.isArray(a.content) ? a.content.join(" ") : String(a.content ?? JSON.stringify(a));
    const srcs = [...txt.matchAll(/<disclosed-context source="([^"]+)"/g)].map(m => m[1]);
    inj.push({ after: lastTool, srcs });
    for (const s of srcs) perSrc[s] = (perSrc[s] || 0) + 1;
  }
  const dup = Object.entries(perSrc).filter(([, n]) => n > 1);
  console.log(`${run.key.padEnd(5)} ${run.arm.padEnd(7)} rep${run.rep}  injections=${inj.length} files=${Object.keys(perSrc).length} dupes=${dup.length ? JSON.stringify(dup) : "none"} hookErrors=${errs.length}`);
  for (const i of inj) console.log(`     after ${i.after.padEnd(14)} -> ${i.srcs.join(", ") || "(no disclosed-context block)"}`);
}
