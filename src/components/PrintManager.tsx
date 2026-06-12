import React, { useState } from "react";
import { useBingo } from "../context/BingoContext";
import { Printer, Heart, Sparkles } from "lucide-react";

export const PrintManager: React.FC = () => {
  const { currentRound, selectedTheme } = useBingo();
  const [cardsPerPage, setCardsPerPage] = useState<1 | 2 | 4 | 6>(2);
  const [markedCards, setMarkedCards] = useState<number[]>([]);

  if (!currentRound || !currentRound.isActive) {
    return (
      <div id="print-manager-no-round" className="bg-white/5 backdrop-blur-md p-8 rounded-2xl border border-white/10 text-center max-w-xl mx-auto space-y-4">
        <Heart size={44} className="text-rose-500 mx-auto animate-pulse" />
        <h2 className="text-xl font-bold text-white uppercase tracking-wider font-sans">Geracao de Cartelas</h2>
        <p className="text-xs text-rose-200/50 leading-relaxed">
          Nenhuma rodada foi iniciada ainda. Para gerar, visualizar e imprimir as cartelas, configure uma rodada ativa no menu <strong>"Painel da Rodada"</strong>!
        </p>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const toggleMockMark = (cardId: number) => {
    if (markedCards.includes(cardId)) {
      setMarkedCards(markedCards.filter((id) => id !== cardId));
    } else {
      setMarkedCards([...markedCards, cardId]);
    }
  };

  const getPrintStyles = () => {
    const isLandscape = cardsPerPage === 2 || cardsPerPage === 4;
    const pageMargin = 5;

    return `
      @page {
        size: ${isLandscape ? "A4 landscape" : "A4 portrait"};
        margin: ${pageMargin}mm;
      }

      .bingo-card-print {
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
        margin-left: auto !important;
        margin-right: auto !important;
        width: 100% !important;
        background-color: #fffbeb !important;
      }

      .bingo-page-grid {
        width: fit-content !important;
        max-width: 100% !important;
        height: fit-content !important;
        max-height: 100% !important;
        display: grid !important;
        align-content: center !important;
        justify-content: center !important;
        justify-items: center !important;
        align-items: stretch !important;
        place-items: stretch center !important;
        box-sizing: border-box !important;
      }

      .bingo-cell-text {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        text-align: center !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: clip !important;
      }

      @media screen {
        .printable-page-break-portrait {
          padding: 6mm !important;
        }

        .printable-page-break-landscape {
          padding: 4mm !important;
        }

        .bingo-card-print-1 {
          max-width: min(100%, 760px) !important;
          max-height: min(100%, 1060px) !important;
        }

        .bingo-card-print-2 {
          max-width: min(100%, 520px) !important;
          max-height: min(100%, 760px) !important;
        }

        .bingo-card-print-4 {
          max-width: min(100%, 360px) !important;
          max-height: min(100%, 280px) !important;
        }

        .bingo-card-print-6 {
          max-width: min(100%, 245px) !important;
          max-height: min(100%, 300px) !important;
        }
      }

      @media print {
        body {
          background: white !important;
          color: black !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        #root-layout-header, #main-sidebar-nav, #dashboard-tabs, #non-printable-panels, button {
          display: none !important;
        }

        #print-rendering-area {
          display: block !important;
          position: static !important;
          left: auto !important;
          top: auto !important;
          width: 100% !important;
          padding: 0 !important;
          margin: 0 !important;
          opacity: 1 !important;
          pointer-events: auto !important;
        }

        .printable-page-break {
          page-break-after: always !important;
          page-break-inside: avoid !important;
          margin: 0 !important;
          border: none !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: center !important;
          align-items: center !important;
          box-sizing: border-box !important;
          background: white !important;
        }

        .printable-page-break-portrait {
          width: 200mm !important;
          height: 287mm !important;
          padding: 1.5mm !important;
        }

        .printable-page-break-landscape {
          width: 287mm !important;
          height: 200mm !important;
          padding: 1.5mm !important;
        }

        .bingo-card-print-1 {
          width: 196mm !important;
          height: 281mm !important;
          padding: 3.2mm !important;
        }

        .bingo-card-print-2 {
          width: 141mm !important;
          height: 196mm !important;
          padding: 2.6mm !important;
        }

        .bingo-card-print-4 {
          width: 140.5mm !important;
          height: 97mm !important;
          padding: 1.8mm !important;
        }

        .bingo-card-print-6 {
          width: 99.5mm !important;
          height: 95mm !important;
          padding: 1.5mm !important;
        }

        .bingo-page-grid-1 {
          gap: 0 !important;
          grid-template-columns: 196mm !important;
        }

        .bingo-page-grid-2 {
          gap: 0.6mm !important;
          grid-template-columns: repeat(2, 141mm) !important;
        }

        .bingo-page-grid-4 {
          gap: 0.6mm !important;
          grid-template-columns: repeat(2, 140.5mm) !important;
          grid-template-rows: repeat(2, 97mm) !important;
        }

        .bingo-page-grid-6 {
          gap: 0.5mm !important;
          grid-template-columns: repeat(2, 99.5mm) !important;
          grid-template-rows: repeat(3, 95mm) !important;
        }
      }
    `;
  };

  const getCellFontSizeClass = (word: string) => {
    const len = word.length;

    if (cardsPerPage === 6) {
      if (len > 12) return "text-[7.6px] tracking-[-0.10em] leading-none select-none font-black";
      if (len > 9) return "text-[8.7px] tracking-[-0.06em] leading-none select-none font-black";
      return "text-[9.8px] tracking-[-0.02em] leading-none select-none font-black";
    }

    if (cardsPerPage === 4) {
      if (len > 12) return "text-[7.8px] tracking-[-0.08em] leading-none select-none font-black";
      if (len > 9) return "text-[9px] tracking-[-0.05em] leading-none select-none font-black";
      return "text-[10.5px] tracking-[-0.02em] leading-none select-none font-black";
    }

    if (cardsPerPage === 2) {
      if (len > 12) return "text-[10.5px] tracking-[-0.06em] leading-none select-none font-black";
      if (len > 9) return "text-[12px] tracking-[-0.03em] leading-none select-none font-black";
      return "text-[14px] tracking-tight leading-none select-none font-black";
    }

    if (len > 12) return "text-[14px] sm:text-[15px] tracking-[-0.05em] leading-none select-none font-black";
    if (len > 9) return "text-[15.5px] sm:text-[17px] tracking-tight leading-none select-none font-black";
    return "text-[18px] sm:text-[20px] tracking-tight leading-none select-none font-black";
  };

  const chunkedCards = [];
  const chunkSize = cardsPerPage;
  for (let i = 0; i < currentRound.cards.length; i += chunkSize) {
    chunkedCards.push(currentRound.cards.slice(i, i + chunkSize));
  }

  return (
    <div id="print-manager-container" className="space-y-6">
      <style>{getPrintStyles()}</style>

      <div id="non-printable-panels" className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-xl">
          <div>
            <h2 className="text-2xl font-bold text-white font-sans flex items-center gap-2">Central de Impressao de Cartelas</h2>
            <p className="text-xs text-rose-200/60 mt-1">
              Visualize todas as {currentRound.cards.length} cartelas geradas e escolha o numero de layouts por pagina A4.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              id="print-action-button"
              onClick={handlePrint}
              className="bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold py-2.5 px-5 rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer text-xs"
            >
              <Printer size={15} /> Imprimir / Salvar PDF
            </button>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-lg grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-xs text-rose-200/50 uppercase tracking-widest font-bold">Distribuicao por A4</label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 4, 6].map((num) => (
                <button
                  key={num}
                  id={`cards-layout-${num}-btn`}
                  onClick={() => setCardsPerPage(num as 1 | 2 | 4 | 6)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition duration-150 cursor-pointer text-center ${
                    cardsPerPage === num
                      ? "bg-rose-900 border-yellow-500/50 text-white"
                      : "bg-black/30 border-white/5 text-rose-300 hover:border-white/15"
                  }`}
                >
                  {num} {num === 1 ? "Cartela" : "Cartelas"}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-rose-300/40 leading-relaxed">
              O modo {cardsPerPage} {cardsPerPage === 1 ? "cartela" : "cartelas"} formata automaticamente as quebras de pagina no PDF.
            </p>
          </div>

          <div className="space-y-1 md:col-span-2 bg-black/40 p-4 rounded-xl border border-white/5">
            <span className="text-[11px] font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={12} className="animate-pulse" /> Dica de Exportacao PDF
            </span>
            <p className="text-[11px] text-rose-200/70 leading-relaxed">
              Para salvar como PDF, clique em <strong>"Imprimir"</strong>, escolha <strong>"Salvar como PDF"</strong>, mantenha o papel em <strong>A4</strong> e ative a impressao de imagens de fundo.
            </p>
          </div>
        </div>
      </div>

      <div
        id="print-rendering-area"
        className="fixed left-[-200vw] top-0 w-[210mm]"
        aria-hidden="true"
      >
        <div className="space-y-8">
          {chunkedCards.map((pageGroup, pageIdx) => {
            const isLandscape = cardsPerPage === 2 || cardsPerPage === 4;

            return (
              <div
                key={pageIdx}
                className={`printable-page-break ${
                  isLandscape
                    ? "printable-page-break-landscape max-w-[297mm] min-h-[210mm]"
                    : "printable-page-break-portrait max-w-[210mm] min-h-[297mm]"
                } bg-white text-black rounded-2xl shadow-xl mx-auto border border-gray-200 relative flex flex-col justify-start transition-all duration-300`}
                style={{ boxSizing: "border-box" }}
              >
                <div id="non-printable-panels" className="absolute top-2 right-4 text-[9px] text-gray-400 uppercase font-mono tracking-widest font-bold">
                  Pagina A4 ({isLandscape ? "Paisagem" : "Retrato"}) #{pageIdx + 1}
                </div>

                <div
                  className={`bingo-page-grid bingo-page-grid-${cardsPerPage} gap-0 mx-auto my-0 ${
                    cardsPerPage === 1
                      ? "grid-cols-1"
                      : cardsPerPage === 2
                        ? "grid-cols-2"
                        : cardsPerPage === 4
                          ? "grid-cols-2 grid-rows-2"
                          : "grid-cols-2 grid-rows-3"
                  }`}
                >
                  {pageGroup.map((card) => (
                    <div
                      key={card.id}
                      onClick={() => toggleMockMark(card.id)}
                      className={`bingo-card-print bingo-card-print-${cardsPerPage} border-4 border-amber-600 rounded-3xl bg-amber-50/10 flex flex-col justify-between shadow-inner relative transition cursor-pointer group ${
                        markedCards.includes(card.id) ? "opacity-95 bg-amber-100/30" : ""
                      }`}
                      style={{
                        borderColor: "#b45309",
                        borderStyle: "double",
                        borderWidth: "6px",
                      }}
                    >
                      <div className="absolute top-1.5 left-1.5 right-1.5 bottom-1.5 border border-amber-600/15 pointer-events-none rounded-2xl" />

                      <div className="text-center space-y-0 relative z-10 shrink-0">
                        <div className={`text-amber-900 font-black tracking-tight uppercase ${cardsPerPage === 6 ? "text-[7.8px] mt-0.5" : cardsPerPage === 4 ? "text-[9px] mt-0.5" : cardsPerPage === 2 ? "text-[11.5px] mt-1" : "text-[14px] mt-1.5"}`}>
                          {selectedTheme?.cardTitle || selectedTheme?.name || "Cartela Oficial"}
                        </div>

                        <div
                          className={`inline-block bg-amber-700 text-amber-50 font-mono font-black rounded-full ${
                            cardsPerPage === 6 ? "text-[6.8px] px-1.5 py-0" : cardsPerPage === 4 ? "text-[8px] px-1.5 py-0" : cardsPerPage === 2 ? "text-[9.5px] px-2 py-0.5" : "text-[11.2px] px-2.5 py-0.5"
                          } ${cardsPerPage === 6 ? "mt-1" : "mt-1.5"}`}
                        >
                          {card.code}
                        </div>
                      </div>

                      <div className={`flex-1 min-h-0 w-full flex flex-col justify-center relative z-10 ${cardsPerPage === 6 ? "mt-0.5 mb-0" : cardsPerPage === 4 ? "mt-0.5 mb-0" : cardsPerPage === 2 ? "mt-1 mb-0.5" : "mt-1.5 mb-0.5"}`}>
                        <table className="w-full h-full table-fixed border-collapse text-center mx-auto">
                          <tbody>
                            {card.grid.map((row, rIdx) => (
                              <tr key={rIdx} className="h-1/5">
                                {row.map((cell, cIdx) => {
                                  const isFree = cell === "LIVRE";

                                  return (
                                    <td
                                      key={cIdx}
                                      className={`border border-amber-700/65 font-sans font-bold text-amber-950 bg-amber-50/20 transition-all select-none align-middle ${
                                        isFree ? "bg-red-50 text-red-700" : "hover:bg-amber-100/40"
                                      }`}
                                      style={{
                                        padding: cardsPerPage === 6 ? "0.5px" : cardsPerPage === 4 ? "0.5px 1px" : cardsPerPage === 2 ? "1px 2px" : "2px 3px",
                                      }}
                                    >
                                      <div className="w-full h-full flex items-center justify-center overflow-hidden">
                                        {isFree ? (
                                          <div className="flex flex-col items-center justify-center leading-none">
                                            <Heart size={cardsPerPage === 6 ? 6 : cardsPerPage === 4 ? 8 : 12} className="fill-red-700 text-red-700" />
                                            <span className={`${cardsPerPage === 6 ? "text-[5.6px]" : "text-[7.2px]"} uppercase tracking-wider font-extrabold text-red-700`}>LIVRE</span>
                                          </div>
                                        ) : (
                                          <span className={`bingo-cell-text ${getCellFontSizeClass(cell)}`}>{cell}</span>
                                        )}
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
