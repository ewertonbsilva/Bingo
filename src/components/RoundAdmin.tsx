import React, { useState } from "react";
import { useBingo } from "../context/BingoContext";
import { BingoType, VictoryMode } from "../types";
import { Sparkles, ArrowRight, ArrowLeft, CheckCircle, RefreshCw, Play, Pause, Grid, Users, Trophy, Eye, Clock, XCircle } from "lucide-react";
import { motion } from "motion/react";

export const RoundAdmin: React.FC<{ onViewSorteador: () => void }> = ({ onViewSorteador }) => {
  const { wordBank, currentRound, startNewRound, pauseRound, resumeRound, resetRound, endRound, elapsedSeconds, addWord, selectedTheme } = useBingo();
  const [step, setStep] = useState(1);
  const [bingoType, setBingoType] = useState<BingoType>("5x5");
  const [cardVolumeType, setCardVolumeType] = useState<"standard" | "custom">("standard");
  const [cardsCount, setCardsCount] = useState<number>(30);
  const [selectedModes, setSelectedModes] = useState<VictoryMode[]>(["full_card"]);
  const [blockName, setBlockName] = useState("");
  const [isAiAutofilling, setIsAiAutofilling] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const requiredWordsCount = bingoType === "3x3" ? 8 : 24;
  const hasEnoughWords = wordBank.length >= requiredWordsCount;

  const victoryModesOptions = [
    { value: "horizontal" as VictoryMode, label: "Horizontal", desc: "Completar qualquer linha" },
    { value: "vertical" as VictoryMode, label: "Vertical", desc: "Completar qualquer coluna" },
    { value: "diagonal" as VictoryMode, label: "Diagonal Principal", desc: "Diagonal principal" },
    { value: "diagonal_inverse" as VictoryMode, label: "Diagonal Secundaria", desc: "Diagonal reversa" },
    { value: "full_card" as VictoryMode, label: "Cartela Cheia", desc: "Marcar todas as palavras" },
  ];

  const toggleVictoryMode = (mode: VictoryMode) => {
    if (selectedModes.includes(mode)) {
      if (selectedModes.length > 1) setSelectedModes(selectedModes.filter((m) => m !== mode));
    } else {
      setSelectedModes([...selectedModes, mode]);
    }
  };

  const handleAutofillWords = async () => {
    setIsAiAutofilling(true);
    try {
      const response = await fetch("/api/generate-words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ existingWords: wordBank, themeName: selectedTheme?.name || "" }),
      });
      const data = await response.json();
      const generated: string[] = data.words || [];
      for (const word of generated) {
        await addWord(word);
      }
    } finally {
      setIsAiAutofilling(false);
    }
  };

  const handleLaunchRound = async () => {
    if (!hasEnoughWords) return;
    await startNewRound(bingoType, cardsCount, selectedModes, blockName || `${selectedTheme?.name || "Tema"} - Lote ${cardsCount}`);
    setStep(1);
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  if (currentRound && currentRound.isActive) {
    return (
      <div id="active-round-dashboard" className="space-y-6">
        <div className="bg-gradient-to-r from-red-950 via-burgundy to-rose-950 p-6 rounded-2xl border border-yellow-500/30 shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
            <div className="space-y-1">
              <span className="inline-block bg-yellow-500/20 text-yellow-300 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border border-yellow-500/30">
                Rodada em Andamento
              </span>
              <h2 className="text-2xl font-bold text-white font-sans">{currentRound.blockName}</h2>
              <p className="text-xs text-rose-200/60 font-mono">
                Tema: {selectedTheme?.name} | Bloco #{currentRound.blockId} | Vitorias: {currentRound.victoryModes.join(", ")}
              </p>
            </div>

            <div className="bg-black/30 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/5 flex items-center gap-3">
              <Clock className="text-yellow-400 animate-pulse" size={20} />
              <div className="text-right">
                <div className="text-xs text-rose-200/50 uppercase tracking-widest font-bold">Tempo Escorrido</div>
                <div className="text-2xl font-mono font-bold text-yellow-400">{formatTime(elapsedSeconds)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/5 backdrop-blur-md p-5 rounded-xl border border-white/10 flex items-center gap-4">
            <div className="bg-rose-500/20 p-3 rounded-lg text-rose-400"><Grid size={24} /></div>
            <div><div className="text-xs text-rose-200/50 uppercase">Formato Grid</div><div className="text-xl font-bold text-white uppercase">{currentRound.type}</div></div>
          </div>
          <div className="bg-white/5 backdrop-blur-md p-5 rounded-xl border border-white/10 flex items-center gap-4">
            <div className="bg-yellow-500/20 p-3 rounded-lg text-yellow-400"><Users size={24} /></div>
            <div><div className="text-xs text-rose-200/50 uppercase">Cartelas Emitidas</div><div className="text-xl font-bold text-white">{currentRound.totalCards}</div></div>
          </div>
          <div className="bg-white/5 backdrop-blur-md p-5 rounded-xl border border-white/10 flex items-center gap-4">
            <div className="bg-emerald-500/20 p-3 rounded-lg text-emerald-400"><Trophy size={24} /></div>
            <div><div className="text-xs text-rose-200/50 uppercase">Sorteios Efetuados</div><div className="text-xl font-bold text-white">{currentRound.drawnWords.length} / {wordBank.length}</div></div>
          </div>
          <div className="bg-white/5 backdrop-blur-md p-5 rounded-xl border border-white/10 flex items-center gap-4">
            <div className="bg-blue-500/20 p-3 rounded-lg text-blue-400"><Eye size={24} /></div>
            <div><div className="text-xs text-rose-200/50 uppercase">Ultima Sorteada</div><div className="text-xl font-bold text-white font-mono truncate max-w-[140px]">{currentRound.lastDrawnWord || "NENHUMA"}</div></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 space-y-4">
            {currentRound.isPaused ? (
              <button onClick={() => void resumeRound()} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 px-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer">
                <Play size={18} /> Continuar Jogo
              </button>
            ) : (
              <button onClick={() => void pauseRound()} className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-medium py-3 px-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer">
                <Pause size={18} /> Pausar Rodada
              </button>
            )}

            <button onClick={onViewSorteador} className="w-full bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-medium py-3 px-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer">
              <Trophy size={18} /> Abrir Sorteador / Telao
            </button>

            {showResetConfirm ? (
              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl space-y-2 text-left">
                <p className="text-[10px] text-amber-200 leading-relaxed font-bold">Confirma reiniciar o sorteio deste bloco?</p>
                <div className="flex gap-2">
                  <button onClick={() => void resetRound().then(() => setShowResetConfirm(false))} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] uppercase transition cursor-pointer">Sim, Reiniciar</button>
                  <button onClick={() => setShowResetConfirm(false)} className="bg-white/10 hover:bg-white/15 text-stone-200 py-1.5 px-3 rounded-lg text-[10px] uppercase transition cursor-pointer">Cancelar</button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setShowResetConfirm(true); setShowEndConfirm(false); }} className="w-full bg-white/5 hover:bg-white/10 text-rose-200 border border-white/10 hover:border-rose-400/30 font-medium py-2 px-4 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer text-xs">
                <RefreshCw size={14} /> Reiniciar Sorteio
              </button>
            )}

            {showEndConfirm ? (
              <div className="bg-rose-500/15 border border-rose-500/30 p-3 rounded-xl space-y-2 text-left">
                <p className="text-[10px] text-rose-200 leading-relaxed font-bold">Confirma finalizar a rodada ativa?</p>
                <div className="flex gap-2">
                  <button onClick={() => void endRound().then(() => setShowEndConfirm(false))} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] uppercase transition cursor-pointer">Sim, Finalizar</button>
                  <button onClick={() => setShowEndConfirm(false)} className="bg-white/10 hover:bg-white/15 text-stone-200 py-1.5 px-3 rounded-lg text-[10px] uppercase transition cursor-pointer">Cancelar</button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setShowEndConfirm(true); setShowResetConfirm(false); }} className="w-full bg-rose-950/40 hover:bg-rose-950 text-rose-300 border border-rose-500/20 font-medium py-2 px-4 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer text-xs">
                <XCircle size={14} /> Finalizar Rodada Ativa
              </button>
            )}
          </div>

          <div className="lg:col-span-2 bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 flex flex-col h-[340px]">
            <h3 className="text-lg font-medium text-rose-100 mb-3">Historico de Quase Bingo ({currentRound.nearWins.length})</h3>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {currentRound.nearWins.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-rose-200/35 space-y-2">
                  <p className="text-sm">Nenhuma cartela esta perto de bater ainda.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentRound.nearWins.map((alert) => (
                    <div key={alert.id} className="bg-black/30 border border-yellow-500/10 rounded-xl p-3 shadow">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-yellow-400 font-bold font-mono">{alert.cardCode}</span>
                        <span className="text-[10px] uppercase text-rose-200/60">{alert.matchedMode}</span>
                      </div>
                      <div className="text-xs text-white mt-2">
                        Faltam {alert.missingCount} palavra{alert.missingCount > 1 ? "s" : ""}: {alert.missingWords.join(", ")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="round-creation-wizard" className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-xl max-w-3xl mx-auto space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white font-sans">Assistente de Criacao de Rodada</h2>
            <p className="text-xs text-rose-200/60">Tema atual: {selectedTheme?.name || "Sem tema"}.</p>
          </div>
          <span className="text-xs font-bold text-yellow-400 uppercase tracking-widest bg-yellow-500/15 px-3 py-1 rounded-full border border-yellow-500/20">
            Passo {step} de 4
          </span>
        </div>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`h-2 flex-1 rounded-full transition-all duration-300 ${i <= step ? "bg-gradient-to-r from-red-600 to-rose-600" : "bg-white/10"}`} />
          ))}
        </div>
      </div>

      <div className="py-2 min-h-[220px]">
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <h3 className="text-base font-semibold text-rose-100">Passo 1: Escolha o estilo do Grid</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(["3x3", "5x5"] as BingoType[]).map((size) => (
                <button key={size} onClick={() => setBingoType(size)} className={`p-5 rounded-2xl border text-left transition relative cursor-pointer flex flex-col justify-between h-40 ${bingoType === size ? "bg-rose-950/50 border-yellow-500/50 shadow-lg shadow-rose-950/40" : "bg-black/30 border-white/10 hover:border-white/20"}`}>
                  <div>
                    <h4 className="font-bold text-white text-lg">Bingo {size}</h4>
                    <p className="text-xs text-rose-200/60 mt-1 leading-relaxed">{size === "3x3" ? "Cartelas compactas com 8 palavras." : "Estrutura classica com 24 palavras."}</p>
                  </div>
                  <div className="text-[10px] text-yellow-400 font-mono tracking-widest uppercase">{size === "3x3" ? "8 palavras requeridas" : "24 palavras requeridas"}</div>
                </button>
              ))}
            </div>

            {!hasEnoughWords ? (
              <div className="bg-rose-500/10 border border-rose-500/35 p-4 rounded-xl space-y-3">
                <div className="flex items-start gap-2 text-rose-200 text-xs">
                  <p>O tema possui <strong className="text-white">{wordBank.length}</strong> palavras. Sao necessarias pelo menos <strong className="text-white">{requiredWordsCount}</strong>.</p>
                </div>
                <button onClick={() => void handleAutofillWords()} disabled={isAiAutofilling} className="bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-bold py-2 px-4 rounded-lg flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer">
                  <Sparkles size={13} />
                  {isAiAutofilling ? "Autocompletando..." : "Autocompletar palavras com IA"}
                </button>
              </div>
            ) : (
              <div className="bg-emerald-500/15 border border-emerald-500/30 p-3 rounded-xl flex items-center gap-2 text-emerald-300 text-xs">
                <CheckCircle size={14} />
                Tudo certo. Existem {wordBank.length} palavras disponiveis.
              </div>
            )}
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <h3 className="text-base font-semibold text-rose-100">Passo 2: Defina a quantidade de cartelas</h3>
            <input value={blockName} onChange={(e) => setBlockName(e.target.value)} placeholder="Nome do bloco impresso" className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white text-sm" />
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[10, 20, 30, 50, 100, 200].map((volume) => (
                <button key={volume} onClick={() => { setCardVolumeType("standard"); setCardsCount(volume); }} className={`py-3.5 px-2 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${cardVolumeType === "standard" && cardsCount === volume ? "bg-rose-900 border-yellow-500 text-white" : "bg-black/30 border-white/5 text-rose-200/70 hover:border-white/10"}`}>
                  {volume}
                </button>
              ))}
            </div>
            <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-3">
              <div className="flex items-center gap-3">
                <input type="radio" id="custom-vol-radio" checked={cardVolumeType === "custom"} onChange={() => setCardVolumeType("custom")} className="accent-yellow-500" />
                <label htmlFor="custom-vol-radio" className="text-xs text-rose-100 font-medium">Digitar volume personalizado</label>
              </div>
              {cardVolumeType === "custom" && (
                <input type="number" min={1} max={500} value={cardsCount} onChange={(e) => setCardsCount(Math.max(1, parseInt(e.target.value) || 0))} className="bg-black/40 border border-white/10 focus:border-yellow-500 rounded-lg px-4 py-2 text-white font-mono font-bold w-full text-center text-sm" />
              )}
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <h3 className="text-base font-semibold text-rose-100">Passo 3: Escolha as condicoes de vitoria</h3>
            <div className="space-y-2">
              {victoryModesOptions.map((opt) => {
                const isSelected = selectedModes.includes(opt.value);
                return (
                  <button key={opt.value} onClick={() => toggleVictoryMode(opt.value)} className={`w-full p-4 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${isSelected ? "bg-rose-950/40 border-yellow-500/45 text-white" : "bg-black/35 border-white/5 text-rose-200/60 hover:bg-black/40 hover:border-white/10"}`}>
                    <div>
                      <div className="font-bold text-xs uppercase tracking-wide">{opt.label}</div>
                      <div className="text-[11px] text-rose-300/50 mt-0.5">{opt.desc}</div>
                    </div>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? "border-yellow-400 bg-yellow-400 text-black" : "border-white/25"}`}>
                      {isSelected && <CheckCircle size={10} strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <h3 className="text-base font-semibold text-rose-100">Passo 4: Revisar e Iniciar</h3>
            <div className="bg-black/40 p-5 rounded-2xl border border-white/10 divide-y divide-white/5 space-y-3.5">
              <div className="flex justify-between items-center text-xs py-1"><span className="text-rose-200/50 uppercase font-medium">Tema</span><span className="text-white font-bold">{selectedTheme?.name}</span></div>
              <div className="flex justify-between items-center text-xs py-1"><span className="text-rose-200/50 uppercase font-medium">Bloco</span><span className="text-white font-bold">{blockName || "Nome automatico"}</span></div>
              <div className="flex justify-between items-center text-xs py-3.5"><span className="text-rose-200/50 uppercase font-medium">Grid</span><span className="text-white font-bold">BINGO {bingoType}</span></div>
              <div className="flex justify-between items-center text-xs py-3.5"><span className="text-rose-200/50 uppercase font-medium">Total de Cartelas</span><span className="text-white font-mono font-bold text-lg">{cardsCount}</span></div>
            </div>
            <button onClick={() => void handleLaunchRound()} disabled={!hasEnoughWords} className="w-full bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 text-black font-bold py-3 px-6 rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer text-sm disabled:opacity-50">
              GERAR BLOCO E INICIAR RODADA
            </button>
          </motion.div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-white/5 pt-4">
        {step > 1 ? (
          <button onClick={() => setStep(step - 1)} className="flex items-center gap-1 text-xs text-rose-200 hover:text-white px-4 py-2 hover:bg-white/5 rounded-xl border border-white/5 transition cursor-pointer">
            <ArrowLeft size={14} /> Voltar
          </button>
        ) : <div />}
        {step < 4 ? (
          <button onClick={() => setStep(step + 1)} disabled={step === 1 && !hasEnoughWords} className="flex items-center gap-1 text-xs text-black font-bold bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2 rounded-xl border border-yellow-400 transition cursor-pointer">
            Avancar <ArrowRight size={14} />
          </button>
        ) : <div />}
      </div>
    </div>
  );
};
