import { handleOptions, readJsonBody, sendMethodNotAllowed, store } from "../_lib/store";

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") return handleOptions(res);

  if (req.method === "GET") {
    return store.json(res, 200, store.listProjects());
  }

  if (req.method === "POST") {
    const payload = await readJsonBody(req);
    if (!payload?.name || typeof payload.name !== "string") {
      return store.json(res, 400, { message: "Validation error", errors: { name: ["Required"] } });
    }
    const created = store.createProject(payload);
    return store.json(res, 201, created);
  }

  return sendMethodNotAllowed(res);
}

