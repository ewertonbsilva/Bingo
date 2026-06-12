import React, { useRef } from "react";
import { useBingo } from "../context/BingoContext";
import { Heart, Maximize, Minimize, AlertCircle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const PublicScreen: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { currentRound } = useBingo();
  const screenRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      screenRef.current?.requestFullscreen().catch((err) => {
        console.error("Fullscreen Request Failed:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const currentDrawnWord = currentRound?.lastDrawnWord || "AGUARDANDO";
  const drawnHistory = currentRound?.drawnWords || [];

  // Previous drawings (the last 4 except the active one)
  const previousDraws = drawnHistory.length > 1
    ? drawnHistory.slice(0, drawnHistory.length - 1).slice(-4).reverse()
    : [];

  return (
    <div
      ref={screenRef}
      className="fixed inset-0 z-50 bg-gradient-to-br from-rose-950 via-burgundy to-black text-white flex flex-col justify-between p-6 sm:p-12 select-none overflow-hidden"
    >
      {/* Floating background glowing hearts */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <Heart size={300} className="absolute -top-16 -left-16 text-rose-500 blur-xl animate-pulse" />
        <Heart size={200} className="absolute -bottom-16 -right-16 text-yellow-500 blur-xl animate-pulse duration-5000" />
      </div>

      {/* Control overlay menu */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <Heart size={24} className="text-red-500 fill-red-500 animate-pulse" />
          <div className="text-left">
            <h1 className="text-lg font-black tracking-widest text-white uppercase font-sans">
              REDE DE CASAIS
            </h1>
            <p className="text-[10px] text-yellow-500/70 font-mono tracking-wider">
              BINGO DO AMOR • PAINEL PÚBLICO
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-xl border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Expandir Tela"
          >
            <Maximize size={13} /> Tela Cheia
          </button>
          
          <button
            onClick={onClose}
            className="bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-xl border border-rose-500/20 text-rose-300 text-xs font-semibold transition cursor-pointer"
          >
            Fechar Painel
          </button>
        </div>
      </div>

      {/* Main Focus: LARGE WORD DISPLAY */}
      <div className="flex-1 flex flex-col items-center justify-center text-center py-8 z-10">
        <div className="space-y-4 max-w-4xl w-full">
          {/* Heart display icon decoration */}
          <div className="flex items-center justify-center gap-2 text-yellow-400">
            <Sparkles size={16} className="animate-spin duration-5000" />
            <span className="text-[11px] font-mono tracking-widest uppercase font-bold text-yellow-500/80">
              Palavra Sorteada Ativa
            </span>
            <Sparkles size={16} className="animate-spin duration-5000" />
          </div>

          <div className="min-h-[160px] sm:min-h-[220px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.h2
                key={currentDrawnWord}
                initial={{ transform: "scale(0.7) translateY(40px)", opacity: 0 }}
                animate={{ transform: "scale(1) translateY(0px)", opacity: 1 }}
                exit={{ transform: "scale(0.8) translateY(-40px)", opacity: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 15 }}
                className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black font-sans text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-500 tracking-wider drop-shadow-[0_8px_24px_rgba(234,179,8,0.25)] p-2"
              >
                {currentDrawnWord}
              </motion.h2>
            </AnimatePresence>
          </div>

          <p className="text-rose-200/40 text-xs sm:text-sm font-serif italic max-w-md mx-auto">
            {currentRound?.lastDrawnWord
              ? "Marque este valor em sua cartela de bingo!"
              : "Aguardando o início dos sorteios da liderança..."}
          </p>
        </div>
      </div>

      {/* Footer list: PREVIOUS DRAWS log */}
      <div className="border-t border-white/5 pt-6 z-10">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-left space-y-1">
            <h4 className="text-xs uppercase font-mono tracking-widest text-rose-200/50">Palavras Sorteadas Anteriormente</h4>
            <div className="text-[10px] text-rose-300/40 font-mono">Últimos disparos em ordem decrescente</div>
          </div>

          <div className="flex-1 max-w-lg">
            {previousDraws.length === 0 ? (
              <div className="text-xs text-rose-200/25 italic text-center sm:text-right py-2">
                Nenhum histórico anterior.
              </div>
            ) : (
              <div className="flex flex-wrap sm:justify-end gap-2.5">
                {previousDraws.map((word, idx) => (
                  <motion.div
                    key={word}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white/5 border border-white/5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold tracking-wide text-rose-200 shadow-inner"
                  >
                    {word}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
