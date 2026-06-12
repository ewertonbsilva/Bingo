import { authenticateUser } from "../_lib/db.js";
import { setAuthCookie } from "../_lib/auth.js";
import { allowMethod, handleError, json, readJsonBody } from "../_lib/http.js";

export default async function handler(req: any, res: any) {
  if (!allowMethod(req, res, ["POST"])) return;

  try {
    const body = await readJsonBody<{ username?: string; password?: string }>(req);
    const user = await authenticateUser(String(body.username ?? ""), String(body.password ?? ""));
    if (!user) {
      json(res, 401, { error: "Usuario ou senha invalidos." });
      return;
    }

    setAuthCookie(res, user.id);
    json(res, 200, { user });
  } catch (error) {
    handleError(res, error);
  }
}
