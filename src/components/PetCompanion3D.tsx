import React, { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { renderRecoloredFigurine, resolvePetVisual } from '../lib/petAppearance';
import type { Pet, PetAppearance } from '../types';

interface BurstParticle {
  id: number;
  glyph: string;
  tx: number;
  left: number;
  top: number;
}

interface PetCompanion3DProps {
  species?: 'dog' | 'cat' | 'other';
  breed?: string | null;
  appearance?: PetAppearance | null;
  petName: string;
  pendingCount: number;
  doneCount: number;
  totalCount: number;
  compact?: boolean;
  previewOnly?: boolean;
  customQuote?: string;
}

export function getPetMascotSrc(
  species?: 'dog' | 'cat' | 'other',
  breed?: string | null,
  appearance?: PetAppearance | null
): string {
  const visual = resolvePetVisual({
    species: species || 'dog',
    breed: breed ?? null,
    appearance: appearance ?? null
  });
  return visual.baseSrc || '/assets/pets/shiba-bobo.webp';
}

export function useResolvedPetImageSrc(
  species: 'dog' | 'cat' | 'other',
  breed?: string | null,
  appearance?: PetAppearance | null
): {
  imgSrc: string;
  baseAsset: ReturnType<typeof resolvePetVisual>['baseAsset'];
  primaryColor: string;
  secondaryColor: string;
  collarColor: string;
  breedLabel: string;
  isNativePreset: boolean;
} {
  const visual = resolvePetVisual({
    species,
    breed: breed ?? null,
    appearance: appearance ?? null
  });
  const [resolvedUrl, setResolvedUrl] = useState<string>(visual.baseSrc);

  useEffect(() => {
    let cancelled = false;
    if (visual.isDefaultNativeCoat) {
      setResolvedUrl(visual.baseSrc);
      return;
    }
    renderRecoloredFigurine(visual.baseAsset, visual.baseSrc, {
      primaryColor: visual.primaryColor,
      secondaryColor: visual.secondaryColor,
      pattern: visual.pattern,
      collarColor: visual.collarColor,
      skipFurRecolor: visual.skipFurRecolor
    })
      .then((url) => {
        if (!cancelled) setResolvedUrl(url);
      })
      .catch(() => {
        if (!cancelled) setResolvedUrl(visual.baseSrc);
      });

    return () => {
      cancelled = true;
    };
  }, [
    visual.baseAsset,
    visual.baseSrc,
    visual.primaryColor,
    visual.secondaryColor,
    visual.pattern,
    visual.collarColor,
    visual.isDefaultNativeCoat,
    visual.skipFurRecolor
  ]);

  return {
    imgSrc: resolvedUrl || visual.baseSrc,
    baseAsset: visual.baseAsset,
    primaryColor: visual.primaryColor,
    secondaryColor: visual.secondaryColor,
    collarColor: visual.collarColor,
    breedLabel: visual.breedLabel,
    isNativePreset: visual.skipFurRecolor
  };
}

export const PetAvatarBadge: React.FC<{
  pet: Pick<Pet, 'name' | 'species' | 'breed' | 'appearance' | 'avatar_emoji'>;
  sizeClass?: string;
}> = ({ pet, sizeClass = 'h-6 w-6' }) => {
  const { imgSrc } = useResolvedPetImageSrc(
    pet.species,
    pet.breed,
    pet.appearance
  );

  return (
    <img
      src={imgSrc || '/assets/pets/shiba-bobo.webp'}
      alt={pet.name}
      className={`${sizeClass} rounded-full bg-white/95 object-contain p-0.5 shadow-sm`}
      draggable={false}
    />
  );
};

export function PetCompanion3D({
  species = 'dog',
  breed,
  appearance,
  petName,
  pendingCount,
  doneCount,
  totalCount,
  compact = false,
  previewOnly = false,
  customQuote
}: PetCompanion3DProps) {
  const [bouncing, setBouncing] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [particles, setParticles] = useState<BurstParticle[]>([]);
  const nextIdRef = useRef(1);
  const timerRef = useRef<number | null>(null);

  const isCat = species === 'cat';
  const { imgSrc, breedLabel } = useResolvedPetImageSrc(
    species,
    breed,
    appearance
  );
  const allDone = totalCount > 0 && doneCount >= totalCount && pendingCount === 0;

  const dogQuotes = allDone
    ? [
        `汪！${petName}今日照護 100% 完成囉 ✨`,
        `太棒了！全家人今天都超用心守護 💛`,
        `打卡達標！摸摸${petName}獎勵一下吧 🐾`
      ]
    : totalCount === 0
    ? [
        `汪？還沒建立排程嗎？新增餵食或拍藥袋試試！`,
        `有照護紀錄陪著${petName}，大家更安心 💛`
      ]
    : [
        `汪！今天還有 ${pendingCount} 次照護待打卡喔`,
        `餵完記得點一下打卡，家人就不會重複餵 🐾`,
        `拍拍${petName}，等一下也要準時照顧喔 💛`
      ];

  const catQuotes = allDone
    ? [
        `喵～${petName}今日打卡圓滿完成 ✨`,
        `呼嚕嚕…謝謝溫柔的家人們一起守護 💛`,
        `今天表現滿分！來抱抱${petName}吧 🐾`
      ]
    : totalCount === 0
    ? [
        `喵？點一下「拍藥袋」或手動新增排程吧`,
        `記下每次照護時間，回診更好說明喔 ✨`
      ]
    : [
        `喵～還有 ${pendingCount} 次待打卡，別忘了我喔`,
        `輕輕點我可以收穫愛心，餵完記得打卡 💛`,
        `有全家同步紀錄，再也不怕重複餵啦 🐾`
      ];

  const otherQuotes = allDone
    ? [`${petName}今日照護圓滿完成囉 ✨`, `謝謝細心照顧${petName} 💛`]
    : [`隨時替${petName}記錄每日照護與餵食時間 🐾`];

  const quotes = species === 'cat' ? catQuotes : species === 'other' ? otherQuotes : dogQuotes;
  const activeQuote = customQuote || quotes[quoteIdx % quotes.length];

  useEffect(() => {
    setQuoteIdx(0);
  }, [species, petName, allDone, pendingCount, totalCount]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  function handleTap() {
    setBouncing(false);
    requestAnimationFrame(() => {
      setBouncing(true);
    });
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setBouncing(false), 680);

    setQuoteIdx((prev) => prev + 1);

    const glyphs = isCat ? ['💛', '✨', '🐾', '🩷'] : ['💛', '✨', '🐾', '🧡'];
    const burst: BurstParticle[] = Array.from({ length: 4 }, (_, idx) => ({
      id: nextIdRef.current++,
      glyph: glyphs[(nextIdRef.current + idx) % glyphs.length],
      tx: (idx - 1.5) * 22 + (Math.random() * 10 - 5),
      left: 34 + idx * 11,
      top: 22 + (idx % 2) * 14
    }));
    setParticles((prev) => [...prev.slice(-8), ...burst]);
    window.setTimeout(() => {
      const ids = new Set(burst.map((b) => b.id));
      setParticles((prev) => prev.filter((p) => !ids.has(p.id)));
    }, 1100);
  }

  const figurineClass = `relative z-10 ${
    compact ? 'h-14 w-14' : 'h-28 w-28 sm:h-32 sm:w-32'
  } object-contain select-none transition-transform duration-200 group-hover:scale-[1.04] ${
    bouncing ? 'pet-3d-jump' : allDone ? 'pet-3d-celebrate' : 'pet-3d-float'
  }`;

  const renderFigurine = () => (
    <img
      src={imgSrc || '/assets/pets/shiba-bobo.webp'}
      alt={`3D ${breedLabel}公仔 ${petName}`}
      className={figurineClass}
      style={{
        filter: compact
          ? 'drop-shadow(0 8px 12px rgba(46, 36, 30, 0.14))'
          : 'drop-shadow(0 12px 16px rgba(46, 36, 30, 0.16))'
      }}
      draggable={false}
    />
  );

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleTap}
        title={`點擊與${petName}互動`}
        className="group relative inline-flex shrink-0 items-center justify-center rounded-2xl p-1 focus:outline-none"
      >
        <span
          className="pointer-events-none absolute inset-1 rounded-full blur-md opacity-70 transition group-hover:opacity-100"
          style={{
            background: 'radial-gradient(circle, var(--brand-primary-soft) 0%, transparent 72%)'
          }}
        />
        {renderFigurine()}
        {particles.map((p) => (
          <span
            key={p.id}
            className="pet-heart-particle absolute z-20 text-xs"
            style={
              {
                left: `${p.left}%`,
                top: `${p.top}%`,
                '--tx': `${p.tx}px`
              } as React.CSSProperties
            }
          >
            {p.glyph}
          </span>
        ))}
      </button>
    );
  }

  return (
    <div className="relative flex flex-col items-center select-none">
      {!previewOnly && (
        <div
          className={`relative z-20 mb-1.5 max-w-[210px] rounded-2xl border px-3 py-1.5 text-center text-[11px] font-bold shadow-sm transition-all ${
            allDone
              ? 'border-[var(--status-ok-border)] bg-[var(--status-ok-bg)] text-[var(--status-ok)]'
              : 'border-white/90 bg-white/92 text-[var(--ink-primary)]'
          }`}
        >
          {allDone && <Sparkles className="mr-1 inline h-3 w-3 text-[var(--brand-gold)]" />}
          <span>{activeQuote}</span>
          <span
            className={`absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r ${
              allDone
                ? 'border-[var(--status-ok-border)] bg-[var(--status-ok-bg)]'
                : 'border-white/90 bg-white/92'
            }`}
          />
        </div>
      )}

      <button
        type="button"
        onClick={handleTap}
        aria-label={`點擊與 3D ${petName} 公仔互動`}
        className="group relative flex h-32 w-32 sm:h-36 sm:w-36 cursor-pointer items-center justify-center rounded-full focus:outline-none"
      >
        <span
          className="pointer-events-none absolute inset-2 rounded-full transition-transform duration-300 group-hover:scale-110"
          style={{
            background: allDone
              ? 'radial-gradient(circle, rgba(82, 120, 77, 0.22) 0%, var(--brand-primary-soft) 55%, transparent 75%)'
              : 'radial-gradient(circle, var(--brand-primary-soft) 0%, rgba(216, 156, 74, 0.14) 55%, transparent 75%)'
          }}
        />

        {allDone && !previewOnly && (
          <>
            <span className="pet-sparkle-twinkle pointer-events-none absolute left-2 top-3 z-20 text-sm">✨</span>
            <span
              className="pet-sparkle-twinkle pointer-events-none absolute right-2 top-5 z-20 text-xs"
              style={{ animationDelay: '0.8s' }}
            >
              🌟
            </span>
          </>
        )}

        {renderFigurine()}

        <span
          className="pet-3d-shadow pointer-events-none absolute bottom-1.5 h-3.5 w-20 rounded-full blur-[3px]"
          style={{ backgroundColor: 'var(--ink-primary)' }}
        />

        {particles.map((p) => (
          <span
            key={p.id}
            className="pet-heart-particle pointer-events-none absolute z-30 text-base"
            style={
              {
                left: `${p.left}%`,
                top: `${p.top}%`,
                '--tx': `${p.tx}px`
              } as React.CSSProperties
            }
          >
            {p.glyph}
          </span>
        ))}
      </button>

      <span className="mt-0.5 rounded-full bg-white/75 px-2.5 py-0.5 text-[10px] font-bold text-[var(--ink-muted)] border border-white/80">
        {previewOnly ? `${breedLabel}・點我試玩互動` : `點我摸摸 ${petName}`}
      </span>
    </div>
  );
}
