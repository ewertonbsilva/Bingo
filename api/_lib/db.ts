import crypto from "node:crypto";
import "./env.js";
import { Pool } from "pg";
import { INITIAL_WORDS } from "./initialWords.js";

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

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  ssl: process.env.POSTGRES_URL || process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
});

let initialized: Promise<void> | null = null;

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

async function ensureInitialized() {
  if (!initialized) {
    initialized = initializeDatabase();
  }
  await initialized;
}

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS themes (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      preset TEXT NOT NULL DEFAULT 'romantic',
      card_title TEXT NOT NULL DEFAULT 'Cartela Oficial',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS words (
      id BIGSERIAL PRIMARY KEY,
      theme_id BIGINT NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
      value TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(theme_id, value)
    );

    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'operator',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS card_blocks (
      id BIGSERIAL PRIMARY KEY,
      theme_id BIGINT NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      bingo_type TEXT NOT NULL,
      victory_modes_json JSONB NOT NULL,
      total_cards INTEGER NOT NULL,
      printed_start INTEGER,
      printed_end INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS cards (
      id BIGSERIAL PRIMARY KEY,
      block_id BIGINT NOT NULL REFERENCES card_blocks(id) ON DELETE CASCADE,
      sequence_number INTEGER NOT NULL,
      code TEXT NOT NULL,
      grid_json JSONB NOT NULL,
      UNIQUE(block_id, sequence_number)
    );

    CREATE TABLE IF NOT EXISTS rounds (
      id BIGSERIAL PRIMARY KEY,
      theme_id BIGINT NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
      block_id BIGINT NOT NULL REFERENCES card_blocks(id) ON DELETE CASCADE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      drawn_words_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      last_drawn_word TEXT,
      start_time TIMESTAMPTZ,
      is_paused BOOLEAN NOT NULL DEFAULT FALSE,
      paused_seconds INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS near_win_alerts (
      id BIGSERIAL PRIMARY KEY,
      round_id BIGINT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
      card_id BIGINT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      card_code TEXT NOT NULL,
      sequence_number INTEGER NOT NULL,
      matched_mode TEXT NOT NULL,
      missing_count INTEGER NOT NULL,
      missing_words_json JSONB NOT NULL,
      fingerprint TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(round_id, fingerprint)
    );
  `);

  const themeCount = Number((await pool.query("SELECT COUNT(*)::int AS count FROM themes")).rows[0].count);
  if (themeCount === 0) {
    const romantic = await pool.query(
      "INSERT INTO themes (name, slug, preset, card_title) VALUES ($1, $2, $3, $4) RETURNING id",
      ["Rede de Casais", "rede-de-casais", "romantic", "Rede de Casais"]
    );
    const romanticId = Number(romantic.rows[0].id);
    await pool.query("INSERT INTO themes (name, slug, preset, card_title) VALUES ($1, $2, $3, $4)", ["Noite Escura", "noite-escura", "dark", "Noite Escura"]);
    await pool.query("INSERT INTO themes (name, slug, preset, card_title) VALUES ($1, $2, $3, $4)", ["Celebracao Clara", "celebracao-clara", "light", "Celebracao Clara"]);
    for (const word of INITIAL_WORDS) {
      const normalized = normalizeWord(word);
      if (normalized) {
        await pool.query("INSERT INTO words (theme_id, value) VALUES ($1, $2) ON CONFLICT (theme_id, value) DO NOTHING", [romanticId, normalized]);
      }
    }
    await pool.query(
      "INSERT INTO app_settings (key, value) VALUES ('selected_theme_id', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
      [String(romanticId)]
    );
  }

  const userCount = Number((await pool.query("SELECT COUNT(*)::int AS count FROM users")).rows[0].count);
  if (userCount === 0) {
    await pool.query(
      "INSERT INTO users (username, name, password_hash, role, is_active) VALUES ($1, $2, $3, 'admin', TRUE)",
      ["admin", "Administrador", hashPassword("admin123")]
    );
  }
}

async function getSelectedThemeId() {
  await ensureInitialized();
  const row = (await pool.query("SELECT value FROM app_settings WHERE key = 'selected_theme_id'")).rows[0] as { value: string } | undefined;
  if (row) return Number(row.value);
  const firstTheme = (await pool.query("SELECT id FROM themes ORDER BY id LIMIT 1")).rows[0] as { id: number } | undefined;
  return Number(firstTheme?.id ?? 1);
}

async function setSelectedThemeId(themeId: number) {
  await ensureInitialized();
  await pool.query(
    "INSERT INTO app_settings (key, value) VALUES ('selected_theme_id', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
    [String(themeId)]
  );
}

async function getCardsByBlock(blockId: number): Promise<StoredCard[]> {
  const { rows } = await pool.query(
    `SELECT id, sequence_number AS "sequenceNumber", code, grid_json AS "gridJson"
     FROM cards WHERE block_id = $1 ORDER BY sequence_number`,
    [blockId]
  );
  return rows.map((row: any) => ({
    id: Number(row.id),
    sequenceNumber: Number(row.sequenceNumber),
    code: row.code,
    grid: row.gridJson,
  }));
}

async function getNearWins(roundId: number): Promise<NearWinAlert[]> {
  const { rows } = await pool.query(
    `SELECT id, card_id AS "cardId", card_code AS "cardCode", sequence_number AS "sequenceNumber",
            matched_mode AS "matchedMode", missing_count AS "missingCount",
            missing_words_json AS "missingWords", created_at AS "createdAt"
     FROM near_win_alerts
     WHERE round_id = $1
     ORDER BY missing_count ASC, id DESC
     LIMIT 100`,
    [roundId]
  );
  return rows.map((row: any) => ({
    id: Number(row.id),
    cardId: Number(row.cardId),
    cardCode: row.cardCode,
    sequenceNumber: Number(row.sequenceNumber),
    matchedMode: row.matchedMode,
    missingCount: Number(row.missingCount),
    missingWords: row.missingWords,
    createdAt: row.createdAt,
  }));
}

function getWinningLines(grid: string[][], mode: VictoryMode) {
  const size = grid.length;
  if (mode === "full_card") return [grid.flat()];
  const lines: string[][] = [];
  if (mode === "horizontal") {
    for (let r = 0; r < size; r++) lines.push(grid[r]);
  }
  if (mode === "vertical") {
    for (let c = 0; c < size; c++) lines.push(Array.from({ length: size }, (_, r) => grid[r][c]));
  }
  if (mode === "diagonal") lines.push(Array.from({ length: size }, (_, i) => grid[i][i]));
  if (mode === "diagonal_inverse") lines.push(Array.from({ length: size }, (_, i) => grid[i][size - 1 - i]));
  return lines;
}

async function detectNearWins(round: ActiveRoundRecord) {
  const drawn = new Set(round.drawnWords);
  for (const card of round.cards) {
    for (const mode of round.victoryModes) {
      for (const line of getWinningLines(card.grid, mode)) {
        const relevant = line.filter((word) => word !== "LIVRE");
        const missingWords = relevant.filter((word) => !drawn.has(word));
        if (missingWords.length > 0 && missingWords.length <= 2) {
          const fingerprint = `${card.id}:${mode}:${missingWords.join("|")}`;
          await pool.query(
            `INSERT INTO near_win_alerts
             (round_id, card_id, card_code, sequence_number, matched_mode, missing_count, missing_words_json, fingerprint)
             VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
             ON CONFLICT (round_id, fingerprint) DO NOTHING`,
            [round.id, card.id, card.code, card.sequenceNumber, mode, missingWords.length, JSON.stringify(missingWords), fingerprint]
          );
        }
      }
    }
  }
}

export async function listThemes() {
  await ensureInitialized();
  const { rows } = await pool.query("SELECT id, name, slug, preset, card_title AS \"cardTitle\" FROM themes ORDER BY name");
  return { themes: rows as StoredTheme[], selectedThemeId: await getSelectedThemeId() };
}

export async function getTheme(themeId: number) {
  await ensureInitialized();
  const theme = (await pool.query("SELECT id, name, slug, preset, card_title AS \"cardTitle\" FROM themes WHERE id = $1", [themeId])).rows[0] as StoredTheme | undefined;
  if (!theme) throw new Error("Tema nao encontrado.");
  const words = (await pool.query("SELECT value FROM words WHERE theme_id = $1 ORDER BY value", [themeId])).rows.map((row: any) => row.value as string);
  return { ...theme, words };
}

export async function setSelectedTheme(themeId: number) {
  await getTheme(themeId);
  await setSelectedThemeId(themeId);
  return getTheme(themeId);
}

export async function createTheme(name: string, preset: StoredTheme["preset"]) {
  await ensureInitialized();
  const cleanName = name.trim();
  if (!cleanName) throw new Error("Nome do tema e obrigatorio.");
  const slugBase = slugify(cleanName);
  let slug = slugBase;
  let suffix = 2;
  while ((await pool.query("SELECT 1 FROM themes WHERE slug = $1", [slug])).rowCount) {
    slug = `${slugBase}-${suffix++}`;
  }
  const result = await pool.query(
    "INSERT INTO themes (name, slug, preset, card_title) VALUES ($1, $2, $3, $4) RETURNING id",
    [cleanName, slug, preset, cleanName]
  );
  return getTheme(Number(result.rows[0].id));
}

export async function updateTheme(themeId: number, input: { name?: string; preset?: StoredTheme["preset"]; cardTitle?: string }) {
  const current = await getTheme(themeId);
  const nextName = input.name?.trim() || current.name;
  const nextPreset = input.preset || current.preset;
  const nextCardTitle = input.cardTitle?.trim() || current.cardTitle || current.name;
  await pool.query("UPDATE themes SET name = $1, preset = $2, card_title = $3 WHERE id = $4", [nextName, nextPreset, nextCardTitle, themeId]);
  return getTheme(themeId);
}

export async function deleteTheme(themeId: number) {
  const count = Number((await pool.query("SELECT COUNT(*)::int AS count FROM themes")).rows[0].count);
  if (count <= 1) throw new Error("Nao e permitido excluir o ultimo tema.");
  if (!(await pool.query("SELECT 1 FROM themes WHERE id = $1", [themeId])).rowCount) throw new Error("Tema nao encontrado.");
  const activeRound = await getActiveRound();
  if (activeRound?.themeId === themeId) throw new Error("Finalize a rodada ativa antes de excluir este tema.");
  await pool.query("DELETE FROM themes WHERE id = $1", [themeId]);
  if ((await getSelectedThemeId()) === themeId) {
    const fallback = (await pool.query("SELECT id FROM themes ORDER BY id LIMIT 1")).rows[0] as { id: number } | undefined;
    if (fallback) await setSelectedThemeId(Number(fallback.id));
  }
  return listThemes();
}

export async function addWord(themeId: number, value: string) {
  const word = normalizeWord(value);
  if (!word) throw new Error("Palavra invalida.");
  if ((await pool.query("SELECT 1 FROM words WHERE theme_id = $1 AND value = $2", [themeId, word])).rowCount) {
    throw new Error("Ja existe uma palavra igual neste tema.");
  }
  await pool.query("INSERT INTO words (theme_id, value) VALUES ($1, $2)", [themeId, word]);
  return (await getTheme(themeId)).words;
}

export async function updateWord(themeId: number, oldValue: string, newValue: string) {
  const oldWord = normalizeWord(oldValue);
  const nextWord = normalizeWord(newValue);
  if (!oldWord || !nextWord) throw new Error("Palavra invalida.");
  if ((await pool.query("SELECT 1 FROM words WHERE theme_id = $1 AND value = $2 AND value <> $3", [themeId, nextWord, oldWord])).rowCount) {
    throw new Error("Ja existe uma palavra igual neste tema.");
  }
  await pool.query("UPDATE words SET value = $1 WHERE theme_id = $2 AND value = $3", [nextWord, themeId, oldWord]);
  return (await getTheme(themeId)).words;
}

export async function removeWord(themeId: number, value: string) {
  const word = normalizeWord(value);
  await pool.query("DELETE FROM words WHERE theme_id = $1 AND value = $2", [themeId, word]);
  return (await getTheme(themeId)).words;
}

export async function importWords(themeId: number, rawText: string) {
  const values = rawText
    .split(/[\n,;]+/)
    .map((item) => normalizeWord(item))
    .filter(Boolean);
  let inserted = 0;
  for (const word of values) {
    const result = await pool.query(
      "INSERT INTO words (theme_id, value) VALUES ($1, $2) ON CONFLICT (theme_id, value) DO NOTHING",
      [themeId, word]
    );
    inserted += result.rowCount;
  }
  return { inserted, words: (await getTheme(themeId)).words };
}

export async function resetThemeWords(themeId: number) {
  await pool.query("DELETE FROM words WHERE theme_id = $1", [themeId]);
  for (const word of INITIAL_WORDS) {
    const normalized = normalizeWord(word);
    if (normalized) await pool.query("INSERT INTO words (theme_id, value) VALUES ($1, $2) ON CONFLICT (theme_id, value) DO NOTHING", [themeId, normalized]);
  }
  return (await getTheme(themeId)).words;
}

export async function listBlocks(themeId?: number) {
  const query = `
    SELECT b.id, b.theme_id AS "themeId", t.name AS "themeName", b.name, b.bingo_type AS type,
           b.total_cards AS "totalCards", b.printed_start AS "printedStart", b.printed_end AS "printedEnd",
           b.created_at AS "createdAt"
    FROM card_blocks b
    JOIN themes t ON t.id = b.theme_id
    ${themeId ? "WHERE b.theme_id = $1" : ""}
    ORDER BY b.id DESC
  `;
  return (await pool.query(query, themeId ? [themeId] : [])).rows;
}

export async function updateBlockPrintRange(blockId: number, printedStart: number, printedEnd: number) {
  const { rows } = await pool.query(
    `UPDATE card_blocks SET printed_start = $1, printed_end = $2
     WHERE id = $3
     RETURNING id, theme_id AS "themeId", name, bingo_type AS type, total_cards AS "totalCards",
               printed_start AS "printedStart", printed_end AS "printedEnd"`,
    [printedStart, printedEnd, blockId]
  );
  return rows[0];
}

export async function saveBlockAndRound(input: {
  themeId: number;
  name: string;
  type: BingoType;
  victoryModes: VictoryMode[];
  cards: Array<{ code: string; grid: string[][] }>;
}) {
  await pool.query("UPDATE rounds SET is_active = FALSE, updated_at = NOW() WHERE is_active = TRUE");
  const block = await pool.query(
    `INSERT INTO card_blocks (theme_id, name, bingo_type, victory_modes_json, total_cards)
     VALUES ($1, $2, $3, $4::jsonb, $5) RETURNING id`,
    [input.themeId, input.name, input.type, JSON.stringify(input.victoryModes), input.cards.length]
  );
  const blockId = Number(block.rows[0].id);
  for (let i = 0; i < input.cards.length; i++) {
    const card = input.cards[i];
    await pool.query(
      "INSERT INTO cards (block_id, sequence_number, code, grid_json) VALUES ($1, $2, $3, $4::jsonb)",
      [blockId, i + 1, card.code, JSON.stringify(card.grid)]
    );
  }
  const round = await pool.query(
    `INSERT INTO rounds (theme_id, block_id, is_active, drawn_words_json, start_time, is_paused, paused_seconds)
     VALUES ($1, $2, TRUE, '[]'::jsonb, $3, FALSE, 0) RETURNING id`,
    [input.themeId, blockId, new Date().toISOString()]
  );
  return getActiveRound(Number(round.rows[0].id));
}

export async function getActiveRound(roundId?: number): Promise<ActiveRoundRecord | null> {
  await ensureInitialized();
  const { rows } = await pool.query(
    `SELECT r.id, r.theme_id AS "themeId", r.block_id AS "blockId", r.is_active AS "isActive",
            r.drawn_words_json AS "drawnWords", r.last_drawn_word AS "lastDrawnWord",
            r.start_time AS "startTime", r.is_paused AS "isPaused", r.paused_seconds AS "pausedSeconds",
            b.bingo_type AS type, b.victory_modes_json AS "victoryModes", b.total_cards AS "totalCards",
            b.printed_start AS "printedStart", b.printed_end AS "printedEnd", b.name AS "blockName"
     FROM rounds r
     JOIN card_blocks b ON b.id = r.block_id
     WHERE ${roundId ? "r.id = $1" : "r.is_active = TRUE"}
     ORDER BY r.id DESC
     LIMIT 1`,
    roundId ? [roundId] : []
  );
  const row = rows[0] as any;
  if (!row) return null;
  return {
    id: Number(row.id),
    themeId: Number(row.themeId),
    blockId: Number(row.blockId),
    isActive: Boolean(row.isActive),
    type: row.type,
    victoryModes: row.victoryModes,
    totalCards: Number(row.totalCards),
    cards: await getCardsByBlock(Number(row.blockId)),
    drawnWords: row.drawnWords,
    startTime: row.startTime,
    isPaused: Boolean(row.isPaused),
    pausedSeconds: Number(row.pausedSeconds),
    lastDrawnWord: row.lastDrawnWord,
    printedStart: row.printedStart,
    printedEnd: row.printedEnd,
    blockName: row.blockName,
    nearWins: await getNearWins(Number(row.id)),
  };
}

export async function drawWordForRound() {
  const round = await getActiveRound();
  if (!round || !round.isActive) return null;
  const theme = await getTheme(round.themeId);
  const available = theme.words.filter((word) => !round.drawnWords.includes(word));
  if (available.length === 0) return null;
  const selected = available[Math.floor(Math.random() * available.length)];
  const nextDrawn = [...round.drawnWords, selected];
  await pool.query(
    "UPDATE rounds SET drawn_words_json = $1::jsonb, last_drawn_word = $2, updated_at = NOW() WHERE id = $3",
    [JSON.stringify(nextDrawn), selected, round.id]
  );
  const updated = await getActiveRound(round.id);
  if (updated) await detectNearWins(updated);
  return getActiveRound(round.id);
}

export async function pauseRound() {
  const round = await getActiveRound();
  if (!round || !round.startTime || round.isPaused) return round;
  const currentElapsed = Math.floor((Date.now() - new Date(round.startTime).getTime()) / 1000) - round.pausedSeconds;
  await pool.query("UPDATE rounds SET is_paused = TRUE, paused_seconds = $1, updated_at = NOW() WHERE id = $2", [currentElapsed, round.id]);
  return getActiveRound(round.id);
}

export async function resumeRound() {
  const round = await getActiveRound();
  if (!round || !round.isPaused) return round;
  const newStart = new Date(Date.now() - round.pausedSeconds * 1000).toISOString();
  await pool.query(
    "UPDATE rounds SET is_paused = FALSE, start_time = $1, paused_seconds = 0, updated_at = NOW() WHERE id = $2",
    [newStart, round.id]
  );
  return getActiveRound(round.id);
}

export async function resetRound() {
  const round = await getActiveRound();
  if (!round) return null;
  await pool.query("DELETE FROM near_win_alerts WHERE round_id = $1", [round.id]);
  await pool.query(
    "UPDATE rounds SET drawn_words_json = '[]'::jsonb, last_drawn_word = NULL, start_time = $1, is_paused = FALSE, paused_seconds = 0, updated_at = NOW() WHERE id = $2",
    [new Date().toISOString(), round.id]
  );
  return getActiveRound(round.id);
}

export async function endRound() {
  const round = await getActiveRound();
  if (!round) return null;
  await pool.query("UPDATE rounds SET is_active = FALSE, updated_at = NOW() WHERE id = $1", [round.id]);
  return null;
}

export async function getDashboardSnapshot() {
  const { themes, selectedThemeId } = await listThemes();
  const selectedTheme = await getTheme(selectedThemeId);
  const activeRound = await getActiveRound();
  const blocks = await listBlocks(selectedThemeId);
  return { themes, selectedThemeId, selectedTheme, activeRound, blocks };
}

export async function listUsers() {
  await ensureInitialized();
  const { rows } = await pool.query(
    `SELECT id, username, name, role, is_active AS "isActive", created_at AS "createdAt"
     FROM users ORDER BY name, username`
  );
  return rows as StoredUser[];
}

export async function authenticateUser(username: string, password: string) {
  await ensureInitialized();
  const row = (await pool.query(
    `SELECT id, username, name, password_hash AS "passwordHash", role, is_active AS "isActive", created_at AS "createdAt"
     FROM users WHERE lower(username) = lower($1) LIMIT 1`,
    [username.trim()]
  )).rows[0] as any;
  if (!row || !row.isActive || !verifyPassword(password, row.passwordHash)) return null;
  return {
    id: Number(row.id),
    username: row.username,
    name: row.name,
    role: row.role,
    isActive: Boolean(row.isActive),
    createdAt: row.createdAt,
  } as StoredUser;
}

export async function getUserById(userId: number) {
  await ensureInitialized();
  const row = (await pool.query(
    `SELECT id, username, name, role, is_active AS "isActive", created_at AS "createdAt"
     FROM users WHERE id = $1`,
    [userId]
  )).rows[0] as StoredUser | undefined;
  return row ? { ...row, isActive: Boolean((row as any).isActive) } : null;
}

export async function createUser(input: { username: string; name: string; password: string; role: "admin" | "operator" }) {
  const username = input.username.trim().toLowerCase();
  const name = input.name.trim();
  const password = input.password.trim();
  if (username.length < 3) throw new Error("Usuario precisa ter ao menos 3 caracteres.");
  if (name.length < 3) throw new Error("Nome precisa ter ao menos 3 caracteres.");
  if (password.length < 4) throw new Error("Senha precisa ter ao menos 4 caracteres.");
  if ((await pool.query("SELECT 1 FROM users WHERE username = $1", [username])).rowCount) {
    throw new Error("Ja existe um usuario com esse login.");
  }
  const result = await pool.query(
    `INSERT INTO users (username, name, password_hash, role, is_active)
     VALUES ($1, $2, $3, $4, TRUE) RETURNING id`,
    [username, name, hashPassword(password), input.role]
  );
  return getUserById(Number(result.rows[0].id));
}

export async function updateUser(userId: number, input: { username?: string; name?: string; password?: string; role?: "admin" | "operator"; isActive?: boolean }) {
  const current = (await pool.query("SELECT id, username, name, role, is_active AS \"isActive\" FROM users WHERE id = $1", [userId])).rows[0] as any;
  if (!current) throw new Error("Usuario nao encontrado.");
  const username = input.username?.trim().toLowerCase() || current.username;
  const name = input.name?.trim() || current.name;
  const role = input.role || current.role;
  const isActive = typeof input.isActive === "boolean" ? input.isActive : Boolean(current.isActive);
  if ((await pool.query("SELECT 1 FROM users WHERE username = $1 AND id <> $2", [username, userId])).rowCount) {
    throw new Error("Ja existe um usuario com esse login.");
  }
  await pool.query("UPDATE users SET username = $1, name = $2, role = $3, is_active = $4 WHERE id = $5", [username, name, role, isActive, userId]);
  if (input.password?.trim()) {
    if (input.password.trim().length < 4) throw new Error("Senha precisa ter ao menos 4 caracteres.");
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hashPassword(input.password.trim()), userId]);
  }
  return getUserById(userId);
}

export async function deleteUser(userId: number) {
  const current = (await pool.query("SELECT id, role FROM users WHERE id = $1", [userId])).rows[0] as { id: number; role: string } | undefined;
  if (!current) throw new Error("Usuario nao encontrado.");
  if (current.role === "admin") {
    const totalAdmins = Number((await pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin'")).rows[0].count);
    if (totalAdmins <= 1) throw new Error("Nao e permitido excluir o ultimo administrador.");
  }
  await pool.query("DELETE FROM users WHERE id = $1", [userId]);
  return listUsers();
}
