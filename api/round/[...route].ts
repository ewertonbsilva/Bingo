import {
  drawWordForRound,
  endRound,
  getActiveRound,
  pauseRound,
  resetRound,
  resumeRound,
  saveBlockAndRound,
} from "../_lib/db.js";
import { requireAuth } from "../_lib/auth.js";
import { allowMethod, getQueryString, handleError, json, readJsonBody } from "../_lib/http.js";

export default async function handler(req: any, res: any) {
  const route = Array.isArray(req.query?.route) ? req.query.route : [getQueryString(req.query?.route)].filter(Boolean);
  const action = route[0] || "";

  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (!action) {
      if (!allowMethod(req, res, ["GET"])) return;
      json(res, 200, { round: await getActiveRound() });
      return;
    }

    if (!allowMethod(req, res, ["POST"])) return;

    if (action === "start") {
      const body = await readJsonBody<{
        themeId?: number;
        name?: string;
        type?: "3x3" | "5x5";
        victoryModes?: Array<"horizontal" | "vertical" | "diagonal" | "diagonal_inverse" | "full_card">;
        cards?: Array<{ code: string; grid: string[][] }>;
      }>(req);
      const round = await saveBlockAndRound({
        themeId: Number(body.themeId),
        name: String(body.name ?? "Bloco"),
        type: body.type ?? "5x5",
        victoryModes: body.victoryModes ?? ["full_card"],
        cards: body.cards ?? [],
      });
      json(res, 201, { round });
      return;
    }

    if (action === "draw") {
      const round = await drawWordForRound();
      if (!round) {
        json(res, 400, { error: "Nao ha rodada ativa ou nao restam palavras." });
        return;
      }
      json(res, 200, { round });
      return;
    }

    if (action === "pause") {
      json(res, 200, { round: await pauseRound() });
      return;
    }

    if (action === "resume") {
      json(res, 200, { round: await resumeRound() });
      return;
    }

    if (action === "reset") {
      json(res, 200, { round: await resetRound() });
      return;
    }

    if (action === "end") {
      await endRound();
      json(res, 200, { round: null });
      return;
    }

    json(res, 404, { error: "Rota nao encontrada." });
  } catch (error) {
    handleError(res, error, "Erro interno do servidor.", 400);
  }
}
