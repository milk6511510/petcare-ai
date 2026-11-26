import React, { useEffect, useRef } from 'react';
import { Camera, History, Settings, ShieldCheck, Users } from 'lucide-react';
import type { TabId } from '../types';

interface LiquidGlassTabbarProps {
  activeTab: TabId;
  onChangeTab: (tab: TabId) => void;
}

const TABS: Array<{ id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'today', label: '今日看板', icon: ShieldCheck },
  { id: 'ocr', label: '拍立得掃描', icon: Camera },
  { id: 'family', label: '家庭同步', icon: Users },
  { id: 'history', label: '照護紀錄', icon: History },
  { id: 'settings', label: '設定 VIP', icon: Settings }
];

export const LiquidGlassTabbar: React.FC<LiquidGlassTabbarProps> = ({ activeTab, onChangeTab }) => {
  const barRef = useRef<HTMLElement | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeTabRef = useRef<TabId>(activeTab);
  const onChangeTabRef = useRef(onChangeTab);

  activeTabRef.current = activeTab;
  onChangeTabRef.current = onChangeTab;

  const activeIndex = Math.max(
    0,
    TABS.findIndex((t) => t.id === activeTab)
  );

  // Sync capsule position whenever activeTab changes
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    bar.style.setProperty('--tab-position', `${activeIndex * 100}%`);
    bar.style.setProperty('--tab-stretch', '1');
    bar.style.setProperty('--tab-gloss', '0');
  }, [activeIndex]);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    let pointer: {
      id: number;
      x: number;
      y: number;
      startIndex: number;
      cellWidth: number;
      moved: boolean;
    } | null = null;
    let suppressClick = false;
    let suppressTimer: number | null = null;

    const getTabEls = () => tabRefs.current.filter((el): el is HTMLButtonElement => Boolean(el));

    const updateGlassAngle = (event: PointerEvent) => {
      const tiles = bar.querySelectorAll<HTMLElement>('.tab-icon-glass');
      tiles.forEach((tile) => {
        const rect = tile.getBoundingClientRect();
        const angle =
          (Math.atan2(
            event.clientX - (rect.left + rect.width / 2),
            -(event.clientY - (rect.top + rect.height / 2))
          ) *
            180) /
          Math.PI;
        tile.style.setProperty('--tab-icon-angle', `${angle.toFixed(1)}deg`);
      });
    };

    const resetGlassAngle = () => {
      bar.querySelectorAll<HTMLElement>('.tab-icon-glass').forEach((tile) => {
        tile.style.removeProperty('--tab-icon-angle');
      });
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      const tab = target?.closest('.tab');
      if (!tab || (event.pointerType === 'mouse' && event.button !== 0)) return;
      const tabs = getTabEls();
      const current = Math.max(
        0,
        TABS.findIndex((item) => item.id === activeTabRef.current)
      );
      pointer = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        startIndex: current,
        cellWidth: Math.max(36, (bar.getBoundingClientRect().width - 12) / Math.max(1, tabs.length)),
        moved: false
      };
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!pointer || pointer.id !== event.pointerId) return;
      const deltaX = event.clientX - pointer.x;
      const deltaY = event.clientY - pointer.y;
      if (!pointer.moved && Math.abs(deltaX) > 7 && Math.abs(deltaX) > Math.abs(deltaY)) {
        pointer.moved = true;
      }
      if (!pointer.moved) return;

      event.preventDefault();
      const tabs = getTabEls();
      const maxIndex = Math.max(0, tabs.length - 1);
      const position = Math.max(0, Math.min(maxIndex, pointer.startIndex + deltaX / pointer.cellWidth));
      const stretch = 1 + Math.min(0.055, Math.abs(deltaX / pointer.cellWidth) * 0.055);
      const gloss = Math.min(1, Math.abs(deltaX / pointer.cellWidth));
      const targetIndex = Math.max(0, Math.min(maxIndex, Math.round(position)));

      tabs.forEach((tabEl, index) => tabEl.classList.toggle('gesture-target', index === targetIndex));
      bar.classList.add('is-dragging');
      bar.style.setProperty('--tab-position', `${position * 100}%`);
      bar.style.setProperty('--tab-stretch', stretch.toFixed(3));
      bar.style.setProperty('--tab-gloss', gloss.toFixed(2));
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (!pointer || pointer.id !== event.pointerId) return;
      const deltaX = event.clientX - pointer.x;
      const moved = pointer.moved;
      const tabs = getTabEls();
      const maxIndex = Math.max(0, tabs.length - 1);
      const destination = Math.max(
        0,
        Math.min(maxIndex, Math.round(pointer.startIndex + deltaX / pointer.cellWidth))
      );

      pointer = null;
      tabs.forEach((tabEl) => tabEl.classList.remove('gesture-target'));
      bar.classList.remove('is-dragging');
      bar.style.setProperty('--tab-stretch', '1');
      bar.style.setProperty('--tab-gloss', '0');

      if (moved) {
        suppressClick = true;
        if (suppressTimer !== null) window.clearTimeout(suppressTimer);
        suppressTimer = window.setTimeout(() => {
          suppressClick = false;
        }, 500);
        const nextTab = TABS[destination];
        if (nextTab) {
          bar.style.setProperty('--tab-position', `${destination * 100}%`);
          onChangeTabRef.current(nextTab.id);
        }
      }
    };

    const resetDrag = () => {
      if (!pointer) return;
      pointer = null;
      bar.classList.remove('is-dragging');
      bar.style.setProperty('--tab-stretch', '1');
      bar.style.setProperty('--tab-gloss', '0');
      const current = Math.max(
        0,
        TABS.findIndex((item) => item.id === activeTabRef.current)
      );
      getTabEls().forEach((tabEl) => tabEl.classList.remove('gesture-target'));
      bar.style.setProperty('--tab-position', `${current * 100}%`);
    };

    const handleClickCapture = (event: MouseEvent) => {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      suppressClick = false;
      if (suppressTimer !== null) window.clearTimeout(suppressTimer);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('.tab')) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const tabs = getTabEls();
      const current = Math.max(
        0,
        TABS.findIndex((item) => item.id === activeTabRef.current)
      );
      const nextIndex = Math.max(
        0,
        Math.min(tabs.length - 1, current + (event.key === 'ArrowRight' ? 1 : -1))
      );
      const nextTab = TABS[nextIndex];
      if (nextTab) {
        onChangeTabRef.current(nextTab.id);
        tabs[nextIndex]?.focus({ preventScroll: true });
      }
    };

    bar.addEventListener('pointermove', updateGlassAngle);
    bar.addEventListener('pointerleave', resetGlassAngle);
    bar.addEventListener('pointerdown', handlePointerDown);
    bar.addEventListener('click', handleClickCapture, true);
    bar.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', resetDrag);
    window.addEventListener('blur', resetDrag);

    return () => {
      bar.removeEventListener('pointermove', updateGlassAngle);
      bar.removeEventListener('pointerleave', resetGlassAngle);
      bar.removeEventListener('pointerdown', handlePointerDown);
      bar.removeEventListener('click', handleClickCapture, true);
      bar.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', resetDrag);
      window.removeEventListener('blur', resetDrag);
      if (suppressTimer !== null) window.clearTimeout(suppressTimer);
    };
  }, []);

  return (
    <nav ref={barRef} className="tabbar" role="tablist" aria-label="主要功能導覽列">
      <div className="tabbar-selection" aria-hidden="true" />
      {TABS.map((tab, idx) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[idx] = el;
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-view={tab.id}
            onClick={() => onChangeTab(tab.id)}
            className={`tab${isActive ? ' active' : ''}`}
          >
            <span className="tab-icon-glass" aria-hidden="true">
              <Icon />
            </span>
            <span className="tab-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
