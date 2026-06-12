import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AppUser, BingoType, Card, CardBlockSummary, RoundState, ThemePreset, ThemeType, VictoryMode } from "../types";

interface BingoContextData {
  currentUser: AppUser | null;
  users: AppUser[];
  wordBank: string[];
  currentRound: RoundState | null;
  theme: ThemeType;
  themes: ThemePreset[];
  selectedTheme: ThemePreset | null;
  blocks: CardBlockSummary[];
  elapsedSeconds: number;
  loading: boolean;
  authLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  addWord: (word: string) => Promise<boolean>;
  removeWord: (word: string) => Promise<void>;
  updateWord: (oldWord: string, newWord: string) => Promise<boolean>;
  resetWordBank: () => Promise<void>;
  importWords: (rawText: string) => Promise<number>;
  startNewRound: (type: BingoType, totalCards: number, victoryModes: VictoryMode[], blockName?: string) => Promise<void>;
  drawWord: () => Promise<string | null>;
  pauseRound: () => Promise<void>;
  resumeRound: () => Promise<void>;
  resetRound: () => Promise<void>;
  endRound: () => Promise<void>;
  setTheme: (theme: ThemeType) => void;
  setSelectedThemeId: (themeId: number) => Promise<void>;
  createTheme: (name: string, preset: ThemeType) => Promise<void>;
  deleteTheme: (themeId: number) => Promise<void>;
  updateSelectedTheme: (input: { name?: string; cardTitle?: string }) => Promise<void>;
  loadUsers: () => Promise<void>;
  createUser: (input: { username: string; name: string; password: string; role: "admin" | "operator" }) => Promise<void>;
  updateUserAccount: (userId: number, input: { username?: string; name?: string; password?: string; role?: "admin" | "operator"; isActive?: boolean }) => Promise<void>;
  deleteUserAccount: (userId: number) => Promise<void>;
  updateBlockRange: (blockId: number, printedStart: number, printedEnd: number) => Promise<void>;
  refreshData: () => Promise<void>;
}

const BingoContext = createContext<BingoContextData | undefined>(undefined);

async function api<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const text = await response.text();
  const contentType = response.headers.get("content-type") || "";
  const data = text && contentType.includes("application/json") ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error((data as any)?.error || `Erro na requisicao (${response.status}).`);
  }
  if (!data) {
    throw new Error("Resposta invalida da API.");
  }
  return data;
}

export const BingoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [themes, setThemes] = useState<ThemePreset[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<ThemePreset | null>(null);
  const [blocks, setBlocks] = useState<CardBlockSummary[]>([]);
  const [currentRound, setCurrentRound] = useState<RoundState | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [themeOverride, setThemeOverride] = useState<ThemeType | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const wordBank = useMemo(() => selectedTheme?.words ?? [], [selectedTheme]);
  const theme = themeOverride ?? selectedTheme?.preset ?? "romantic";

  const refreshData = async () => {
    const data = await api<{
      themes: ThemePreset[];
      selectedThemeId: number;
      selectedTheme: ThemePreset;
      activeRound: RoundState | null;
      blocks: CardBlockSummary[];
    }>("/api/bootstrap");
    setThemes(data.themes);
    setSelectedTheme(data.selectedTheme);
    setCurrentRound(data.activeRound);
    setBlocks(data.blocks);
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const auth = await api<{ authenticated: boolean; user: AppUser | null }>("/api/auth/bootstrap");
        setCurrentUser(auth.user);
        if (auth.user) {
          await refreshData();
          if (auth.user.role === "admin") {
            const data = await api<{ users: AppUser[] }>("/api/users");
            setUsers(data.users);
          }
        }
      } catch {
        setCurrentUser(null);
      } finally {
        setAuthLoading(false);
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  useEffect(() => {
    if (!currentRound || !currentRound.isActive || currentRound.isPaused || !currentRound.startTime) {
      setElapsedSeconds(currentRound?.pausedSeconds ?? 0);
      return;
    }

    const tick = () => {
      const start = new Date(currentRound.startTime!).getTime();
      setElapsedSeconds(Math.floor((Date.now() - start) / 1000) - currentRound.pausedSeconds);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [currentRound]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark", "romantic");
    root.classList.add(theme);
  }, [theme]);

  const login = async (username: string, password: string) => {
    const data = await api<{ user: AppUser }>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setCurrentUser(data.user);
    await refreshData();
    if (data.user.role === "admin") {
      const usersData = await api<{ users: AppUser[] }>("/api/users");
      setUsers(usersData.users);
    } else {
      setUsers([]);
    }
  };

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    setCurrentUser(null);
    setUsers([]);
    setThemes([]);
    setSelectedTheme(null);
    setCurrentRound(null);
    setBlocks([]);
  };

  const reloadSelectedTheme = async (themeId?: number) => {
    if (!themeId && !selectedTheme) return;
    const targetId = themeId ?? selectedTheme!.id;
    const themeData = await api<ThemePreset>(`/api/themes/${targetId}`);
    setSelectedTheme(themeData);
  };

  const addWord = async (word: string) => {
    if (!selectedTheme) return false;
    const data = await api<{ words: string[] }>(`/api/themes/${selectedTheme.id}/words`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word }),
    });
    setSelectedTheme({ ...selectedTheme, words: data.words });
    return true;
  };

  const removeWord = async (word: string) => {
    if (!selectedTheme) return;
    const data = await api<{ words: string[] }>(`/api/themes/${selectedTheme.id}/words/${encodeURIComponent(word)}`, {
      method: "DELETE",
    });
    setSelectedTheme({ ...selectedTheme, words: data.words });
  };

  const updateWord = async (oldWord: string, newWord: string) => {
    if (!selectedTheme) return false;
    const data = await api<{ words: string[] }>(`/api/themes/${selectedTheme.id}/words`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldWord, newWord }),
    });
    setSelectedTheme({ ...selectedTheme, words: data.words });
    return true;
  };

  const resetWordBank = async () => {
    if (!selectedTheme) return;
    const data = await api<{ words: string[] }>(`/api/themes/${selectedTheme.id}/words/reset`, {
      method: "POST",
    });
    setSelectedTheme({ ...selectedTheme, words: data.words });
  };

  const importWords = async (rawText: string) => {
    if (!selectedTheme) return 0;
    const data = await api<{ inserted: number; words: string[] }>(`/api/themes/${selectedTheme.id}/words/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText }),
    });
    setSelectedTheme({ ...selectedTheme, words: data.words });
    return data.inserted;
  };

  const startNewRound = async (type: BingoType, totalCards: number, victoryModes: VictoryMode[], blockName?: string) => {
    if (!selectedTheme) return;
    const { generateBingoCards } = await import("../utils/bingoGenerator");
    const generated = generateBingoCards(wordBank, type, totalCards);
    const payload = {
      themeId: selectedTheme.id,
      name: blockName?.trim() || `${selectedTheme.name} ${new Date().toLocaleString("pt-BR")}`,
      type,
      victoryModes,
      cards: generated.map((card: Card) => ({ code: card.code, grid: card.grid })),
    };
    const data = await api<{ round: RoundState }>("/api/round/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setCurrentRound(data.round);
    await refreshData();
  };

  const drawWord = async () => {
    const data = await api<{ round: RoundState }>("/api/round/draw", { method: "POST" });
    setCurrentRound(data.round);
    return data.round.lastDrawnWord;
  };

  const pauseRoundAction = async () => {
    const data = await api<{ round: RoundState | null }>("/api/round/pause", { method: "POST" });
    setCurrentRound(data.round);
  };

  const resumeRoundAction = async () => {
    const data = await api<{ round: RoundState | null }>("/api/round/resume", { method: "POST" });
    setCurrentRound(data.round);
  };

  const resetRoundAction = async () => {
    const data = await api<{ round: RoundState | null }>("/api/round/reset", { method: "POST" });
    setCurrentRound(data.round);
  };

  const endRoundAction = async () => {
    await api<{ round: null }>("/api/round/end", { method: "POST" });
    setCurrentRound(null);
    await refreshData();
  };

  const setSelectedThemeId = async (themeId: number) => {
    await api(`/api/themes/select`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ themeId }),
    });
    setThemeOverride(null);
    await refreshData();
  };

  const createThemeAction = async (name: string, preset: ThemeType) => {
    const themeData = await api<ThemePreset>("/api/themes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, preset }),
    });
    await setSelectedThemeId(themeData.id);
    await reloadSelectedTheme(themeData.id);
  };

  const deleteThemeAction = async (themeId: number) => {
    await api(`/api/themes/${themeId}`, { method: "DELETE" });
    setThemeOverride(null);
    await refreshData();
  };

  const updateSelectedTheme = async (input: { name?: string; cardTitle?: string }) => {
    if (!selectedTheme) return;
    const themeData = await api<ThemePreset>(`/api/themes/${selectedTheme.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    setSelectedTheme(themeData);
    setThemes((prev) => prev.map((item) => (item.id === themeData.id ? { ...item, ...themeData } : item)));
  };

  const updateBlockRange = async (blockId: number, printedStart: number, printedEnd: number) => {
    await api(`/api/blocks/${blockId}/print-range`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ printedStart, printedEnd }),
    });
    await refreshData();
  };

  const loadUsers = async () => {
    const data = await api<{ users: AppUser[] }>("/api/users");
    setUsers(data.users);
  };

  const createUserAction = async (input: { username: string; name: string; password: string; role: "admin" | "operator" }) => {
    await api("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    await loadUsers();
  };

  const updateUserAccount = async (userId: number, input: { username?: string; name?: string; password?: string; role?: "admin" | "operator"; isActive?: boolean }) => {
    await api(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    await loadUsers();
  };

  const deleteUserAccount = async (userId: number) => {
    const data = await api<{ users: AppUser[] }>(`/api/users/${userId}`, {
      method: "DELETE",
    });
    setUsers(data.users);
  };

  return (
    <BingoContext.Provider
      value={{
        currentUser,
        users,
        wordBank,
        currentRound,
        theme,
        themes,
        selectedTheme,
        blocks,
        elapsedSeconds,
        loading,
        authLoading,
        login,
        logout,
        addWord,
        removeWord,
        updateWord,
        resetWordBank,
        importWords,
        startNewRound,
        drawWord,
        pauseRound: pauseRoundAction,
        resumeRound: resumeRoundAction,
        resetRound: resetRoundAction,
        endRound: endRoundAction,
        setTheme: setThemeOverride,
        setSelectedThemeId,
        createTheme: createThemeAction,
        deleteTheme: deleteThemeAction,
        updateSelectedTheme,
        loadUsers,
        createUser: createUserAction,
        updateUserAccount,
        deleteUserAccount,
        updateBlockRange,
        refreshData,
      }}
    >
      {children}
    </BingoContext.Provider>
  );
};

export const useBingo = () => {
  const context = useContext(BingoContext);
  if (!context) {
    throw new Error("useBingo must be used within a BingoProvider");
  }
  return context;
};
