import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Crosshair,
  Download,
  MapPin,
  Maximize,
  Minimize,
  RotateCcw,
  Share2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AerialViewport } from './components/AerialViewport';
import { CompareModal } from './components/CompareModal';
import { LotPlanSidebar } from './components/LotPlanSidebar';
import { PlanModal } from './components/PlanModal';
import { RotatePhoneOverlay } from './components/RotatePhoneOverlay';
import { WelcomeModal } from './components/WelcomeModal';
import {
  buildShareLotUrl,
  buildWhatsappUrl,
  fetchSheetLotStatuses,
  formatEstadosLotesSnippet,
  GOOGLE_MAPS_URL,
  GUIDED_TOUR_LOT_IDS,
  isAdminModeFromUrl,
  Lote,
  LOTES,
  LotSector,
  resolveAsesorFromUrl,
  resolveInitialLotIdFromUrl,
  SECTOR_FILTERS,
  TAUREN_LOGO_URL,
} from './data/lotes';
import { usePresentationAudio } from './hooks/usePresentationAudio';

const HEADER_SECTORS = SECTOR_FILTERS.slice(0, 5);
const CALIB_STORAGE_KEY = 'tauren_el_bosque_ef0u68_px_v1';
const TOUR_INTERVAL_MS = 3500;

function loadManualOverrides(): Record<string, { ax: number; ay: number }> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CALIB_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, { ax: number; ay: number }>;
  } catch {
    return {};
  }
}

function computeLotsFromDimensions(
  naturalWidth: number | null,
  naturalHeight: number | null,
  overrides: Record<string, { ax: number; ay: number }>
): Lote[] {
  return LOTES.map((l) => {
    if (overrides[l.id]) {
      return { ...l, ax: overrides[l.id].ax, ay: overrides[l.id].ay };
    }
    if (naturalWidth && naturalHeight) {
      return {
        ...l,
        ax: Number(((l.pixelX / naturalWidth) * 100).toFixed(4)),
        ay: Number(((l.pixelY / naturalHeight) * 100).toFixed(4)),
      };
    }
    return l;
  });
}

export default function App() {
  const initialOverrides = useMemo(() => loadManualOverrides(), []);
  const initialLotId = useMemo(() => resolveInitialLotIdFromUrl(), []);
  const isAdminMode = useMemo(() => isAdminModeFromUrl(), []);

  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [lotes, setLotes] = useState<Lote[]>(() =>
    computeLotsFromDimensions(null, null, initialOverrides)
  );
  const [hasCustomCalibration, setHasCustomCalibration] = useState<boolean>(
    Object.keys(initialOverrides).length > 0
  );
  const [sectorFilter, setSectorFilter] = useState<'todos' | LotSector>('todos');
  const [selectedLotId, setSelectedLotId] = useState<string>(initialLotId);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState<boolean>(false);
  const [headerLogoError, setHeaderLogoError] = useState<boolean>(false);
  const [focusRequest, setFocusRequest] = useState<{ seq: number; zoom: boolean }>({
    seq: 0,
    zoom: false,
  });
  const [sectorFocusRequest, setSectorFocusRequest] = useState<{
    seq: number;
    sector: 'todos' | LotSector;
  }>({ seq: 0, sector: 'todos' });

  const [isTourActive, setIsTourActive] = useState<boolean>(false);
  const tourStepRef = useRef<number>(0);

  const [isPlanModalOpen, setIsPlanModalOpen] = useState<boolean>(false);
  const [isCompareOpen, setIsCompareOpen] = useState<boolean>(false);
  const [comparedLotIds, setComparedLotIds] = useState<string[]>([]);
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [shareCopied, setShareCopied] = useState<boolean>(false);
  const [sheetStatuses, setSheetStatuses] = useState<Record<string, Lote['estado']>>({});
  const [isSyncingSheet, setIsSyncingSheet] = useState<boolean>(false);
  const [adminStatusOverrides, setAdminStatusOverrides] = useState<
    Record<string, 'disponible' | 'reservado' | 'vendido'>
  >({});
  const [estadosCopied, setEstadosCopied] = useState<boolean>(false);
  const [coordToast, setCoordToast] = useState<{
    lotNum: string;
    ax: number;
    ay: number;
  } | null>(null);
  const [copiedCoord, setCopiedCoord] = useState<boolean>(false);
  const toastTimerRef = useRef<number | null>(null);

  const asesor = useMemo(() => resolveAsesorFromUrl(), []);
  const audio = usePresentationAudio();

  const syncFromGoogleSheet = useCallback(async () => {
    setIsSyncingSheet(true);
    try {
      const updates = await fetchSheetLotStatuses();
      if (Object.keys(updates).length > 0) {
        setSheetStatuses(updates);
      }
    } catch {
      // Keep fallback local statuses if offline
    } finally {
      setIsSyncingSheet(false);
    }
  }, []);

  useEffect(() => {
    void syncFromGoogleSheet();
  }, [syncFromGoogleSheet]);

  const displayLotes = useMemo(
    () =>
      lotes.map((l) => {
        if (l.id === '17') {
          return l.estado === 'area_verde' ? l : { ...l, estado: 'area_verde' as const };
        }
        const adminOverride = adminStatusOverrides[l.id];
        if (adminOverride) return { ...l, estado: adminOverride };
        const liveEstado = sheetStatuses[l.id];
        return liveEstado ? { ...l, estado: liveEstado } : l;
      }),
    [lotes, sheetStatuses, adminStatusOverrides]
  );

  const filteredLotes = useMemo(
    () =>
      displayLotes.filter(
        (lote) => sectorFilter === 'todos' || lote.sector === sectorFilter
      ),
    [displayLotes, sectorFilter]
  );

  const selectedLot = useMemo(
    () =>
      displayLotes.find((l) => l.id === selectedLotId) ||
      filteredLotes[0] ||
      displayLotes[0],
    [displayLotes, selectedLotId, filteredLotes]
  );

  const comparedLotes = useMemo(
    () =>
      comparedLotIds
        .map((id) => displayLotes.find((l) => l.id === id))
        .filter((l): l is Lote => Boolean(l)),
    [comparedLotIds, displayLotes]
  );

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Guided Tour automatic progression every 3.5 seconds + instant stop on screen touch
  useEffect(() => {
    if (!isTourActive) return;

    const intervalId = window.setInterval(() => {
      tourStepRef.current = (tourStepRef.current + 1) % GUIDED_TOUR_LOT_IDS.length;
      const nextId = GUIDED_TOUR_LOT_IDS[tourStepRef.current];
      setSelectedLotId(nextId);
      setFocusRequest((prev) => ({ seq: prev.seq + 1, zoom: true }));
    }, TOUR_INTERVAL_MS);

    const stopOnAnyTouch = (e: PointerEvent) => {
      if ((e.target as HTMLElement | null)?.closest('[data-tour-toggle="true"]')) {
        return;
      }
      setIsTourActive(false);
    };

    window.addEventListener('pointerdown', stopOnAnyTouch, { capture: true });

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('pointerdown', stopOnAnyTouch, { capture: true });
    };
  }, [isTourActive]);

  const handleToggleTour = () => {
    if (isTourActive) {
      setIsTourActive(false);
      return;
    }

    setSectorFilter('todos');
    setIsCalibrating(false);

    const currentTourIdx = GUIDED_TOUR_LOT_IDS.indexOf(selectedLotId);
    const startIdx = currentTourIdx >= 0 ? currentTourIdx : 0;
    tourStepRef.current = startIdx;

    const firstId = GUIDED_TOUR_LOT_IDS[startIdx];
    setSelectedLotId(firstId);
    setIsMobileSheetOpen(true);
    setFocusRequest((prev) => ({ seq: prev.seq + 1, zoom: true }));
    setIsTourActive(true);
  };

  const enterMobileLandscapeMode = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const isMobileDevice = Math.min(window.innerWidth, window.innerHeight) < 860;
    if (!isMobileDevice) return;

    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Fullscreen may be blocked on iOS Safari
    }

    try {
      const orientationApi = screen.orientation as ScreenOrientation & {
        lock?: (orientation: 'landscape' | 'portrait') => Promise<void>;
      };
      if (orientationApi && typeof orientationApi.lock === 'function') {
        await orientationApi.lock('landscape');
      }
    } catch {
      // Orientation lock unsupported (e.g. iOS Safari) -> RotatePhoneOverlay handles guidance
    }
  }, []);

  const handleEnterWithAudio = () => {
    setShowWelcome(false);
    void enterMobileLandscapeMode();
    void audio.play(true);
  };

  const handleEnterWithoutAudio = () => {
    setShowWelcome(false);
    void enterMobileLandscapeMode();
    audio.pause();
  };

  const handleAerialDimensions = useCallback((w: number, h: number) => {
    setNaturalSize({ w, h });
    const manual = loadManualOverrides();
    setLotes(computeLotsFromDimensions(w, h, manual));
  }, []);

  const handleSectorChange = (nextSector: 'todos' | LotSector) => {
    setIsTourActive(false);
    setSectorFilter(nextSector);
    setSectorFocusRequest((prev) => ({ seq: prev.seq + 1, sector: nextSector }));

    const matching = displayLotes.filter(
      (lote) => nextSector === 'todos' || lote.sector === nextSector
    );
    if (matching.length > 0 && !matching.some((l) => l.id === selectedLotId)) {
      setSelectedLotId(matching[0].id);
      setFocusRequest((prev) => ({ seq: prev.seq + 1, zoom: false }));
    }
  };

  const handleSelectLot = (id: string, shouldZoom = true) => {
    setIsTourActive(false);
    const lot = displayLotes.find((l) => l.id === id);
    if (!lot) return;
    if (sectorFilter !== 'todos' && lot.sector !== sectorFilter) {
      setSectorFilter('todos');
    }
    setSelectedLotId(id);
    setIsMobileSheetOpen(true);
    setFocusRequest((prev) => ({ seq: prev.seq + 1, zoom: shouldZoom }));
  };

  const handleToggleCompare = (id: string) => {
    setComparedLotIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore if fullscreen is blocked by embedded iframe policy
    }
  };

  const handleShareLot = async () => {
    const shareUrl = buildShareLotUrl(selectedLot.id);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2200);
    } catch {
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2200);
    }
  };

  const handleCalibrateLot = (id: string, ax: number, ay: number) => {
    if (!isAdminMode) return;
    setLotes((prev) => prev.map((l) => (l.id === id ? { ...l, ax, ay } : l)));
    try {
      const manual = loadManualOverrides();
      manual[id] = { ax, ay };
      localStorage.setItem(CALIB_STORAGE_KEY, JSON.stringify(manual));
    } catch {
      // Ignore storage errors in restricted environments
    }
    setHasCustomCalibration(true);

    const lot = lotes.find((l) => l.id === id);
    if (lot) {
      setCoordToast({ lotNum: lot.num, ax, ay });
      setCopiedCoord(false);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => {
        setCoordToast(null);
      }, 4500);
    }
  };

  const handleAdminStatusChange = (
    lotId: string,
    status: 'disponible' | 'reservado' | 'vendido'
  ) => {
    if (!isAdminMode || lotId === '17') return;
    setAdminStatusOverrides((prev) => ({ ...prev, [lotId]: status }));
  };

  const handleCopyEstadosLotes = async () => {
    if (!isAdminMode) return;
    const snippet = formatEstadosLotesSnippet(displayLotes);
    try {
      await navigator.clipboard.writeText(snippet);
      setEstadosCopied(true);
      setTimeout(() => setEstadosCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = snippet;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setEstadosCopied(true);
      setTimeout(() => setEstadosCopied(false), 2000);
    }
  };

  const handleExportJson = () => {
    const payload = JSON.stringify(
      displayLotes.map(({ id, num, sector, area, estado, px, py, pixelX, pixelY, ax, ay }) => ({
        id,
        num,
        sector,
        area,
        estado,
        px,
        py,
        pixelX,
        pixelY,
        ax,
        ay,
      })),
      null,
      2
    );
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'coordenadas-lotes-el-bosque-etapa3.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleResetCalibration = () => {
    try {
      localStorage.removeItem(CALIB_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
    setLotes(computeLotsFromDimensions(naturalSize?.w ?? null, naturalSize?.h ?? null, {}));
    setHasCustomCalibration(false);
    setCoordToast(null);
  };

  const handleCopyCoords = async () => {
    if (!coordToast) return;
    const snippet = `ax: ${coordToast.ax}, ay: ${coordToast.ay}`;
    try {
      await navigator.clipboard.writeText(snippet);
      setCopiedCoord(true);
      setTimeout(() => setCopiedCoord(false), 1800);
    } catch {
      // Clipboard API unavailable
    }
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden bg-white text-[#0f3d26]">
      <header className="h-[48px] min-[860px]:h-[60px] shrink-0 bg-[#0f3d26] text-white px-3 min-[860px]:px-5 flex items-center justify-between gap-2 sm:gap-6 border-b-[3px] border-[#facc15] z-30">
        {/* Zone 1: Brand Logo + Inmobiliaria Tauren */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            handleSectorChange('todos');
            setIsMobileSheetOpen(false);
          }}
          className="inline-flex items-center gap-2 min-w-0 max-w-[205px] sm:max-w-none whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#facc15] rounded"
        >
          {TAUREN_LOGO_URL && !headerLogoError && (
            <span className="bg-white px-1.5 py-0.5 rounded-md shrink-0 flex items-center justify-center shadow-sm">
              <img
                src={TAUREN_LOGO_URL}
                alt="Logo Inmobiliaria Tauren"
                referrerPolicy="no-referrer"
                onError={() => setHeaderLogoError(true)}
                className="h-6 min-[860px]:h-7 w-auto object-contain"
              />
            </span>
          )}
          <span className="text-[13px] sm:text-base min-[860px]:text-[17px] font-extrabold font-display tracking-tight text-white truncate">
            Inmobiliaria Tauren
          </span>
        </a>

        {/* Zone 2: Concise Sector Navigation (Desktop) */}
        <nav
          aria-label="Sectores de lotización"
          className="hidden 2xl:flex items-center gap-6 text-[13px] font-medium"
        >
          {HEADER_SECTORS.map((sec) => {
            const active = sectorFilter === sec.value;
            return (
              <button
                key={sec.value}
                type="button"
                onClick={() => handleSectorChange(sec.value)}
                className={`py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#facc15] ${
                  active
                    ? 'text-[#facc15] border-[#facc15] font-semibold'
                    : 'text-[#84cc16] border-transparent hover:text-white'
                }`}
              >
                {sec.shortLabel}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Sound Control + Share + Fullscreen + Admin Calibration (?admin=1) + Desktop CTA */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {!audio.hasError && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => void audio.toggle()}
                aria-pressed={audio.isPlaying}
                title={audio.isPlaying ? 'Pausar presentación de audio' : 'Activar audio de presentación'}
                aria-label={audio.isPlaying ? 'Pausar audio' : 'Activar audio'}
                className={`inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg border text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#facc15] ${
                  audio.isPlaying
                    ? 'bg-[#84cc16]/20 text-[#facc15] border-[#84cc16]'
                    : 'bg-white/10 text-white/90 border-white/25 hover:bg-white/20'
                }`}
              >
                {audio.isPlaying ? (
                  <>
                    <Volume2 className="w-4 h-4 text-[#facc15] shrink-0" />
                    <span className="hidden sm:inline">Audio</span>
                    <span className="inline-flex items-end gap-[2px] h-3" aria-hidden="true">
                      <span className="w-[2px] h-3 rounded-full bg-[#84cc16] origin-bottom animate-[soundwave_0.75s_ease-in-out_infinite]" />
                      <span className="w-[2px] h-3 rounded-full bg-[#facc15] origin-bottom animate-[soundwave_0.75s_ease-in-out_0.2s_infinite]" />
                      <span className="w-[2px] h-3 rounded-full bg-[#84cc16] origin-bottom animate-[soundwave_0.75s_ease-in-out_0.4s_infinite]" />
                    </span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-4 h-4 text-[#facc15] shrink-0" />
                    <span className="hidden sm:inline">Audio</span>
                  </>
                )}
              </button>

              {(audio.isPlaying || audio.hasEnded) && (
                <button
                  type="button"
                  onClick={() => void audio.restart()}
                  title="Reiniciar audio desde el inicio"
                  aria-label="Reiniciar audio"
                  className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-[#facc15] border border-white/25 transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#facc15]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <a
            href={GOOGLE_MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="Cómo llegar por Google Maps (Av. Sesquicentenario)"
            aria-label="Ubicación en Google Maps"
            className="inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/25 text-xs font-bold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#facc15]"
          >
            <MapPin className="w-3.5 h-3.5 text-[#84cc16] shrink-0" />
            <span className="hidden lg:inline">Ubicación Maps</span>
          </a>

          <button
            type="button"
            onClick={handleShareLot}
            title={`Copiar enlace directo del Lote ${selectedLot.num}`}
            aria-label={`Compartir Lote ${selectedLot.num}`}
            className="inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/25 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#facc15]"
          >
            {shareCopied ? (
              <Check className="w-3.5 h-3.5 text-[#84cc16] shrink-0" />
            ) : (
              <Share2 className="w-3.5 h-3.5 text-[#facc15] shrink-0" />
            )}
            <span className="hidden md:inline">
              {shareCopied ? 'Copiado' : 'Compartir Lote'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-[#facc15] border border-white/25 transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#facc15]"
          >
            {isFullscreen ? (
              <Minimize className="w-4 h-4" />
            ) : (
              <Maximize className="w-4 h-4" />
            )}
          </button>

          {/* Calibration button shown ONLY when URL contains ?admin=1 */}
          {isAdminMode && (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsTourActive(false);
                  setIsCalibrating((prev) => !prev);
                }}
                title="Activar calibración rápida sobre la foto aérea"
                aria-pressed={isCalibrating}
                className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  isCalibrating
                    ? 'bg-[#facc15] text-[#0f3d26] border-[#facc15]'
                    : 'bg-white/10 text-[#facc15] border-[#facc15]/80 hover:bg-white/20'
                }`}
              >
                <Crosshair className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">
                  {isCalibrating ? 'Finalizar ajuste' : 'Ajustar posición'}
                </span>
              </button>

              {hasCustomCalibration && (
                <button
                  type="button"
                  onClick={handleExportJson}
                  title="Exportar coordenadas calibradas en JSON"
                  className="hidden lg:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#84cc16] hover:bg-[#facc15] text-[#0f3d26] text-xs font-extrabold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span>Exportar JSON</span>
                </button>
              )}
            </>
          )}

          {selectedLot.estado === 'area_verde' ? (
            <span className="hidden min-[860px]:inline-flex items-center justify-center h-9 px-3.5 rounded-lg bg-[#84cc16]/20 border border-[#84cc16] text-[#84cc16] text-xs font-extrabold whitespace-nowrap shrink-0">
              Área Verde · Zona Común
            </span>
          ) : selectedLot.estado === 'vendido' ? (
            <button
              type="button"
              disabled
              className="hidden min-[860px]:inline-flex items-center justify-center h-9 px-4 rounded-lg bg-red-600/80 text-white text-xs font-extrabold whitespace-nowrap shrink-0 cursor-not-allowed opacity-90"
            >
              Lote {selectedLot.num} Vendido
            </button>
          ) : selectedLot.estado === 'reservado' ? (
            <a
              href={buildWhatsappUrl(asesor, selectedLot)}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden min-[860px]:inline-flex items-center justify-center h-9 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#0f3d26] text-xs font-extrabold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Consultar Lote {selectedLot.num}
            </a>
          ) : (
            <a
              href={buildWhatsappUrl(asesor, selectedLot)}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden min-[860px]:inline-flex items-center justify-center h-9 px-4 rounded-lg bg-[#facc15] hover:bg-[#84cc16] text-[#0f3d26] text-xs font-extrabold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Reservar Lote {selectedLot.num}
            </a>
          )}
        </div>
      </header>

      {/* Native-Style Split: 46% Top Aerial + 54% Rounded Bottom Sheet on mobile (<860px), Horizontal on desktop */}
      <main className="flex-1 flex flex-col min-[860px]:flex-row overflow-hidden relative bg-[#0f3d26]">
        <AerialViewport
          lotes={displayLotes}
          selectedLot={selectedLot}
          sectorFilter={sectorFilter}
          focusRequest={focusRequest}
          sectorFocusRequest={sectorFocusRequest}
          isTourActive={isTourActive}
          isMobileSheetOpen={isMobileSheetOpen}
          isCalibrating={isAdminMode && isCalibrating}
          onSelectLot={(id) => handleSelectLot(id, false)}
          onSelectSector={handleSectorChange}
          onToggleTour={handleToggleTour}
          onOpenMobileSheet={() => setIsMobileSheetOpen(true)}
          onAerialDimensions={handleAerialDimensions}
          onCalibrateLot={handleCalibrateLot}
          onExportJson={handleExportJson}
          onResetCalibration={handleResetCalibration}
          hasCustomCalibration={hasCustomCalibration}
        />

        <LotPlanSidebar
          lotes={displayLotes}
          filteredLotes={filteredLotes}
          selectedLot={selectedLot}
          sectorFilter={sectorFilter}
          asesor={asesor}
          comparedLotIds={comparedLotIds}
          isAdminMode={isAdminMode}
          estadosCopied={estadosCopied}
          isSyncingSheet={isSyncingSheet}
          isMobileSheetOpen={isMobileSheetOpen}
          onCloseMobileSheet={() => setIsMobileSheetOpen(false)}
          onRefreshSheet={() => void syncFromGoogleSheet()}
          onSectorChange={handleSectorChange}
          onSelectLot={(id) => handleSelectLot(id, true)}
          onToggleCompare={handleToggleCompare}
          onOpenCompare={() => {
            setIsTourActive(false);
            setIsCompareOpen(true);
          }}
          onOpenExpandedPlan={() => {
            setIsTourActive(false);
            setIsPlanModalOpen(true);
          }}
          onAdminStatusChange={handleAdminStatusChange}
          onCopyEstadosLotes={handleCopyEstadosLotes}
        />
      </main>

      {isAdminMode && coordToast && (
        <div
          role="status"
          className="fixed bottom-5 left-4 min-[860px]:left-[72px] z-50 flex items-center gap-2.5 bg-[#0f3d26]/85 backdrop-blur-[10px] text-[#facc15] px-3.5 py-2 rounded-xl border border-[#facc15]/80 shadow-xl text-xs font-mono-num font-bold"
        >
          <span>
            Lote {coordToast.lotNum} → ax: {coordToast.ax}, ay: {coordToast.ay}
          </span>
          <button
            type="button"
            onClick={handleCopyCoords}
            title="Copiar coordenadas"
            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#facc15] text-[#0f3d26] hover:bg-[#84cc16] text-[11px] font-sans font-bold cursor-pointer transition-colors"
          >
            {copiedCoord ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            <span>{copiedCoord ? 'Copiado' : 'Copiar'}</span>
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            title="Descargar JSON de coordenadas"
            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#84cc16] text-[#0f3d26] hover:bg-[#facc15] text-[11px] font-sans font-bold cursor-pointer transition-colors"
          >
            <Download className="w-3 h-3" />
            <span>JSON</span>
          </button>
        </div>
      )}

      <RotatePhoneOverlay enabled={!showWelcome} />

      <WelcomeModal
        isOpen={showWelcome}
        onEnterWithAudio={handleEnterWithAudio}
        onEnterWithoutAudio={handleEnterWithoutAudio}
      />

      <PlanModal
        isOpen={isPlanModalOpen}
        lotes={displayLotes}
        selectedLot={selectedLot}
        sectorFilter={sectorFilter}
        onSelectLot={(id) => handleSelectLot(id, true)}
        onClose={() => setIsPlanModalOpen(false)}
      />

      <CompareModal
        isOpen={isCompareOpen}
        comparedLotes={comparedLotes}
        asesor={asesor}
        onSelectLot={(id) => handleSelectLot(id, true)}
        onRemoveLot={(id) => handleToggleCompare(id)}
        onClearAll={() => setComparedLotIds([])}
        onClose={() => setIsCompareOpen(false)}
      />
    </div>
  );
}
