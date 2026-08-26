export async function getUser(id: string) {
  const r = await fetch(`/api/users/${id}`);
  if (!r.ok) throw new Error(`user ${id}: ${r.status}`);
  return r.json() as Promise<{ id: string; name: string }>;
}
