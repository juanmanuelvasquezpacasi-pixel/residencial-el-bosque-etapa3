import React, { useState } from 'react';
import { Compass, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { TAUREN_LOGO_URL } from '../data/lotes';

interface WelcomeModalProps {
  isOpen: boolean;
  onEnterWithAudio: () => void;
  onEnterWithoutAudio: () => void;
}

export function WelcomeModal({
  isOpen,
  onEnterWithAudio,
  onEnterWithoutAudio,
}: WelcomeModalProps) {
  const [logoError, setLogoError] = useState(false);

  if (!isOpen) return null;

  const showImageLogo = Boolean(TAUREN_LOGO_URL) && !logoError;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#092818]/92 backdrop-blur-[14px] p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div className="relative w-full max-w-md rounded-3xl border-2 border-[#facc15]/80 bg-gradient-to-b from-[#0f3d26] via-[#0d3521] to-[#082215] shadow-[0_24px_64px_rgba(0,0,0,0.65)] p-6 sm:p-8 text-center text-white flex flex-col items-center gap-6 overflow-hidden">
        {/* Subtle decorative golden top glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-44 rounded-full bg-[#facc15]/20 blur-3xl"
        />

        {/* Brand Logo & Project Header */}
        <div className="relative flex flex-col items-center gap-4 w-full">
          {showImageLogo ? (
            <div className="bg-white px-6 py-4 rounded-2xl border-2 border-[#facc15] shadow-[0_10px_28px_rgba(0,0,0,0.35)] flex items-center justify-center">
              <img
                src={TAUREN_LOGO_URL}
                alt="Inmobiliaria Tauren SAC"
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
                className="max-h-20 sm:max-h-24 w-auto object-contain"
              />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-2xl border border-[#facc15]/70 bg-white/[0.06] flex items-center justify-center shadow-lg">
              <Compass className="w-10 h-10 text-[#facc15]" />
            </div>
          )}

          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#facc15]/15 border border-[#facc15]/45 text-[11px] font-extrabold tracking-[0.16em] uppercase text-[#facc15]">
              <Sparkles className="w-3 h-3" />
              <span>Inmobiliaria Tauren</span>
            </span>
            <h2
              id="welcome-title"
              className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-white pt-1"
            >
              Residencial El Bosque
            </h2>
            <p className="text-xs sm:text-sm text-[#84cc16] font-extrabold tracking-wide uppercase">
              Etapa 3 · Andahuaylas · 46 Lotes Exclusivos
            </p>
          </div>
        </div>

        <p className="relative text-xs sm:text-sm text-white/85 leading-relaxed max-w-xs font-medium">
          Recorre la vista aérea panorámica 360°, consulta áreas exactas en tiempo real y reserva tu lote ideal.
        </p>

        {/* Two clear entry buttons */}
        <div className="relative w-full flex flex-col gap-3">
          <button
            type="button"
            onClick={onEnterWithAudio}
            className="flex items-center justify-center gap-2.5 w-full h-12 px-5 rounded-xl bg-[#facc15] hover:bg-[#84cc16] text-[#0f3d26] text-sm font-extrabold transition-all shadow-lg hover:scale-[1.01] cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Volume2 className="w-5 h-5 shrink-0" />
            <span>Ingresar con Audio</span>
          </button>

          <button
            type="button"
            onClick={onEnterWithoutAudio}
            className="flex items-center justify-center gap-2.5 w-full h-11 px-5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/30 text-sm font-bold transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#facc15]"
          >
            <VolumeX className="w-4 h-4 shrink-0 text-[#facc15]" />
            <span>Ingresar sin Audio</span>
          </button>
        </div>
      </div>
    </div>
  );
}
