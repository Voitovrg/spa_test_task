import { handleOptions, readJsonBody, sendMethodNotAllowed, store } from "../_lib/store.js";

export const config = {
  runtime: "nodejs",
};

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") return handleOptions(res);

  if (req.method === "GET") {
    return store.json(res, 200, store.listTasks());
  }

  if (req.method === "POST") {
    const payload = await readJsonBody(req);
    if (!payload?.title || typeof payload.title !== "string") {
      return store.json(res, 400, { message: "Validation error", errors: { title: ["Required"] } });
    }
    if (!payload?.status || typeof payload.status !== "string") {
      return store.json(res, 400, { message: "Validation error", errors: { status: ["Required"] } });
    }
    if (!payload?.dueDate || typeof payload.dueDate !== "string") {
      return store.json(res, 400, { message: "Validation error", errors: { dueDate: ["Required"] } });
    }

    const created = store.createTask(payload);
    return store.json(res, 201, created);
  }

  return sendMethodNotAllowed(res);
}

