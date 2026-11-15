import React from 'react';
import { Maximize2, Star, Trees } from 'lucide-react';
import { getLotCommercialTags, Lote, LotTagKind } from '../data/lotes';

interface LotTagsProps {
  lote: Lote;
  variant?: 'light' | 'dark';
  compact?: boolean;
}

function TagIcon({ kind, className }: { kind: LotTagKind; className?: string }) {
  if (kind === 'corner') return <Star className={className} />;
  if (kind === 'green') return <Trees className={className} />;
  return <Maximize2 className={className} />;
}

export function LotTags({ lote, variant = 'light', compact = false }: LotTagsProps) {
  const tags = getLotCommercialTags(lote);
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => {
        const isDark = variant === 'dark';
        let colorClass = '';
        if (isDark) {
          colorClass =
            tag.kind === 'corner'
              ? 'bg-[#facc15] text-[#0f3d26] border-[#facc15]'
              : tag.kind === 'green'
              ? 'bg-[#84cc16] text-[#0f3d26] border-[#84cc16]'
              : 'bg-white/15 text-[#facc15] border-[#facc15]/60';
        } else {
          colorClass =
            tag.kind === 'corner'
              ? 'bg-[#facc15]/30 text-[#0f3d26] border-[#facc15]'
              : tag.kind === 'green'
              ? 'bg-[#84cc16]/25 text-[#0f3d26] border-[#84cc16]'
              : 'bg-[#0f3d26] text-[#facc15] border-[#0f3d26]';
        }

        return (
          <span
            key={tag.kind}
            className={`inline-flex items-center gap-1 border font-bold rounded-md whitespace-nowrap ${
              compact ? 'text-[10px] px-1.5 py-0.5' : 'text-[11px] px-2 py-0.5'
            } ${colorClass}`}
          >
            <TagIcon
              kind={tag.kind}
              className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} shrink-0 ${
                tag.kind === 'corner' ? 'fill-current' : ''
              }`}
            />
            <span>{tag.label}</span>
          </span>
        );
      })}
    </div>
  );
}
