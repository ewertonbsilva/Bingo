import React from "react";
import { useBingo } from "../context/BingoContext";
import { Heart, PlusCircle, Printer, Trophy, FileText, Sparkles } from "lucide-react";

interface DashboardProps {
  onNavigate: (tabId: string) => void;
  onLaunchPublic: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onLaunchPublic }) => {
  const { wordBank, currentRound, elapsedSeconds, theme, selectedTheme } = useBingo();
  const isLight = theme === "light";
  const shellCard = isLight
    ? "bg-white/92 border border-amber-900/12 text-amber-950 shadow-[0_14px_40px_rgba(120,53,15,0.10)]"
    : "bg-white/5 backdrop-blur-md border border-white/10 text-white";
  const miniCard = isLight
    ? "bg-amber-50 border border-amber-900/12 hover:bg-amber-100/70"
    : "bg-black/30 border border-white/5 hover:bg-black/40";
  const muted = isLight ? "text-amber-900/70" : "text-rose-200/50";
  const sub = isLight ? "text-amber-900/58" : "text-rose-300/40";

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div id="dashboard-tab-content" className="space-y-6">
      <div className={`${isLight ? "bg-gradient-to-r from-amber-100 via-orange-50 to-rose-100 border-amber-900/10" : "bg-gradient-to-r from-red-950 via-burgundy to-rose-950 border-yellow-500/30"} p-6 md:p-8 rounded-2xl border shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6`}>
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <Heart size={20} className="text-red-500 fill-red-500 animate-pulse" />
            <span className={`${isLight ? "text-amber-700" : "text-yellow-400"} text-xs uppercase tracking-widest font-black`}>
              {selectedTheme?.name || "Bingo Tematico"}
            </span>
          </div>
          <h2 className={`text-2xl md:text-3xl font-black font-sans tracking-tight ${isLight ? "text-amber-950" : "text-white"}`}>
            Central do Evento
          </h2>
          <p className={`text-xs md:text-sm max-w-xl leading-relaxed ${isLight ? "text-amber-900/72" : "text-rose-100/70"}`}>
            Gerencie as palavras do tema, gere blocos de cartelas, acompanhe a rodada ativa e prepare a impressao em A4.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 relative z-10 shrink-0">
          <button
            id="quick-start-round-btn"
            onClick={() => onNavigate("rodada")}
            className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 transition duration-150 cursor-pointer shadow-md"
          >
            <PlusCircle size={15} /> Nova Rodada
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className={`${shellCard} p-5 rounded-xl flex items-center justify-between`}>
          <div className="space-y-1">
            <span className={`text-[10px] uppercase tracking-wider font-bold ${muted}`}>Palavras no Banco</span>
            <div className={`text-3xl font-black ${isLight ? "text-amber-950" : "text-white"}`}>{wordBank.length}</div>
            <p className={`text-[10px] ${sub}`}>Relacionadas ao tema atual</p>
          </div>
          <div className="bg-yellow-500/10 p-3 rounded-xl border border-yellow-500/20 text-yellow-500">
            <FileText size={22} />
          </div>
        </div>

        <div className={`${shellCard} p-5 rounded-xl flex items-center justify-between`}>
          <div className="space-y-1">
            <span className={`text-[10px] uppercase tracking-wider font-bold ${muted}`}>Cartelas Emitidas</span>
            <div className={`text-3xl font-black ${isLight ? "text-amber-950" : "text-white"}`}>
              {currentRound && currentRound.isActive ? currentRound.totalCards : 0}
            </div>
            <p className={`text-[10px] ${sub}`}>Prontas para impressao</p>
          </div>
          <div className="bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 text-rose-500">
            <Printer size={22} />
          </div>
        </div>

        <div className={`${shellCard} p-5 rounded-xl flex items-center justify-between`}>
          <div className="space-y-1">
            <span className={`text-[10px] uppercase tracking-wider font-bold ${muted}`}>Status da Rodada</span>
            <div className={`text-lg font-black uppercase tracking-tight flex items-center gap-1.5 pt-1.5 ${isLight ? "text-amber-950" : "text-white"}`}>
              {currentRound && currentRound.isActive ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-emerald-500">Ativa ({currentRound.type})</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-rose-500">Sem Rodada Ativa</span>
                </>
              )}
            </div>
            {currentRound && currentRound.isActive ? (
              <p className={`text-[10px] ${sub}`}>Duracao: {formatTime(elapsedSeconds)} • {currentRound.drawnWords.length} sorteios</p>
            ) : (
              <p className={`text-[10px] ${sub}`}>Pronto para iniciar</p>
            )}
          </div>
          <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-emerald-500">
            <Trophy size={22} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${shellCard} lg:col-span-2 p-6 rounded-2xl space-y-4`}>
          <h3 className={`text-base font-semibold uppercase tracking-widest text-[11px] ${isLight ? "text-amber-950" : "text-rose-100"}`}>
            Atalhos Rapidos
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <button onClick={() => onNavigate("palavras")} className={`${miniCard} p-4 rounded-xl text-left transition group cursor-pointer`}>
              <h4 className="font-bold text-sm text-yellow-600">Gerenciar Palavras</h4>
              <p className={`text-xs mt-1 leading-relaxed ${muted}`}>Cadastre, edite e gere palavras novas por IA para o tema atual.</p>
            </button>

            <button onClick={() => onNavigate("print")} className={`${miniCard} p-4 rounded-xl text-left transition group cursor-pointer`}>
              <h4 className="font-bold text-sm text-rose-600">Grade de Impressao</h4>
              <p className={`text-xs mt-1 leading-relaxed ${muted}`}>Formate as cartelas em A4 e salve o PDF do bloco impresso.</p>
            </button>

            <button onClick={() => onNavigate("sorteador")} className={`${miniCard} p-4 rounded-xl text-left transition group cursor-pointer`}>
              <h4 className="font-bold text-sm text-red-600">Abrir Sorteador</h4>
              <p className={`text-xs mt-1 leading-relaxed ${muted}`}>Conduza o sorteio e acompanhe as cartelas perto de bater.</p>
            </button>

            <button onClick={onLaunchPublic} className={`${miniCard} p-4 rounded-xl text-left transition group cursor-pointer`}>
              <h4 className="font-bold text-sm text-emerald-600">Modo Telao</h4>
              <p className={`text-xs mt-1 leading-relaxed ${muted}`}>Abra a tela publica para televisao, projetor ou monitor auxiliar.</p>
            </button>
          </div>
        </div>

        <div className={`${isLight ? "bg-gradient-to-b from-amber-100 to-orange-50 border-amber-900/10" : "bg-gradient-to-b from-rose-950/40 to-burgundy-900/40 border-white/10"} lg:col-span-1 p-6 rounded-2xl border shadow-md flex flex-col justify-between`}>
          <div className="space-y-3.5">
            <Heart size={28} className="text-red-500 fill-red-500 animate-pulse" />
            <h4 className={`text-base font-semibold ${isLight ? "text-amber-950" : "text-rose-100"}`}>Resumo do Tema</h4>
            <p className={`text-xs leading-relaxed font-sans ${isLight ? "text-amber-900/72" : "text-rose-100/60"}`}>
              Tema atual: <strong>{selectedTheme?.name || "Sem tema"}</strong>.
              <br /><br />
              Use o cadastro de palavras para montar o vocabulário do evento e personalize o título das cartelas antes da impressão.
            </p>
          </div>

          <div className={`border-t pt-4 mt-4 flex items-center gap-2 text-[10px] font-mono ${isLight ? "border-amber-900/12 text-amber-700" : "border-white/5 text-yellow-400"}`}>
            <Sparkles size={11} />
            <span>SISTEMA PRONTO PARA OPERACAO</span>
          </div>
        </div>
      </div>
    </div>
  );
};
