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
    const curHfov = inst.getHfov?.() ?? 105;
    if (curHfov > 75) {
      inst.setHfov?.(72, 600);
    }
  }, [selectedLot.id, focusRequest, polygons]);

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

  const handleDeleteLotPolygon = (lotId: string) => {
    const nextPolys = { ...polygons };
    delete nextPolys[lotId];
    persistPolygons(nextPolys);
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

  const zoomStep = (deltaHfov: number) => {
    const inst = viewerInstanceRef.current;
    if (!inst) return;
    const cur = inst.getHfov?.() ?? 105;
    const next = Math.min(120, Math.max(42, cur + deltaHfov));
    inst.setHfov?.(next, 250);
  };

  const resetCamera = () => {
    const inst = viewerInstanceRef.current;
    if (!inst) return;
    inst.setPitch?.(-24, 450);
    inst.setYaw?.(0, 450);
    inst.setHfov?.(105, 450);
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
      ref={viewportRef}
      onClick={handleCanvasClickForTrace}
      className={`relative w-full h-[100dvh] flex-1 shrink-0 overflow-hidden bg-[#0f3d26] select-none ${
        isDrawingMode ? 'cursor-crosshair' : 'cursor-grab'
      }`}
    >
      {!isLoaded && !loadFailed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white pointer-events-none z-20 bg-[#0f3d26]">
          <div className="w-10 h-10 rounded-full border-2 border-[#facc15]/30 border-t-[#facc15] animate-spin" />
          <p className="text-sm font-extrabold tracking-wide text-[#facc15]">
            Cargando experiencia 360°...
          </p>
        </div>
      )}

      <div ref={viewerContainerRef} className="absolute inset-0 w-full h-full" />

      {!loadFailed && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-15"
          viewBox={`0 0 ${Math.max(1, cameraState.width)} ${Math.max(1, cameraState.height)}`}
        >
          {projectedLots.map(({ lote, pointsAttr, centerX, centerY }) => {
            const isSelected = selectedLot.id === lote.id;
            const isDimmed = sectorFilter !== 'todos' && lote.sector !== sectorFilter;

            let fill = 'rgba(250, 204, 21, 0.35)';
            let stroke = '#facc15';

            if (lote.estado === 'vendido') {
              fill = 'rgba(220, 38, 38, 0.48)';
              stroke = '#ef4444';
            } else if (lote.estado === 'reservado') {
              fill = 'rgba(234, 179, 8, 0.50)';
              stroke = '#eab308';
            } else if (lote.estado === 'area_verde') {
              fill = 'rgba(34, 197, 94, 0.30)';
              stroke = '#4ade80';
            }

            if (isSelected) {
              fill = 'rgba(250, 204, 21, 0.75)';
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
                  strokeLinejoin="miter"
                  strokeMiterlimit={4}
                />
                <g transform={`translate(${centerX}, ${centerY})`}>
                  <rect
                    x={-14}
                    y={-10}
                    width={28}
                    height={20}
                    rx={5}
                    fill="#0f3d26"
                    stroke="#facc15"
                    strokeWidth={1.5}
                  />
                  <text
                    x={0}
                    y={4}
                    textAnchor="middle"
                    fill="#facc15"
                    fontSize="10"
                    fontWeight="800"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {lote.num}
                  </text>
                </g>
              </g>
            );
          })}

          {isDrawingMode && projectedDraft.length > 0 && (
            <g>
              <polyline
                points={projectedDraft.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="rgba(250, 204, 21, 0.3)"
                stroke="#facc15"
                strokeWidth={2.5}
                strokeDasharray="4,4"
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

      {isAdminMode && (
        <div
          data-toolbar="true"
          className="absolute top-3 left-1/2 -translate-x-1/2 z-30 w-[94%] max-w-2xl flex flex-col items-center gap-2"
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
                  <span className="text-xs font-extrabold text-[#facc15]">Lote actual:</span>
                  <select
                    aria-label="Seleccionar lote a trazar"
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
                    Puntos: {draftPoints.length}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
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
                      onClick={handleSaveDraft}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#facc15] text-[#0f3d26] text-[11px] font-extrabold cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Cerrar Polígono y Siguiente</span>
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
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/15 text-[11px]">
                <span className="text-white/80">
                  Haz clic punto por punto pegado al lote vecino (ideal para formas irregulares).
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
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div
        data-toolbar="true"
        className="absolute bottom-5 left-5 flex items-end gap-2 z-25"
      >
        <div className="flex flex-col gap-2 shrink-0">
          <button
            type="button"
            onClick={() => zoomStep(-12)}
            title="Acercar vista"
            className="w-11 h-11 rounded-xl border border-[#facc15]/60 bg-[#0f3d26]/80 backdrop-blur-[10px] text-white hover:bg-[#facc15] hover:text-[#0f3d26] transition-all flex items-center justify-center shadow-lg cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => zoomStep(12)}
            title="Alejar vista"
            className="w-11 h-11 rounded-xl border border-[#facc15]/60 bg-[#0f3d26]/80 backdrop-blur-[10px] text-white hover:bg-[#facc15] hover:text-[#0f3d26] transition-all flex items-center justify-center shadow-lg cursor-pointer"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={resetCamera}
            title="Centrar vista inicial"
            className="w-11 h-11 rounded-xl border border-[#facc15]/50 bg-[#0f3d26]/80 backdrop-blur-[10px] text-white hover:bg-[#facc15] hover:text-[#0f3d26] transition-all flex items-center justify-center shadow-lg cursor-pointer"
          >
            <LocateFixed className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
