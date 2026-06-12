import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import {
  addWord,
  createTheme,
  deleteTheme,
  drawWordForRound,
  endRound,
  getActiveRound,
  getDashboardSnapshot,
  getTheme,
  importWords,
  listBlocks,
  listThemes,
  pauseRound,
  removeWord,
  resetRound,
  resetThemeWords,
  resumeRound,
  saveBlockAndRound,
  setSelectedTheme,
  updateBlockPrintRange,
  updateTheme,
  updateWord,
} from "./db";

dotenv.config();

function normalizeGeneratedWord(value: string) {
  const sanitized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[^a-zA-Z\s]/g, " ")
    .replace(/\s+/g, " ");

  return sanitized
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("")
    .slice(0, 16);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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

  app.get("/api/bootstrap", (_req, res) => {
    res.json(getDashboardSnapshot());
  });

  app.get("/api/themes", (_req, res) => {
    res.json(listThemes());
  });

  app.post("/api/themes", (req, res) => {
    try {
      const { name, preset = "romantic" } = req.body ?? {};
      const theme = createTheme(String(name ?? ""), preset);
      res.status(201).json(theme);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/themes/:themeId", (req, res) => {
    try {
      const result = deleteTheme(Number(req.params.themeId));
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/themes/select", (req, res) => {
    try {
      const theme = setSelectedTheme(Number(req.body?.themeId));
      res.json(theme);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/themes/:themeId", (req, res) => {
    try {
      res.json(getTheme(Number(req.params.themeId)));
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  });

  app.patch("/api/themes/:themeId", (req, res) => {
    try {
      const theme = updateTheme(Number(req.params.themeId), {
        name: req.body?.name,
        preset: req.body?.preset,
        cardTitle: req.body?.cardTitle,
      });
      res.json(theme);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/themes/:themeId/words", (req, res) => {
    try {
      const words = addWord(Number(req.params.themeId), String(req.body?.word ?? ""));
      res.json({ words });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/themes/:themeId/words", (req, res) => {
    try {
      const words = updateWord(Number(req.params.themeId), String(req.body?.oldWord ?? ""), String(req.body?.newWord ?? ""));
      res.json({ words });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/themes/:themeId/words/:word", (req, res) => {
    try {
      const words = removeWord(Number(req.params.themeId), decodeURIComponent(req.params.word));
      res.json({ words });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/themes/:themeId/words/import", (req, res) => {
    try {
      const result = importWords(Number(req.params.themeId), String(req.body?.rawText ?? ""));
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/themes/:themeId/words/reset", (req, res) => {
    try {
      const words = resetThemeWords(Number(req.params.themeId));
      res.json({ words });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/blocks", (req, res) => {
    const themeId = req.query.themeId ? Number(req.query.themeId) : undefined;
    res.json({ blocks: listBlocks(themeId) });
  });

  app.patch("/api/blocks/:blockId/print-range", (req, res) => {
    try {
      const block = updateBlockPrintRange(Number(req.params.blockId), Number(req.body?.printedStart), Number(req.body?.printedEnd));
      res.json(block);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/round", (_req, res) => {
    res.json({ round: getActiveRound() });
  });

  app.post("/api/round/start", (req, res) => {
    try {
      const { themeId, name, type, victoryModes, cards } = req.body ?? {};
      const round = saveBlockAndRound({
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

  app.post("/api/round/draw", (_req, res) => {
    const round = drawWordForRound();
    if (!round) {
      res.status(400).json({ error: "Nao ha rodada ativa ou nao restam palavras." });
      return;
    }
    res.json({ round });
  });

  app.post("/api/round/pause", (_req, res) => {
    res.json({ round: pauseRound() });
  });

  app.post("/api/round/resume", (_req, res) => {
    res.json({ round: resumeRound() });
  });

  app.post("/api/round/reset", (_req, res) => {
    res.json({ round: resetRound() });
  });

  app.post("/api/round/end", (_req, res) => {
    endRound();
    res.json({ round: null });
  });

  app.post("/api/generate-words", async (req, res) => {
    try {
      const { existingWords = [], themeName = "" } = req.body;

      if (!ai) {
        const fallbackOptions = [
          "ADORACAO", "ALIANCA", "AMIZADE", "BONDADE", "CARIDADE",
          "DEVOCAO", "ESPERANCA", "FIDELIDADE", "HONRA", "MUTUO",
          "SINCERIDADE", "TERNURA", "SABEDORIA", "CONSELHO", "ORACAO"
        ];
        const newWords = fallbackOptions.filter((w) => !existingWords.includes(w)).slice(0, 5);
        return res.json({ words: newWords });
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

      res.json({ words: generatedWords });
    } catch (error: any) {
      console.error("Gemini Generation Error:", error);
      res.status(500).json({ error: "Erro ao gerar palavras usando IA." });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
