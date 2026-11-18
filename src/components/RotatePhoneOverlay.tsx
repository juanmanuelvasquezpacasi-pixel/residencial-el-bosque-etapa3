import React, { useEffect, useState } from 'react';
import { Smartphone } from 'lucide-react';

interface RotatePhoneOverlayProps {
  enabled: boolean;
}

export function RotatePhoneOverlay({ enabled }: RotatePhoneOverlayProps) {
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    setIsIos(/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

    const checkOrientation = () => {
      const w = window.visualViewport?.width ?? window.innerWidth;
      const h = window.visualViewport?.height ?? window.innerHeight;
      const isSmallDevice = Math.min(w, h) < 650;
      const isPortrait = h > w;
      setIsPortraitMobile(isSmallDevice && isPortrait);
      if (!isPortrait) {
        setDismissed(false);
      }
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    window.visualViewport?.addEventListener('resize', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      window.visualViewport?.removeEventListener('resize', checkOrientation);
    };
  }, []);

  if (!enabled || !isPortraitMobile || dismissed) return null;

  return (
    <div
      className="fixed inset-0 z-45 flex items-center justify-center bg-[#0f3d26]/92 backdrop-blur-[12px] p-6 text-center text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Girar pantalla en horizontal"
    >
      <div className="max-w-xs w-full rounded-2xl border border-[#facc15]/70 bg-[#0f3d26]/90 p-6 shadow-2xl flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-white/10 border border-[#facc15]/60 flex items-center justify-center">
          <Smartphone className="w-9 h-9 text-[#facc15] animate-pulse -rotate-90 transition-transform duration-700" />
        </div>
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#84cc16]">
            Vista Panorámica
          </p>
          <h3 className="text-lg font-extrabold font-display text-white">
            Gira tu celular en horizontal
          </h3>
          <p className="text-xs text-white/85 leading-relaxed">
            {isIos
              ? 'Desactiva el bloqueo de rotación en tu iPhone y gíralo en horizontal para ver el mapa 360° y el plano lateral en pantalla completa.'
              : 'Para explorar toda la vista aérea de Residencial El Bosque en pantalla completa, coloca tu teléfono de forma horizontal.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-xs font-bold text-white/90 cursor-pointer transition-colors"
        >
          Continuar en vertical
        </button>
      </div>
    </div>
  );
}
