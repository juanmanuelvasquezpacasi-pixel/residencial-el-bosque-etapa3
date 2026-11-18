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
    () => (hoveredLotId ? lotes.find((l) => l.id === hoveredLotId) || null : null),
    [hoveredLotId, lotes]
  );

  const tourIndex = useMemo(
    () => GUIDED_TOUR_LOT_IDS.indexOf(selectedLot.id),
    [selectedLot.id]
  );

  const tracedCount = Object.keys(polygons).length;

  return (
    <div
      ref={viewportRef}
      onClick={handleCanvasClickForTrace}
      className={`relative w-full ${
        isMobileSheetOpen ? 'h-[calc(46%+14px)] landscape:h-full' : 'h-full'
      } min-[860px]:h-full min-[860px]:flex-1 shrink-0 overflow-hidden bg-[#0f3d26] select-none transition-[height] duration-300 ${
        isDrawingMode ? 'cursor-crosshair' : 'cursor-grab'
      }`}
      aria-label="Vista aérea interactiva 360 grados de Residencial El Bosque Etapa 3"
    >
      {!isLoaded && !loadFailed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white pointer-events-none z-10 bg-[#0f3d26]">
          <div className="w-10 h-10 rounded-full border-2 border-[#facc15]/30 border-t-[#facc15] animate-spin" />
          <p className="text-sm font-bold tracking-wide text-[#facc15]">
            Cargando vista aérea 360°...
          </p>
          <p className="text-xs text-white/75 max-w-xs text-center px-4">
            Preparando fotografía panorámica esférica de Residencial El Bosque
          </p>
        </div>
      )}

      {/* Pannellum 360° WebGL Canvas */}
      <div ref={viewerContainerRef} className="w-full h-full" />

      {/* Live Projected SVG Layer for Interactive 360° Lot Polygons */}
      {isLoaded && !loadFailed && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-15"
          viewBox={`0 0 ${Math.max(1, cameraState.width)} ${Math.max(1, cameraState.height)}`}
        >
          {projectedLots.map(({ lote, pointsAttr, centerX, centerY }) => {
            const isSelected = selectedLot.id === lote.id;
            const isDimmed = sectorFilter !== 'todos' && lote.sector !== sectorFilter;

            let fill = 'rgba(250, 204, 21, 0.32)';
            let stroke = '#facc15';

            if (lote.estado === 'vendido') {
              fill = 'rgba(220, 38, 38, 0.48)';
              stroke = '#ef4444';
            } else if (lote.estado === 'reservado') {
              fill = 'rgba(250, 204, 21, 0.45)';
              stroke = '#facc15';
            } else if (lote.estado === 'area_verde') {
              fill = 'rgba(34, 197, 94, 0.25)';
              stroke = '#4ade80';
            }

            if (isSelected) {
              fill =
                lote.estado === 'vendido'
                  ? 'rgba(220, 38, 38, 0.68)'
                  : 'rgba(250, 204, 21, 0.65)';
              stroke = '#ffffff';
            }

            return (
              <g
                key={lote.id}
                style={{ opacity: isDimmed ? 0.2 : 1 }}
                className={
                  isDrawingMode || isDimmed
                    ? 'pointer-events-none'
                    : 'pointer-events-auto cursor-pointer'
                }
                onMouseEnter={() => setHoveredLotId(lote.id)}
                onMouseLeave={() => setHoveredLotId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  viewerInstanceRef.current?.stopAutoRotate?.();
                  setAutoRotate(false);
                  onSelectLot(lote.id);
                  onOpenMobileSheet();
                }}
              >
                <polygon
                  points={pointsAttr}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isSelected ? 3.5 : 2}
                  strokeLinejoin="round"
                />
                <g transform={`translate(${centerX}, ${centerY})`}>
                  <rect
                    x={lote.estado === 'vendido' ? -24 : -13}
                    y={-10}
                    width={lote.estado === 'vendido' ? 48 : 26}
                    height={20}
                    rx={5}
                    fill={
                      lote.estado === 'vendido'
                        ? '#dc2626'
                        : lote.estado === 'reservado'
                        ? '#facc15'
                        : '#0f3d26'
                    }
                    stroke="#ffffff"
                    strokeWidth={1.2}
                  />
                  <text
                    x={0}
                    y={4}
                    textAnchor="middle"
                    fill={lote.estado === 'reservado' ? '#0f3d26' : '#ffffff'}
                    fontSize="10"
                    fontWeight="800"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {lote.estado === 'vendido' ? `${lote.num} VEND` : lote.num}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Draft Polygon while Admin traces corners */}
          {isDrawingMode && projectedDraft.length > 0 && (
            <g>
              <polyline
                points={projectedDraft.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="rgba(250, 204, 21, 0.28)"
                stroke="#facc15"
                strokeWidth={2.5}
                strokeDasharray="5,4"
              />
              {projectedDraft.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={5}
                  fill="#facc15"
                  stroke="#0f3d26"
                  strokeWidth={2}
                />
              ))}
            </g>
          )}
        </svg>
      )}

      {/* Instant Hover Tooltip */}
      {hoveredLot && !isDrawingMode && (
        <div
          data-toolbar="true"
          className="absolute top-16 left-1/2 -translate-x-1/2 z-35 pointer-events-none bg-[#0f3d26]/90 backdrop-blur-[10px] text-white px-3.5 py-1.5 rounded-xl border border-[#facc15] shadow-2xl flex items-center gap-2 text-xs font-mono-num font-bold animate-fadeIn"
        >
          <span className="text-[#facc15]">Lote {hoveredLot.num}</span>
          <span>·</span>
          <span>{hoveredLot.area}</span>
          <span>·</span>
          <span
            className={`uppercase text-[10px] px-1.5 py-0.5 rounded ${
              hoveredLot.estado === 'disponible'
                ? 'bg-[#facc15] text-[#0f3d26]'
                : hoveredLot.estado === 'reservado'
                ? 'bg-amber-400 text-[#0f3d26]'
                : hoveredLot.estado === 'vendido'
                ? 'bg-red-600 text-white'
                : 'bg-[#84cc16]/40 text-[#0f3d26]'
            }`}
          >
            {hoveredLot.estado}
          </span>
        </div>
      )}

      {/* Compact Mobile Top Zone Pills */}
      <div
        data-toolbar="true"
        className="min-[860px]:hidden absolute top-1.5 inset-x-0 z-25 px-2"
      >
        <div
          role="navigation"
          aria-label="Zonas de lotización"
          className="flex items-center gap-1 overflow-x-auto no-scrollbar"
        >
          {SECTOR_FILTERS.map((sec) => {
            const active = sectorFilter === sec.value;
            return (
              <button
                key={sec.value}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectSector(sec.value);
                }}
                className={`py-[5px] px-[11px] rounded-full text-[11px] leading-tight font-bold border transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-sm ${
                  active
                    ? 'bg-[#facc15] text-[#0f3d26] border-[#facc15]'
                    : 'bg-[#0f3d26]/80 backdrop-blur-[10px] text-white border-[#facc15]/45 hover:bg-[#0f3d26]'
                }`}
              >
                {sec.mobileLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Admin 360° Polygon Tracer Bar (?admin=1) */}
      {isAdminMode && (
        <div
          data-toolbar="true"
          className="absolute top-11 min-[860px]:top-3 left-1/2 -translate-x-1/2 z-30 w-[94%] max-w-2xl flex flex-col items-center gap-2"
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleDrawing}
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border text-xs font-extrabold shadow-lg cursor-pointer transition-colors ${
                isDrawingMode
                  ? 'bg-[#facc15] text-[#0f3d26] border-white'
                  : 'bg-[#0f3d26]/90 text-[#facc15] border-[#facc15]'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>
                {isDrawingMode
                  ? 'Finalizar Trazado 360°'
                  : `Trazar Lotes en Amarillo (${tracedCount}/46)`}
              </span>
            </button>
          </div>

          {isDrawingMode && (
            <div className="w-full bg-[#0f3d26]/95 backdrop-blur-[12px] border border-[#facc15] rounded-2xl p-2.5 shadow-2xl space-y-2 text-white">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-[#facc15]">Lote:</span>
                  <select
                    aria-label="Seleccionar lote a trazar en 360"
                    value={editingLotId}
                    onChange={(e) => {
                      setEditingLotId(e.target.value);
                      setDraftPoints([]);
                    }}
                    className="px-2 py-1 rounded-lg bg-white text-[#0f3d26] text-xs font-extrabold font-mono-num"
                  >
                    {lotes.map((l) => (
                      <option key={l.id} value={l.id}>
                        Lote {l.num} ({l.area}) {polygons[l.id] ? '✓' : ''}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-[#facc15] font-bold">
                    Esquinas: {draftPoints.length}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {draftPoints.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDraftPoints((prev) => prev.slice(0, -1))}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold cursor-pointer"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>Deshacer</span>
                    </button>
                  )}
                  {draftPoints.length >= 3 && (
                    <button
                      type="button"
                      onClick={handleSaveDraftEarly}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#facc15] text-[#0f3d26] text-[11px] font-extrabold cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Cerrar Polígono ({draftPoints.length} pts)</span>
                    </button>
                  )}
                  {polygons[editingLotId] && (
                    <button
                      type="button"
                      onClick={() => handleDeleteLotPolygon(editingLotId)}
                      title="Borrar polígono de este lote"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-[11px] font-bold cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Borrar Lote</span>
                    </button>
                  )}
                  {(tracedCount > 0 || draftPoints.length > 0) && (
                    <button
                      type="button"
                      onClick={handleClearAllPolygons}
                      title="Limpiar todos los trazos y empezar desde cero"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-700 hover:bg-red-600 text-white text-[11px] font-extrabold border border-red-400/50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Borrar Todo</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/15 text-[11px]">
                <span className="text-white/80">
                  Marca las esquinas del Lote {editingLotId} y pulsa "Cerrar Polígono".
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyPolygonsSnippet}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#facc15] text-[#0f3d26] font-extrabold cursor-pointer"
                  >
                    {copiedSnippet ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSnippet ? '¡Copiado!' : `Copiar código (${tracedCount})`}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPolygonsJson}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white font-bold cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>JSON</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Interactive Card */}
      {!isMobileSheetOpen && !isDrawingMode && selectedLot && (
        <div
          data-toolbar="true"
          className="absolute bottom-16 right-3 min-[860px]:bottom-5 min-[860px]:right-5 z-30 w-[calc(100%-24px)] max-w-xs bg-white/95 backdrop-blur-[12px] text-[#0f3d26] rounded-2xl border-2 border-[#facc15] shadow-2xl p-3.5 space-y-2.5 animate-slideUp"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-baseline gap-2">
                <h4 className="text-lg font-extrabold font-display">
                  Lote {selectedLot.num}
                </h4>
                <span className="font-mono-num text-sm font-extrabold text-[#0f3d26]">
                  {selectedLot.area}
                </span>
              </div>
              <p className="text-xs text-[#0f3d26]/75 font-medium">
                {selectedLot.sector} · Residencial El Bosque
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenMobileSheet}
              className="px-2.5 py-1 rounded-lg bg-[#0f3d26] text-[#facc15] hover:bg-[#facc15] hover:text-[#0f3d26] text-[11px] font-extrabold transition-colors cursor-pointer whitespace-nowrap"
            >
              Ver Ficha +
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <LotTags lote={selectedLot} compact />
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                selectedLot.estado === 'vendido'
                  ? 'bg-red-600/15 text-red-700 border-red-600/40'
                  : selectedLot.estado === 'reservado'
                  ? 'bg-amber-400/30 text-amber-900 border-amber-500'
                  : 'bg-[#facc15]/25 text-[#0f3d26] border-[#facc15]'
              }`}
            >
              {selectedLot.estado === 'vendido' ? (
                <>
                  <Lock className="w-3 h-3" />
                  <span>Vendido</span>
                </>
              ) : selectedLot.estado === 'reservado' ? (
                <>
                  <Clock className="w-3 h-3" />
                  <span>Reservado</span>
                </>
              ) : selectedLot.estado === 'area_verde' ? (
                <>
                  <Trees className="w-3 h-3" />
                  <span>Área Verde</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Disponible</span>
                </>
              )}
            </span>
          </div>

          {selectedLot.estado === 'area_verde' ? (
            <div className="py-2 px-3 rounded-xl bg-[#84cc16]/20 border border-[#84cc16] text-xs font-bold text-center">
              Área de Recreación y Parque
            </div>
          ) : selectedLot.estado === 'vendido' ? (
            <button
              type="button"
              disabled
              className="w-full py-2.5 px-3 rounded-xl bg-red-50 text-red-700 border border-red-300 text-xs font-extrabold cursor-not-allowed"
            >
              Lote Vendido
            </button>
          ) : (
            <a
              href={buildWhatsappUrl(asesor, selectedLot)}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl text-xs font-extrabold border-2 transition-colors ${
                selectedLot.estado === 'reservado'
                  ? 'bg-amber-400 hover:bg-amber-300 text-[#0f3d26] border-amber-500'
                  : 'bg-[#0f3d26] hover:bg-[#facc15] text-[#facc15] hover:text-[#0f3d26] border-[#facc15]'
              }`}
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>
                {selectedLot.estado === 'reservado'
                  ? 'Consultar disponibilidad'
                  : `Reservar Lote ${selectedLot.num} por WhatsApp`}
              </span>
            </a>
          )}
        </div>
      )}

      {/* Bottom-left glassmorphic 360 controls */}
      <div
        data-toolbar="true"
        className="absolute bottom-[22px] left-2.5 min-[860px]:bottom-5 min-[860px]:left-5 flex items-end gap-2 z-25 max-w-[calc(100%-20px)]"
      >
        <div className="flex flex-col gap-1 min-[860px]:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => zoomStep(-12)}
            title="Acercar vista 360°"
            aria-label="Acercar vista 360"
            className="w-8 h-8 min-[860px]:w-11 min-[860px]:h-11 rounded-xl border border-[#facc15]/60 bg-[#0f3d26]/80 backdrop-blur-[10px] text-white hover:bg-[#facc15] hover:text-[#0f3d26] transition-all duration-200 flex items-center justify-center shadow-lg cursor-pointer"
          >
            <Plus className="w-4 h-4 min-[860px]:w-5 min-[860px]:h-5" />
          </button>
          <button
            type="button"
            onClick={() => zoomStep(12)}
            title="Alejar vista 360°"
            aria-label="Alejar vista 360"
            className="w-8 h-8 min-[860px]:w-11 min-[860px]:h-11 rounded-xl border border-[#facc15]/60 bg-[#0f3d26]/80 backdrop-blur-[10px] text-white hover:bg-[#facc15] hover:text-[#0f3d26] transition-all duration-200 flex items-center justify-center shadow-lg cursor-pointer"
          >
            <Minus className="w-4 h-4 min-[860px]:w-5 min-[860px]:h-5" />
          </button>
          <button
            type="button"
            onClick={handleToggleRotate}
            title={autoRotate ? 'Pausar giro 360°' : 'Activar giro automático 360°'}
            aria-label={autoRotate ? 'Pausar giro 360' : 'Activar giro automático 360'}
            className={`w-8 h-8 min-[860px]:w-11 min-[860px]:h-11 rounded-xl border backdrop-blur-[10px] transition-all duration-200 flex items-center justify-center shadow-lg cursor-pointer ${
              autoRotate
                ? 'bg-[#facc15] text-[#0f3d26] border-white'
                : 'bg-[#0f3d26]/80 text-[#facc15] border-[#facc15]/60 hover:bg-[#facc15] hover:text-[#0f3d26]'
            }`}
          >
            <RotateCw className={`w-4 h-4 ${autoRotate ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
          </button>
          <button
            type="button"
            onClick={resetCamera}
            title="Centrar vista inicial 360°"
            aria-label="Centrar vista inicial 360"
            className="w-8 h-8 min-[860px]:w-11 min-[860px]:h-11 rounded-xl border border-[#facc15]/50 bg-[#0f3d26]/80 backdrop-blur-[10px] text-white hover:bg-[#facc15] hover:text-[#0f3d26] transition-all duration-200 flex items-center justify-center shadow-lg cursor-pointer"
          >
            <LocateFixed className="w-3.5 h-3.5 min-[860px]:w-4 min-[860px]:h-4" />
          </button>
        </div>

        <div className="flex flex-col items-start gap-1.5">
          {isTourActive && (
            <div className="pointer-events-none bg-[#0f3d26]/88 backdrop-blur-[10px] border border-[#facc15]/80 rounded-2xl p-2 sm:p-3 text-white shadow-2xl w-52 sm:w-68 space-y-1 transition-all duration-300">
              <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px]">
                <span className="inline-flex items-center gap-1.5 font-extrabold text-[#facc15] uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-[#facc15] animate-pulse" />
                  <span>Recorrido</span>
                </span>
                <span className="font-mono-num text-[#facc15] font-bold">
                  {tourIndex >= 0 ? `${tourIndex + 1}/${GUIDED_TOUR_LOT_IDS.length}` : 'En vivo'}
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <strong className="text-sm sm:text-base font-extrabold font-display text-white">
                  Lote {selectedLot.num}
                </strong>
                <span className="font-mono-num text-xs sm:text-sm font-extrabold text-[#facc15]">
                  {selectedLot.area}
                </span>
              </div>

              <p className="text-[10px] sm:text-[11px] text-white/80 font-medium">{selectedLot.sector}</p>
              <LotTags lote={selectedLot} variant="dark" compact />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              data-tour-toggle="true"
              onClick={onToggleTour}
              aria-pressed={isTourActive}
              className={`inline-flex items-center gap-1.5 h-8 min-[860px]:h-11 px-2.5 min-[860px]:px-3.5 rounded-xl border text-[11px] min-[860px]:text-xs font-extrabold shadow-xl transition-all cursor-pointer whitespace-nowrap backdrop-blur-[10px] ${
                isTourActive
                  ? 'bg-[#facc15] text-[#0f3d26] border-white hover:bg-[#facc15]/80'
                  : 'bg-[#0f3d26]/85 text-[#facc15] border-[#facc15]/80 hover:bg-[#facc15] hover:text-[#0f3d26]'
              }`}
            >
              {isTourActive ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current shrink-0" />
                  <span>Detener Tour</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                  <span>Tour Guiado</span>
                </>
              )}
            </button>

            {!isMobileSheetOpen && (
              <button
                type="button"
                onClick={onOpenMobileSheet}
                className="min-[860px]:hidden inline-flex items-center gap-1.5 h-8 px-2.5 rounded-xl border border-[#0f3d26] bg-[#facc15] text-[#0f3d26] text-[11px] font-extrabold shadow-xl cursor-pointer whitespace-nowrap"
              >
                <span>Ver Ficha y Lotes</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
