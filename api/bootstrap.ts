import { getDashboardSnapshot } from "./_lib/db.js";
import { requireAuth } from "./_lib/auth.js";
import { allowMethod, handleError, json } from "./_lib/http.js";

export default async function handler(req: any, res: any) {
  if (!allowMethod(req, res, ["GET"])) return;

  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    json(res, 200, await getDashboardSnapshot());
  } catch (error) {
    handleError(res, error);
  }
}
