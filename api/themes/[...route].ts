import {
  addWord,
  createTheme,
  deleteTheme,
  getTheme,
  importWords,
  listThemes,
  removeWord,
  resetThemeWords,
  setSelectedTheme,
  updateTheme,
  updateWord,
} from "../_lib/db.js";
import { requireAuth } from "../_lib/auth.js";
import { allowMethod, getQueryNumber, getQueryString, handleError, json, readJsonBody } from "../_lib/http.js";

export default async function handler(req: any, res: any) {
  const route = Array.isArray(req.query?.route) ? req.query.route : [getQueryString(req.query?.route)].filter(Boolean);

  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (route.length === 0) {
      if (!allowMethod(req, res, ["GET", "POST"])) return;

      if (req.method === "GET") {
        json(res, 200, await listThemes());
        return;
      }

      const body = await readJsonBody<{ name?: string; preset?: "romantic" | "dark" | "light" }>(req);
      json(res, 201, await createTheme(String(body.name ?? ""), body.preset ?? "romantic"));
      return;
    }

    if (route[0] === "select") {
      if (!allowMethod(req, res, ["POST"])) return;
      const body = await readJsonBody<{ themeId?: number }>(req);
      json(res, 200, await setSelectedTheme(Number(body.themeId)));
      return;
    }

    const themeId = getQueryNumber(route[0]);

    if (route.length === 1) {
      if (!allowMethod(req, res, ["GET", "PATCH", "DELETE"])) return;

      if (req.method === "GET") {
        json(res, 200, await getTheme(themeId));
        return;
      }

      if (req.method === "DELETE") {
        json(res, 200, await deleteTheme(themeId));
        return;
      }

      const body = await readJsonBody<{ name?: string; preset?: "romantic" | "dark" | "light"; cardTitle?: string }>(req);
      json(res, 200, await updateTheme(themeId, body));
      return;
    }

    if (route[1] !== "words") {
      json(res, 404, { error: "Rota nao encontrada." });
      return;
    }

    if (route.length === 2) {
      if (!allowMethod(req, res, ["POST", "PUT"])) return;

      if (req.method === "POST") {
        const body = await readJsonBody<{ word?: string }>(req);
        json(res, 200, { words: await addWord(themeId, String(body.word ?? "")) });
        return;
      }

      const body = await readJsonBody<{ oldWord?: string; newWord?: string }>(req);
      json(res, 200, {
        words: await updateWord(themeId, String(body.oldWord ?? ""), String(body.newWord ?? "")),
      });
      return;
    }

    if (route[2] === "reset") {
      if (!allowMethod(req, res, ["POST"])) return;
      json(res, 200, { words: await resetThemeWords(themeId) });
      return;
    }

    if (route[2] === "import") {
      if (!allowMethod(req, res, ["POST"])) return;
      const body = await readJsonBody<{ rawText?: string }>(req);
      json(res, 200, await importWords(themeId, String(body.rawText ?? "")));
      return;
    }

    if (!allowMethod(req, res, ["DELETE"])) return;
    json(res, 200, { words: await removeWord(themeId, decodeURIComponent(route[2])) });
  } catch (error) {
    handleError(res, error, "Erro interno do servidor.", route.length === 1 && req.method === "GET" ? 404 : 400);
  }
}
