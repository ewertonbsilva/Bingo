import React, { useEffect, useMemo, useState } from "react";
import { useBingo } from "../context/BingoContext";
import { AlertTriangle, Monitor, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const Sorteador: React.FC<{ onLaunchPublicScreen: () => void }> = ({ onLaunchPublicScreen }) => {
  const { currentRound, drawWord, wordBank, blocks, updateBlockRange } = useBingo();
  const [isRaffling, setIsRaffling] = useState(false);
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
    setShowRaffleAlert("");

    let counter = 0;
    const maxCycles = 15;
    const interval = setInterval(async () => {
      const tempWord = unDrawn[Math.floor(Math.random() * unDrawn.length)];
      setRaffleDisplay(tempWord);
      counter++;

      if (counter >= maxCycles) {
        clearInterval(interval);
        const selected = await drawWord();
        if (selected) {
          setRaffleDisplay(selected);
        }
        setIsRaffling(false);
      }
    }, 100);
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
          <div className="relative z-10 space-y-6 w-full max-w-md">
            <div className="text-xs text-yellow-400 font-mono tracking-widest uppercase font-bold">SORTEIO DO BLOCO {currentRound?.blockId ?? "-"}</div>

            <div className="min-h-[110px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={raffleDisplay}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1, y: [0, -10, 0] }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`text-4xl sm:text-5xl md:text-6xl font-black tracking-wider font-sans text-transparent bg-clip-text bg-gradient-to-r ${
                    isRaffling ? "from-yellow-400 via-amber-300 to-yellow-500" : "from-white via-rose-100 to-yellow-300"
                  } drop-shadow-md p-1`}
                >
                  {raffleDisplay}
                </motion.div>
              </AnimatePresence>
            </div>

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
