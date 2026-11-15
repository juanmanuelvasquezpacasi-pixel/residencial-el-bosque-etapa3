import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Crosshair,
  Download,
  LocateFixed,
  MapPin,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
} from 'lucide-react';
import {
  AERIAL_HIT_RADIUS_PX,
  AERIAL_MAP_URL,
  GUIDED_TOUR_LOT_IDS,
  Lote,
  LotSector,
  SECTOR_FILTERS,
} from '../data/lotes';
import { LotTags } from './LotTags';

interface AerialViewportProps {
  lotes: Lote[];
  selectedLot: Lote;
  sectorFilter: 'todos' | LotSector;
  focusRequest: { seq: number; zoom: boolean };
  sectorFocusRequest: { seq: number; sector: 'todos' | LotSector };
  isTourActive: boolean;
  isCalibrating: boolean;
  onSelectLot: (id: string) => void;
  onSelectSector: (sector: 'todos' | LotSector) => void;
  onToggleTour: () => void;
  onAerialDimensions: (naturalWidth: number, naturalHeight: number) => void;
  onCalibrateLot: (id: string, ax: number, ay: number) => void;
  onExportJson: () => void;
  onResetCalibration: () => void;
  hasCustomCalibration: boolean;
}

const MAX_SCALE = 1.2;

export function AerialViewport({
  lotes,
  selectedLot,
  sectorFilter,
  focusRequest,
  sectorFocusRequest,
  isTourActive,
  isCalibrating,
  onSelectLot,
  onSelectSector,
  onToggleTour,
  onAerialDimensions,
  onCalibrateLot,
  onExportJson,
  onResetCalibration,
  hasCustomCalibration,
}: AerialViewportProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [imgError, setImgError] = useState(false);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [minScale, setMinScale] = useState(0.3);
  const [smooth, setSmooth] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const transformRef = useRef(transform);
  transformRef.current = transform;
  const minScaleRef = useRef(minScale);
  minScaleRef.current = minScale;
  const lotesRef = useRef(lotes);
  lotesRef.current = lotes;

  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: false,
  });

  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(1);

  const clampTransform = useCallback(
    (x: number, y: number, scale: number, vw: number, vh: number, nw: number, nh: number) => {
      const scaledW = nw * scale;
      const scaledH = nh * scale;
      const clampedX =
        scaledW >= vw ? Math.min(0, Math.max(vw - scaledW, x)) : (vw - scaledW) / 2;
      const clampedY =
        scaledH >= vh ? Math.min(0, Math.max(vh - scaledH, y)) : (vh - scaledH) / 2;
      return { x: clampedX, y: clampedY };
    },
    []
  );

  const fitImage = useCallback(() => {
    const vp = viewportRef.current;
    const img = imgRef.current;
    if (!vp || !img || !img.naturalWidth || !img.naturalHeight) return;

    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;

    const isMobile = vw < 860 || window.innerWidth < 860;
    const containScale = Math.min(MAX_SCALE, Math.min(vw / nw, vh / nh));
    const coverScale = Math.min(MAX_SCALE, Math.max(vw / nw, vh / nh));
    const nextMin = isMobile ? coverScale : containScale;

    let rawX = (vw - nw * nextMin) / 2;
    let rawY = (vh - nh * nextMin) / 2;

    if (isMobile && lotesRef.current.length > 0) {
      let sumAx = 0;
      let sumAy = 0;
      for (const l of lotesRef.current) {
        sumAx += l.ax;
        sumAy += l.ay;
      }
      const avgPxX = (sumAx / lotesRef.current.length / 100) * nw;
      const avgPxY = (sumAy / lotesRef.current.length / 100) * nh;
      rawX = vw / 2 - avgPxX * nextMin;
      rawY = vh * 0.5 - avgPxY * nextMin;
    }

    const { x, y } = clampTransform(rawX, rawY, nextMin, vw, vh, nw, nh);

    setMinScale(nextMin);
    setSmooth(true);
    setTransform({ x, y, scale: nextMin });
  }, [clampTransform]);

  const focusOnLot = useCallback(
    (lot: Lote, allowZoom = false) => {
      const vp = viewportRef.current;
      if (!vp || !imgSize) return;

      const cur = transformRef.current;
      const targetScale = allowZoom
        ? Math.min(1.0, Math.max(minScaleRef.current * 1.35, cur.scale))
        : Math.min(1.0, cur.scale);

      const clampedScale = Math.min(MAX_SCALE, targetScale);
      const targetX = (lot.ax / 100) * imgSize.w;
      const targetY = (lot.ay / 100) * imgSize.h;

      const screenX = cur.x + targetX * cur.scale;
      const screenY = cur.y + targetY * cur.scale;
      const margin = 44;
      const isVisible =
        screenX >= margin &&
        screenX <= vp.clientWidth - margin &&
        screenY >= margin &&
        screenY <= vp.clientHeight - margin;

      if (!allowZoom && isVisible) {
        return;
      }

      const rawX = vp.clientWidth / 2 - targetX * clampedScale;
      const rawY = vp.clientHeight / 2 - targetY * clampedScale;
      const { x, y } = clampTransform(
        rawX,
        rawY,
        clampedScale,
        vp.clientWidth,
        vp.clientHeight,
        imgSize.w,
        imgSize.h
      );

      setSmooth(true);
      setTransform({ x, y, scale: clampedScale });
    },
    [imgSize, clampTransform]
  );

  const focusOnSector = useCallback(
    (sector: 'todos' | LotSector) => {
      const vp = viewportRef.current;
      if (!vp || !imgSize) return;

      if (sector === 'todos') {
        fitImage();
        return;
      }

      const sectorLots = lotesRef.current.filter((l) => l.sector === sector);
      if (sectorLots.length === 0) return;

      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      for (const l of sectorLots) {
        const px = (l.ax / 100) * imgSize.w;
        const py = (l.ay / 100) * imgSize.h;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }

      const padX = sectorLots.length === 1 ? 240 : 120;
      const padY = sectorLots.length === 1 ? 180 : 110;
      const boxW = Math.max(300, maxX - minX + padX * 2);
      const boxH = Math.max(220, maxY - minY + padY * 2);

      const scale = Math.min(
        MAX_SCALE,
        Math.max(minScaleRef.current, Math.min(vp.clientWidth / boxW, vp.clientHeight / boxH))
      );

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const rawX = vp.clientWidth / 2 - centerX * scale;
      const rawY = vp.clientHeight * 0.5 - centerY * scale;
      const { x, y } = clampTransform(
        rawX,
        rawY,
        scale,
        vp.clientWidth,
        vp.clientHeight,
        imgSize.w,
        imgSize.h
      );

      setSmooth(true);
      setTransform({ x, y, scale });
    },
    [imgSize, fitImage, clampTransform]
  );

  useEffect(() => {
    if (!imgSize || !focusRequest.zoom) return;
    focusOnLot(selectedLot, true);
  }, [selectedLot, focusRequest, imgSize, focusOnLot]);

  useEffect(() => {
    if (!imgSize || sectorFocusRequest.seq === 0) return;
    focusOnSector(sectorFocusRequest.sector);
  }, [sectorFocusRequest, imgSize, focusOnSector]);

  useEffect(() => {
    const vp = viewportRef.current;
    const handleResize = () => {
      fitImage();
    };
    window.addEventListener('resize', handleResize);

    let ro: ResizeObserver | null = null;
    if (vp && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        fitImage();
      });
      ro.observe(vp);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      ro?.disconnect();
    };
  }, [fitImage]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = vp.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const delta = e.deltaY < 0 ? 1.12 : 0.88;
      const cur = transformRef.current;
      const nextScale = Math.min(MAX_SCALE, Math.max(minScaleRef.current, cur.scale * delta));
      const ratio = nextScale / cur.scale;

      const rawX = mx - (mx - cur.x) * ratio;
      const rawY = my - (my - cur.y) * ratio;
      const img = imgRef.current;

      setSmooth(false);
      if (img && img.naturalWidth && img.naturalHeight) {
        const clamped = clampTransform(
          rawX,
          rawY,
          nextScale,
          vp.clientWidth,
          vp.clientHeight,
          img.naturalWidth,
          img.naturalHeight
        );
        setTransform({ x: clamped.x, y: clamped.y, scale: nextScale });
      } else {
        setTransform({ x: rawX, y: rawY, scale: nextScale });
      }
    };

    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }, [clampTransform]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-toolbar="true"]')) return;

    if (isCalibrating && containerRef.current && imgSize) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const rawAx = ((e.clientX - rect.left) / rect.width) * 100;
        const rawAy = ((e.clientY - rect.top) / rect.height) * 100;
        const ax = Number(Math.min(100, Math.max(0, rawAx)).toFixed(1));
        const ay = Number(Math.min(100, Math.max(0, rawAy)).toFixed(1));
        onCalibrateLot(selectedLot.id, ax, ay);
      }
      return;
    }

    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 1) {
      dragRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        originX: transformRef.current.x,
        originY: transformRef.current.y,
        moved: false,
      };
      setIsDragging(true);
      setSmooth(false);
    } else if (pointersRef.current.size === 2) {
      dragRef.current.active = false;
      const pts = Array.from(pointersRef.current.values());
      pinchStartDistRef.current = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      pinchStartScaleRef.current = transformRef.current.scale;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (pointersRef.current.size === 2 && pinchStartDistRef.current && viewportRef.current) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const rect = viewportRef.current.getBoundingClientRect();
      const midX = (pts[0].x + pts[1].x) / 2 - rect.left;
      const midY = (pts[0].y + pts[1].y) / 2 - rect.top;
      const cur = transformRef.current;
      const nextScale = Math.min(
        MAX_SCALE,
        Math.max(minScaleRef.current, pinchStartScaleRef.current * (dist / pinchStartDistRef.current))
      );
      const ratio = nextScale / cur.scale;
      const rawX = midX - (midX - cur.x) * ratio;
      const rawY = midY - (midY - cur.y) * ratio;
      const img = imgRef.current;
      const vp = viewportRef.current;

      setSmooth(false);
      if (img && img.naturalWidth && img.naturalHeight) {
        const clamped = clampTransform(
          rawX,
          rawY,
          nextScale,
          vp.clientWidth,
          vp.clientHeight,
          img.naturalWidth,
          img.naturalHeight
        );
        setTransform({ x: clamped.x, y: clamped.y, scale: nextScale });
      } else {
        setTransform({ x: rawX, y: rawY, scale: nextScale });
      }
      return;
    }

    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.hypot(dx, dy) > 5) {
      dragRef.current.moved = true;
    }
    const vp = viewportRef.current;
    const img = imgRef.current;
    const rawX = dragRef.current.originX + dx;
    const rawY = dragRef.current.originY + dy;

    if (vp && img && img.naturalWidth && img.naturalHeight) {
      const clamped = clampTransform(
        rawX,
        rawY,
        transformRef.current.scale,
        vp.clientWidth,
        vp.clientHeight,
        img.naturalWidth,
        img.naturalHeight
      );
      setTransform((prev) => ({ ...prev, x: clamped.x, y: clamped.y }));
    } else {
      setTransform((prev) => ({ ...prev, x: rawX, y: rawY }));
    }
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) {
      pinchStartDistRef.current = null;
    }
    if (pointersRef.current.size === 0) {
      dragRef.current.active = false;
      setIsDragging(false);
    }
  };

  const zoomStep = (factor: number) => {
    const vp = viewportRef.current;
    const img = imgRef.current;
    if (!vp) return;
    const cx = vp.clientWidth / 2;
    const cy = vp.clientHeight / 2;
    const cur = transformRef.current;
    const nextScale = Math.min(MAX_SCALE, Math.max(minScaleRef.current, cur.scale * factor));
    const ratio = nextScale / cur.scale;

    const rawX = cx - (cx - cur.x) * ratio;
    const rawY = cy - (cy - cur.y) * ratio;

    setSmooth(true);
    if (img && img.naturalWidth && img.naturalHeight) {
      const clamped = clampTransform(
        rawX,
        rawY,
        nextScale,
        vp.clientWidth,
        vp.clientHeight,
        img.naturalWidth,
        img.naturalHeight
      );
      setTransform({ x: clamped.x, y: clamped.y, scale: nextScale });
    } else {
      setTransform({ x: rawX, y: rawY, scale: nextScale });
    }
  };

  const handleImageLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    setImgError(false);
    setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    onAerialDimensions(img.naturalWidth, img.naturalHeight);
    fitImage();
  };

  const handleCopyJson = async () => {
    try {
      const payload = JSON.stringify(
        lotes.map(({ id, num, sector, area, ax, ay, px, py }) => ({
          id,
          num,
          sector,
          area,
          px,
          py,
          ax,
          ay,
        })),
        null,
        2
      );
      await navigator.clipboard.writeText(payload);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 1800);
    } catch {
      // Clipboard unavailable
    }
  };

  const tourIndex = GUIDED_TOUR_LOT_IDS.indexOf(selectedLot.id);
  const cursorClass = isCalibrating
    ? 'cursor-crosshair'
    : isDragging
    ? 'cursor-grabbing'
    : 'cursor-grab';

  return (
    <div
      ref={viewportRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUpOrCancel}
      onPointerCancel={handlePointerUpOrCancel}
      className={`relative w-full h-[calc(46%+14px)] min-[860px]:h-full min-[860px]:flex-1 shrink-0 overflow-hidden bg-[#0f3d26] select-none touch-none ${cursorClass}`}
      aria-label="Vista aérea interactiva 2D de Residencial El Bosque Etapa 3"
    >
      {!imgSize && !imgError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white pointer-events-none z-10 bg-[#0f3d26]">
          <div className="w-10 h-10 rounded-full border-2 border-[#84cc16]/30 border-t-[#facc15] animate-spin" />
          <p className="text-sm font-medium tracking-wide">Cargando fotografía aérea...</p>
        </div>
      )}

      {imgError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center bg-[#0f3d26] text-white z-10">
          <MapPin className="w-10 h-10 text-[#facc15]" />
          <div className="max-w-md space-y-1">
            <h2 className="text-lg font-bold">Vista aérea temporalmente no disponible</h2>
            <p className="text-sm text-white/80">
              Puedes continuar explorando las medidas y disponibilidad de los 46 lotes en el plano lateral.
            </p>
          </div>
        </div>
      )}

      {/* Compact Mobile Top Zone Pills (minimal top margin, keeps lots & pin unobstructed) */}
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

      {/* Admin-only Calibration Quick-Action Bar */}
      {isCalibrating && (
        <div
          data-toolbar="true"
          className="absolute top-12 min-[860px]:top-3 left-1/2 -translate-x-1/2 z-30 flex flex-wrap items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-[#0f3d26]/85 backdrop-blur-[10px] border border-[#facc15]/70 text-white text-xs shadow-xl max-w-[94%]"
        >
          <span className="inline-flex items-center gap-1.5 font-bold text-[#facc15] whitespace-nowrap">
            <Crosshair className="w-4 h-4 shrink-0" />
            <span>Clic en la foto para ubicar Lote {selectedLot.num}</span>
          </span>
          <span className="hidden sm:inline text-white/40" aria-hidden="true">
            |
          </span>
          <button
            type="button"
            onClick={onExportJson}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#facc15] hover:bg-[#84cc16] text-[#0f3d26] font-extrabold transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar JSON</span>
          </button>
          <button
            type="button"
            onClick={handleCopyJson}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/15 hover:bg-white/25 text-white font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            {copiedJson ? <Check className="w-3.5 h-3.5 text-[#84cc16]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedJson ? 'Copiado' : 'Copiar JSON'}</span>
          </button>
          {hasCustomCalibration && (
            <button
              type="button"
              onClick={onResetCalibration}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-[#facc15] font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>Restaurar</span>
            </button>
          )}
        </div>
      )}

      {/* 2D Aerial Map Container */}
      <div
        ref={containerRef}
        style={{
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
          transformOrigin: '0 0',
          transition: smooth ? 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
          willChange: 'transform',
        }}
        className="absolute top-0 left-0"
      >
        <img
          ref={imgRef}
          src={AERIAL_MAP_URL}
          alt="Vista aérea 2D lotes Residencial El Bosque Etapa 3"
          referrerPolicy="no-referrer"
          draggable={false}
          onLoad={handleImageLoad}
          onError={() => setImgError(true)}
          style={{ imageRendering: 'high-quality' as React.CSSProperties['imageRendering'] }}
          className="block max-w-none pointer-events-none"
        />

        {/* Transparent 25px-radius click zones directly over each of the 46 red circles (zero extra dots) */}
        {imgSize &&
          !isCalibrating &&
          lotes.map((lote) => {
            const isSelected = lote.id === selectedLot.id;
            const hitDiameterPx = Math.max(AERIAL_HIT_RADIUS_PX * 2, 24 / transform.scale);
            return (
              <button
                key={lote.id}
                type="button"
                aria-label={`Lote ${lote.num} - ${lote.area}`}
                title={`Lote ${lote.num} · ${lote.area}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (dragRef.current.moved) return;
                  onSelectLot(lote.id);
                }}
                style={{
                  left: `${lote.ax}%`,
                  top: `${lote.ay}%`,
                  width: `${hitDiameterPx}px`,
                  height: `${hitDiameterPx}px`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`absolute rounded-full bg-transparent border-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#facc15] ${
                  isSelected ? 'pointer-events-none' : ''
                }`}
              />
            );
          })}

        {/* Clean hollow highlight ring around the selected red circle (never covers the red number) */}
        {imgSize && (
          <div
            style={{
              left: `${selectedLot.ax}%`,
              top: `${selectedLot.ay}%`,
              transform: `translate(-50%, -50%) scale(${1 / transform.scale})`,
            }}
            className="absolute pointer-events-none flex items-center justify-center z-20 transition-[left,top] duration-300 ease-out"
          >
            <span className="font-mono-num whitespace-nowrap absolute bottom-full mb-1.5 bg-[#0f3d26]/90 backdrop-blur-[10px] text-[#facc15] font-bold text-xs px-2.5 py-1 rounded-full border border-[#facc15]/80 shadow-xl">
              Lote {selectedLot.num} · {selectedLot.area}
            </span>
            <span className="w-9 h-9 rounded-full bg-transparent border-[3px] border-[#facc15] shadow-[0_0_0_2px_#0f3d26,0_0_12px_rgba(250,204,21,0.75)] transition-transform duration-200" />
          </div>
        )}
      </div>

      {/* Bottom-left glassmorphic zoom controls + Tour Guiado button directly above white bottom sheet edge */}
      <div
        data-toolbar="true"
        className="absolute bottom-[22px] left-2.5 min-[860px]:bottom-5 min-[860px]:left-5 flex items-end gap-2 z-25 max-w-[calc(100%-20px)]"
      >
        <div className="flex flex-col gap-1 min-[860px]:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => zoomStep(1.15)}
            title="Acercar vista (máx. 1.2x)"
            aria-label="Acercar vista"
            className="w-8 h-8 min-[860px]:w-11 min-[860px]:h-11 rounded-xl border border-[#facc15]/60 bg-[#0f3d26]/80 backdrop-blur-[10px] text-white hover:bg-[#84cc16] hover:text-[#0f3d26] hover:border-[#0f3d26] transition-all duration-200 flex items-center justify-center shadow-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#facc15]"
          >
            <Plus className="w-4 h-4 min-[860px]:w-5 min-[860px]:h-5" />
          </button>
          <button
            type="button"
            onClick={() => zoomStep(0.85)}
            title="Alejar vista"
            aria-label="Alejar vista"
            className="w-8 h-8 min-[860px]:w-11 min-[860px]:h-11 rounded-xl border border-[#facc15]/60 bg-[#0f3d26]/80 backdrop-blur-[10px] text-white hover:bg-[#84cc16] hover:text-[#0f3d26] hover:border-[#0f3d26] transition-all duration-200 flex items-center justify-center shadow-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#facc15]"
          >
            <Minus className="w-4 h-4 min-[860px]:w-5 min-[860px]:h-5" />
          </button>
          <button
            type="button"
            onClick={() => focusOnLot(selectedLot, true)}
            title={`Centrar Lote ${selectedLot.num}`}
            aria-label={`Centrar Lote ${selectedLot.num}`}
            className="w-8 h-8 min-[860px]:w-11 min-[860px]:h-11 rounded-xl border border-[#facc15]/60 bg-[#0f3d26]/80 backdrop-blur-[10px] text-[#facc15] hover:bg-[#84cc16] hover:text-[#0f3d26] hover:border-[#0f3d26] transition-all duration-200 flex items-center justify-center shadow-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#facc15]"
          >
            <LocateFixed className="w-4 h-4 min-[860px]:w-5 min-[860px]:h-5" />
          </button>
          <button
            type="button"
            onClick={fitImage}
            title="Encajar imagen completa"
            aria-label="Encajar imagen completa"
            className="w-8 h-8 min-[860px]:w-11 min-[860px]:h-11 rounded-xl border border-[#facc15]/50 bg-[#0f3d26]/80 backdrop-blur-[10px] text-white hover:bg-[#84cc16] hover:text-[#0f3d26] hover:border-[#0f3d26] transition-all duration-200 flex items-center justify-center shadow-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#facc15]"
          >
            <RotateCcw className="w-3.5 h-3.5 min-[860px]:w-4 min-[860px]:h-4" />
          </button>
        </div>

        <div className="flex flex-col items-start gap-1.5">
          {isTourActive && (
            <div className="pointer-events-none bg-[#0f3d26]/88 backdrop-blur-[10px] border border-[#facc15]/80 rounded-2xl p-2 sm:p-3 text-white shadow-2xl w-52 sm:w-68 space-y-1 transition-all duration-300">
              <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px]">
                <span className="inline-flex items-center gap-1.5 font-extrabold text-[#84cc16] uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-[#84cc16] animate-pulse" />
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
              <p className="text-[9.5px] sm:text-[10px] text-white/65">
                Toca la pantalla para detener
              </p>
            </div>
          )}

          <button
            type="button"
            data-tour-toggle="true"
            onClick={onToggleTour}
            aria-pressed={isTourActive}
            className={`inline-flex items-center gap-1.5 h-8 min-[860px]:h-11 px-2.5 min-[860px]:px-3.5 rounded-xl border text-[11px] min-[860px]:text-xs font-extrabold shadow-xl transition-all cursor-pointer whitespace-nowrap backdrop-blur-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
              isTourActive
                ? 'bg-[#facc15] text-[#0f3d26] border-white hover:bg-[#84cc16]'
                : 'bg-[#0f3d26]/85 text-[#facc15] border-[#facc15]/80 hover:bg-[#84cc16] hover:text-[#0f3d26] hover:border-[#0f3d26]'
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
        </div>
      </div>
    </div>
  );
}
