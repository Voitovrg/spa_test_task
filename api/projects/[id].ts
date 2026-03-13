import { handleOptions, readJsonBody, sendMethodNotAllowed, sendNotFound, store } from "../_lib/store";

function parseId(raw: unknown): number | undefined {
  const n = typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : NaN;
  return Number.isFinite(n) ? n : undefined;
}

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") return handleOptions(res);

  const id = parseId(req.query?.id);
  if (!id) return sendNotFound(res);

  if (req.method === "PATCH") {
    const patch = await readJsonBody(req);
    const updated = store.patchProject(id, patch);
    if (!updated) return sendNotFound(res);
    return store.json(res, 200, updated);
  }

  if (req.method === "DELETE") {
    const ok = store.deleteProject(id);
    if (!ok) return sendNotFound(res);
    res.statusCode = 204;
    res.end();
    return;
  }

  return sendMethodNotAllowed(res);
}

