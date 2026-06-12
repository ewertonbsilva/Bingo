import { clearAuthCookie } from "../_lib/auth.js";
import { allowMethod, handleError, json } from "../_lib/http.js";

export default async function handler(req: any, res: any) {
  if (!allowMethod(req, res, ["POST"])) return;

  try {
    clearAuthCookie(res);
    json(res, 200, { success: true });
  } catch (error) {
    handleError(res, error);
  }
}
