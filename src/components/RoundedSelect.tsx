import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';

export interface RoundedSelectOption {
  value: string;
  label: string;
  group?: string;
  description?: string;
  swatchColor?: string;
  icon?: React.ReactNode;
}

interface RoundedSelectProps {
  value: string;
  options: RoundedSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  className?: string;
  triggerClassName?: string;
  ariaLabel?: string;
}

export const RoundedSelect: React.FC<RoundedSelectProps> = ({
  value,
  options,
  onChange,
  placeholder = '請選擇...',
  searchable = false,
  searchPlaceholder = '搜尋品種或關鍵字...',
  className = '',
  triggerClassName = '',
  ariaLabel
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; openUp: boolean }>({
    top: 0,
    left: 0,
    width: 240,
    openUp: false
  });

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const selected = useMemo(() => options.find((opt) => opt.value === value) || null, [options, value]);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.group && opt.group.toLowerCase().includes(q)) ||
        (opt.description && opt.description.toLowerCase().includes(q))
    );
  }, [options, query]);

  const groupedOptions = useMemo(() => {
    const groups: Array<{ group: string | null; items: RoundedSelectOption[] }> = [];
    const indexByGroup = new Map<string, number>();
    for (const item of filteredOptions) {
      const g = item.group || null;
      const key = g || '__default__';
      const existingIdx = indexByGroup.get(key);
      if (existingIdx !== undefined) {
        groups[existingIdx].items.push(item);
      } else {
        indexByGroup.set(key, groups.length);
        groups.push({ group: g, items: [item] });
      }
    }
    return groups;
  }, [filteredOptions]);

  function updatePosition() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 260 && rect.top > spaceBelow;
    const top = openUp ? rect.top - 8 : rect.bottom + 8;
    const width = Math.max(rect.width, 200);
    const maxLeft = Math.max(12, window.innerWidth - width - 12);
    const left = Math.min(Math.max(12, rect.left), maxLeft);
    setCoords({ top, left, width, openUp });
  }

  useEffect(() => {
    if (!open) return;
    updatePosition();
    if (searchable) {
      window.setTimeout(() => searchInputRef.current?.focus(), 30);
    }

    function onWindowChange() {
      updatePosition();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }

    window.addEventListener('resize', onWindowChange);
    window.addEventListener('scroll', onWindowChange, true);
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      window.removeEventListener('resize', onWindowChange);
      window.removeEventListener('scroll', onWindowChange, true);
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open, searchable]);

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          setQuery('');
          setOpen((prev) => !prev);
        }}
        className={`flex w-full items-center justify-between gap-2 rounded-2xl border border-white/85 bg-white/88 px-3.5 py-2.5 text-left text-xs font-semibold text-[var(--ink-primary)] shadow-sm transition hover:bg-white focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary-soft)] ${triggerClassName}`}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          {selected?.swatchColor && (
            <span
              className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/10 shadow-inner"
              style={{ backgroundColor: selected.swatchColor }}
            />
          )}
          {selected?.icon && <span className="shrink-0">{selected.icon}</span>}
          <span className={`truncate ${selected ? 'text-[var(--ink-primary)]' : 'text-[var(--ink-muted)]'}`}>
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[var(--ink-secondary)] transition-transform duration-200 ${
            open ? 'rotate-180 text-[var(--brand-primary)]' : ''
          }`}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={{
              position: 'fixed',
              top: coords.openUp ? undefined : `${coords.top}px`,
              bottom: coords.openUp ? `${window.innerHeight - coords.top}px` : undefined,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 9999
            }}
            className="liquid-glass-strong overflow-hidden rounded-[22px] border border-white/90 p-2 shadow-2xl"
          >
            {searchable && (
              <div className="mb-1.5 flex items-center gap-2 rounded-xl border border-white/80 bg-white/90 px-2.5 py-1.5">
                <Search className="h-3.5 w-3.5 shrink-0 text-[var(--ink-muted)]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full bg-transparent text-xs text-[var(--ink-primary)] outline-none placeholder:text-[var(--ink-muted)]"
                />
              </div>
            )}

            <div className="max-h-64 overflow-y-auto pr-0.5 space-y-1">
              {groupedOptions.length === 0 ? (
                <div className="rounded-xl px-3 py-4 text-center text-xs text-[var(--ink-muted)]">
                  找不到符合的項目，可選擇「自行輸入品種」
                </div>
              ) : (
                groupedOptions.map((grp, gIdx) => (
                  <div key={grp.group || `g-${gIdx}`} className="space-y-0.5">
                    {grp.group && (
                      <div className="px-2.5 pt-1.5 pb-0.5 text-[10px] font-extrabold tracking-wide text-[var(--ink-muted)]">
                        {grp.group}
                      </div>
                    )}
                    {grp.items.map((opt) => {
                      const isSelected = opt.value === value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            onChange(opt.value);
                            setOpen(false);
                          }}
                          className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs transition ${
                            isSelected
                              ? 'bg-[var(--brand-primary-light)] font-extrabold text-[var(--brand-primary-hover)]'
                              : 'font-semibold text-[var(--ink-primary)] hover:bg-white/85'
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            {opt.swatchColor && (
                              <span
                                className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/10"
                                style={{ backgroundColor: opt.swatchColor }}
                              />
                            )}
                            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                            <span className="truncate">{opt.label}</span>
                          </span>
                          {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-[var(--brand-primary)]" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
