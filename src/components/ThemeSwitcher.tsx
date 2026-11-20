import React, { useEffect, useRef, useState } from 'react';
import { Check, Palette } from 'lucide-react';
import { THEME_OPTIONS, type ThemeId } from '../lib/theme';

interface ThemeSwitcherProps {
  themeId: ThemeId;
  onChange: (id: ThemeId) => void;
  variant?: 'pill' | 'cards';
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  themeId,
  onChange,
  variant = 'pill'
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const current = THEME_OPTIONS.find((t) => t.id === themeId) ?? THEME_OPTIONS[0];

  if (variant === 'cards') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {THEME_OPTIONS.map((opt) => {
          const active = opt.id === themeId;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`text-left rounded-2xl p-3.5 transition border ${
                active
                  ? 'border-[var(--brand-primary)] bg-white/95 shadow-md ring-2 ring-[var(--brand-primary-border)]'
                  : 'border-white/80 bg-white/65 hover:bg-white/90'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  {opt.swatches.map((hex) => (
                    <span
                      key={hex}
                      className="h-4 w-4 rounded-full border border-black/10 shadow-sm"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
                {active ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-primary-soft)] px-2 py-0.5 text-[10px] font-extrabold text-[var(--brand-primary)]">
                    <Check className="h-3 w-3" /> 套用中
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-[var(--ink-muted)]">點擊套用</span>
                )}
              </div>
              <div className="text-xs font-extrabold text-[var(--ink-primary)]">{opt.name}</div>
              <div className="text-[11px] text-[var(--ink-secondary)] mt-0.5">{opt.subtitle}</div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-2xl bg-white/85 px-3 py-2 text-xs font-bold text-[var(--ink-primary)] border border-white hover:bg-white transition"
        title="切換網站暖色系主題"
        aria-expanded={open}
      >
        <Palette className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
        <span className="hidden sm:inline">{current.name.replace('系', '')}</span>
        <span className="flex items-center -space-x-1">
          <span
            className="h-2.5 w-2.5 rounded-full border border-white"
            style={{ backgroundColor: current.swatches[1] }}
          />
          <span
            className="h-2.5 w-2.5 rounded-full border border-white"
            style={{ backgroundColor: current.swatches[2] }}
          />
        </span>
      </button>

      {open && (
        <div className="liquid-glass-strong absolute right-0 mt-2 w-64 rounded-2xl p-2 z-50 border border-white">
          <div className="px-2.5 py-1.5 text-[11px] font-extrabold text-[var(--ink-secondary)]">
            選擇暖色系主題配色
          </div>
          <div className="space-y-1">
            {THEME_OPTIONS.map((opt) => {
              const active = opt.id === themeId;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left transition ${
                    active
                      ? 'bg-[var(--brand-primary-light)] text-[var(--ink-primary)]'
                      : 'hover:bg-white/80 text-[var(--ink-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex items-center -space-x-1 shrink-0">
                      {opt.swatches.map((hex) => (
                        <span
                          key={hex}
                          className="h-4 w-4 rounded-full border border-white shadow-sm"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold truncate">{opt.name}</div>
                      <div className="text-[10px] text-[var(--ink-muted)] truncate">{opt.subtitle}</div>
                    </div>
                  </div>
                  {active && <Check className="h-3.5 w-3.5 shrink-0 text-[var(--brand-primary)]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
