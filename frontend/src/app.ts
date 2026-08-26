import { getUser } from "./api";
export async function boot() { const u = await getUser("1"); document.title = u.name; }
