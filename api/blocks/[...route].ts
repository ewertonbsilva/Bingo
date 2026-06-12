import { listBlocks, updateBlockPrintRange } from "../_lib/db.js";
import { requireAuth } from "../_lib/auth.js";
import { allowMethod, getQueryNumber, getQueryString, handleError, json, readJsonBody } from "../_lib/http.js";

export default async function handler(req: any, res: any) {
  const route = Array.isArray(req.query?.route) ? req.query.route : [getQueryString(req.query?.route)].filter(Boolean);

  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (route.length === 0) {
      if (!allowMethod(req, res, ["GET"])) return;
      const themeId = req.query?.themeId ? getQueryNumber(req.query.themeId) : undefined;
      json(res, 200, { blocks: await listBlocks(themeId) });
      return;
    }

    if (!allowMethod(req, res, ["PATCH"])) return;
    if (route[1] !== "print-range") {
      json(res, 404, { error: "Rota nao encontrada." });
      return;
    }

    const blockId = getQueryNumber(route[0]);
    const body = await readJsonBody<{ printedStart?: number; printedEnd?: number }>(req);
    json(res, 200, await updateBlockPrintRange(blockId, Number(body.printedStart), Number(body.printedEnd)));
  } catch (error) {
    handleError(res, error, "Erro interno do servidor.", 400);
  }
}
