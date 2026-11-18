import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Edit3,
  LocateFixed,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCw,
  Trash2,
  Undo2,
} from 'lucide-react';
import {
  Asesor,
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

// Encuadre panorámico abierto fijo
const INITIAL_PITCH = -12;
const INITIAL_YAW = -15;
const INITIAL_HFOV = 118;

function loadSaved360Polygons(): Record<string, SphericalPoint[]> {
  if (typeof window === 'undefined') return { ...POLIGONOS_360_LOTES };
  try {
    const raw = localStorage.getItem(STORAGE_360_KEY);
    if (!raw) return { ...POLIGONOS_360_LOTES };
    return JSON.parse(raw) as Record<string, SphericalPoint[]>;
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
  sectorFocusRequest,
  isTourActive,
  isMobileSheetOpen,
  isAdminMode,
  onSelectLot,
  onSelectSector,
  onToggleTour,
  onOpenMobileSheet,
}: PanoramaViewportProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const viewerInstanceRef = useRef<PannellumViewerInstance | null>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
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
  }>({ pitch: INITIAL_PITCH, yaw: INITIAL_YAW, hfov: INITIAL_HFOV, width: 1280, height: 720 });

  useEffect(() => {
    setEditingLotId(selectedLot.id);
  }, [selectedLot.id]);

  useEffect(() => {
    const container = viewerContainerRef.current;
    if (!container) return;

    let cancelled = false;
    let retryTimer: number | null = null;
    let fallbackTimer: number | null = null;
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
          autoRotate: 0,
          compass: false,
          showControls: false,
          mouseZoom: true,
          hfov: INITIAL_HFOV,
          minHfov: 42,
          maxHfov: 125,
          pitch: INITIAL_PITCH,
          yaw: INITIAL_YAW,
          crossOrigin: 'anonymous',
          strings: {
            loadingLabel: 'Cargando vista aérea 360°...',
            errorMsg: 'No se pudo cargar la imagen 360°.',
          },
        });

        instance.on?.('load', () => {
          if (!cancelled) setIsLoaded(true);
        });
        instance.on?.('error', () => {
          if (!cancelled) setLoadFailed(true);
        });

        fallbackTimer = window.setTimeout(() => {
          if (!cancelled) setIsLoaded(true);
        }, 1200);

        viewerInstanceRef.current = instance;
      } catch {
        setLoadFailed(true);
      }

      const syncCameraLoop = () => {
        const inst = viewerInstanceRef.current;
        const el = viewerContainerRef.current;
        if (inst &&
