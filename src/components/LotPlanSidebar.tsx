import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  Lock,
  Map as MapIcon,
  MapPin,
  Maximize2,
  MessageCircle,
  RefreshCw,
  Star,
  Trees,
  X,
} from 'lucide-react';
import {
  Asesor,
  buildWhatsappUrl,
  GOOGLE_MAPS_URL,
  Lote,
  LotSector,
  LotStatus,
  PLAN_MAP_URL,
  SECTOR_FILTERS,
} from '../data/lotes';
import { LotTags } from './LotTags';

interface LotPlanSidebarProps {
  lotes: Lote[];
  filteredLotes: Lote[];
  selectedLot: Lote;
  sectorFilter: 'todos' | LotSector;
  asesor: Asesor;
  comparedLotIds: string[];
  isAdminMode: boolean;
  estadosCopied: boolean;
  isSyncingSheet: boolean;
  isMobileSheetOpen: boolean;
  onCloseMobileSheet: () => void;
  onRefreshSheet: () => void;
  onSectorChange: (sector: 'todos' | LotSector) => void;
  onSelectLot: (id: string) => void;
  onToggleCompare: (id: string) => void;
  onOpenCompare: () => void;
  onOpenExpandedPlan: () => void;
  onAdminStatusChange: (lotId: string, status: 'disponible' | 'reservado' | 'vendido') => void;
  onCopyEstadosLotes: () => void;
}

const STATUS_META: Record<
  LotStatus,
  {
    label: string;
    badgeClass: string;
    Icon: typeof CheckCircle2;
  }
> = {
  disponible: {
    label: 'Disponible',
    badgeClass: 'bg-[#84cc16]/20 text-[#0f3d26] border border-[#84cc16]',
    Icon: CheckCircle2,
  },
  reservado: {
    label: 'Reservado',
    badgeClass: 'bg-amber-400/30 text-amber-900 border border-amber-500',
    Icon: Clock,
  },
  vendido: {
    label: 'Vendido',
    badgeClass: 'bg-red-600/15 text-red-700 border border-red-600/40',
    Icon: Lock,
  },
  area_verde: {
    label: 'Área Verde • Zona Común',
    badgeClass: 'bg-[#84cc16]/30 text-[#0f3d26] border border-[#84cc16]',
    Icon: Trees,
  },
};

export function LotPlanSidebar({
  lotes,
  filteredLotes,
  selectedLot,
  sectorFilter,
  asesor,
  comparedLotIds,
  isAdminMode,
  estadosCopied,
  isSyncingSheet,
  isMobileSheetOpen,
  onCloseMobileSheet,
  onRefreshSheet,
  onSectorChange,
  onSelectLot,
  onToggleCompare,
  onOpenCompare,
  onOpenExpandedPlan,
  onAdminStatusChange,
  onCopyEstadosLotes,
}: LotPlanSidebarProps) {
  const [planError, setPlanError] = useState(false);
  const [mobileTab, setMobileTab] = useState<'ficha' | 'plano'>('ficha');
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const stripContainerRef = useRef<HTMLDivElement>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const activeChip = chipRefs.current[selectedLot.id];
    const strip = stripContainerRef.current;
    if (!activeChip) return;

    if (strip) {
      const targetLeft =
        activeChip.offsetLeft - strip.clientWidth / 2 + activeChip.offsetWidth / 2;
      strip.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
    } else {
      activeChip.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [selectedLot.id, mobileTab, filteredLotes]);

  // Exclude Lote 17 (area_verde) from sellable commercial counts (45 residential lots)
  const counts = useMemo(() => {
    let disponibles = 0;
    let reservados = 0;
    let vendidos = 0;
    for (const lot of lotes) {
      if (lot.estado === 'area_verde' || lot.id === '17') continue;
      if (lot.estado === 'disponible') disponibles++;
      else if (lot.estado === 'reservado') reservados++;
      else if (lot.estado === 'vendido') vendidos++;
    }
    return { disponibles, reservados, vendidos };
  }, [lotes]);

  const currentIdx = filteredLotes.findIndex((l) => l.id === selectedLot.id);
  const canPrev = currentIdx > 0;
  const canNext = currentIdx >= 0 && currentIdx < filteredLotes.length - 1;

  const handleCardTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) {
      swipeStartRef.current = null;
      return;
    }
    swipeStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleCardTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!swipeStartRef.current || e.changedTouches.length !== 1) return;
    const dx = e.changedTouches[0].clientX - swipeStartRef.current.x;
    const dy = e.changedTouches[0].clientY - swipeStartRef.current.y;
    swipeStartRef.current = null;

    // Require clear horizontal swipe gesture
    if (Math.abs(dx) < 42 || Math.abs(dx) < Math.abs(dy) * 1.2) return;

    if (dx < 0 && canNext) {
      onSelectLot(filteredLotes[currentIdx + 1].id);
    } else if (dx > 0 && canPrev) {
      onSelectLot(filteredLotes[currentIdx - 1].id);
    }
  };

  const isCompared = comparedLotIds.includes(selectedLot.id);
  const compareFull = !isCompared && comparedLotIds.length >= 3;

  const statusInfo = STATUS_META[selectedLot.estado];
  const StatusIcon = statusInfo.Icon;
  const isAvailable = selectedLot.estado === 'disponible';
  const isReserved = selectedLot.estado === 'reservado';
  const isSold = selectedLot.estado === 'vendido';
  const isGreenZone = selectedLot.estado === 'area_verde';

  return (
    <aside
      className={`${
        isMobileSheetOpen
          ? 'flex fixed inset-x-0 bottom-0 h-[56dvh] landscape:static landscape:h-full landscape:w-[330px] min-[860px]:static min-[860px]:h-full min-[860px]:w-[420px]'
          : 'hidden landscape:flex landscape:static landscape:h-full landscape:w-[330px] min-[860px]:flex min-[860px]:h-full min-[860px]:w-[420px]'
      } bg-white rounded-t-[20px] landscape:rounded-none min-[860px]:rounded-none shadow-[0_-10px_28px_rgba(15,61,38,0.32)] landscape:shadow-none min-[860px]:shadow-none border-t border-[#facc15]/60 landscape:border-t-0 landscape:border-l landscape:border-[#0f3d26]/20 min-[860px]:border-t-0 min-[860px]:border-l min-[860px]:border-[#0f3d26]/20 flex-col z-35 overflow-hidden shrink-0 pr-[env(safe-area-inset-right)]`}
      aria-label="Tarjeta de ficha de lotes y plano oficial"
    >
      {/* Mobile Bottom Sheet Handle + Top Tab Switcher (Ficha y Lotes | Plano Oficial) + Close to full map */}
      <div className="landscape:hidden min-[860px]:hidden shrink-0 px-3 pt-1.5 pb-1.5 bg-white border-b border-[#0f3d26]/12">
        <div className="flex items-center gap-1.5">
          <div
            role="tablist"
            aria-label="Secciones de la tarjeta inferior"
            className="flex-1 grid grid-cols-2 gap-1 p-0.5 rounded-xl bg-[#0f3d26]/[0.06]"
          >
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'ficha'}
            onClick={() => setMobileTab('ficha')}
            className={`inline-flex items-center justify-center gap-1.5 h-7 px-2 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              mobileTab === 'ficha'
                ? 'bg-[#0f3d26] text-[#facc15] shadow-sm'
                : 'text-[#0f3d26]/75 hover:text-[#0f3d26]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span>Ficha y Lotes</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'plano'}
            onClick={() => setMobileTab('plano')}
            className={`inline-flex items-center justify-center gap-1.5 h-7 px-2 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              mobileTab === 'plano'
                ? 'bg-[#0f3d26] text-[#facc15] shadow-sm'
                : 'text-[#0f3d26]/75 hover:text-[#0f3d26]'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5 shrink-0" />
            <span>Plano Oficial</span>
          </button>
          </div>
          <button
            type="button"
            onClick={onCloseMobileSheet}
            title="Cerrar ficha y ver mapa completo"
            aria-label="Cerrar ficha y ver mapa completo"
            className="w-8 h-8 rounded-xl bg-[#0f3d26]/10 hover:bg-[#0f3d26]/20 text-[#0f3d26] flex items-center justify-center shrink-0 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto overscroll-contain flex flex-col">
        {/* Desktop Availability Bar */}
        <div className="hidden landscape:grid min-[860px]:grid px-3 min-[860px]:px-4 py-2 min-[860px]:py-3 bg-[#0f3d26] text-white border-b border-[#facc15]/40 grid-cols-3 gap-2 shrink-0">
          <div className="relative px-2.5 py-2 rounded-lg bg-white/[0.07] border border-[#84cc16]/40 text-center">
            <button
              type="button"
              onClick={onRefreshSheet}
              disabled={isSyncingSheet}
              title="Actualizar estados desde Google Sheets"
              aria-label="Actualizar estados desde Google Sheets"
              className="absolute top-1.5 right-1.5 w-5 h-5 rounded flex items-center justify-center text-[#84cc16] hover:bg-white/15 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncingSheet ? 'animate-spin' : ''}`} />
            </button>
            <span className="block text-[10px] font-semibold text-[#84cc16] uppercase tracking-wider">
              Disponibles
            </span>
            <strong className="font-mono-num text-lg font-extrabold text-white">
              {counts.disponibles}
            </strong>
          </div>
          <div className="px-2.5 py-2 rounded-lg bg-white/[0.07] border border-[#facc15]/40 text-center">
            <span className="block text-[10px] font-semibold text-[#facc15] uppercase tracking-wider">
              Reservados
            </span>
            <strong className="font-mono-num text-lg font-extrabold text-[#facc15]">
              {counts.reservados}
            </strong>
          </div>
          <div className="px-2.5 py-2 rounded-lg bg-white/[0.07] border border-white/20 text-center">
            <span className="block text-[10px] font-semibold text-white/75 uppercase tracking-wider">
              Vendidos
            </span>
            <strong className="font-mono-num text-lg font-extrabold text-white/90">
              {counts.vendidos}
            </strong>
          </div>
        </div>

        {/* Official Lotization Plan (always shown on desktop, toggled via "Plano Oficial" on mobile) */}
        <div
          className={`p-3.5 min-[860px]:p-4 bg-[#0f3d26]/[0.04] border-b border-[#0f3d26]/15 shrink-0 ${
            mobileTab === 'plano' ? 'block' : 'hidden min-[860px]:block'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-[13px] font-bold text-[#0f3d26] font-display">
              Plano Oficial de Lotización (01 al 46)
            </span>
            <button
              type="button"
              onClick={onOpenExpandedPlan}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0f3d26] bg-[#facc15] hover:bg-[#84cc16] px-2.5 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f3d26]"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Ampliar plano</span>
            </button>
          </div>

          <div className="relative w-full bg-white rounded-xl overflow-hidden border border-[#0f3d26]/30 shadow-sm [container-type:inline-size]">
            {!planError ? (
              <img
                src={PLAN_MAP_URL}
                alt="Plano oficial completo Residencial El Bosque Etapa 3"
                referrerPolicy="no-referrer"
                onError={() => setPlanError(true)}
                className="block w-full h-auto select-none"
              />
            ) : (
              <div className="aspect-[4/3] w-full flex flex-col items-center justify-center p-4 text-center bg-[#0f3d26]/5 text-[#0f3d26]/75 text-xs">
                <span>Plano base no disponible; usa la fila de lotes para seleccionar.</span>
              </div>
            )}

            {lotes.map((lote) => {
              const isActive = lote.id === selectedLot.id;
              const isDimmed = sectorFilter !== 'todos' && lote.sector !== sectorFilter;
              const estadoColor =
                lote.estado === 'vendido'
                  ? 'bg-red-600 text-white'
                  : lote.estado === 'reservado'
                  ? 'bg-amber-400 text-[#0f3d26]'
                  : lote.estado === 'area_verde'
                  ? 'bg-[#84cc16] text-[#0f3d26]'
                  : 'bg-[#0f3d26] text-white';

              return (
                <button
                  key={lote.id}
                  type="button"
                  disabled={isDimmed}
                  onClick={() => onSelectLot(lote.id)}
                  title={`Lote ${lote.num} — ${lote.area}`}
                  aria-label={`Lote ${lote.num}, ${lote.area}, ${lote.estado}`}
                  style={{
                    left: `${lote.px}%`,
                    top: `${lote.py}%`,
                    width: 'clamp(13px, 3.6cqw, 16px)',
                    height: 'clamp(13px, 3.6cqw, 16px)',
                    fontSize: 'clamp(7.5px, 2cqw, 8.5px)',
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full leading-none font-bold font-mono-num flex items-center justify-center border border-white transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#facc15] ${
                    isDimmed
                      ? 'opacity-20 pointer-events-none bg-[#0f3d26]/70 text-white'
                      : isActive
                      ? 'bg-[#facc15] text-[#0f3d26] border-[#0f3d26] scale-[1.38] ring-4 ring-[#84cc16]/75 z-10 cursor-pointer'
                      : `${estadoColor} cursor-pointer hover:scale-125 hover:bg-[#84cc16] hover:text-[#0f3d26] hover:z-10`
                  }`}
                >
                  {lote.num}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5 text-[11px] text-[#0f3d26]/80">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0f3d26] inline-block" />
                <span>Disponible</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                <span>Reservado</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />
                <span>Vendido</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#facc15] border border-[#0f3d26] inline-block" />
                <span>Activo</span>
              </span>
            </div>

            {comparedLotIds.length > 0 && (
              <button
                type="button"
                onClick={onOpenCompare}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0f3d26] bg-[#facc15]/40 hover:bg-[#facc15] px-2 py-0.5 rounded transition-colors cursor-pointer whitespace-nowrap"
              >
                <Star className="w-3 h-3 fill-[#facc15] text-[#0f3d26]" />
                <span>Comparador ({comparedLotIds.length}/3)</span>
              </button>
            )}
          </div>

          {/* Mobile quick jump back to Ficha y Lotes */}
          <div className="min-[860px]:hidden mt-2.5 flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-[#0f3d26]/15">
            <div className="text-xs">
              <span className="font-extrabold text-[#0f3d26]">Lote {selectedLot.num}</span>
              <span className="text-[#0f3d26]/70 font-mono-num"> · {selectedLot.area}</span>
            </div>
            <button
              type="button"
              onClick={() => setMobileTab('ficha')}
              className="px-3 py-1.5 rounded-lg bg-[#0f3d26] text-[#facc15] text-xs font-extrabold cursor-pointer whitespace-nowrap"
            >
              Ver Ficha →
            </button>
          </div>
        </div>

        {/* Ficha y Lotes Panel (Default tab on mobile bottom sheet) */}
        <div
          className={`px-3 py-2 min-[860px]:p-4 flex flex-col gap-2 min-[860px]:gap-3 bg-white flex-1 ${
            mobileTab === 'ficha' ? 'flex' : 'hidden min-[860px]:flex'
          }`}
        >
          {/* Thumb-friendly Horizontal Strip of Numbered Lot Buttons (01 - 46) with smooth auto-centering */}
          <div className="-mx-1 px-1">
            <div
              ref={stripContainerRef}
              role="listbox"
              aria-label="Selector rápido de lotes del 01 al 46"
              className="relative flex items-center gap-1.5 overflow-x-auto no-scrollbar smooth-touch-scroll py-0.5"
            >
              {filteredLotes.map((l) => {
                const active = l.id === selectedLot.id;
                let chipClasses = '';
                if (l.estado === 'vendido') {
                  chipClasses = active
                    ? 'bg-red-600 text-white border-red-700 ring-2 ring-red-300 shadow-sm'
                    : 'bg-red-600/15 text-red-700 border-red-500/50 hover:bg-red-600/25';
                } else if (l.estado === 'reservado') {
                  chipClasses = active
                    ? 'bg-amber-500 text-[#0f3d26] border-amber-700 ring-2 ring-[#facc15] shadow-sm'
                    : 'bg-amber-400/25 text-amber-900 border-amber-500/50 hover:bg-amber-400/40';
                } else if (l.estado === 'area_verde') {
                  chipClasses = active
                    ? 'bg-[#0f3d26] text-[#84cc16] border-[#84cc16] ring-2 ring-[#84cc16] shadow-sm'
                    : 'bg-[#84cc16]/25 text-[#0f3d26] border-[#84cc16] hover:bg-[#84cc16]/40';
                } else {
                  chipClasses = active
                    ? 'bg-[#0f3d26] text-[#facc15] border-[#0f3d26] ring-2 ring-[#84cc16] shadow-sm'
                    : 'bg-[#0f3d26]/[0.05] text-[#0f3d26] border-[#0f3d26]/15 hover:bg-[#84cc16]/25';
                }

                return (
                  <button
                    key={l.id}
                    ref={(el) => {
                      chipRefs.current[l.id] = el;
                    }}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => onSelectLot(l.id)}
                    className={`min-w-[38px] min-[860px]:min-w-[42px] h-8 min-[860px]:h-9 px-1.5 min-[860px]:px-2 rounded-lg min-[860px]:rounded-xl font-mono-num text-xs font-extrabold border transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#84cc16] ${chipClasses}`}
                  >
                    {l.num}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Swipeable Specification Card (horizontal touch swipe prev/next, zero scroll needed on mobile) */}
          <div
            onTouchStart={handleCardTouchStart}
            onTouchEnd={handleCardTouchEnd}
            className="touch-pan-y bg-[#0f3d26]/[0.04] border border-[#0f3d26]/15 rounded-2xl p-2.5 min-[860px]:p-4 flex flex-col gap-2 min-[860px]:gap-2.5 transition-all duration-200 select-none"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <h2 className="text-base min-[860px]:text-xl font-extrabold text-[#0f3d26] font-display tracking-tight">
                    Lote {selectedLot.num}
                  </h2>
                  <span className="font-mono-num text-sm min-[860px]:text-lg font-extrabold text-[#0f3d26]">
                    {selectedLot.area}
                  </span>
                </div>
                <p className="text-[11px] min-[860px]:text-xs text-[#0f3d26]/75 font-medium">
                  {selectedLot.sector} · Residencial El Bosque
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {!isGreenZone && (
                  <button
                    type="button"
                    disabled={compareFull}
                    onClick={() => onToggleCompare(selectedLot.id)}
                    title={
                      compareFull
                        ? 'Máximo 3 lotes en el comparador'
                        : isCompared
                        ? 'Quitar del comparador'
                        : 'Guardar para comparar (máx. 3)'
                    }
                    aria-pressed={isCompared}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer whitespace-nowrap disabled:opacity-45 disabled:cursor-not-allowed ${
                      isCompared
                        ? 'bg-[#facc15] text-[#0f3d26] border-[#0f3d26]/30'
                        : 'bg-white text-[#0f3d26] border-[#0f3d26]/25 hover:bg-[#facc15]/25'
                    }`}
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        isCompared ? 'fill-[#0f3d26] text-[#0f3d26]' : 'text-[#0f3d26]'
                      }`}
                    />
                    <span className="hidden sm:inline">{isCompared ? 'En lista' : 'Comparar'}</span>
                  </button>
                )}

                <span
                  className={`inline-flex items-center gap-1 text-[10.5px] min-[860px]:text-[11px] font-bold px-2 py-1 rounded-lg tracking-wide shrink-0 ${
                    isGreenZone ? '' : 'uppercase'
                  } ${statusInfo.badgeClass}`}
                >
                  <StatusIcon className="w-3 h-3 min-[860px]:w-3.5 min-[860px]:h-3.5 shrink-0" />
                  <span>{statusInfo.label}</span>
                </span>
              </div>
            </div>

            {/* Automatic Commercial Badges (Esquina / Frente a Área Verde / +200 m²) */}
            <LotTags lote={selectedLot} compact />

            {/* Commercial CTA / Informative Notice by Status */}
            {isGreenZone ? (
              <div className="flex items-center justify-center gap-2 w-full bg-[#84cc16]/20 text-[#0f3d26] border border-[#84cc16] py-2.5 min-[860px]:py-3 px-3 rounded-xl text-xs min-[860px]:text-sm font-bold text-center">
                <Trees className="w-4 h-4 text-[#0f3d26] shrink-0" />
                <span>Área de Recreación y Parque (No disponible para venta)</span>
              </div>
            ) : isAvailable ? (
              <a
                href={buildWhatsappUrl(asesor, selectedLot)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-[#0f3d26] hover:bg-[#84cc16] text-[#facc15] hover:text-[#0f3d26] border-2 border-[#84cc16] py-2.5 min-[860px]:py-3 px-4 rounded-xl text-[13px] min-[860px]:text-sm font-extrabold transition-colors shadow-sm whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#84cc16]"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  Reservar por WhatsApp · Lote {selectedLot.num}
                </span>
              </a>
            ) : isReserved ? (
              <a
                href={buildWhatsappUrl(asesor, selectedLot)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-amber-400 hover:bg-amber-300 text-[#0f3d26] border-2 border-amber-500 py-2.5 min-[860px]:py-3 px-4 rounded-xl text-[13px] min-[860px]:text-sm font-extrabold transition-colors shadow-sm whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span className="truncate">Consultar disponibilidad (Reservado)</span>
              </a>
            ) : (
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="flex items-center justify-center gap-2 w-full bg-red-50 text-red-700 border border-red-300 py-2.5 min-[860px]:py-3 px-4 rounded-xl text-[13px] min-[860px]:text-sm font-extrabold cursor-not-allowed opacity-90"
              >
                <Lock className="w-4 h-4 shrink-0" />
                <span>Lote Vendido</span>
              </button>
            )}

            {/* Admin-only Quick Status Editor (?admin=1) */}
            {isAdminMode && (
              <div className="p-2 rounded-xl bg-[#0f3d26] text-white border border-[#facc15]/60 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#facc15]">
                    Admin · Estado del Lote {selectedLot.num}
                  </span>
                  <button
                    type="button"
                    onClick={onCopyEstadosLotes}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#facc15] hover:bg-[#84cc16] text-[#0f3d26] text-[10px] font-extrabold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {estadosCopied ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copiar ESTADOS_LOTES</span>
                      </>
                    )}
                  </button>
                </div>

                {!isGreenZone ? (
                  <div className="grid grid-cols-3 gap-1">
                    {(['disponible', 'reservado', 'vendido'] as const).map((statusOpt) => {
                      const activeOpt = selectedLot.estado === statusOpt;
                      const label =
                        statusOpt === 'disponible'
                          ? 'Disponible'
                          : statusOpt === 'reservado'
                          ? 'Reservado'
                          : 'Vendido';
                      return (
                        <button
                          key={statusOpt}
                          type="button"
                          onClick={() => onAdminStatusChange(selectedLot.id, statusOpt)}
                          className={`py-1 px-2 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                            activeOpt
                              ? statusOpt === 'vendido'
                                ? 'bg-red-600 text-white'
                                : statusOpt === 'reservado'
                                ? 'bg-amber-400 text-[#0f3d26]'
                                : 'bg-[#84cc16] text-[#0f3d26]'
                              : 'bg-white/10 text-white/85 hover:bg-white/20'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[10px] text-white/80">
                    El Lote 17 es Área Verde fija (excluido de venta).
                  </p>
                )}
              </div>
            )}

            {/* Secondary Actions Row: Ubicación Maps + Comparador (when populated) */}
            <div className={`grid gap-1.5 min-[860px]:gap-2 ${comparedLotIds.length > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <a
                href={GOOGLE_MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir ruta hacia Av. Sesquicentenario (Residencial El Bosque) en Google Maps"
                className="inline-flex items-center justify-center gap-1.5 py-1.5 min-[860px]:py-2 px-3 rounded-xl border border-[#0f3d26]/25 bg-white hover:bg-[#84cc16]/20 text-[#0f3d26] text-[11px] min-[860px]:text-xs font-bold transition-colors whitespace-nowrap"
              >
                <MapPin className="w-3.5 h-3.5 text-[#0f3d26] shrink-0" />
                <span>Ubicación Maps</span>
              </a>

              {comparedLotIds.length > 0 && (
                <button
                  type="button"
                  onClick={onOpenCompare}
                  className="inline-flex items-center justify-center gap-1.5 py-1.5 min-[860px]:py-2 px-3 rounded-xl border border-[#facc15] bg-[#facc15]/25 hover:bg-[#facc15]/45 text-[#0f3d26] text-[11px] min-[860px]:text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Star className="w-3.5 h-3.5 fill-[#facc15] text-[#0f3d26] shrink-0" />
                  <span>Comparar ({comparedLotIds.length}/3)</span>
                </button>
              )}
            </div>

            <p className="min-[860px]:hidden text-[10px] text-[#0f3d26]/55 font-medium text-center leading-none">
              ← Desliza esta tarjeta para cambiar de lote →
            </p>
          </div>

          {/* Desktop Dropdown Selectors (mobile uses top Zone Pills + Horizontal Lot Strip) */}
          <div className="hidden min-[860px]:grid grid-cols-2 gap-2">
            <select
              aria-label="Filtrar por sector"
              value={sectorFilter}
              onChange={(e) => onSectorChange(e.target.value as 'todos' | LotSector)}
              className="w-full min-w-0 px-2.5 py-2.5 rounded-lg border border-[#0f3d26]/35 bg-white text-[#0f3d26] text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[#84cc16] cursor-pointer"
            >
              {SECTOR_FILTERS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Seleccionar lote"
              value={selectedLot.id}
              onChange={(e) => onSelectLot(e.target.value)}
              className="w-full min-w-0 px-2.5 py-2.5 rounded-lg border border-[#0f3d26]/35 bg-white text-[#0f3d26] text-xs font-semibold font-mono-num outline-none focus-visible:ring-2 focus-visible:ring-[#84cc16] cursor-pointer"
            >
              {filteredLotes.map((l) => (
                <option key={l.id} value={l.id}>
                  Lote {l.num} ({l.area})
                </option>
              ))}
            </select>
          </div>

          {/* Mobile Availability Summary inside sheet scroll */}
          <div className="min-[860px]:hidden grid grid-cols-3 gap-2">
            <div className="relative px-2 py-1.5 rounded-lg bg-[#0f3d26]/[0.05] border border-[#0f3d26]/15 text-center">
              <button
                type="button"
                onClick={onRefreshSheet}
                disabled={isSyncingSheet}
                title="Actualizar estados desde Google Sheets"
                aria-label="Actualizar estados desde Google Sheets"
                className="absolute top-1 right-1 w-5 h-5 rounded flex items-center justify-center text-[#0f3d26]/75 hover:bg-[#0f3d26]/10 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncingSheet ? 'animate-spin' : ''}`} />
              </button>
              <span className="block text-[10px] font-semibold text-[#0f3d26]/70">Disponibles</span>
              <strong className="font-mono-num text-sm font-extrabold text-[#0f3d26]">
                {counts.disponibles}
              </strong>
            </div>
            <div className="px-2 py-1.5 rounded-lg bg-[#facc15]/15 border border-[#facc15]/50 text-center">
              <span className="block text-[10px] font-semibold text-[#0f3d26]/80">Reservados</span>
              <strong className="font-mono-num text-sm font-extrabold text-[#0f3d26]">
                {counts.reservados}
              </strong>
            </div>
            <div className="px-2 py-1.5 rounded-lg bg-[#0f3d26]/[0.04] border border-[#0f3d26]/15 text-center">
              <span className="block text-[10px] font-semibold text-[#0f3d26]/70">Vendidos</span>
              <strong className="font-mono-num text-sm font-extrabold text-[#0f3d26]/70">
                {counts.vendidos}
              </strong>
            </div>
          </div>

          <p className="text-[11px] text-[#0f3d26]/70 text-center pb-1">
            Asesor asignado: <span className="font-semibold text-[#0f3d26]">{asesor.nombre}</span>
            <span aria-hidden="true"> · </span>
            <span>Andahuaylas</span>
          </p>
        </div>
      </div>
    </aside>
  );
}
