import React, { useEffect, useMemo, useState } from "react";
import { useBingo } from "../context/BingoContext";
import { AlertTriangle, Monitor, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const Sorteador: React.FC<{ onLaunchPublicScreen: () => void }> = ({ onLaunchPublicScreen }) => {
  const { currentRound, drawWord, wordBank, blocks, updateBlockRange } = useBingo();
  const [isRaffling, setIsRaffling] = useState(false);
  const [isRevealingResult, setIsRevealingResult] = useState(false);
  const [raffleDisplay, setRaffleDisplay] = useState("SORTEAR");
  const [showRaffleAlert, setShowRaffleAlert] = useState("");
  const [rangeStart, setRangeStart] = useState<number>(1);
  const [rangeEnd, setRangeEnd] = useState<number>(1);

  const activeBlock = useMemo(
    () => blocks.find((block) => block.id === currentRound?.blockId) || null,
    [blocks, currentRound?.blockId]
  );

  useEffect(() => {
    if (activeBlock) {
      setRangeStart(activeBlock.printedStart ?? 1);
      setRangeEnd(activeBlock.printedEnd ?? activeBlock.totalCards);
    }
  }, [activeBlock]);

  const handleDraw = async () => {
    if (!currentRound || !currentRound.isActive) {
      setShowRaffleAlert("Sem rodada ativa. Crie uma nova rodada primeiro em Painel da Rodada.");
      return;
    }
    if (currentRound.isPaused) {
      setShowRaffleAlert("Rodada pausada. Retome o jogo antes de sortear.");
      return;
    }

    const unDrawn = wordBank.filter((w) => !currentRound.drawnWords.includes(w));
    if (unDrawn.length === 0) {
      setShowRaffleAlert("Todas as palavras do tema ja foram sorteadas.");
      return;
    }

    setIsRaffling(true);
    setIsRevealingResult(false);
    setShowRaffleAlert("");
    const drawPromise = drawWord();

    let counter = 0;
    const maxCycles = 10;
    const interval = setInterval(async () => {
      const tempWord = unDrawn[Math.floor(Math.random() * unDrawn.length)];
      setRaffleDisplay(tempWord);
      counter++;

      if (counter >= maxCycles) {
        clearInterval(interval);
        setIsRevealingResult(true);
        setRaffleDisplay("...");
        const selected = await drawPromise;
        if (selected) {
          setRaffleDisplay(selected);
        }
        setIsRevealingResult(false);
        setIsRaffling(false);
      }
    }, 70);
  };

  useEffect(() => {
    if (currentRound?.lastDrawnWord) {
      setRaffleDisplay(currentRound.lastDrawnWord);
    } else {
      setRaffleDisplay("BINGO");
    }
  }, [currentRound?.lastDrawnWord]);

  return (
    <div id="sorteador-container" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-xl">
        <div>
          <h2 className="text-2xl font-bold text-white font-sans">Sorteador do Bingo</h2>
          <p className="text-xs text-rose-200/60 mt-1">
            Informe a faixa impressa do bloco atual e acompanhe as cartelas que estao perto de bater.
          </p>
        </div>

        <button
          id="launch-telao-button"
          onClick={onLaunchPublicScreen}
          className="bg-burgundy/80 hover:bg-burgundy border border-yellow-500/30 text-yellow-400 hover:text-white px-4 py-2.5 rounded-xl font-medium text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg"
        >
          <Monitor size={15} />
          Abrir Modo Telao
        </button>
      </div>

      {showRaffleAlert && (
        <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 p-4 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle size={15} />
          {showRaffleAlert}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gradient-to-br from-rose-950/35 to-burgundy-900/35 backdrop-blur-md rounded-3xl p-8 border border-white/10 shadow-xl flex flex-col items-center justify-center text-center relative overflow-hidden h-[340px]">
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            animate={isRaffling ? { opacity: [0.2, 0.45, 0.2] } : { opacity: 0.16 }}
            transition={isRaffling ? { duration: 0.8, repeat: Infinity, ease: "easeInOut" } : { duration: 0.4 }}
          >
            <div className="absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-400/10 blur-3xl" />
            <div className="absolute left-1/2 top-1/2 h-[180px] w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-yellow-300/20" />
            <div className="absolute left-1/2 top-1/2 h-[230px] w-[230px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-rose-200/10" />
          </motion.div>

          <div className="relative z-10 space-y-6 w-full max-w-md">
            <div className="text-xs text-yellow-400 font-mono tracking-widest uppercase font-bold">SORTEIO DO BLOCO {currentRound?.blockId ?? "-"}</div>

            <div className="min-h-[110px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={raffleDisplay}
                  initial={{ scale: 0.92, opacity: 0.35, y: 10, filter: "blur(4px)" }}
                  animate={{
                    scale: isRaffling && !isRevealingResult ? [0.99, 1.03, 1] : [0.94, 1.1, 1],
                    opacity: 1,
                    y: isRaffling && !isRevealingResult ? [8, -2, 0] : [10, -14, 0],
                    filter: isRevealingResult ? ["blur(0px)", "blur(0px)", "blur(0px)"] : ["blur(3px)", "blur(0px)", "blur(0px)"],
                  }}
                  exit={{ scale: 1.01, opacity: 0.15, y: -6, filter: "blur(3px)" }}
                  transition={{ duration: isRaffling && !isRevealingResult ? 0.08 : 0.42, ease: isRaffling && !isRevealingResult ? "linear" : "easeOut" }}
                  className="relative p-1"
                >
                  <motion.div
                    className={`absolute inset-0 rounded-3xl ${
                      isRaffling ? "bg-yellow-300/12" : "bg-white/8"
                    }`}
                    animate={isRaffling && !isRevealingResult ? { scale: [0.98, 1.02, 0.99], opacity: [0.18, 0.28, 0.18] } : { scale: 1, opacity: 0.2 }}
                    transition={isRaffling && !isRevealingResult ? { duration: 0.22, repeat: Infinity, ease: "linear" } : { duration: 0.3 }}
                  />
                  <div
                    className={`relative text-4xl sm:text-5xl md:text-6xl font-black tracking-[0.06em] font-sans text-transparent bg-clip-text bg-gradient-to-r ${
                      isRaffling && !isRevealingResult ? "from-yellow-300 via-amber-100 to-yellow-500" : "from-white via-rose-50 to-yellow-200"
                    } drop-shadow-md px-5 py-3`}
                  >
                    {raffleDisplay}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {isRaffling && !isRevealingResult && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="text-[10px] uppercase tracking-[0.35em] text-yellow-300/80 font-black"
                >
                  Misturando Palavras
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {isRevealingResult && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="text-[10px] uppercase tracking-[0.35em] text-rose-100/80 font-black"
                >
                  Revelando Palavra
                </motion.div>
              )}
            </AnimatePresence>

            <button
              id="draw-word-action-btn"
              onClick={() => void handleDraw()}
              disabled={isRaffling}
              className={`min-w-[200px] bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-bold py-3.5 px-8 rounded-full shadow-lg transition-all text-sm uppercase tracking-widest cursor-pointer border border-rose-500/40 ${isRaffling ? "opacity-75 cursor-not-allowed" : ""}`}
            >
              {isRaffling ? "Sorteando..." : "Sortear Palavra"}
            </button>
          </div>
        </div>

        <div className="lg:col-span-1 bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-lg flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-rose-100 flex items-center gap-1.5">
              <Sparkles size={16} className="text-yellow-400" /> Andamento Geral
            </h3>

            <div className="space-y-3.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-rose-200/50 uppercase">Resta Sorteio</span>
                <span className="text-white font-bold font-mono">
                  {currentRound ? wordBank.length - currentRound.drawnWords.length : wordBank.length} palavras
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pt-2">
                <span className="text-rose-200/50 uppercase font-medium">Cartelas Emitidas</span>
                <span className="text-white font-semibold font-mono">{currentRound ? currentRound.totalCards : 0}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" value={rangeStart} onChange={(e) => setRangeStart(Number(e.target.value))} className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                <input type="number" value={rangeEnd} onChange={(e) => setRangeEnd(Number(e.target.value))} className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
              </div>
              <button
                onClick={() => activeBlock && void updateBlockRange(activeBlock.id, rangeStart, rangeEnd)}
                className="w-full bg-yellow-500/90 hover:bg-yellow-400 text-black font-bold py-2 rounded-xl text-xs cursor-pointer"
              >
                Salvar faixa impressa
              </button>
            </div>
          </div>

          <div className="bg-black/40 p-4 rounded-xl border border-white/5 mt-4">
            <div className="text-[10px] text-yellow-400 uppercase tracking-widest font-bold">Quase Bingo</div>
            {currentRound?.nearWins?.length ? (
              <div className="mt-2 space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                {currentRound.nearWins.slice(0, 8).map((alert) => (
                  <div key={alert.id} className="text-[11px] text-rose-100 border border-white/5 rounded-lg px-3 py-2">
                    <strong>{alert.cardCode}</strong> perto de bater em <strong>{alert.matchedMode}</strong>. Faltam {alert.missingCount} palavra{alert.missingCount > 1 ? "s" : ""}: {alert.missingWords.join(", ")}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-rose-200/60 leading-relaxed mt-1">Nenhuma cartela esta perto de bater ainda.</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-lg">
        <h3 className="text-base font-semibold text-rose-100 mb-4">
          Historico da Rodada ({currentRound ? currentRound.drawnWords.length : 0} Sorteadas)
        </h3>

        {!currentRound || currentRound.drawnWords.length === 0 ? (
          <div className="text-center py-12 text-rose-200/30 text-xs">A lista esta limpa. As palavras sorteadas aparecerao aqui.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {currentRound.drawnWords.slice().sort((a, b) => a.localeCompare(b)).map((word) => {
              const sequenceNum = currentRound.drawnWords.indexOf(word) + 1;
              const isLatest = word === currentRound.lastDrawnWord;

              return (
                <motion.div key={word} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`p-3.5 rounded-2xl text-center border relative transition overflow-hidden shadow-sm ${isLatest ? "bg-gradient-to-br from-rose-950 to-burgundy-900 border-yellow-500/50 ring-1 ring-yellow-400/20" : "bg-black/30 border-white/5"}`}>
                  <div className="text-[10px] font-bold text-yellow-500/60 font-mono">#{sequenceNum}</div>
                  <div className={`font-mono font-bold text-sm tracking-wide mt-1 ${isLatest ? "text-yellow-400" : "text-white"}`}>{word}</div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
