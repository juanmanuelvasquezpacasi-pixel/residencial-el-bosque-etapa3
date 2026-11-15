import React, { useEffect } from 'react';
import { CheckCircle2, Clock, Lock, MessageCircle, Star, Trash2, Trees, X } from 'lucide-react';
import { Asesor, buildWhatsappUrl, Lote } from '../data/lotes';

interface CompareModalProps {
  isOpen: boolean;
  comparedLotes: Lote[];
  asesor: Asesor;
  onSelectLot: (id: string) => void;
  onRemoveLot: (id: string) => void;
  onClearAll: () => void;
  onClose: () => void;
}

function parseAreaValue(area: string): number {
  const clean = area.replace(/,/g, '').replace(/[^\d.]/g, '');
  return parseFloat(clean) || 0;
}

export function CompareModal({
  isOpen,
  comparedLotes,
  asesor,
  onSelectLot,
  onRemoveLot,
  onClearAll,
  onClose,
}: CompareModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxArea = Math.max(1, ...comparedLotes.map((l) => parseAreaValue(l.area)));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f3d26]/80 backdrop-blur-[10px] p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Comparador de lotes favoritos"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90dvh] bg-white rounded-2xl border border-[#facc15]/60 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-4 bg-[#0f3d26] text-white border-b-2 border-[#facc15]">
          <div className="flex items-center gap-2.5">
            <Star className="w-5 h-5 text-[#facc15] fill-[#facc15] shrink-0" />
            <div>
              <h3 className="text-base font-bold font-display">
                Comparador de Lotes ({comparedLotes.length}/3)
              </h3>
              <p className="text-xs text-[#84cc16]">
                Compara áreas totales, ubicaciones y reserva directamente por WhatsApp
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {comparedLotes.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpiar lista</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar comparador"
              className="w-10 h-10 rounded-lg bg-[#facc15] text-[#0f3d26] hover:bg-[#84cc16] flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5 bg-[#0f3d26]/[0.03]">
          {comparedLotes.length === 0 ? (
            <div className="py-12 text-center space-y-2 text-[#0f3d26]/75">
              <Star className="w-8 h-8 mx-auto text-[#facc15]" />
              <p className="text-sm font-semibold text-[#0f3d26]">
                Aún no has guardado lotes para comparar.
              </p>
              <p className="text-xs">
                Presiona el botón Comparar en la ficha de hasta 3 lotes para analizarlos lado a lado.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
              {comparedLotes.map((lote) => {
                const areaNum = parseAreaValue(lote.area);
                const areaPct = Math.round((areaNum / maxArea) * 100);
                const isLargest = comparedLotes.length > 1 && areaNum === maxArea;
                const canContact = lote.estado === 'disponible' || lote.estado === 'reservado';

                return (
                  <div
                    key={lote.id}
                    className={`bg-white rounded-xl border p-4 flex flex-col justify-between gap-4 shadow-sm transition-shadow ${
                      isLargest ? 'border-[#84cc16] ring-1 ring-[#84cc16]/40' : 'border-[#0f3d26]/15'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              onSelectLot(lote.id);
                              onClose();
                            }}
                            className="text-left text-lg font-extrabold text-[#0f3d26] hover:text-[#84cc16] transition-colors cursor-pointer font-display"
                          >
                            Lote {lote.num}
                          </button>
                          <p className="text-xs text-[#0f3d26]/70 font-medium">{lote.sector}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => onRemoveLot(lote.id)}
                          aria-label={`Quitar Lote ${lote.num} del comparador`}
                          title="Quitar de la comparación"
                          className="w-8 h-8 rounded-lg border border-[#0f3d26]/15 text-[#0f3d26]/65 hover:text-[#0f3d26] hover:bg-[#facc15]/25 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="p-3 rounded-lg bg-[#0f3d26]/[0.04] border border-[#0f3d26]/10 space-y-2">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[11px] font-medium text-[#0f3d26]/70">
                            Área Total
                          </span>
                          {isLargest && (
                            <span className="text-[10px] font-bold text-[#0f3d26] bg-[#facc15]/40 px-1.5 py-0.5 rounded">
                              Mayor superficie
                            </span>
                          )}
                        </div>
                        <div className="text-xl font-extrabold text-[#0f3d26] font-mono-num">
                          {lote.area}
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[#0f3d26]/10 overflow-hidden">
                          <div
                            style={{ width: `${areaPct}%` }}
                            className="h-full rounded-full bg-[#84cc16] transition-all duration-300"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs py-1.5 border-b border-[#0f3d26]/10">
                        <span className="text-[#0f3d26]/70">Estado</span>
                        <span className="inline-flex items-center gap-1 font-bold text-[#0f3d26]">
                          {lote.estado === 'disponible' && (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#84cc16]" />
                              <span>Disponible</span>
                            </>
                          )}
                          {lote.estado === 'reservado' && (
                            <>
                              <Clock className="w-3.5 h-3.5 text-amber-500" />
                              <span className="text-amber-700">Reservado</span>
                            </>
                          )}
                          {lote.estado === 'vendido' && (
                            <>
                              <Lock className="w-3.5 h-3.5 text-red-600" />
                              <span className="text-red-700">Vendido</span>
                            </>
                          )}
                          {lote.estado === 'area_verde' && (
                            <>
                              <Trees className="w-3.5 h-3.5 text-[#84cc16]" />
                              <span>Área Verde</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {canContact ? (
                        <a
                          href={buildWhatsappUrl(asesor, lote)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl text-xs font-extrabold transition-colors whitespace-nowrap border ${
                            lote.estado === 'reservado'
                              ? 'bg-amber-400 hover:bg-amber-300 text-[#0f3d26] border-amber-500'
                              : 'bg-[#0f3d26] hover:bg-[#84cc16] text-[#facc15] hover:text-[#0f3d26] border-[#84cc16]'
                          }`}
                        >
                          <MessageCircle className="w-4 h-4 shrink-0" />
                          <span>
                            {lote.estado === 'reservado'
                              ? 'Consultar disponibilidad'
                              : `Reservar Lote ${lote.num}`}
                          </span>
                        </a>
                      ) : lote.estado === 'area_verde' ? (
                        <div className="text-center py-2.5 px-3 rounded-xl bg-[#84cc16]/20 text-[#0f3d26] border border-[#84cc16] text-xs font-bold">
                          Zona Común (No vendible)
                        </div>
                      ) : (
                        <div className="text-center py-2.5 px-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold">
                          Lote Vendido
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          onSelectLot(lote.id);
                          onClose();
                        }}
                        className="w-full py-2 px-3 rounded-lg border border-[#0f3d26]/20 text-[#0f3d26] hover:bg-[#0f3d26]/[0.05] text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Ver en plano aéreo
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
