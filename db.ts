import fs from "fs";
import path from "path";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { INITIAL_WORDS } from "./src/data/initialWords";

export type BingoType = "3x3" | "5x5";
export type VictoryMode = "horizontal" | "vertical" | "diagonal" | "diagonal_inverse" | "full_card";

export interface StoredCard {
  id: number;
  sequenceNumber: number;
  code: string;
  grid: string[][];
}

export interface StoredTheme {
  id: number;
  name: string;
  slug: string;
  preset: "romantic" | "dark" | "light";
  cardTitle?: string;
}

export interface StoredUser {
  id: number;
  username: string;
  name: string;
  role: "admin" | "operator";
  isActive: boolean;
  createdAt: string;
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

export interface ActiveRoundRecord {
  id: number;
  themeId: number;
  blockId: number;
  isActive: boolean;
  type: BingoType;
  victoryModes: VictoryMode[];
  totalCards: number;
  cards: StoredCard[];
  drawnWords: string[];
  startTime: string | null;
  isPaused: boolean;
  pausedSeconds: number;
  lastDrawnWord: string | null;
  printedStart: number | null;
  printedEnd: number | null;
  blockName: string;
  nearWins: NearWinAlert[];
}

const dataDir = process.env.VERCEL
  ? path.join("/tmp", "bingo-data")
  : path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "bingo.sqlite");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON");

function normalizeWord(value: string) {
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

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "tema";
}

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS themes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      preset TEXT NOT NULL DEFAULT 'romantic',
      card_title TEXT NOT NULL DEFAULT 'Cartela Oficial',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      theme_id INTEGER NOT NULL,
      value TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(theme_id, value),
      FOREIGN KEY(theme_id) REFERENCES themes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'operator',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS card_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      theme_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      bingo_type TEXT NOT NULL,
      victory_modes_json TEXT NOT NULL,
      total_cards INTEGER NOT NULL,
      printed_start INTEGER,
      printed_end INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(theme_id) REFERENCES themes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      block_id INTEGER NOT NULL,
      sequence_number INTEGER NOT NULL,
      code TEXT NOT NULL,
      grid_json TEXT NOT NULL,
      UNIQUE(block_id, sequence_number),
      FOREIGN KEY(block_id) REFERENCES card_blocks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS rounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      theme_id INTEGER NOT NULL,
      block_id INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      drawn_words_json TEXT NOT NULL DEFAULT '[]',
      last_drawn_word TEXT,
      start_time TEXT,
      is_paused INTEGER NOT NULL DEFAULT 0,
      paused_seconds INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(theme_id) REFERENCES themes(id) ON DELETE CASCADE,
      FOREIGN KEY(block_id) REFERENCES card_blocks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS near_win_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      round_id INTEGER NOT NULL,
      card_id INTEGER NOT NULL,
      card_code TEXT NOT NULL,
      sequence_number INTEGER NOT NULL,
      matched_mode TEXT NOT NULL,
      missing_count INTEGER NOT NULL,
      missing_words_json TEXT NOT NULL,
      fingerprint TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(round_id, fingerprint),
      FOREIGN KEY(round_id) REFERENCES rounds(id) ON DELETE CASCADE,
      FOREIGN KEY(card_id) REFERENCES cards(id) ON DELETE CASCADE
    );
  `);
}

function seedDefaults() {
  const themeCount = Number(db.prepare("SELECT COUNT(*) AS count FROM themes").get().count);
  if (themeCount > 0) return;

  const insertTheme = db.prepare("INSERT INTO themes (name, slug, preset) VALUES (?, ?, ?)");
  const insertWord = db.prepare("INSERT OR IGNORE INTO words (theme_id, value) VALUES (?, ?)");

  const romanticId = Number(insertTheme.run("Rede de Casais", "rede-de-casais", "romantic").lastInsertRowid);
  insertTheme.run("Noite Escura", "noite-escura", "dark");
  insertTheme.run("Celebração Clara", "celebracao-clara", "light");

  for (const word of INITIAL_WORDS) {
    const normalized = normalizeWord(word);
    if (normalized) insertWord.run(romanticId, normalized);
  }

  db.prepare("INSERT INTO app_settings (key, value) VALUES ('selected_theme_id', ?)").run(String(romanticId));

  const usersCount = Number(db.prepare("SELECT COUNT(*) AS count FROM users").get().count);
  if (usersCount === 0) {
    const passwordHash = hashPassword("admin123");
    db.prepare(`
      INSERT INTO users (username, name, password_hash, role, is_active)
      VALUES (?, ?, ?, 'admin', 1)
    `).run("admin", "Administrador", passwordHash);
  }
}

createSchema();
try {
  db.exec("ALTER TABLE themes ADD COLUMN card_title TEXT NOT NULL DEFAULT 'Cartela Oficial'");
} catch {
  // Column already exists in upgraded databases.
}
seedDefaults();

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(derived, "hex"));
}

function getSelectedThemeId() {
  const row = db.prepare("SELECT value FROM app_settings WHERE key = 'selected_theme_id'").get() as { value: string } | undefined;
  if (row) return Number(row.value);
  const firstTheme = db.prepare("SELECT id FROM themes ORDER BY id LIMIT 1").get() as { id: number } | undefined;
  return firstTheme?.id ?? 1;
}

function setSelectedThemeId(themeId: number) {
  db.prepare(`
    INSERT INTO app_settings (key, value) VALUES ('selected_theme_id', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(String(themeId));
}

export function listThemes() {
  const themes = db.prepare("SELECT id, name, slug, preset, card_title AS cardTitle FROM themes ORDER BY name").all() as unknown as StoredTheme[];
  const selectedThemeId = getSelectedThemeId();
  return { themes, selectedThemeId };
}

export function createTheme(name: string, preset: StoredTheme["preset"]) {
  const cleanName = name.trim();
  if (!cleanName) throw new Error("Nome do tema e obrigatorio.");
  const slugBase = slugify(cleanName);
  let slug = slugBase;
  let suffix = 2;
  while (db.prepare("SELECT 1 FROM themes WHERE slug = ?").get(slug)) {
    slug = `${slugBase}-${suffix++}`;
  }
  const result = db.prepare("INSERT INTO themes (name, slug, preset, card_title) VALUES (?, ?, ?, ?)").run(cleanName, slug, preset, cleanName);
  const themeId = Number(result.lastInsertRowid);
  return getTheme(themeId);
}

export function updateTheme(themeId: number, input: { name?: string; preset?: StoredTheme["preset"]; cardTitle?: string }) {
  const current = getTheme(themeId);
  const nextName = input.name?.trim() || current.name;
  const nextPreset = input.preset || current.preset;
  const nextCardTitle = input.cardTitle?.trim() || current.cardTitle || current.name;
  db.prepare("UPDATE themes SET name = ?, preset = ?, card_title = ? WHERE id = ?").run(nextName, nextPreset, nextCardTitle, themeId);
  return getTheme(themeId);
}

export function deleteTheme(themeId: number) {
  const count = Number(db.prepare("SELECT COUNT(*) AS count FROM themes").get().count);
  if (count <= 1) {
    throw new Error("Nao e permitido excluir o ultimo tema.");
  }

  const theme = db.prepare("SELECT id FROM themes WHERE id = ?").get(themeId) as { id: number } | undefined;
  if (!theme) {
    throw new Error("Tema nao encontrado.");
  }

  const activeRound = getActiveRound();
  if (activeRound?.themeId === themeId) {
    throw new Error("Finalize a rodada ativa antes de excluir este tema.");
  }

  db.prepare("DELETE FROM themes WHERE id = ?").run(themeId);

  const selectedThemeId = getSelectedThemeId();
  if (selectedThemeId === themeId) {
    const fallback = db.prepare("SELECT id FROM themes ORDER BY id LIMIT 1").get() as { id: number } | undefined;
    if (fallback) {
      setSelectedThemeId(fallback.id);
    }
  }

  return listThemes();
}

export function getTheme(themeId: number) {
  const theme = db.prepare("SELECT id, name, slug, preset, card_title AS cardTitle FROM themes WHERE id = ?").get(themeId) as unknown as StoredTheme | undefined;
  if (!theme) throw new Error("Tema nao encontrado.");
  const words = db.prepare("SELECT value FROM words WHERE theme_id = ? ORDER BY value").all(themeId).map((row: any) => row.value as string);
  return { ...theme, words };
}

export function setSelectedTheme(themeId: number) {
  getTheme(themeId);
  setSelectedThemeId(themeId);
  return getTheme(themeId);
}

export function addWord(themeId: number, value: string) {
  const word = normalizeWord(value);
  if (!word) throw new Error("Palavra invalida.");
  const exists = db.prepare("SELECT 1 FROM words WHERE theme_id = ? AND value = ?").get(themeId, word);
  if (exists) {
    throw new Error("Ja existe uma palavra igual neste tema.");
  }
  db.prepare("INSERT INTO words (theme_id, value) VALUES (?, ?)").run(themeId, word);
  return getTheme(themeId).words;
}

export function updateWord(themeId: number, oldValue: string, newValue: string) {
  const oldWord = normalizeWord(oldValue);
  const nextWord = normalizeWord(newValue);
  if (!oldWord || !nextWord) throw new Error("Palavra invalida.");
  const exists = db.prepare("SELECT 1 FROM words WHERE theme_id = ? AND value = ? AND value <> ?").get(themeId, nextWord, oldWord);
  if (exists) {
    throw new Error("Ja existe uma palavra igual neste tema.");
  }
  db.prepare("UPDATE words SET value = ? WHERE theme_id = ? AND value = ?").run(nextWord, themeId, oldWord);
  return getTheme(themeId).words;
}

export function removeWord(themeId: number, value: string) {
  const word = normalizeWord(value);
  db.prepare("DELETE FROM words WHERE theme_id = ? AND value = ?").run(themeId, word);
  return getTheme(themeId).words;
}

export function importWords(themeId: number, rawText: string) {
  const insertWord = db.prepare("INSERT OR IGNORE INTO words (theme_id, value) VALUES (?, ?)");
  const values = rawText
    .split(/[\n,;]+/)
    .map((item) => normalizeWord(item))
    .filter(Boolean);
  let inserted = 0;
  for (const word of values) {
    const result = insertWord.run(themeId, word);
    if (result.changes > 0) inserted++;
  }
  return { inserted, words: getTheme(themeId).words };
}

export function resetThemeWords(themeId: number) {
  db.prepare("DELETE FROM words WHERE theme_id = ?").run(themeId);
  for (const word of INITIAL_WORDS) {
    const normalized = normalizeWord(word);
    if (normalized) db.prepare("INSERT OR IGNORE INTO words (theme_id, value) VALUES (?, ?)").run(themeId, normalized);
  }
  return getTheme(themeId).words;
}

export function listBlocks(themeId?: number) {
  const rows = db.prepare(`
    SELECT b.id, b.theme_id AS themeId, t.name AS themeName, b.name, b.bingo_type AS type,
           b.total_cards AS totalCards, b.printed_start AS printedStart, b.printed_end AS printedEnd,
           b.created_at AS createdAt
    FROM card_blocks b
    JOIN themes t ON t.id = b.theme_id
    ${themeId ? "WHERE b.theme_id = ?" : ""}
    ORDER BY b.id DESC
  `).all(...(themeId ? [themeId] : []));
  return rows;
}

export function updateBlockPrintRange(blockId: number, printedStart: number, printedEnd: number) {
  db.prepare("UPDATE card_blocks SET printed_start = ?, printed_end = ? WHERE id = ?").run(printedStart, printedEnd, blockId);
  return db.prepare(`
    SELECT id, theme_id AS themeId, name, bingo_type AS type, total_cards AS totalCards,
           printed_start AS printedStart, printed_end AS printedEnd
    FROM card_blocks WHERE id = ?
  `).get(blockId);
}

export function saveBlockAndRound(input: {
  themeId: number;
  name: string;
  type: BingoType;
  victoryModes: VictoryMode[];
  cards: Array<{ code: string; grid: string[][] }>;
}) {
  db.prepare("UPDATE rounds SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE is_active = 1").run();
  const blockResult = db.prepare(`
    INSERT INTO card_blocks (theme_id, name, bingo_type, victory_modes_json, total_cards)
    VALUES (?, ?, ?, ?, ?)
  `).run(input.themeId, input.name, input.type, JSON.stringify(input.victoryModes), input.cards.length);
  const blockId = Number(blockResult.lastInsertRowid);
  const insertCard = db.prepare("INSERT INTO cards (block_id, sequence_number, code, grid_json) VALUES (?, ?, ?, ?)");
  input.cards.forEach((card, index) => {
    insertCard.run(blockId, index + 1, card.code, JSON.stringify(card.grid));
  });
  const roundResult = db.prepare(`
    INSERT INTO rounds (theme_id, block_id, is_active, drawn_words_json, start_time, is_paused, paused_seconds)
    VALUES (?, ?, 1, '[]', ?, 0, 0)
  `).run(input.themeId, blockId, new Date().toISOString());
  return getActiveRound(Number(roundResult.lastInsertRowid));
}

function getCardsByBlock(blockId: number): StoredCard[] {
  return db.prepare(`
    SELECT id, sequence_number AS sequenceNumber, code, grid_json AS gridJson
    FROM cards
    WHERE block_id = ?
    ORDER BY sequence_number
  `).all(blockId).map((row: any) => ({
    id: row.id,
    sequenceNumber: row.sequenceNumber,
    code: row.code,
    grid: JSON.parse(row.gridJson),
  }));
}

function getNearWins(roundId: number): NearWinAlert[] {
  return db.prepare(`
    SELECT id, card_id AS cardId, card_code AS cardCode, sequence_number AS sequenceNumber,
           matched_mode AS matchedMode, missing_count AS missingCount,
           missing_words_json AS missingWordsJson, created_at AS createdAt
    FROM near_win_alerts
    WHERE round_id = ?
    ORDER BY missing_count ASC, id DESC
    LIMIT 100
  `).all(roundId).map((row: any) => ({
    id: row.id,
    cardId: row.cardId,
    cardCode: row.cardCode,
    sequenceNumber: row.sequenceNumber,
    matchedMode: row.matchedMode,
    missingCount: row.missingCount,
    missingWords: JSON.parse(row.missingWordsJson),
    createdAt: row.createdAt,
  }));
}

export function getActiveRound(roundId?: number): ActiveRoundRecord | null {
  const row = db.prepare(`
    SELECT r.id, r.theme_id AS themeId, r.block_id AS blockId, r.is_active AS isActive,
           r.drawn_words_json AS drawnWordsJson, r.last_drawn_word AS lastDrawnWord,
           r.start_time AS startTime, r.is_paused AS isPaused, r.paused_seconds AS pausedSeconds,
           b.bingo_type AS type, b.victory_modes_json AS victoryModesJson, b.total_cards AS totalCards,
           b.printed_start AS printedStart, b.printed_end AS printedEnd, b.name AS blockName
    FROM rounds r
    JOIN card_blocks b ON b.id = r.block_id
    WHERE ${roundId ? "r.id = ?" : "r.is_active = 1"}
    ORDER BY r.id DESC
    LIMIT 1
  `).get(...(roundId ? [roundId] : [])) as any;
  if (!row) return null;
  return {
    id: row.id,
    themeId: row.themeId,
    blockId: row.blockId,
    isActive: Boolean(row.isActive),
    type: row.type,
    victoryModes: JSON.parse(row.victoryModesJson),
    totalCards: row.totalCards,
    cards: getCardsByBlock(row.blockId),
    drawnWords: JSON.parse(row.drawnWordsJson),
    startTime: row.startTime,
    isPaused: Boolean(row.isPaused),
    pausedSeconds: row.pausedSeconds,
    lastDrawnWord: row.lastDrawnWord,
    printedStart: row.printedStart,
    printedEnd: row.printedEnd,
    blockName: row.blockName,
    nearWins: getNearWins(row.id),
  };
}

function getWinningLines(grid: string[][], mode: VictoryMode) {
  const size = grid.length;
  if (mode === "full_card") {
    return [grid.flat()];
  }
  const lines: string[][][] = [];
  if (mode === "horizontal") {
    for (let r = 0; r < size; r++) lines.push([grid[r]]);
  }
  if (mode === "vertical") {
    for (let c = 0; c < size; c++) {
      lines.push([Array.from({ length: size }, (_, r) => grid[r][c])]);
    }
  }
  if (mode === "diagonal") {
    lines.push([Array.from({ length: size }, (_, i) => grid[i][i])]);
  }
  if (mode === "diagonal_inverse") {
    lines.push([Array.from({ length: size }, (_, i) => grid[i][size - 1 - i])]);
  }
  return lines.map((entry) => entry[0]);
}

function detectNearWins(round: ActiveRoundRecord) {
  const drawn = new Set(round.drawnWords);
  const insertAlert = db.prepare(`
    INSERT OR IGNORE INTO near_win_alerts
    (round_id, card_id, card_code, sequence_number, matched_mode, missing_count, missing_words_json, fingerprint)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const card of round.cards) {
    for (const mode of round.victoryModes) {
      for (const line of getWinningLines(card.grid, mode)) {
        const relevant = line.filter((word) => word !== "LIVRE");
        const missingWords = relevant.filter((word) => !drawn.has(word));
        if (missingWords.length > 0 && missingWords.length <= 2) {
          const fingerprint = `${card.id}:${mode}:${missingWords.join("|")}`;
          insertAlert.run(round.id, card.id, card.code, card.sequenceNumber, mode, missingWords.length, JSON.stringify(missingWords), fingerprint);
        }
      }
    }
  }
}

export function drawWordForRound() {
  const round = getActiveRound();
  if (!round || !round.isActive) return null;
  const theme = getTheme(round.themeId);
  const available = theme.words.filter((word) => !round.drawnWords.includes(word));
  if (available.length === 0) return null;
  const selected = available[Math.floor(Math.random() * available.length)];
  const nextDrawn = [...round.drawnWords, selected];
  db.prepare(`
    UPDATE rounds
    SET drawn_words_json = ?, last_drawn_word = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(JSON.stringify(nextDrawn), selected, round.id);
  const updated = getActiveRound(round.id);
  if (updated) detectNearWins(updated);
  return getActiveRound(round.id);
}

export function pauseRound() {
  const round = getActiveRound();
  if (!round || !round.startTime || round.isPaused) return round;
  const currentElapsed = Math.floor((Date.now() - new Date(round.startTime).getTime()) / 1000) - round.pausedSeconds;
  db.prepare("UPDATE rounds SET is_paused = 1, paused_seconds = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(currentElapsed, round.id);
  return getActiveRound(round.id);
}

export function resumeRound() {
  const round = getActiveRound();
  if (!round || !round.isPaused) return round;
  const newStart = new Date(Date.now() - round.pausedSeconds * 1000).toISOString();
  db.prepare(`
    UPDATE rounds
    SET is_paused = 0, start_time = ?, paused_seconds = 0, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(newStart, round.id);
  return getActiveRound(round.id);
}

export function resetRound() {
  const round = getActiveRound();
  if (!round) return null;
  db.prepare("DELETE FROM near_win_alerts WHERE round_id = ?").run(round.id);
  db.prepare(`
    UPDATE rounds
    SET drawn_words_json = '[]', last_drawn_word = NULL, start_time = ?, is_paused = 0, paused_seconds = 0, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(new Date().toISOString(), round.id);
  return getActiveRound(round.id);
}

export function endRound() {
  const round = getActiveRound();
  if (!round) return null;
  db.prepare("UPDATE rounds SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(round.id);
  return null;
}

export function getDashboardSnapshot() {
  const { themes, selectedThemeId } = listThemes();
  const selectedTheme = getTheme(selectedThemeId);
  const activeRound = getActiveRound();
  const blocks = listBlocks(selectedThemeId);
  return {
    themes,
    selectedThemeId,
    selectedTheme,
    activeRound,
    blocks,
  };
}

export function listUsers() {
  return db.prepare(`
    SELECT id, username, name, role, is_active AS isActive, created_at AS createdAt
    FROM users
    ORDER BY name, username
  `).all() as unknown as StoredUser[];
}

export function authenticateUser(username: string, password: string) {
  const user = db.prepare(`
    SELECT id, username, name, password_hash AS passwordHash, role, is_active AS isActive, created_at AS createdAt
    FROM users
    WHERE lower(username) = lower(?)
    LIMIT 1
  `).get(username.trim()) as any;

  if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    isActive: Boolean(user.isActive),
    createdAt: user.createdAt,
  } as StoredUser;
}

export function getUserById(userId: number) {
  const user = db.prepare(`
    SELECT id, username, name, role, is_active AS isActive, created_at AS createdAt
    FROM users
    WHERE id = ?
  `).get(userId) as unknown as StoredUser | undefined;
  return user ? { ...user, isActive: Boolean((user as any).isActive) } : null;
}

export function createUser(input: { username: string; name: string; password: string; role: "admin" | "operator" }) {
  const username = input.username.trim().toLowerCase();
  const name = input.name.trim();
  const password = input.password.trim();
  if (username.length < 3) throw new Error("Usuario precisa ter ao menos 3 caracteres.");
  if (name.length < 3) throw new Error("Nome precisa ter ao menos 3 caracteres.");
  if (password.length < 4) throw new Error("Senha precisa ter ao menos 4 caracteres.");
  const exists = db.prepare("SELECT 1 FROM users WHERE username = ?").get(username);
  if (exists) throw new Error("Ja existe um usuario com esse login.");

  const result = db.prepare(`
    INSERT INTO users (username, name, password_hash, role, is_active)
    VALUES (?, ?, ?, ?, 1)
  `).run(username, name, hashPassword(password), input.role);

  return getUserById(Number(result.lastInsertRowid));
}

export function updateUser(userId: number, input: { username?: string; name?: string; password?: string; role?: "admin" | "operator"; isActive?: boolean }) {
  const current = db.prepare(`
    SELECT id, username, name, role, is_active AS isActive
    FROM users
    WHERE id = ?
  `).get(userId) as any;
  if (!current) throw new Error("Usuario nao encontrado.");

  const username = input.username?.trim().toLowerCase() || current.username;
  const name = input.name?.trim() || current.name;
  const role = input.role || current.role;
  const isActive = typeof input.isActive === "boolean" ? input.isActive : Boolean(current.isActive);

  const duplicate = db.prepare("SELECT 1 FROM users WHERE username = ? AND id <> ?").get(username, userId);
  if (duplicate) throw new Error("Ja existe um usuario com esse login.");

  db.prepare(`
    UPDATE users
    SET username = ?, name = ?, role = ?, is_active = ?
    WHERE id = ?
  `).run(username, name, role, isActive ? 1 : 0, userId);

  if (input.password?.trim()) {
    if (input.password.trim().length < 4) throw new Error("Senha precisa ter ao menos 4 caracteres.");
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(input.password.trim()), userId);
  }

  return getUserById(userId);
}

export function deleteUser(userId: number) {
  const totalAdmins = Number(db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'").get().count);
  const current = db.prepare("SELECT id, role FROM users WHERE id = ?").get(userId) as { id: number; role: string } | undefined;
  if (!current) throw new Error("Usuario nao encontrado.");
  if (current.role === "admin" && totalAdmins <= 1) {
    throw new Error("Nao e permitido excluir o ultimo administrador.");
  }
  db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  return listUsers();
}
