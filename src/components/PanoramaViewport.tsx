import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Copy,
  Download,
  Edit3,
  Layers,
  LocateFixed,
  Lock,
  MapPin,
  MessageCircle,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Star,
  Trash2,
  Trees,
  Undo2,
  X,
} from 'lucide-react';
import {
  Asesor,
  buildWhatsappUrl,
  GUIDED_TOUR_LOT_IDS,
  Lote,
  LotSector,
  PANORAMA_360_URL,
  SECTOR_FILTERS,
} from '../data/lotes';
import { POLIGONOS_360_LOTES, SphericalPoint } from '../data/poligonos360';
import { LotTags } from './LotTags';

interface PanoramaViewportProps {
  lotes: Lote[];
  selectedLot: Lote;
  sectorFilter: 'todos' | LotSector;
  focusRequest: { seq: number; zoom: boolean };
  sectorFocusRequest: { seq: number; sector: 'todos' | LotSector };
  isTourActive: boolean;
  isMobileSheetOpen: boolean;
  isAdminMode: boolean;
  asesor: Asesor;
  comparedLotIds: string[];
  onSelectLot: (id: string) => void;
  onSelectSector: (sector: 'todos' | LotSector) => void;
  onToggleTour: () => void;
  onToggleCompare: (id: string) => void;
  onOpenMobileSheet: () => void;
}

interface PannellumViewerInstance {
  destroy?: () => void;
  startAutoRotate?: (speed?: number) => void;
  stopAutoRotate?: () => void;
  getPitch?: () => number;
  getYaw?: () => number;
  getHfov?: () => number;
  setPitch?: (pitch: number, animated?: boolean | number) => void;
  setYaw?: (yaw: number, animated?: boolean | number) => void;
  setHfov?: (hfov: number, animated?: boolean | number) => void;
  mouseEventToCoords?: (event: MouseEvent) => [number, number];
  on?: (event: string, cb: () => void) => void;
}

declare global {
  interface Window {
    pannellum?: {
      viewer: (
        container: HTMLElement | string,
        config: Record<string, unknown>
      ) => PannellumViewerInstance;
    };
  }
}

const STORAGE_360_KEY = 'tauren_el_bosque_360_polygons_v1';

function loadSaved360Polygons(): Record<string, SphericalPoint[]> {
  if (typeof window === 'undefined') return { ...POLIGONOS_360_LOTES };
  try {
    const raw = localStorage.getItem(STORAGE_360_KEY);
    if (!raw) return { ...POLIGONOS_360_LOTES };
    const parsed = JSON.parse(raw) as Record<string, SphericalPoint[]>;
    return { ...POLIGONOS_360_LOTES, ...parsed };
  } catch {
    return { ...POLIGONOS_360_LOTES };
  }
}

function projectSphericalToScreen(
  ptPitchDeg: number,
  ptYawDeg: number,
  camPitchDeg: number,
  camYawDeg: number,
  hfovDeg: number,
  width: number,
  height: number
): { x: number; y: number } | null {
  if (width <= 0 || height <= 0) return null;

  const deg2rad = Math.PI / 180;
  const phi = ptPitchDeg * deg2rad;
  const lambda = ptYawDeg * deg2rad;
  const phi0 = camPitchDeg * deg2rad;
  const lambda0 = camYawDeg * deg2rad;
  const dLambda = lambda - lambda0;

  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const cosPhi0 = Math.cos(phi0);
  const sinPhi0 = Math.sin(phi0);
  const cosDLambda = Math.cos(dLambda);

  const cosC = sinPhi0 * sinPhi + cosPhi0 * cosPhi * cosDLambda;
  if (cosC <= 0.05) {
    return null;
  }

  const f = width / (2 * Math.tan((hfovDeg * deg2rad) / 2));
  const x = width / 2 + (f * (cosPhi * Math.sin(dLambda))) / cosC;
  const y = height / 2 - (f * (cosPhi0 * sinPhi - sinPhi0 * cosPhi * cosDLambda)) / cosC;

  return { x, y };
}

export function PanoramaViewport({
  lotes,
  selectedLot,
  sectorFilter,
  focusRequest,
  sectorFocusRequest,
  isTourActive,
  isMobileSheetOpen,
  isAdminMode,
  asesor,
  comparedLotIds,
  onSelectLot,
  onSelectSector,
  onToggleTour,
  onToggleCompare,
  onOpenMobileSheet,
}: PanoramaViewportProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const viewerInstanceRef = useRef<PannellumViewerInstance | null>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [autoRotate, setAutoRotate] = useState(!isAdminMode);
  const [polygons, setPolygons] = useState<Record<string, SphericalPoint[]>>(() =>
    loadSaved360Polygons()
  );
  const [hoveredLotId, setHoveredLotId] = useState<string | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState<boolean>(false);
  const [editingLotId, setEditingLotId] = useState<string>(selectedLot.id);
  const [draftPoints, setDraftPoints] = useState<SphericalPoint[]>([]);
  const [copiedSnippet, setCopiedSnippet] = useState<boolean>(false);

  const [cameraState, setCameraState] = useState<{
    pitch: number;
    yaw: number;
    hfov: number;
    width: number;
    height: number;
  }>({ pitch: -24, yaw: 0, hfov: 105, width: 1280, height: 720 });

  useEffect(() => {
    setEditingLotId(selectedLot.id);
  }, [selectedLot.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!isLoaded) {
        setLoadFailed(true);
      }
    }, 7000);
    return () => window.clearTimeout(timer);
  }, [isLoaded]);

  useEffect(() => {
    const container = viewerContainerRef.current;
    if (!container) return;

    let cancelled = false;
    let retryTimer: number | null = null;
    let rafId = 0;

    const initViewer = () => {
      if (cancelled || !viewerContainerRef.current) return;
      if (!window.pannellum || typeof window.pannellum.viewer !== 'function') {
        retryTimer = window.setTimeout(initViewer, 150);
        return;
      }

      try {
        const instance = window.pannellum.viewer(viewerContainerRef.current, {
          type: 'equirectangular',
          panorama: PANORAMA_360_URL,
          autoLoad: true,
          autoRotate: isAdminMode ? 0 : -1.5,
          compass: false,
          showControls: false,
          mouseZoom: true,
          hfov: 105,
          minHfov: 42,
          maxHfov: 120,
          pitch: -24,
          yaw: 0,
          crossOrigin: 'anonymous',
          strings: {
            loadingLabel: 'Cargando vista aérea 360°...',
            errorMsg: 'No se pudo cargar la imagen 360°.',
          },
        });

        instance.on?.('load', () => {
          if (!cancelled) {
            setIsLoaded(true);
            setLoadFailed(false);
          }
        });
        instance.on?.('error', () => {
          if (!cancelled) setLoadFailed(true);
        });

        viewerInstanceRef.current = instance;
      } catch {
        setLoadFailed(true);
      }

      const syncCameraLoop = () => {
        const inst = viewerInstanceRef.current;
        const el = viewerContainerRef.current;
        if (inst && el) {
          const pitch = inst.getPitch?.() ?? -24;
          const yaw = inst.getYaw?.() ?? 0;
          const hfov = inst.getHfov?.() ?? 105;
          const width = el.clientWidth;
          const height = el.clientHeight;
          setCameraState((prev) => {
            if (
              Math.abs(prev.pitch - pitch) < 0.03 &&
              Math.abs(prev.yaw - yaw) < 0.03 &&
              Math.abs(prev.hfov - hfov) < 0.03 &&
              prev.width === width &&
              prev.height === height
            ) {
              return prev;
            }
            return { pitch, yaw, hfov, width, height };
          });
        }
        rafId = window.requestAnimationFrame(syncCameraLoop);
      };
      rafId = window.requestAnimationFrame(syncCameraLoop);
    };

    initViewer();

    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      window.cancelAnimationFrame(rafId);
      if (viewerInstanceRef.current?.destroy) {
        try {
          viewerInstanceRef.current.destroy();
        } catch {
          // Ignore
        }
      }
      viewerInstanceRef.current = null;
    };
  }, [isAdminMode]);

  // Resto de la lógica del componente (zoom, tour, selección de lotes)...
  return (
    <div
      ref={viewportRef}
      className="relative w-full h-[100dvh] flex-1 shrink-0 overflow-hidden bg-[#0f3d26] select-none"
    >
      <div ref={viewerContainerRef} className="w-full h-full" />
    </div>
  );
}
