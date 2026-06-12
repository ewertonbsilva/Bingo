import { getAuthenticatedUser } from "../_lib/auth.js";
import { allowMethod, handleError, json } from "../_lib/http.js";

export default async function handler(req: any, res: any) {
  if (!allowMethod(req, res, ["GET"])) return;

  try {
    const user = await getAuthenticatedUser(req);
    json(res, 200, { authenticated: Boolean(user), user });
  } catch (error) {
    handleError(res, error);
  }
}
