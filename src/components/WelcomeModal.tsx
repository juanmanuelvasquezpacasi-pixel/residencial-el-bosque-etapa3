import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f3d26]/92 backdrop-blur-[12px] p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-[#facc15]/60 bg-[#0f3d26]/85 backdrop-blur-[10px] shadow-2xl p-6 sm:p-8 text-center text-white flex flex-col items-center gap-6">
        {/* Brand Logo or Architectural Golden/White Emblem */}
        <div className="flex flex-col items-center gap-3">
          {showImageLogo ? (
            <div className="bg-white/95 px-4 py-2.5 rounded-2xl border border-[#facc15]/80 shadow-lg flex items-center justify-center">
              <img
                src={TAUREN_LOGO_URL}
                alt="Inmobiliaria Tauren SAC - Construimos tu futuro"
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
                className="max-h-16 sm:max-h-20 w-auto object-contain"
              />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-2xl border border-[#facc15]/70 bg-white/[0.06] flex items-center justify-center shadow-lg">
              <svg
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-12 h-12"
                aria-hidden="true"
              >
                <path
                  d="M32 8L12 34H24L16 48H48L40 34H52L32 8Z"
                  stroke="#facc15"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M32 22V56"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M22 56H42"
                  stroke="#84cc16"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-xs font-bold tracking-[0.18em] uppercase text-[#facc15]">
              Inmobiliaria Tauren
            </p>
            <h2
              id="welcome-title"
              className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-white"
            >
              Residencial El Bosque
            </h2>
            <p className="text-xs sm:text-sm text-white/80 font-medium">
              Etapa 3 · Andahuaylas · 46 Lotes Exclusivos
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-white/85 leading-relaxed max-w-xs">
          Explora la vista aérea interactiva, revisa las medidas exactas y reserva tu lote ideal en tiempo real.
        </p>

        {/* Two clear entry buttons */}
        <div className="w-full flex flex-col gap-3">
          <button
            type="button"
            onClick={onEnterWithAudio}
            className="flex items-center justify-center gap-2.5 w-full h-12 px-5 rounded-xl bg-[#facc15] hover:bg-[#84cc16] text-[#0f3d26] text-sm font-extrabold transition-colors shadow-lg cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
