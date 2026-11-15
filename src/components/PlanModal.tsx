import React, { useEffect } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { Lote, LotSector, PLAN_MAP_URL } from '../data/lotes';

interface PlanModalProps {
  isOpen: boolean;
  lotes: Lote[];
  selectedLot: Lote;
  sectorFilter: 'todos' | LotSector;
  onSelectLot: (id: string) => void;
  onClose: () => void;
}

export function PlanModal({
  isOpen,
  lotes,
  selectedLot,
  sectorFilter,
  onSelectLot,
  onClose,
}: PlanModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f3d26]/85 backdrop-blur-sm p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Plano de lotización ampliado"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[92dvh] bg-white rounded-2xl border border-[#0f3d26]/25 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 bg-[#0f3d26] text-white border-b-2 border-[#facc15]">
          <div>
            <h3 className="text-base font-bold font-display">
              Plano de Lotización Completo — Etapa 3
            </h3>
            <p className="text-xs text-[#84cc16]">
              Haz clic en cualquier número de lote para seleccionarlo y enfocarlo en la vista aérea
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={PLAN_MAP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir imagen original</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar plano ampliado"
              className="w-10 h-10 rounded-lg bg-[#facc15] text-[#0f3d26] hover:bg-[#84cc16] flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-3 sm:p-4 bg-[#0f3d26]/[0.04] flex items-center justify-center">
          <div className="relative inline-block w-full max-w-[820px] bg-white rounded-xl border border-[#0f3d26]/30 shadow-md overflow-hidden [container-type:inline-size]">
            <img
              src={PLAN_MAP_URL}
              alt="Plano de lotización ampliado Residencial El Bosque Etapa 3"
              referrerPolicy="no-referrer"
              className="block w-full h-auto select-none"
            />
            {lotes.map((lote) => {
              const isActive = lote.id === selectedLot.id;
              const isDimmed = sectorFilter !== 'todos' && lote.sector !== sectorFilter;
              const stateColor =
                lote.estado === 'vendido'
                  ? 'bg-red-600 text-white'
                  : lote.estado === 'reservado'
                  ? 'bg-amber-400 text-[#0f3d26]'
                  : lote.estado === 'area_verde'
                  ? 'bg-[#84cc16] text-[#0f3d26]'
                  : 'bg-[#0f3d26]/90 text-white';

              return (
                <button
                  key={lote.id}
                  type="button"
                  disabled={isDimmed}
                  onClick={() => {
                    onSelectLot(lote.id);
                    onClose();
                  }}
                  title={`Lote ${lote.num} — ${lote.area}`}
                  style={{
                    left: `${lote.px}%`,
                    top: `${lote.py}%`,
                    width: 'clamp(13px, 2.7cqw, 22px)',
                    height: 'clamp(13px, 2.7cqw, 22px)',
                    fontSize: 'clamp(7.5px, 1.35cqw, 10px)',
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full leading-none font-bold font-mono-num flex items-center justify-center border border-white transition-all duration-150 ${
                    isDimmed
                      ? 'opacity-20 pointer-events-none bg-[#0f3d26]/70 text-white'
                      : isActive
                      ? 'bg-[#facc15] text-[#0f3d26] border-[#0f3d26] scale-125 ring-4 ring-[#84cc16]/60 z-10 cursor-pointer'
                      : `${stateColor} cursor-pointer hover:scale-125 hover:bg-[#84cc16] hover:text-[#0f3d26] hover:z-10`
                  }`}
                >
                  {lote.num}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
