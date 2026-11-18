import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Edit3,
  LocateFixed,
  Lock,
  MessageCircle,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCw,
  Trash2,
  Trees,
  Undo2,
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

// Encuadre panorámico abierto (igual a la segunda imagen)
const INITIAL_PITCH = -12;
const INITIAL_YAW = -15;
const INITIAL_HFOV = 118;

function loadSaved360Polygons(): Record<string, SphericalPoint[]> {
  if (typeof window === 'undefined') return { ...POLIGONOS_360_LOTES };
  try {
    const raw = localStorage.getItem(STORAGE_360_KEY);
    if (!raw) return { ...POLIGONOS_360_LOTES };
    const parsed = JSON.parse(raw) as Record<string, SphericalPoint[]>;
    return parsed;
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
          autoRotate: isAdminMode ? 0 : -1.5,
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
        if (inst && el) {
          const pitch = inst.getPitch?.() ?? INITIAL_PITCH;
          const yaw = inst.getYaw?.() ?? INITIAL_YAW;
          const hfov = inst.getHfov?.() ?? INITIAL_HFOV;
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
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
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

  useEffect(() => {
    if (!focusRequest.zoom) return;
    const poly = polygons[selectedLot.id];
    const inst = viewerInstanceRef.current;
    if (!poly || poly.length === 0 || !inst) return;

    const avgPitch = poly.reduce((acc, p) => acc + p.pitch, 0) / poly.length;
    const avgYaw = poly.reduce((acc, p) => acc + p.yaw, 0) / poly.length;
    inst.stopAutoRotate?.();
    setAutoRotate(false);
    inst.setPitch?.(avgPitch, 600);
    inst.setYaw?.(avgYaw, 600);
    const curHfov = inst.getHfov?.() ?? INITIAL_HFOV;
    if (curHfov > 75) {
      inst.setHfov?.(72, 600);
    }
  }, [selectedLot.id, focusRequest, polygons]);

  useEffect(() => {
    if (sectorFocusRequest.seq === 0) return;
    const inst = viewerInstanceRef.current;
    if (!inst) return;

    if (sectorFocusRequest.sector === 'todos') {
      inst.setPitch?.(INITIAL_PITCH, 600);
      inst.setYaw?.(INITIAL_YAW, 600);
      inst.setHfov?.(INITIAL_HFOV, 600);
      return;
    }

    const sectorPts: SphericalPoint[] = [];
    for (const l of lotes) {
      if (l.sector === sectorFocusRequest.sector && polygons[l.id]) {
        sectorPts.push(...polygons[l.id]);
      }
    }
    if (sectorPts.length > 0) {
      const avgPitch = sectorPts.reduce((acc, p) => acc + p.pitch, 0) / sectorPts.length;
      const avgYaw = sectorPts.reduce((acc, p) => acc + p.yaw, 0) / sectorPts.length;
      inst.stopAutoRotate?.();
      setAutoRotate(false);
      inst.setPitch?.(avgPitch, 600);
      inst.setYaw?.(avgYaw, 600);
      inst.setHfov?.(82, 600);
    }
  }, [sectorFocusRequest, lotes, polygons]);

  const persistPolygons = useCallback((next: Record<string, SphericalPoint[]>) => {
    setPolygons(next);
    try {
      localStorage.setItem(STORAGE_360_KEY, JSON.stringify(next));
    } catch {
      // Ignore
    }
  }, []);

  const handleToggleRotate = () => {
    const inst = viewerInstanceRef.current;
    if (!inst) return;
    if (autoRotate) {
      inst.stopAutoRotate?.();
      setAutoRotate(false);
    } else {
      inst.startAutoRotate?.(-1.5);
      setAutoRotate(true);
    }
  };

  const handleToggleDrawing = () => {
    const next = !isDrawingMode;
    setIsDrawingMode(next);
    setDraftPoints([]);
    if (next && viewerInstanceRef.current?.stopAutoRotate) {
      viewerInstanceRef.current.stopAutoRotate();
      setAutoRotate(false);
    }
  };

  const handleCanvasClickForTrace = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAdminMode || !isDrawingMode || !viewerInstanceRef.current?.mouseEventToCoords) return;
    if ((e.target as HTMLElement).closest('[data-toolbar="true"]')) return;

    const coords = viewerInstanceRef.current.mouseEventToCoords(e.nativeEvent);
    if (!coords || coords.length < 2) return;

    const pt: SphericalPoint = {
      pitch: Number(coords[0].toFixed(2)),
      yaw: Number(coords[1].toFixed(2)),
    };

    setDraftPoints((prev) => [...prev, pt]);
  };

  const handleSaveDraftEarly = () => {
    if (draftPoints.length < 3) return;
    const nextPolys = { ...polygons, [editingLotId]: draftPoints };
    persistPolygons(nextPolys);
    setDraftPoints([]);
    onSelectLot(editingLotId);

    const idx = lotes.findIndex((l) => l.id === editingLotId);
    if (idx >= 0 && idx < lotes.length - 1) {
      setEditingLotId(lotes[idx + 1].id);
    }
  };

  const handleDeleteLotPolygon = (lotId: string) => {
    const nextPolys = { ...polygons };
    delete nextPolys[lotId];
    persistPolygons(nextPolys);
  };

  const handleClearAllPolygons = () => {
    setDraftPoints([]);
    persistPolygons({});
    if (lotes.length > 0) {
      setEditingLotId(lotes[0].id);
    }
  };

  const handleCopyPolygonsSnippet = async () => {
    const entries = Object.keys(polygons)
      .sort()
      .map((id) => {
        const pts = polygons[id]
          .map((p) => `{ pitch: ${p.pitch}, yaw: ${p.yaw} }`)
          .join(', ');
        return `  '${id}': [${pts}],`;
      });
    const snippet = `export const POLIGONOS_360_LOTES: Record<string, SphericalPoint[]> = {\n${entries.join('\n')}\n};`;
    try {
      await navigator.clipboard.writeText(snippet);
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2200);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = snippet;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2200);
    }
  };

  const handleExportPolygonsJson = () => {
    const blob = new Blob([JSON.stringify(polygons, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'poligonos-360-el-bosque-etapa3.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const zoomStep = (deltaHfov: number) => {
    const inst = viewerInstanceRef.current;
    if (!inst) return;
    const cur = inst.getHfov?.() ?? INITIAL_HFOV;
    const next = Math.min(125, Math.max(42, cur + deltaHfov));
    inst.setHfov?.(next, 250);
  };

  const resetCamera = () => {
    const inst = viewerInstanceRef.current;
    if (!inst) return;
    inst.setPitch?.(INITIAL_PITCH, 450);
    inst.setYaw?.(INITIAL_YAW, 450);
    inst.setHfov?.(INITIAL_HFOV, 450);
  };

  const projectedLots = useMemo(() => {
    const result: Array<{
      lote: Lote;
      pointsAttr: string;
      centerX: number;
      centerY: number;
    }> = [];

    for (const lote of lotes) {
      const poly = polygons[lote.id];
      if (!poly || poly.length < 3) continue;

      const screenPts: Array<{ x: number; y: number }> = [];
      let valid = true;
      for (const sp of poly) {
        const projected = projectSphericalToScreen(
          sp.pitch,
          sp.yaw,
          cameraState.pitch,
          cameraState.yaw,
          cameraState.hfov,
          cameraState.width,
          cameraState.height
        );
        if (!projected) {
          valid = false;
          break;
        }
        screenPts.push(projected);
      }

      if (!valid || screenPts.length < 3) continue;

      const sumX = screenPts.reduce((acc, p) => acc + p.x, 0);
      const sumY = screenPts.reduce((acc, p) => acc + p.y, 0);
      result.push({
        lote,
        pointsAttr: screenPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
        centerX: sumX / screenPts.length,
        centerY: sumY / screenPts.length,
      });
    }
    return result;
  }, [lotes, polygons, cameraState]);

  const projectedDraft = useMemo(() => {
    return draftPoints
      .map((sp) =>
        projectSphericalToScreen(
          sp.pitch,
          sp.yaw,
          cameraState.pitch,
          cameraState.yaw,
          cameraState.hfov,
          cameraState.width,
          cameraState.height
        )
      )
      .filter((p): p is { x: number; y: number } => Boolean(p));
  }, [draftPoints, cameraState]);

  const hoveredLot = useMemo(
    () => (hoveredLotId ? lotes.find((l) => l.id ===
