import { createUser, deleteUser, listUsers, updateUser } from "../_lib/db.js";
import { requireAdmin } from "../_lib/auth.js";
import { allowMethod, getQueryNumber, getQueryString, handleError, json, readJsonBody } from "../_lib/http.js";

export default async function handler(req: any, res: any) {
  const route = Array.isArray(req.query?.route) ? req.query.route : [getQueryString(req.query?.route)].filter(Boolean);

  try {
    const user = await requireAdmin(req, res);
    if (!user) return;

    if (route.length === 0) {
      if (!allowMethod(req, res, ["GET", "POST"])) return;

      if (req.method === "GET") {
        json(res, 200, { users: await listUsers() });
        return;
      }

      const body = await readJsonBody<{ username?: string; name?: string; password?: string; role?: "admin" | "operator" }>(req);
      const created = await createUser({
        username: String(body.username ?? ""),
        name: String(body.name ?? ""),
        password: String(body.password ?? ""),
        role: body.role === "admin" ? "admin" : "operator",
      });
      json(res, 201, created);
      return;
    }

    if (!allowMethod(req, res, ["PATCH", "DELETE"])) return;
    const userId = getQueryNumber(route[0]);

    if (req.method === "DELETE") {
      json(res, 200, { users: await deleteUser(userId) });
      return;
    }

    const body = await readJsonBody<{
      username?: string;
      name?: string;
      password?: string;
      role?: "admin" | "operator";
      isActive?: boolean;
    }>(req);
    json(res, 200, await updateUser(userId, body));
  } catch (error) {
    handleError(res, error, "Erro interno do servidor.", 400);
  }
}
