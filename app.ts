import express from "express";
import crypto from "node:crypto";
import { GoogleGenAI, Type } from "@google/genai";
import "./env.ts";
import {
  addWord,
  authenticateUser,
  createUser,
  createTheme,
  deleteUser,
  deleteTheme,
  drawWordForRound,
  endRound,
  getActiveRound,
  getDashboardSnapshot,
  getTheme,
  getUserById,
  importWords,
  listBlocks,
  listThemes,
  listUsers,
  pauseRound,
  removeWord,
  resetRound,
  resetThemeWords,
  resumeRound,
  saveBlockAndRound,
  setSelectedTheme,
  updateBlockPrintRange,
  updateTheme,
  updateUser,
  updateWord,
} from "./db.ts";

function normalizeGeneratedWord(value: string) {
  const sanitized = value
    .trim()
    .replace(/[^\p{L}\s]/gu, " ")
    .replace(/\s+/g, " ");

  return sanitized
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("")
    .slice(0, 16);
}

const fallbackOptions = [
  "Adoracao", "Alianca", "Amizade", "Bondade", "Caridade",
  "Devocao", "Esperanca", "Fidelidade", "Honra", "Mutuo",
  "Sinceridade", "Ternura", "Sabedoria", "Conselho", "Oracao",
];

function buildFallbackWords(existingWords: string[]) {
  return fallbackOptions.filter((word) => !existingWords.includes(word)).slice(0, 5);
}

export function createApp() {
  const app = express();
  app.use(express.json());

  const authSecret = process.env.AUTH_SECRET || "bingo-tematico-dev-secret";

  const createToken = (userId: number) => {
    const payload = String(userId);
    const signature = crypto.createHmac("sha256", authSecret).update(payload).digest("hex");
    return `${payload}.${signature}`;
  };

  const readCookie = (cookieHeader = "", name: string) => {
    return cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`))
      ?.slice(name.length + 1);
  };

  const getAuthenticatedUser = async (req: express.Request) => {
    const raw = readCookie(req.headers.cookie, "bingo_auth");
    if (!raw) return null;
    const [userIdText, signature] = raw.split(".");
    if (!userIdText || !signature) return null;
    const expected = crypto.createHmac("sha256", authSecret).update(userIdText).digest("hex");
    if (signature !== expected) return null;
    const userId = Number(userIdText);
    if (!Number.isFinite(userId)) return null;
    return getUserById(userId);
  };

  const setAuthCookie = (res: express.Response, userId: number) => {
    const token = createToken(userId);
    const secure = process.env.NODE_ENV === "production";
    res.setHeader("Set-Cookie", `bingo_auth=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure ? "; Secure" : ""}`);
  };

  const clearAuthCookie = (res: express.Response) => {
    const secure = process.env.NODE_ENV === "production";
    res.setHeader("Set-Cookie", `bingo_auth=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`);
  };

  const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: "Sessao expirada. Faca login novamente." });
      return;
    }
    (req as any).authUser = user;
    next();
  };

  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = (req as any).authUser;
    if (!user || user.role !== "admin") {
      res.status(403).json({ error: "Acesso permitido apenas para administradores." });
      return;
    }
    next();
  };

  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey
    ? new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      })
    : null;

  app.get("/api/auth/bootstrap", async (req, res) => {
    const user = await getAuthenticatedUser(req);
    res.json({ authenticated: Boolean(user), user });
  });

  app.post("/api/auth/login", async (req, res) => {
    const username = String(req.body?.username ?? "");
    const password = String(req.body?.password ?? "");
    const user = await authenticateUser(username, password);
    if (!user) {
      res.status(401).json({ error: "Usuario ou senha invalidos." });
      return;
    }
    setAuthCookie(res, user.id);
    res.json({ user });
  });

  app.post("/api/auth/logout", (_req, res) => {
    clearAuthCookie(res);
    res.json({ success: true });
  });

  app.use("/api", (req, res, next) => {
    if (req.path.startsWith("/auth/")) {
      next();
      return;
    }
    requireAuth(req, res, next);
  });

  app.get("/api/bootstrap", async (_req, res) => {
    res.json(await getDashboardSnapshot());
  });

  app.get("/api/users", requireAdmin, async (_req, res) => {
    res.json({ users: await listUsers() });
  });

  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const user = await createUser({
        username: String(req.body?.username ?? ""),
        name: String(req.body?.name ?? ""),
        password: String(req.body?.password ?? ""),
        role: req.body?.role === "admin" ? "admin" : "operator",
      });
      res.status(201).json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/users/:userId", requireAdmin, async (req, res) => {
    try {
      const user = await updateUser(Number(req.params.userId), {
        username: req.body?.username,
        name: req.body?.name,
        password: req.body?.password,
        role: req.body?.role === "admin" ? "admin" : req.body?.role === "operator" ? "operator" : undefined,
        isActive: typeof req.body?.isActive === "boolean" ? req.body.isActive : undefined,
      });
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/users/:userId", requireAdmin, async (req, res) => {
    try {
      const users = await deleteUser(Number(req.params.userId));
      res.json({ users });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/themes", async (_req, res) => {
    res.json(await listThemes());
  });

  app.post("/api/themes", async (req, res) => {
    try {
      const { name, preset = "romantic" } = req.body ?? {};
      const theme = await createTheme(String(name ?? ""), preset);
      res.status(201).json(theme);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/themes/:themeId", async (req, res) => {
    try {
      const result = await deleteTheme(Number(req.params.themeId));
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/themes/select", async (req, res) => {
    try {
      const theme = await setSelectedTheme(Number(req.body?.themeId));
      res.json(theme);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/themes/:themeId", async (req, res) => {
    try {
      res.json(await getTheme(Number(req.params.themeId)));
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  });

  app.patch("/api/themes/:themeId", async (req, res) => {
    try {
      const theme = await updateTheme(Number(req.params.themeId), {
        name: req.body?.name,
        preset: req.body?.preset,
        cardTitle: req.body?.cardTitle,
      });
      res.json(theme);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/themes/:themeId/words", async (req, res) => {
    try {
      const words = await addWord(Number(req.params.themeId), String(req.body?.word ?? ""));
      res.json({ words });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/themes/:themeId/words", async (req, res) => {
    try {
      const words = await updateWord(Number(req.params.themeId), String(req.body?.oldWord ?? ""), String(req.body?.newWord ?? ""));
      res.json({ words });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/themes/:themeId/words/:word", async (req, res) => {
    try {
      const words = await removeWord(Number(req.params.themeId), decodeURIComponent(req.params.word));
      res.json({ words });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/themes/:themeId/words/import", async (req, res) => {
    try {
      const result = await importWords(Number(req.params.themeId), String(req.body?.rawText ?? ""));
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/themes/:themeId/words/reset", async (req, res) => {
    try {
      const words = await resetThemeWords(Number(req.params.themeId));
      res.json({ words });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/blocks", async (req, res) => {
    const themeId = req.query.themeId ? Number(req.query.themeId) : undefined;
    res.json({ blocks: await listBlocks(themeId) });
  });

  app.patch("/api/blocks/:blockId/print-range", async (req, res) => {
    try {
      const block = await updateBlockPrintRange(Number(req.params.blockId), Number(req.body?.printedStart), Number(req.body?.printedEnd));
      res.json(block);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/round", async (_req, res) => {
    res.json({ round: await getActiveRound() });
  });

  app.post("/api/round/start", async (req, res) => {
    try {
      const { themeId, name, type, victoryModes, cards } = req.body ?? {};
      const round = await saveBlockAndRound({
        themeId: Number(themeId),
        name: String(name ?? "Bloco"),
        type,
        victoryModes,
        cards,
      });
      res.status(201).json({ round });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/round/draw", async (_req, res) => {
    const round = await drawWordForRound();
    if (!round) {
      res.status(400).json({ error: "Nao ha rodada ativa ou nao restam palavras." });
      return;
    }
    res.json({ round });
  });

  app.post("/api/round/pause", async (_req, res) => {
    res.json({ round: await pauseRound() });
  });

  app.post("/api/round/resume", async (_req, res) => {
    res.json({ round: await resumeRound() });
  });

  app.post("/api/round/reset", async (_req, res) => {
    res.json({ round: await resetRound() });
  });

  app.post("/api/round/end", async (_req, res) => {
    await endRound();
    res.json({ round: null });
  });

  app.post("/api/generate-words", async (req, res) => {
    try {
      const { existingWords = [], themeName = "" } = req.body;

      if (!ai) {
        return res.json({ words: buildFallbackWords(existingWords) });
      }

      const prompt = `Gere uma lista de 8 novas palavras em portugues para um bingo tematico.

Tema do evento: ${themeName || "Bingo Tematico"}.

As palavras precisam combinar com esse tema especifico. Se o tema for um aniversario, use termos ligados a aniversario. Se for casamento, use termos de casamento. Se for igreja, use termos de igreja. Evite palavras genericas que nao tenham relacao clara com o tema informado.

Regras:
1. Nao retorne nenhuma destas palavras: ${existingWords.join(", ")}.
2. Maximo de 16 caracteres.
3. Pode ser uma palavra ou expressao curta.
4. Sem simbolos ou pontuacao.
5. Nao use pontuacao nem numeros.
6. Priorize palavras realmente relacionadas ao tema informado.
7. Use apenas palavras reais, comuns e corretas na ortografia do portugues do Brasil.
8. Nao invente palavras, nao use abreviacoes, nao junte duas palavras em uma e nao use termos truncados.
9. Se estiver em duvida sobre uma palavra, descarte e escolha outra mais simples e correta.
10. Retorne um array JSON com as palavras.`;

      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            temperature: 0.35,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                words: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ["words"],
            },
          },
        });

        const result = JSON.parse(response.text || "{}");
        const generatedWords = (result.words || [])
          .map((w: string) => normalizeGeneratedWord(w))
          .filter((w: string) => w.length > 2 && w.length <= 16 && !existingWords.includes(w) && !/^(X|Y|Z)+$/.test(w));

        res.json({ words: generatedWords.length > 0 ? generatedWords : buildFallbackWords(existingWords) });
      } catch (error: any) {
        console.error("Gemini Generation Error:", error);
        res.json({ words: buildFallbackWords(existingWords) });
      }
    } catch (error: any) {
      res.status(500).json({ error: "Erro ao gerar palavras usando IA." });
    }
  });

  return app;
}
