import React, { useEffect, useState } from 'react';
import { Clock, Plus, Sparkles, Trash2, X } from 'lucide-react';
import type { Pet } from '../types';

export interface ScheduleSlotInput {
  scheduleId?: string;
  scheduledTime: string;
  todayDone?: boolean;
}

export interface ScheduleEditorSubmitPayload {
  mode: 'create' | 'edit';
  prescriptionId?: string;
  petId: string;
  medicationName: string;
  dosageText: string;
  mealTiming: 'after_meal' | 'before_meal' | 'before_bed' | 'anytime';
  totalDays: number;
  slots: ScheduleSlotInput[];
}

interface ScheduleEditorModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  pet: Pet;
  initialPrescription?: {
    prescriptionId: string;
    medicationName: string;
    dosageText: string;
    mealTiming: string;
    totalDays: number;
    slots: ScheduleSlotInput[];
  } | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (payload: ScheduleEditorSubmitPayload) => Promise<void> | void;
  onDelete?: (prescriptionId: string) => Promise<void> | void;
}

const DEFAULT_TIME_PRESETS: Record<number, string[]> = {
  1: ['08:30'],
  2: ['08:30', '20:00'],
  3: ['08:00', '13:00', '20:00'],
  4: ['08:00', '12:30', '17:30', '22:00']
};

export const ScheduleEditorModal: React.FC<ScheduleEditorModalProps> = ({
  open,
  mode,
  pet,
  initialPrescription,
  saving = false,
  onClose,
  onSave,
  onDelete
}) => {
  const [medicationName, setMedicationName] = useState('');
  const [dosageText, setDosageText] = useState('');
  const [mealTiming, setMealTiming] = useState<'after_meal' | 'before_meal' | 'before_bed' | 'anytime'>('after_meal');
  const [totalDays, setTotalDays] = useState('7');
  const [slots, setSlots] = useState<ScheduleSlotInput[]>([
    { scheduledTime: '08:30' },
    { scheduledTime: '20:00' }
  ]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setConfirmDelete(false);
    if (mode === 'edit' && initialPrescription) {
      setMedicationName(initialPrescription.medicationName);
      setDosageText(initialPrescription.dosageText);
      const timing = initialPrescription.mealTiming;
      setMealTiming(
        timing === 'before_meal' || timing === 'before_bed' || timing === 'anytime' ? timing : 'after_meal'
      );
      setTotalDays(String(initialPrescription.totalDays || 7));
      setSlots(
        initialPrescription.slots.length > 0
          ? initialPrescription.slots.map((s) => ({ ...s }))
          : [{ scheduledTime: '08:30' }]
      );
    } else {
      setMedicationName('');
      setDosageText('每次 1 顆・或依指示份量');
      setMealTiming('after_meal');
      setTotalDays('7');
      setSlots([{ scheduledTime: '08:30' }, { scheduledTime: '20:00' }]);
    }
  }, [open, mode, initialPrescription]);

  if (!open) return null;

  function applyDailyCount(count: number) {
    const defaults = DEFAULT_TIME_PRESETS[count] ?? ['08:30'];
    setSlots((prev) => {
      if (count <= prev.length) {
        return prev.slice(0, count);
      }
      const next = [...prev];
      for (let i = prev.length; i < count; i++) {
        next.push({ scheduledTime: defaults[i] || '12:00' });
      }
      return next;
    });
  }

  function handleSlotTimeChange(index: number, value: string) {
    setSlots((prev) => prev.map((s, idx) => (idx === index ? { ...s, scheduledTime: value } : s)));
  }

  function handleAddSlot() {
    if (slots.length >= 8) return;
    const fallbackTimes = ['08:00', '12:00', '16:00', '20:00', '22:30', '06:30', '10:30', '14:30'];
    const used = new Set(slots.map((s) => s.scheduledTime));
    const nextTime = fallbackTimes.find((t) => !used.has(t)) || '12:00';
    setSlots((prev) => [...prev, { scheduledTime: nextTime }]);
  }

  function handleRemoveSlot(index: number) {
    if (slots.length <= 1) return;
    setSlots((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!medicationName.trim() || slots.length === 0) return;
    await onSave({
      mode,
      prescriptionId: initialPrescription?.prescriptionId,
      petId: pet.id,
      medicationName: medicationName.trim(),
      dosageText: dosageText.trim() || '依毛孩日常照護指示',
      mealTiming,
      totalDays: Math.max(1, Math.min(365, Number(totalDays) || 7)),
      slots: slots.map((s) => ({
        ...s,
        scheduledTime: /^\d{2}:\d{2}$/.test(s.scheduledTime) ? s.scheduledTime : '08:30'
      }))
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-3 sm:p-5 overflow-y-auto">
      <div className="liquid-glass-strong relative my-auto w-full max-w-lg rounded-[28px] p-5 sm:p-6 text-[var(--ink-primary)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-white/80 p-2 text-[var(--ink-secondary)] hover:bg-white transition"
          aria-label="關閉"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-gold)] text-white shadow-md">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight">
              {mode === 'create' ? '新增餵食 / 用藥排程' : '修改餵食 / 用藥次數與時段'}
            </h2>
            <p className="text-xs text-[var(--ink-secondary)]">
              對象：{pet.avatar_emoji} {pet.name} ・ 可自由增減每日次數與調整各時段提醒
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--ink-secondary)]">
              餵食或用藥項目名稱（必填）
            </label>
            <input
              type="text"
              required
              value={medicationName}
              onChange={(e) => setMedicationName(e.target.value)}
              placeholder="例如：胃潰寧、益生菌、早晚主食飼料"
              className="w-full rounded-2xl border border-white/80 bg-white/85 px-3.5 py-2.5 text-sm outline-none focus:border-[var(--brand-primary)]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--ink-secondary)]">用量 / 份量說明</label>
              <input
                type="text"
                value={dosageText}
                onChange={(e) => setDosageText(e.target.value)}
                placeholder="例如：每次 1 顆 / 飼料 40g"
                className="w-full rounded-2xl border border-white/80 bg-white/85 px-3.5 py-2 text-xs outline-none focus:border-[var(--brand-primary)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-[var(--ink-secondary)]">照護時機</label>
                <select
                  value={mealTiming}
                  onChange={(e) =>
                    setMealTiming(e.target.value as 'after_meal' | 'before_meal' | 'before_bed' | 'anytime')
                  }
                  className="w-full rounded-2xl border border-white/80 bg-white/85 px-2.5 py-2 text-xs outline-none focus:border-[var(--brand-primary)]"
                >
                  <option value="after_meal">飯後</option>
                  <option value="before_meal">飯前</option>
                  <option value="before_bed">睡前</option>
                  <option value="anytime">不限時段</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[var(--ink-secondary)]">預計天數</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={totalDays}
                  onChange={(e) => setTotalDays(e.target.value)}
                  className="w-full rounded-2xl border border-white/80 bg-white/85 px-2.5 py-2 text-xs outline-none focus:border-[var(--brand-primary)]"
                />
              </div>
            </div>
          </div>

          {/* Daily Times Count & Time Slots */}
          <div className="rounded-2xl border border-white/85 bg-white/70 p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-[var(--ink-primary)]">
                每日次數：目前共 {slots.length} 次 / 天
              </span>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => applyDailyCount(cnt)}
                    className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition ${
                      slots.length === cnt
                        ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                        : 'bg-white/90 text-[var(--ink-secondary)] hover:bg-white border border-[var(--border-subtle)]'
                    }`}
                  >
                    {cnt} 次
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {slots.map((slot, idx) => (
                <div
                  key={slot.scheduleId || `new-${idx}`}
                  className="flex items-center justify-between gap-2 rounded-xl border border-white bg-white/90 px-3 py-2"
                >
                  <span className="text-[11px] font-bold text-[var(--ink-secondary)] shrink-0">
                    第 {idx + 1} 次
                  </span>
                  <input
                    type="time"
                    required
                    value={slot.scheduledTime}
                    onChange={(e) => handleSlotTimeChange(idx, e.target.value)}
                    className="flex-1 bg-transparent text-xs font-extrabold text-[var(--ink-primary)] outline-none"
                  />
                  {slot.todayDone && (
                    <span className="rounded-full bg-[var(--status-ok-bg)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--status-ok)]">
                      今日已打
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={slots.length <= 1}
                    onClick={() => handleRemoveSlot(idx)}
                    className="rounded-lg p-1 text-[var(--ink-muted)] hover:bg-[#FEECEC] hover:text-[#D32F2F] disabled:opacity-30 transition"
                    title="移除此時段"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {slots.length < 8 && (
              <button
                type="button"
                onClick={handleAddSlot}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--brand-primary-border)] bg-[var(--brand-primary-light)]/60 py-2 text-xs font-bold text-[var(--brand-primary-hover)] hover:bg-[var(--brand-primary-light)] transition"
              >
                <Plus className="h-3.5 w-3.5" /> 再增加 1 個每日時段（最多 8 次）
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {mode === 'edit' && initialPrescription && onDelete ? (
              !confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold text-[#D32F2F] hover:bg-[#FEECEC] transition"
                >
                  <Trash2 className="h-3.5 w-3.5" /> 刪除此項目
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => onDelete(initialPrescription.prescriptionId)}
                    className="rounded-xl bg-[#D32F2F] px-3 py-2 text-xs font-bold text-white"
                  >
                    確定刪除
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-xl bg-white px-2.5 py-2 text-xs font-bold text-[var(--ink-secondary)]"
                  >
                    取消
                  </button>
                </div>
              )
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl bg-white/85 px-4 py-2.5 text-xs font-bold text-[var(--ink-secondary)] border border-white"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-hover)] px-5 py-2.5 text-xs font-extrabold text-white shadow-md hover:brightness-105 disabled:opacity-60"
                style={{ boxShadow: '0 8px 18px var(--brand-primary-shadow)' }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {saving ? '儲存同步中...' : mode === 'create' ? '確認新增排程' : '儲存次數與修改'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
