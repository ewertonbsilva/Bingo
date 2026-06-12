export type BingoType = "3x3" | "5x5";

export type VictoryMode =
  | "horizontal"
  | "vertical"
  | "diagonal"
  | "diagonal_inverse"
  | "full_card";

export interface Card {
  id: number;
  sequenceNumber?: number;
  code: string;
  grid: string[][];
}

export interface ThemePreset {
  id: number;
  name: string;
  slug: string;
  preset: "light" | "dark" | "romantic";
  cardTitle?: string;
  words?: string[];
}

export interface AppUser {
  id: number;
  username: string;
  name: string;
  role: "admin" | "operator";
  isActive: boolean;
  createdAt: string;
}

export interface CardBlockSummary {
  id: number;
  themeId: number;
  themeName?: string;
  name: string;
  type: BingoType;
  totalCards: number;
  printedStart: number | null;
  printedEnd: number | null;
  createdAt?: string;
}

export interface NearWinAlert {
  id: number;
  cardId: number;
  cardCode: string;
  sequenceNumber: number;
  matchedMode: VictoryMode;
  missingCount: number;
  missingWords: string[];
  createdAt: string;
}

export interface RoundState {
  id: number;
  themeId: number;
  blockId: number;
  blockName: string;
  isActive: boolean;
  type: BingoType;
  victoryModes: VictoryMode[];
  totalCards: number;
  cards: Card[];
  drawnWords: string[];
  startTime: string | null;
  isPaused: boolean;
  pausedSeconds: number;
  lastDrawnWord: string | null;
  printedStart: number | null;
  printedEnd: number | null;
  nearWins: NearWinAlert[];
}

export type ThemeType = "light" | "dark" | "romantic";
