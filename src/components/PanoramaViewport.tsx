import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Compass,
  Copy,
  Download,
  Edit3,
  Layers,
  LocateFixed,
  Minus,
  Plus,
  RotateCw,
  Trash2,
  Undo2,
} from 'lucide-react';
import {
  Asesor,
  buildWhatsappUrl,
  Lote,
  LotSector,
  PANORAMA_360_URL,
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
  if (cosC <= 0.05) return null;

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
  isAdminMode,
  asesor,
  onSelectLot,
  onToggleTour,
  onOpenMobileSheet,
}: PanoramaViewportProps) {
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const viewerInstanceRef = useRef<PannellumViewerInstance | null>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [autoRotate, setAutoRotate] = useState(!isAdminMode);
  const [polygons, setPolygons] = useState<Record<string, SphericalPoint[]>>(() =>
    loadSaved360Polygons()
  );
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
      if (!isLoaded) setLoadFailed(true);
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
          setCameraState({ pitch, yaw, hfov, width, height });
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
      viewerInstanceRef.current?.destroy?.();
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
    inst.setHfov?.(72, 600);
  }, [selectedLot.id, focusRequest, polygons]);

  const persistPolygons = useCallback((next: Record<string, SphericalPoint[]>) => {
    setPolygons(next);
    try {
      localStorage.setItem(STORAGE_360_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const handleToggleDrawing = () => {
    const next = !isDrawingMode;
    setIsDrawingMode(next);
    setDraftPoints([]);
    if (next) {
      viewerInstanceRef.current?.stopAutoRotate?.();
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

  const handleSaveDraft = () => {
    if (draftPoints.length < 3) return;
    const nextPolys = { ...polygons, [editingLotId]: draftPoints };
    persistPolygons(nextPolys);
    setDraftPoints([]);
    
    const idx = lotes.findIndex((l) => l.id === editingLotId);
    if (idx >= 0 && idx < lotes.length - 1) {
      setEditingLotId(lotes[idx + 1].id);
    }
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

  const tracedCount = Object.keys(polygons).length;

  return (
    <div
      onClick={handleCanvasClickForTrace}
      className={`relative w-full h-[100dvh] flex-1 shrink-0 overflow-hidden bg-[#0f3d26] select-none ${
        isDrawingMode ? 'cursor-crosshair' : 'cursor-grab'
      }`}
    >
      <div ref={viewerContainerRef} className="absolute inset-0 w-full h-full" />

      {!loadFailed && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-15"
          viewBox={`0 0 ${Math.max(1, cameraState.width)} ${Math.max(1, cameraState.height)}`}
        >
          {projectedLots.map(({ lote, pointsAttr, centerX, centerY }) => {
            const isSelected = selectedLot.id === lote.id;
            const fill = isSelected ? 'rgba(250, 204, 21, 0.75)' : 'rgba(250, 204, 21, 0.35)';
            const stroke = isSelected ? '#ffffff' : '#facc15';

            return (
              <g
                key={lote.id}
                className={isDrawingMode ? 'pointer-events-none' : 'pointer-events-auto cursor-pointer'}
                onClick={(e) => {
                  e.stopPropagation();
                  viewerInstanceRef.current?.stopAutoRotate?.();
                  setAutoRotate(false);
                  onSelectLot(lote.id);
                  onOpenMobileSheet();
                }}
              >
                <polygon points={pointsAttr} fill={fill} stroke={stroke} strokeWidth={isSelected ? 3.5 : 2} />
                <g transform={`translate(${centerX}, ${centerY})`}>
                  <rect x={-14} y={-10} width={28} height={20} rx={5} fill="#0f3d26" stroke="#facc15" strokeWidth={1.5} />
                  <text x={0} y={4} textAnchor="middle" fill="#facc15" fontSize="10" fontWeight="800">
                    {lote.num}
                  </text>
                </g>
              </g>
            );
          })}

          {isDrawingMode && projectedDraft.length > 0 && (
            <polyline
              points={projectedDraft.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="rgba(250, 204, 21, 0.3)"
              stroke="#facc15"
              strokeWidth={2.5}
              strokeDasharray="4,4"
            />
          )}
        </svg>
      )}

      {isAdminMode && (
        <div data-toolbar="true" className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleToggleDrawing}
            className="h-8 px-3 rounded-xl bg-[#facc15] text-[#0f3d26] text-xs font-extrabold shadow-lg cursor-pointer"
          >
            {isDrawingMode ? 'Finalizar Trazado' : `Trazar Lotes en Amarillo (${tracedCount}/46)`}
          </button>
        </div>
      )}
    </div>
  );
}
