import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Copy,
  Download,
  Edit3,
  Lock,
  MessageCircle,
  RotateCcw,
  RotateCw,
  Trash2,
  Trees,
  Undo2,
  X,
} from 'lucide-react';
import {
  Asesor,
  buildWhatsappUrl,
  Lote,
  PANORAMA_360_URL,
} from '../data/lotes';
import { POLIGONOS_360_LOTES, SphericalPoint } from '../data/poligonos360';
import { LotTags } from './LotTags';

interface PanoramaModalProps {
  isOpen: boolean;
  lotes: Lote[];
  selectedLot: Lote;
  asesor: Asesor;
  isAdminMode: boolean;
  onSelectLot: (id: string) => void;
  onClose: () => void;
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
  mouseEventToCoords?: (event: MouseEvent) => [number, number];
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

// Exact spherical (pitch, yaw) -> screen (x, y) rectilinear projection matching Pannellum WebGL camera
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
    // Behind the camera plane
    return null;
  }

  const f = width / (2 * Math.tan((hfovDeg * deg2rad) / 2));
  const x = width / 2 + (f * (cosPhi * Math.sin(dLambda))) / cosC;
  const y = height / 2 - (f * (cosPhi0 * sinPhi - sinPhi0 * cosPhi * cosDLambda)) / cosC;

  return { x, y };
}

export function PanoramaModal({
  isOpen,
  lotes,
  selectedLot,
  asesor,
  isAdminMode,
  onSelectLot,
  onClose,
}: PanoramaModalProps) {
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const overlaySvgRef = useRef<SVGSVGElement>(null);
  const viewerInstanceRef = useRef<PannellumViewerInstance | null>(null);

  const [autoRotate, setAutoRotate] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [polygons, setPolygons] = useState<Record<string, SphericalPoint[]>>(() =>
    loadSaved360Polygons()
  );
  const [active360LotId, setActive360LotId] = useState<string | null>(null);
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
  }>({ pitch: -22, yaw: 0, hfov: 105, width: 1280, height: 720 });

  useEffect(() => {
    setEditingLotId(selectedLot.id);
  }, [selectedLot.id]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDrawingMode && draftPoints.length > 0) {
          setDraftPoints([]);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isDrawingMode, draftPoints.length, onClose]);

  useEffect(() => {
    if (!isOpen || !viewerContainerRef.current) return;
    setLoadFailed(false);

    if (!window.pannellum || typeof window.pannellum.viewer !== 'function') {
      setLoadFailed(true);
      return;
    }

    try {
      const instance = window.pannellum.viewer(viewerContainerRef.current, {
        type: 'equirectangular',
        panorama: PANORAMA_360_URL,
        autoLoad: true,
        autoRotate: isAdminMode ? 0 : -1.8,
        compass: true,
        showControls: true,
        showFullscreenCtrl: false,
        showZoomCtrl: true,
        mouseZoom: true,
        hfov: 105,
        minHfov: 45,
        maxHfov: 120,
        pitch: -22,
        yaw: 0,
        crossOrigin: 'anonymous',
        strings: {
          loadingLabel: 'Cargando vista aérea 360°...',
          errorMsg: 'No se pudo cargar la imagen 360° en este momento.',
        },
      });
      viewerInstanceRef.current = instance;
      setAutoRotate(!isAdminMode);
    } catch {
      setLoadFailed(true);
    }

    let rafId = 0;
    const syncCameraLoop = () => {
      const inst = viewerInstanceRef.current;
      const el = viewerContainerRef.current;
      if (inst && el) {
        const pitch = inst.getPitch?.() ?? -22;
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

    return () => {
      window.cancelAnimationFrame(rafId);
      if (viewerInstanceRef.current?.destroy) {
        try {
          viewerInstanceRef.current.destroy();
        } catch {
          // Ignore cleanup errors
        }
      }
      viewerInstanceRef.current = null;
    };
  }, [isOpen, isAdminMode]);

  const persistPolygons = useCallback((next: Record<string, SphericalPoint[]>) => {
    setPolygons(next);
    try {
      localStorage.setItem(STORAGE_360_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage limits
    }
  }, []);

  const handleToggleRotate = () => {
    const inst = viewerInstanceRef.current;
    if (!inst) return;
    if (autoRotate) {
      inst.stopAutoRotate?.();
      setAutoRotate(false);
    } else {
      inst.startAutoRotate?.(-1.8);
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

  // Capture vertex clicks when Admin Drawing Mode is active
  const handleCanvasClickForTrace = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAdminMode || !isDrawingMode || !viewerInstanceRef.current?.mouseEventToCoords) return;
    if ((e.target as HTMLElement).closest('[data-360-ui="true"]')) return;

    const coords = viewerInstanceRef.current.mouseEventToCoords(e.nativeEvent);
    if (!coords || coords.length < 2) return;

    const pt: SphericalPoint = {
      pitch: Number(coords[0].toFixed(2)),
      yaw: Number(coords[1].toFixed(2)),
    };

    const updated = [...draftPoints, pt];
    if (updated.length >= 4) {
      // Auto-save 4-corner lot polygon and advance automatically to the next lot!
      const nextPolys = { ...polygons, [editingLotId]: updated };
      persistPolygons(nextPolys);
      setDraftPoints([]);
      setActive360LotId(editingLotId);
      onSelectLot(editingLotId);

      const idx = lotes.findIndex((l) => l.id === editingLotId);
      if (idx >= 0 && idx < lotes.length - 1) {
        setEditingLotId(lotes[idx + 1].id);
      }
    } else {
      setDraftPoints(updated);
    }
  };

  const handleSaveDraftEarly = () => {
    if (draftPoints.length < 3) return;
    const nextPolys = { ...polygons, [editingLotId]: draftPoints };
    persistPolygons(nextPolys);
    setDraftPoints([]);
    setActive360LotId(editingLotId);
    onSelectLot(editingLotId);
  };

  const handleDeleteLotPolygon = (lotId: string) => {
    const nextPolys = { ...polygons };
    delete nextPolys[lotId];
    persistPolygons(nextPolys);
    if (active360LotId === lotId) setActive360LotId(null);
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
    const snippet = `export const POLIGONOS_360_LOTES: Record<string, SphericalPoint[]> = {
${entries.join('\n')}
};`;
    try {
      await navigator.clipboard.writeText(snippet);
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2200);
    } catch {
      // Fallback textarea
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

  const active360Lot = useMemo(
    () => (active360LotId ? lotes.find((l) => l.id === active360LotId) || null : null),
    [active360LotId, lotes]
  );

  const tracedCount = Object.keys(polygons).length;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#0f3d26] text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Vista Aérea Interactiva 360 grados con Reconocimiento de Lotes"
    >
      {/* Top Bar */}
      <div
        data-360-ui="true"
        className="h-[52px] shrink-0 px-3 sm:px-5 bg-[#0f3d26] border-b-2 border-[#facc15] flex items-center justify-between gap-2 z-30"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 rounded-lg bg-[#facc15]/20 border border-[#facc15]/60 flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4 text-[#facc15]" />
          </span>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-extrabold font-display text-white truncate">
              Vista Aérea 360° · Residencial El Bosque
            </h3>
            <p className="text-[10.5px] text-[#84cc16] truncate">
              {tracedCount > 0
                ? `${tracedCount} lotes interactivos · Toca cualquier lote en la vista 360°`
                : 'Arrastra con el dedo o mouse para explorar en 360°'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isAdminMode && (
            <button
              type="button"
              onClick={handleToggleDrawing}
              className={`inline-flex items-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-lg border text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap ${
                isDrawingMode
                  ? 'bg-[#84cc16] text-[#0f3d26] border-white'
                  : 'bg-white/10 text-[#facc15] border-[#facc15]/80 hover:bg-white/20'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5 shrink-0" />
              <span>{isDrawingMode ? 'Trazando Lotes...' : 'Trazar Lotes 360°'}</span>
            </button>
          )}

          {!loadFailed && (
            <button
              type="button"
              onClick={handleToggleRotate}
              className={`inline-flex items-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-lg border text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                autoRotate
                  ? 'bg-[#84cc16]/25 text-[#facc15] border-[#84cc16]'
                  : 'bg-white/10 text-white/85 border-white/25 hover:bg-white/20'
              }`}
            >
              <RotateCw
                className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`}
                style={{ animationDuration: '6s' }}
              />
              <span className="hidden sm:inline">{autoRotate ? 'Girando' : 'Pausado'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar vista 360"
            className="inline-flex items-center gap-1.5 h-8 sm:h-9 px-3 rounded-lg bg-[#facc15] hover:bg-[#84cc16] text-[#0f3d26] text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap"
          >
            <X className="w-4 h-4 shrink-0" />
            <span>Volver al Plano</span>
          </button>
        </div>
      </div>

      {/* 360 Panorama Canvas + Real-time Interactive Lot Polygons SVG Overlay */}
      <div
        onClick={handleCanvasClickForTrace}
        className={`relative flex-1 w-full h-full bg-[#092617] overflow-hidden ${
          isDrawingMode ? 'cursor-crosshair' : ''
        }`}
      >
        {!loadFailed ? (
          <>
            <div ref={viewerContainerRef} className="w-full h-full" />

            {/* Live Projected SVG Layer for Lot Polygons */}
            <svg
              ref={overlaySvgRef}
              className="absolute inset-0 w-full h-full pointer-events-none z-15"
              viewBox={`0 0 ${Math.max(1, cameraState.width)} ${Math.max(1, cameraState.height)}`}
            >
              {projectedLots.map(({ lote, pointsAttr, centerX, centerY }) => {
                const isSelected = active360LotId === lote.id;
                let fill = 'rgba(132, 204, 22, 0.28)';
                let stroke = '#84cc16';

                if (lote.estado === 'vendido') {
                  fill = 'rgba(220, 38, 38, 0.45)';
                  stroke = '#ef4444';
                } else if (lote.estado === 'reservado') {
                  fill = 'rgba(250, 204, 21, 0.38)';
                  stroke = '#facc15';
                } else if (lote.estado === 'area_verde') {
                  fill = 'rgba(34, 197, 94, 0.25)';
                  stroke = '#4ade80';
                }

                if (isSelected) {
                  fill =
                    lote.estado === 'vendido'
                      ? 'rgba(220, 38, 38, 0.65)'
                      : 'rgba(250, 204, 21, 0.55)';
                  stroke = '#ffffff';
                }

                return (
                  <g
                    key={lote.id}
                    className={isDrawingMode ? 'pointer-events-none' : 'pointer-events-auto cursor-pointer'}
                    onClick={(e) => {
                      e.stopPropagation();
                      viewerInstanceRef.current?.stopAutoRotate?.();
                      setAutoRotate(false);
                      setActive360LotId(lote.id);
                      onSelectLot(lote.id);
                    }}
                  >
                    <polygon
                      points={pointsAttr}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={isSelected ? 3 : 2}
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

              {/* Draft Polygon while Admin is tracing 4 corners */}
              {isDrawingMode && projectedDraft.length > 0 && (
                <g>
                  <polyline
                    points={projectedDraft.map((p) => `${p.x},${p.y}`).join(' ')}
                    fill="rgba(250, 204, 21, 0.25)"
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

            {/* Legend Pill (bottom-left) */}
            <div
              data-360-ui="true"
              className="absolute bottom-3 left-3 z-25 flex flex-wrap items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#0f3d26]/85 backdrop-blur-[10px] border border-[#facc15]/50 text-[11px] font-bold shadow-lg"
            >
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#84cc16] inline-block" />
                <span>Disponible</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#facc15] inline-block" />
                <span>Reservado</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-600 inline-block" />
                <span>Vendido</span>
              </span>
            </div>

            {/* Admin Polygon Tracer Toolbar (?admin=1) */}
            {isAdminMode && isDrawingMode && (
              <div
                data-360-ui="true"
                className="absolute top-3 left-1/2 -translate-x-1/2 z-30 w-[94%] max-w-2xl bg-[#0f3d26]/95 backdrop-blur-[12px] border border-[#facc15] rounded-2xl p-3 shadow-2xl space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-[#facc15]">
                      Trazando Lote:
                    </span>
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
                    <span className="text-[11px] text-[#84cc16] font-bold">
                      Esquina {draftPoints.length}/4
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
                        onClick={handleSaveDraftEarly}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#84cc16] text-[#0f3d26] text-[11px] font-extrabold cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Cerrar ({draftPoints.length} pts)</span>
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
                    Haz clic en las 4 esquinas del Lote {editingLotId} sobre la foto 360°.
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

            {/* Selected Lot Commercial Card inside 360° Viewer */}
            {active360Lot && !isDrawingMode && (
              <div
                data-360-ui="true"
                className="absolute bottom-14 sm:bottom-5 right-3 sm:right-5 z-30 w-[calc(100%-24px)] max-w-xs bg-white text-[#0f3d26] rounded-2xl border-2 border-[#facc15] shadow-2xl p-3.5 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <h4 className="text-lg font-extrabold font-display">
                        Lote {active360Lot.num}
                      </h4>
                      <span className="font-mono-num text-sm font-extrabold text-[#0f3d26]">
                        {active360Lot.area}
                      </span>
                    </div>
                    <p className="text-xs text-[#0f3d26]/75 font-medium">
                      {active360Lot.sector} · Residencial El Bosque
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActive360LotId(null)}
                    aria-label="Cerrar ficha del lote"
                    className="w-7 h-7 rounded-lg bg-[#0f3d26]/10 hover:bg-[#0f3d26]/20 flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <LotTags lote={active360Lot} compact />
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                      active360Lot.estado === 'vendido'
                        ? 'bg-red-600/15 text-red-700 border-red-600/40'
                        : active360Lot.estado === 'reservado'
                        ? 'bg-amber-400/30 text-amber-900 border-amber-500'
                        : 'bg-[#84cc16]/25 text-[#0f3d26] border-[#84cc16]'
                    }`}
                  >
                    {active360Lot.estado === 'vendido' ? (
                      <>
                        <Lock className="w-3 h-3" />
                        <span>Vendido</span>
                      </>
                    ) : active360Lot.estado === 'reservado' ? (
                      <>
                        <Clock className="w-3 h-3" />
                        <span>Reservado</span>
                      </>
                    ) : active360Lot.estado === 'area_verde' ? (
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

                {active360Lot.estado === 'area_verde' ? (
                  <div className="py-2 px-3 rounded-xl bg-[#84cc16]/20 border border-[#84cc16] text-xs font-bold text-center">
                    Área de Recreación y Parque
                  </div>
                ) : active360Lot.estado === 'vendido' ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-2.5 px-3 rounded-xl bg-red-50 text-red-700 border border-red-300 text-xs font-extrabold cursor-not-allowed"
                  >
                    Lote Vendido
                  </button>
                ) : (
                  <a
                    href={buildWhatsappUrl(asesor, active360Lot)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl text-xs font-extrabold border-2 transition-colors ${
                      active360Lot.estado === 'reservado'
                        ? 'bg-amber-400 hover:bg-amber-300 text-[#0f3d26] border-amber-500'
                        : 'bg-[#0f3d26] hover:bg-[#84cc16] text-[#facc15] hover:text-[#0f3d26] border-[#84cc16]'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4 shrink-0" />
                    <span>
                      {active360Lot.estado === 'reservado'
                        ? 'Consultar disponibilidad'
                        : `Reservar Lote ${active360Lot.num} por WhatsApp`}
                    </span>
                  </a>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 gap-3 text-center">
            <img
              src={PANORAMA_360_URL}
              alt="Panorámica aérea Residencial El Bosque Etapa 3"
              className="max-h-[70dvh] w-auto rounded-xl border border-[#facc15]/50 shadow-xl object-contain"
            />
            <p className="text-xs text-white/80">
              Vista panorámica aérea de Residencial El Bosque - Etapa 3
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
