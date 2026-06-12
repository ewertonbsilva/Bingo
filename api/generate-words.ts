import { GoogleGenAI, Type } from "@google/genai";
import "./_lib/env.js";
import { requireAuth } from "./_lib/auth.js";
import { allowMethod, handleError, json, readJsonBody } from "./_lib/http.js";

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

export default async function handler(req: any, res: any) {
  if (!allowMethod(req, res, ["POST"])) return;

  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const body = await readJsonBody<{ existingWords?: string[]; themeName?: string }>(req);
    const existingWords = body.existingWords ?? [];
    const themeName = body.themeName ?? "";

    if (!ai) {
      json(res, 200, { words: buildFallbackWords(existingWords) });
      return;
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
      const words = (result.words || [])
        .map((item: string) => normalizeGeneratedWord(item))
        .filter((item: string) => item.length > 2 && item.length <= 16 && !existingWords.includes(item) && !/^(X|Y|Z)+$/.test(item));

      json(res, 200, { words: words.length > 0 ? words : buildFallbackWords(existingWords) });
    } catch (error) {
      console.error("Gemini Generation Error:", error);
      json(res, 200, { words: buildFallbackWords(existingWords) });
    }
  } catch (error) {
    handleError(res, error, "Erro ao gerar palavras usando IA.");
  }
}
