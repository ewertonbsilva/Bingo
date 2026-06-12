import React, { useState } from "react";
import { BingoProvider, useBingo } from "./context/BingoContext";
import { Dashboard } from "./components/Dashboard";
import { RoundAdmin } from "./components/RoundAdmin";
import { Sorteador } from "./components/Sorteador";
import { PrintManager } from "./components/PrintManager";
import { WordEditor } from "./components/WordEditor";
import { PublicScreen } from "./components/PublicScreen";
import { UsersAdmin } from "./components/UsersAdmin";
import { Heart, LayoutDashboard, Settings2, PlayCircle, Printer, BookOpen, Sun, Moon, PlusCircle, Trash2, Users, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

function MainAppShell() {
  const { theme, setTheme, currentRound, themes, selectedTheme, setSelectedThemeId, createTheme, deleteTheme, updateSelectedTheme, loading, authLoading, currentUser, logout } = useBingo();
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [showPublicScreen, setShowPublicScreen] = useState<boolean>(false);
  const [newThemeName, setNewThemeName] = useState("");
  const [cardTitleDraft, setCardTitleDraft] = useState("");
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const { login } = useBingo();

  const themeBackdrops = {
    romantic: "from-burgundy-950 via-[#3a0210] to-black text-rose-100",
    dark: "from-gray-950 via-neutral-900 to-black text-stone-100",
    light: "from-amber-50/60 via-rose-50/70 to-orange-50 text-amber-950",
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "rodada", label: "Painel da Rodada", icon: Settings2 },
    { id: "sorteador", label: "Sorteador", icon: PlayCircle },
    { id: "print", label: "Imprimir Cartelas", icon: Printer },
    { id: "palavras", label: "Cadastro de Palavras", icon: BookOpen },
    ...(currentUser?.role === "admin" ? [{ id: "usuarios", label: "Usuarios", icon: Users }] : []),
  ];

  if (loading || authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-white">Carregando...</div>;
  }

  if (!currentUser) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${themeBackdrops[theme]} flex items-center justify-center px-4`}>
        <div className="w-full max-w-md bg-black/35 border border-white/10 rounded-3xl p-8 space-y-4">
          <div className="text-center">
            <h1 className="text-2xl font-black text-white">Bingo Tematico</h1>
            <p className="text-sm text-rose-200/70 mt-2">Entre com usuario e senha para abrir o sistema.</p>
          </div>
          {loginError && <div className="bg-rose-500/15 border border-rose-500/30 text-rose-200 rounded-xl px-4 py-3 text-sm">{loginError}</div>}
          <input value={loginData.username} onChange={(e) => setLoginData((p) => ({ ...p, username: e.target.value }))} placeholder="Usuario" className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white" />
          <input value={loginData.password} onChange={(e) => setLoginData((p) => ({ ...p, password: e.target.value }))} placeholder="Senha" type="password" className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white" />
          <button
            onClick={async () => {
              try {
                setLoginError("");
                await login(loginData.username, loginData.password);
              } catch (error: any) {
                setLoginError(error.message || "Falha no login.");
              }
            }}
            className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl cursor-pointer"
          >
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${themeBackdrops[theme]} transition-all duration-300 relative flex flex-col font-sans selection:bg-rose-500/20`}>
      <div className="h-1 bg-gradient-to-r from-yellow-500 via-rose-600 to-amber-500 w-full" />

      <header
        id="root-layout-header"
        className={`border-b ${theme === "light" ? "bg-white/80 border-amber-950/10" : "bg-black/30 border-white/5"} backdrop-blur-md px-4 py-3.5 sm:px-8 relative z-20 transition`}
      >
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-red-600/10 p-2 rounded-xl border border-red-500/20">
                <Heart className="text-red-500 fill-red-500 animate-pulse" size={20} />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-widest uppercase">Bingo Tematico</h1>
                <p className="text-[10px] text-yellow-500 uppercase tracking-widest font-black">
                  {selectedTheme?.name || "Tema nao selecionado"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className={`px-3 py-2 rounded-xl text-xs font-bold border ${theme === "light" ? "bg-white border-amber-950/10 text-amber-950" : "bg-black/40 border-white/10 text-white"}`}>
                {currentUser.name} • {currentUser.role}
              </div>
              <select
                value={selectedTheme?.id ?? ""}
                onChange={async (e) => {
                  await setSelectedThemeId(Number(e.target.value));
                  setCardTitleDraft("");
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold border ${theme === "light" ? "bg-white border-amber-950/10 text-amber-950" : "bg-black/40 border-white/10 text-white"}`}
              >
                {themes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>

              <div className={`p-1 rounded-xl border flex items-center gap-1 ${theme === "light" ? "bg-amber-100/50 border-amber-950/10" : "bg-black/40 border-white/5"}`}>
                <button
                  id="theme-btn-romantic"
                  onClick={() => setTheme("romantic")}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${theme === "romantic" ? "bg-rose-900 text-white shadow-sm" : theme === "light" ? "text-amber-950/80 hover:bg-amber-200/80" : "opacity-60 hover:opacity-100"}`}
                >
                  Romantico
                </button>
                <button
                  id="theme-btn-dark"
                  onClick={() => setTheme("dark")}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${theme === "dark" ? "bg-neutral-800 text-white shadow-sm" : theme === "light" ? "text-amber-950/80 hover:bg-amber-200/80" : "opacity-60 hover:opacity-100"}`}
                >
                  <Moon size={10} /> Escuro
                </button>
                <button
                  id="theme-btn-light"
                  onClick={() => setTheme("light")}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${theme === "light" ? "bg-amber-200/60 text-amber-950 shadow-sm" : "opacity-60 hover:opacity-100"}`}
                >
                  <Sun size={10} /> Claro
                </button>
              </div>
              <button
                onClick={() => void logout()}
                className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 cursor-pointer ${theme === "light" ? "bg-white border-amber-950/10 text-amber-950" : "bg-black/40 border-white/10 text-white"}`}
              >
                <LogOut size={14} /> Sair
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-2">
            <input
              value={newThemeName}
              onChange={(e) => setNewThemeName(e.target.value)}
              placeholder="Novo tema, ex: Aniversario do Fulano"
              className={`flex-1 px-4 py-2 rounded-xl text-sm border ${theme === "light" ? "bg-white border-amber-950/10 text-amber-950" : "bg-black/30 border-white/10 text-white"}`}
            />
            <button
              onClick={async () => {
                if (!newThemeName.trim()) return;
                await createTheme(newThemeName, theme);
                setNewThemeName("");
              }}
              className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold px-4 py-2 rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <PlusCircle size={16} /> Criar Tema
            </button>
            <button
              onClick={async () => {
                if (!selectedTheme) return;
                if (!window.confirm(`Excluir o tema "${selectedTheme.name}"?`)) return;
                try {
                  await deleteTheme(selectedTheme.id);
                } catch (error: any) {
                  window.alert(error.message || "Nao foi possivel excluir o tema.");
                }
              }}
              disabled={!selectedTheme || themes.length <= 1}
              className="bg-rose-900/80 hover:bg-rose-800 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={16} /> Excluir Tema
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-2">
            <input
              value={cardTitleDraft || selectedTheme?.cardTitle || ""}
              onChange={(e) => setCardTitleDraft(e.target.value)}
              placeholder="Titulo das cartelas"
              className={`flex-1 px-4 py-2 rounded-xl text-sm border ${theme === "light" ? "bg-white border-amber-950/10 text-amber-950" : "bg-black/30 border-white/10 text-white"}`}
            />
            <button
              onClick={async () => {
                if (!selectedTheme) return;
                await updateSelectedTheme({ cardTitle: cardTitleDraft || selectedTheme.cardTitle || selectedTheme.name });
                setCardTitleDraft("");
              }}
              className="bg-black/30 border border-white/10 text-white font-bold px-4 py-2 rounded-xl text-sm cursor-pointer"
            >
              Salvar Titulo da Cartela
            </button>
          </div>
        </div>
      </header>

      <nav
        id="main-sidebar-nav"
        className={`border-b ${theme === "light" ? "bg-amber-50/55 border-amber-950/5" : "bg-black/10 border-white/5"} relative z-10 transition overflow-x-auto`}
      >
        <div id="dashboard-tabs" className="max-w-7xl mx-auto flex items-center justify-start md:justify-center px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`tab-btn-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`px-4 py-3 border-b-2 font-semibold text-xs tracking-wide transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isSelected ? "border-red-500 text-red-500 font-bold" : theme === "light" ? "border-transparent text-amber-950/80 hover:text-amber-950" : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <Icon size={14} />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 sm:px-8 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}>
            {activeTab === "dashboard" && <Dashboard onNavigate={(tab) => setActiveTab(tab)} onLaunchPublic={() => setShowPublicScreen(true)} />}
            {activeTab === "rodada" && <RoundAdmin onViewSorteador={() => setActiveTab("sorteador")} />}
            {activeTab === "sorteador" && <Sorteador onLaunchPublicScreen={() => setShowPublicScreen(true)} />}
            {activeTab === "print" && <PrintManager />}
            {activeTab === "palavras" && <WordEditor />}
            {activeTab === "usuarios" && <UsersAdmin />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer
        id="non-printable-panels"
        className={`border-t text-center py-5 ${theme === "light" ? "border-amber-950/10 text-amber-900/40" : "border-white/5 text-rose-300/30"} text-[10px] uppercase tracking-wider relative z-10`}
      >
        <p>{currentRound ? `Bloco ativo: ${currentRound.blockName}` : "Sem rodada ativa"}</p>
      </footer>

      <AnimatePresence>
        {showPublicScreen && <PublicScreen onClose={() => setShowPublicScreen(false)} />}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <BingoProvider>
      <MainAppShell />
    </BingoProvider>
  );
}
