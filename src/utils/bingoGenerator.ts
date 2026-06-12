import { Card, BingoType } from "../types";

/**
 * Shuffles an array in place using Durstenfeld shuffle.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generates N unique Bingo cards.
 * Ensures that no two cards have the exact same sequential arrangement of words.
 */
export function generateBingoCards(
  wordBank: string[],
  type: BingoType,
  count: number
): Card[] {
  const cards: Card[] = [];
  const generatedHashes = new Set<string>();

  const requiredWordsCount = type === "3x3" ? 8 : 24;

  if (wordBank.length < requiredWordsCount) {
    throw new Error(
      `Palavras insuficientes. Necessário no mínimo ${requiredWordsCount} palavras, mas possui apenas ${wordBank.length}.`
    );
  }

  let attempts = 0;
  const maxAttempts = count * 10; // Prevent infinite loop if combinations are limited

  for (let i = 0; i < count; i++) {
    if (attempts > maxAttempts) {
      console.warn("Atingido o limite de tentativas de geração única.");
      break;
    }

    // Shuffle the word bank and take the needed count of words
    const shuffledWords = shuffleArray(wordBank).slice(0, requiredWordsCount);
    
    // Hash based on current order of selected words to ensure sequence uniqueness
    const hash = shuffledWords.join("|");

    if (generatedHashes.has(hash)) {
      i--; // Retry this card
      attempts++;
      continue;
    }

    generatedHashes.add(hash);

    // Build the matrix
    const grid: string[][] = [];
    let wordIdx = 0;

    if (type === "3x3") {
      for (let r = 0; r < 3; r++) {
        const row: string[] = [];
        for (let c = 0; c < 3; c++) {
          if (r === 1 && c === 1) {
            row.push("LIVRE");
          } else {
            row.push(shuffledWords[wordIdx++]);
          }
        }
        grid.push(row);
      }
    } else {
      // 5x5
      for (let r = 0; r < 5; r++) {
        const row: string[] = [];
        for (let c = 0; c < 5; c++) {
          if (r === 2 && c === 2) {
            row.push("LIVRE");
          } else {
            row.push(shuffledWords[wordIdx++]);
          }
        }
        grid.push(row);
      }
    }

    cards.push({
      id: i + 1,
      code: `#${String(i + 1).padStart(4, "0")}`,
      grid,
    });
  }

  return cards;
}
