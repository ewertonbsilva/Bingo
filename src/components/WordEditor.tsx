import React, { useState } from "react";
import { useBingo } from "../context/BingoContext";
import { Plus, Trash2, Edit2, RotateCcw, AlertTriangle, Sparkles, Upload, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const WordEditor: React.FC = () => {
  const { wordBank, addWord, removeWord, updateWord, resetWordBank, importWords, selectedTheme } = useBingo();
  const [newWord, setNewWord] = useState("");
  const [editingWord, setEditingWord] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAddWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim()) return;

    try {
      await addWord(newWord);
      setNewWord("");
      setErrorMsg("");
      showTemporarySuccess("Palavra adicionada com sucesso.");
    } catch (error: any) {
      setErrorMsg(error.message || "Palavra invalida.");
    }
  };

  const handleStartEdit = (word: string) => {
    setEditingWord(word);
    setEditValue(word);
  };

  const handleSaveEdit = async (oldWord: string) => {
    if (!editValue.trim()) return;
    try {
      await updateWord(oldWord, editValue);
      setEditingWord(null);
      setErrorMsg("");
      showTemporarySuccess("Palavra atualizada.");
    } catch (error: any) {
      setErrorMsg(error.message || "Nao foi possivel atualizar a palavra.");
    }
  };

  const handleBulkImport = async () => {
    if (!importText.trim()) return;
    try {
      const count = await importWords(importText);
      setImportText("");
      setShowImport(false);
      showTemporarySuccess(`${count} palavra(s) importada(s) com sucesso.`);
    } catch (error: any) {
      setErrorMsg(error.message || "Falha ao importar.");
    }
  };

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    setErrorMsg("");
    try {
      const response = await fetch("/api/generate-words", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ existingWords: wordBank, themeName: selectedTheme?.name || "" }),
      });

      if (!response.ok) {
        throw new Error("Falha ao gerar palavras do servidor.");
      }

      const data = await response.json();
      const generated: string[] = data.words || [];

      if (generated.length === 0) {
        setErrorMsg("A IA nao encontrou novas palavras.");
      } else {
        let added = 0;
        for (const word of generated) {
          await addWord(word);
          added++;
        }
        showTemporarySuccess(`IA adicionou ${added} novas palavras.`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Erro de conexao ou IA indisponivel.");
    } finally {
      setIsGenerating(false);
    }
  };

  const showTemporarySuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  return (
    <div id="word-editor-container" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-xl">
        <div>
          <h2 className="text-2xl font-semibold text-white font-sans flex items-center gap-2">
            Banco de Palavras
          </h2>
          <p className="text-rose-200/70 text-sm mt-1">
            Palavras do tema <strong>{selectedTheme?.name || "Sem tema"}</strong>. O Bingo 5x5 exige ao menos 24 palavras; o 3x3 exige 8.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-burgundy-950/40 px-4 py-2 rounded-xl border border-yellow-500/30">
          <span className="text-yellow-400 font-bold text-lg">{wordBank.length}</span>
          <span className="text-rose-100 text-xs uppercase tracking-wider">Palavras Ativas</span>
        </div>
      </div>

      <AnimatePresence>
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 rounded-xl text-sm flex items-center gap-2">
            <Check size={16} />
            {successMsg}
          </motion.div>
        )}
        {errorMsg && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4 bg-rose-500/20 border border-rose-500/50 text-rose-300 rounded-xl text-sm flex items-center gap-2">
            <AlertTriangle size={16} />
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-lg">
            <h3 className="text-lg font-medium text-rose-100 mb-4 flex items-center gap-2">
              <Plus size={18} className="text-yellow-400" /> Adicionar Palavra
            </h3>
            <form onSubmit={handleAddWord} className="space-y-3">
              <input
                id="word-input"
                type="text"
                placeholder="Ex: PACIENCIA"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                maxLength={16}
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 focus:border-yellow-500 text-white placeholder-rose-300/40 tracking-wide text-center text-sm font-semibold transition"
              />
              <button id="add-word-btn" type="submit" className="w-full bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-medium py-2.5 px-4 rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer text-sm">
                Adicionar
              </button>
            </form>
          </div>

          <div className="bg-gradient-to-br from-rose-950/40 to-burgundy-900/40 backdrop-blur-md p-5 rounded-2xl border border-yellow-500/20 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 blur-3xl rounded-full" />
            <h3 className="text-lg font-medium text-rose-100 mb-2 flex items-center gap-2">
              <Sparkles size={18} className="text-yellow-400 animate-pulse" /> Inteligencia Artificial
            </h3>
            <p className="text-rose-200/60 text-xs mb-4 leading-relaxed">
              Gere palavras novas para o tema atual sem repetir as existentes.
            </p>
            <button
              id="ai-generate-btn"
              onClick={handleGenerateAI}
              disabled={isGenerating}
              className={`w-full py-2.5 px-4 rounded-xl font-medium shadow-md transition flex items-center justify-center gap-2 text-sm text-black border border-yellow-400 bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 cursor-pointer ${isGenerating ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Escrevendo Palavras...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Gerar Palavras com IA
                </>
              )}
            </button>
          </div>

          <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-lg space-y-3">
            <button id="show-import-btn" onClick={() => setShowImport(!showImport)} className="w-full flex items-center justify-between text-left px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-rose-100 transition text-sm font-medium">
              <span className="flex items-center gap-2"><Upload size={16} className="text-rose-300" /> Importar Lista</span>
              <span className="text-xs text-rose-300/60">{showImport ? "Fechar" : "Abrir"}</span>
            </button>

            {showImport && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-2 mt-2">
                <textarea
                  id="import-words-textarea"
                  rows={4}
                  placeholder="Cole palavras separadas por virgula, ponto-e-virgula ou quebras de linha..."
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-rose-300/30 text-xs focus:border-rose-400"
                />
                <button id="confirm-import-btn" onClick={handleBulkImport} className="w-full bg-rose-900/60 hover:bg-rose-900 text-rose-100 font-medium py-2 rounded-lg text-xs border border-rose-500/20 transition cursor-pointer">
                  Confirmar Importacao
                </button>
              </motion.div>
            )}

            <button
              id="reset-words-btn"
              onClick={async () => {
                if (window.confirm("Deseja restaurar as palavras padrao neste tema?")) {
                  await resetWordBank();
                  showTemporarySuccess("Lista padrao restaurada.");
                }
              }}
              className="w-full flex items-center gap-2 text-rose-300 hover:text-rose-100 px-4 py-2.5 rounded-xl border border-white/10 hover:bg-rose-500/5 transition text-left text-sm font-medium cursor-pointer"
            >
              <RotateCcw size={16} />
              Restaurar Lista Padrao
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-lg">
          <h3 className="text-lg font-medium text-rose-100 mb-4">Palavras Integradas ({wordBank.length})</h3>

          <div id="words-scroller" className="max-h-[460px] overflow-y-auto pr-2 custom-scrollbar">
            {wordBank.length === 0 ? (
              <div className="text-center py-12 text-rose-300/40">Nenhuma palavra cadastrada no momento.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {wordBank.map((word) => (
                  <motion.div key={word} layoutId={`word-card-${word}`} className="flex items-center justify-between bg-black/35/30 hover:bg-black/40 border border-white/5 hover:border-rose-500/20 rounded-xl p-2.5 transition group">
                    {editingWord === word ? (
                      <div className="flex items-center gap-1 w-full">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          maxLength={16}
                          className="w-full bg-black/50 border border-yellow-500/50 rounded px-2 py-0.5 text-xs text-white text-center focus:outline-none focus:ring-1 focus:ring-yellow-400 font-semibold"
                          autoFocus
                        />
                        <button onClick={() => void handleSaveEdit(word)} className="p-1 hover:text-emerald-400 text-rose-300 transition">
                          <Check size={14} />
                        </button>
                        <button onClick={() => setEditingWord(null)} className="p-1 hover:text-rose-400 text-rose-300 transition">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="font-mono text-xs font-semibold text-rose-100 truncate tracking-wide pl-1.5">
                          {word}
                        </span>
                        <div className="flex items-center gap-0.5 opacity-40 group-hover:opacity-100 transition duration-150">
                          <button onClick={() => handleStartEdit(word)} className="p-1 text-rose-300 hover:text-yellow-400 transition rounded" title="Editar">
                            <Edit2 size={12} />
                          </button>
                          <button onClick={() => void removeWord(word)} className="p-1 text-rose-300 hover:text-rose-500 transition rounded" title="Excluir">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </>
                    )}
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
