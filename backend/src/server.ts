import { createServer } from "node:http";
import { notFound, isAppError } from "./errors";
import { log } from "./log";

const users = new Map<string, { id: string; name: string }>([["1", { id: "1", name: "Ada" }]]);

export function handleGetUser(id: string) {
  const u = users.get(id);
  if (!u) throw notFound(`user ${id}`);
  return u;
}

createServer((req, res) => {
  try {
    const id = (req.url || "/").split("/").pop() || "";
    res.end(JSON.stringify(handleGetUser(id)));
  } catch (e) {
    if (isAppError(e)) { res.statusCode = 404; res.end(JSON.stringify({ code: e.code })); }
    else { log.error("unhandled", { err: String(e) }); res.statusCode = 500; res.end(); }
  }
}).listen(0);
