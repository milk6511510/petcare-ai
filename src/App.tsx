import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock,
  Cloud,
  CloudOff,
  Copy,
  Crown,
  FileText,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Upload,
  Users
} from 'lucide-react';
import { AuthModal } from './components/AuthModal';
import { LiquidGlassTabbar } from './components/LiquidGlassTabbar';
import { PaywallModal } from './components/PaywallModal';
import { PetCompanion3D, getPetMascotSrc } from './components/PetCompanion3D';
import { ReportModal } from './components/ReportModal';
import {
  ScheduleEditorModal,
  type ScheduleEditorSubmitPayload
} from './components/ScheduleEditorModal';
import { SettingsTab } from './components/SettingsTab';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { apiFetch, ApiError } from './lib/api';
import { applyTheme, getStoredThemeId, THEME_OPTIONS, type ThemeId } from './lib/theme';
import type {
  AuthContext,
  DoseConflict,
  FamilyMember,
  HistoryLog,
  OcrDraft,
  Pet,
  PlanItem,
  ScheduleItem,
  TabId
} from './types';

const GUEST_DEFAULT_PETS: Pet[] = [
  {
    id: 'guest-pet-1',
    name: '波波',
    species: 'dog',
    breed: '柴犬',
    weight_kg: 9.4,
    avatar_emoji: '🐶'
  }
];

const GUEST_DEFAULT_SCHEDULES: ScheduleItem[] = [
  {
    schedule_id: 'guest-sched-1',
    pet_id: 'guest-pet-1',
    pet_name: '波波',
    pet_emoji: '🐶',
    prescription_id: 'guest-rx-1',
    medication_name: '胃潰寧 GastroWell（虛擬示範）',
    clinic_name: '晴空動物醫院（虛擬示範）',
    dosage_text: '每次 1 顆・早晚飯後',
    meal_timing: 'after_meal',
    total_days: 7,
    scheduled_time: '08:30',
    label: '飯後照護',
    today_log_id: 'guest-log-1',
    today_logged_by: '媽媽（示範）',
    today_logged_at: new Date().toISOString()
  },
  {
    schedule_id: 'guest-sched-2',
    pet_id: 'guest-pet-1',
    pet_name: '波波',
    pet_emoji: '🐶',
    prescription_id: 'guest-rx-1',
    medication_name: '胃潰寧 GastroWell（虛擬示範）',
    clinic_name: '晴空動物醫院（虛擬示範）',
    dosage_text: '每次 1 顆・早晚飯後',
    meal_timing: 'after_meal',
    total_days: 7,
    scheduled_time: '20:00',
    label: '飯後照護',
    today_log_id: null,
    today_logged_by: null,
    today_logged_at: null
  }
];

const FALLBACK_PLANS: PlanItem[] = [
  {
    id: 'free_0',
    planKey: 'free',
    productId: null,
    name: '一般版 (Free)',
    priceTwd: 0,
    introPriceTwd: null,
    periodLabel: '永久免費',
    trialDays: 0,
    badge: '基礎單機體驗',
    highlights: ['1 隻寵物健康檔案', '每月 3 次藥袋掃描', '最近 14 天紀錄', '單人本機管理', '僅當週單張摘要']
  },
  {
    id: 'weekly_150',
    planKey: 'pro_weekly',
    productId: 'petcare_pro_weekly_150',
    name: 'PRO 週方案',
    priceTwd: 150,
    introPriceTwd: 60,
    periodLabel: '/ 週',
    trialDays: 0,
    badge: '急性期首選・首週 NT$60',
    highlights: ['首週體驗價 NT$60（無免費試用）', '次週起 NT$150/週自動續訂', '無限寵物與藥袋掃描', '最多 10 位家人即時連線']
  },
  {
    id: 'monthly_240',
    planKey: 'pro_monthly',
    productId: 'petcare_pro_monthly_240',
    name: 'PRO 單月方案',
    priceTwd: 240,
    introPriceTwd: 60,
    periodLabel: '/ 月',
    trialDays: 0,
    badge: '低門檻破冰・首月 NT$60',
    highlights: ['首月體驗價 NT$60', '次月起 NT$240/月自動續訂', '永久完整紀錄＋PDF 匯出', '最多 10 位家人即時連線']
  },
  {
    id: 'annual_1290',
    planKey: 'pro_annual',
    productId: 'petcare_pro_annual_1290',
    name: 'PRO 年方案（主推）',
    priceTwd: 1290,
    introPriceTwd: null,
    periodLabel: '/ 年',
    trialDays: 7,
    badge: '最划算・含 7 天免費試用',
    highlights: ['7 天免費試用，第 5 天貼心提醒', '平均每月約 NT$107.5', '解鎖全部 VIP 功能與永久歷程', '最多 10 位家人跨時區同步']
  }
];

function mealTimingLabel(mealTiming: string): string {
  if (mealTiming === 'before_meal') return '飯前照護';
  if (mealTiming === 'before_bed') return '睡前照護';
  if (mealTiming === 'anytime') return '日常照護';
  return '飯後照護';
}

export default function App() {
  const [themeId, setThemeId] = useState<ThemeId>(() => getStoredThemeId());
  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [context, setContext] = useState<AuthContext | null>(null);
  const [bootLoading, setBootLoading] = useState(true);

  const [pets, setPets] = useState<Pet[]>(GUEST_DEFAULT_PETS);
  const [selectedPetId, setSelectedPetId] = useState<string>('guest-pet-1');
  const [schedules, setSchedules] = useState<ScheduleItem[]>(GUEST_DEFAULT_SCHEDULES);
  const [conflicts, setConflicts] = useState<DoseConflict[]>([]);
  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([]);
  const [historyLockedCount, setHistoryLockedCount] = useState(0);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [plans, setPlans] = useState<PlanItem[]>(FALLBACK_PLANS);
  const [referrals, setReferrals] = useState<
    Array<{ id: string; status: string; bonus_days: number; friend_name: string; created_at: string }>
  >([]);

  // Modals & Alerts
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallReason, setPaywallReason] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'warn' | 'err'; text: string } | null>(null);

  // Schedule Add/Edit & Reset states
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleModalMode, setScheduleModalMode] = useState<'create' | 'edit'>('create');
  const [editingPrescriptionId, setEditingPrescriptionId] = useState<string | null>(null);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [confirmResetAll, setConfirmResetAll] = useState(false);

  // Add Pet form
  const [showAddPet, setShowAddPet] = useState(false);
  const [newPetName, setNewPetName] = useState('');
  const [newPetSpecies, setNewPetSpecies] = useState<'dog' | 'cat' | 'other'>('cat');
  const [newPetBreed, setNewPetBreed] = useState('');

  // OCR State
  const [ocrPreset, setOcrPreset] = useState<'heartcalm' | 'gastrowell' | 'soothecoat'>('heartcalm');
  const [ocrFilename, setOcrFilename] = useState<string>('');
  const [ocrPreviewUrl, setOcrPreviewUrl] = useState<string | null>(null);
  const [ocrDraft, setOcrDraft] = useState<OcrDraft | null>(null);
  const [ocrForm, setOcrForm] = useState({
    medicationName: '',
    clinicName: '',
    dosageText: '',
    mealTiming: 'after_meal',
    totalDays: '',
    timesText: '08:30, 20:00',
    humanConfirmed: false
  });
  const [ocrLoading, setOcrLoading] = useState(false);

  // Family join state
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copiedFamilyCode, setCopiedFamilyCode] = useState(false);

  useEffect(() => {
    applyTheme(themeId);
  }, [themeId]);

  const showToast = useCallback((kind: 'ok' | 'warn' | 'err', text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 4200);
  }, []);

  function handleChangeTheme(nextId: ThemeId) {
    setThemeId(nextId);
    applyTheme(nextId);
    const label = THEME_OPTIONS.find((t) => t.id === nextId)?.name ?? nextId;
    showToast('ok', `✓ 已套用「${label}」暖色系主題`);
  }

  const loadCloudWorkspace = useCallback(async (ctx: AuthContext) => {
    setContext(ctx);
    const [petsRes, dosesRes, famRes, billRes] = await Promise.all([
      apiFetch<{ pets: Pet[] }>('/api/pets'),
      apiFetch<{
        schedules: ScheduleItem[];
        conflicts: DoseConflict[];
        historyLogs: HistoryLog[];
        historyLockedCount: number;
      }>('/api/doses'),
      apiFetch<{ members: FamilyMember[] }>('/api/family'),
      apiFetch<{
        plans: PlanItem[];
        referrals: Array<{ id: string; status: string; bonus_days: number; friend_name: string; created_at: string }>;
      }>('/api/billing')
    ]);

    setPets(petsRes.pets);
    if (petsRes.pets.length > 0) {
      setSelectedPetId((prev) => (petsRes.pets.some((p) => p.id === prev) ? prev : petsRes.pets[0].id));
    }
    setSchedules(dosesRes.schedules);
    setConflicts(dosesRes.conflicts);
    setHistoryLogs(dosesRes.historyLogs);
    setHistoryLockedCount(dosesRes.historyLockedCount);
    setMembers(famRes.members);
    if (billRes.plans?.length) setPlans(billRes.plans);
    setReferrals(billRes.referrals || []);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const [authRes, billRes] = await Promise.all([
          apiFetch<{ authenticated: boolean; context: AuthContext | null }>('/api/auth'),
          apiFetch<{ plans: PlanItem[] }>('/api/billing').catch(() => ({ plans: FALLBACK_PLANS }))
        ]);
        if (!mounted) return;
        if (billRes.plans?.length) setPlans(billRes.plans);
        if (authRes.authenticated && authRes.context) {
          await loadCloudWorkspace(authRes.context);
        }
      } catch {
        // stay in guest mode gracefully
      } finally {
        if (mounted) setBootLoading(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, [loadCloudWorkspace]);

  function openPaywall(reason?: string) {
    setPaywallReason(reason || null);
    setPaywallOpen(true);
  }

  async function handleCheckIn(item: ScheduleItem) {
    if (!context) {
      if (item.today_log_id) return;
      setSchedules((prev) =>
        prev.map((s) =>
          s.schedule_id === item.schedule_id
            ? {
                ...s,
                today_log_id: `guest-log-${Date.now()}`,
                today_logged_by: '我（本機）',
                today_logged_at: new Date().toISOString()
              }
            : s
        )
      );
      showToast('ok', `✓ 已打卡「${item.medication_name}」(${item.scheduled_time})`);
      return;
    }

    try {
      await apiFetch('/api/doses', {
        method: 'POST',
        body: JSON.stringify({
          action: 'log',
          scheduleId: item.schedule_id
        })
      });
      await loadCloudWorkspace(context);
      showToast('ok', `✓ 已即時寫入 Neon 雲端並消退同家庭成員提醒！`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        await loadCloudWorkspace(context);
        showToast('warn', err.message);
      } else {
        showToast('err', err instanceof ApiError ? err.message : '打卡失敗');
      }
    }
  }

  async function handleResetDose(item: ScheduleItem) {
    if (!context) {
      setSchedules((prev) =>
        prev.map((s) =>
          s.schedule_id === item.schedule_id
            ? {
                ...s,
                today_log_id: null,
                today_logged_by: null,
                today_logged_at: null
              }
            : s
        )
      );
      showToast('ok', `↺ 已重置「${item.medication_name}」(${item.scheduled_time}) 的今日打卡`);
      return;
    }

    try {
      await apiFetch('/api/doses', {
        method: 'POST',
        body: JSON.stringify({
          action: 'reset_dose',
          scheduleId: item.schedule_id
        })
      });
      await loadCloudWorkspace(context);
      showToast('ok', `↺ 已重置「${item.medication_name}」(${item.scheduled_time}) 的今日打卡狀態`);
    } catch (err) {
      showToast('err', err instanceof ApiError ? err.message : '重置失敗');
    }
  }

  async function handleResetTodayAll() {
    setConfirmResetAll(false);
    if (!context) {
      setSchedules((prev) =>
        prev.map((s) =>
          s.pet_id === selectedPet.id || pets.length <= 1
            ? {
                ...s,
                today_log_id: null,
                today_logged_by: null,
                today_logged_at: null
              }
            : s
        )
      );
      showToast('ok', `↺ 已重置 ${selectedPet.name} 今日全部餵食/用藥打卡次數`);
      return;
    }

    try {
      await apiFetch('/api/doses', {
        method: 'POST',
        body: JSON.stringify({
          action: 'reset_today_all',
          petId: selectedPet.id
        })
      });
      await loadCloudWorkspace(context);
      showToast('ok', `↺ 已同步重置 ${selectedPet.name} 今日全部打卡次數`);
    } catch (err) {
      showToast('err', err instanceof ApiError ? err.message : '重置失敗');
    }
  }

  function openCreateScheduleModal() {
    setScheduleModalMode('create');
    setEditingPrescriptionId(null);
    setScheduleModalOpen(true);
  }

  function openEditScheduleModal(prescriptionId: string) {
    setScheduleModalMode('edit');
    setEditingPrescriptionId(prescriptionId);
    setScheduleModalOpen(true);
  }

  async function handleSaveScheduleModal(payload: ScheduleEditorSubmitPayload) {
    setScheduleSaving(true);
    try {
      if (!context) {
        const label = mealTimingLabel(payload.mealTiming);
        if (payload.mode === 'create') {
          const rxId = `guest-rx-${Date.now()}`;
          const newItems: ScheduleItem[] = payload.slots.map((slot, idx) => ({
            schedule_id: `guest-sched-${Date.now()}-${idx}`,
            pet_id: selectedPet.id,
            pet_name: selectedPet.name,
            pet_emoji: selectedPet.avatar_emoji,
            prescription_id: rxId,
            medication_name: payload.medicationName,
            clinic_name: null,
            dosage_text: payload.dosageText,
            meal_timing: payload.mealTiming,
            total_days: payload.totalDays,
            scheduled_time: slot.scheduledTime,
            label,
            today_log_id: null,
            today_logged_by: null,
            today_logged_at: null
          }));
          setSchedules((prev) =>
            [...prev, ...newItems].sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time))
          );
          showToast('ok', `✓ 已新增「${payload.medicationName}」（每日 ${payload.slots.length} 次）`);
        } else if (payload.prescriptionId) {
          setSchedules((prev) => {
            const others = prev.filter((s) => s.prescription_id !== payload.prescriptionId);
            const existingById = new Map(
              prev
                .filter((s) => s.prescription_id === payload.prescriptionId)
                .map((s) => [s.schedule_id, s])
            );
            const updated: ScheduleItem[] = payload.slots.map((slot, idx) => {
              const old = slot.scheduleId ? existingById.get(slot.scheduleId) : undefined;
              return {
                schedule_id: old ? old.schedule_id : `guest-sched-${Date.now()}-${idx}`,
                pet_id: selectedPet.id,
                pet_name: selectedPet.name,
                pet_emoji: selectedPet.avatar_emoji,
                prescription_id: payload.prescriptionId!,
                medication_name: payload.medicationName,
                clinic_name: old?.clinic_name ?? null,
                dosage_text: payload.dosageText,
                meal_timing: payload.mealTiming,
                total_days: payload.totalDays,
                scheduled_time: slot.scheduledTime,
                label,
                today_log_id: old?.today_log_id ?? null,
                today_logged_by: old?.today_logged_by ?? null,
                today_logged_at: old?.today_logged_at ?? null
              };
            });
            return [...others, ...updated].sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
          });
          showToast('ok', `✓ 已修改「${payload.medicationName}」為每日 ${payload.slots.length} 次`);
        }
        setScheduleModalOpen(false);
        return;
      }

      if (payload.mode === 'create') {
        await apiFetch('/api/doses', {
          method: 'POST',
          body: JSON.stringify({
            action: 'create_schedule',
            petId: payload.petId,
            medicationName: payload.medicationName,
            dosageText: payload.dosageText,
            mealTiming: payload.mealTiming,
            totalDays: payload.totalDays,
            slots: payload.slots
          })
        });
        await loadCloudWorkspace(context);
        showToast('ok', `✓ 已新增「${payload.medicationName}」（每日 ${payload.slots.length} 次）至 Neon 雲端`);
      } else {
        await apiFetch('/api/doses', {
          method: 'POST',
          body: JSON.stringify({
            action: 'update_prescription',
            prescriptionId: payload.prescriptionId,
            medicationName: payload.medicationName,
            dosageText: payload.dosageText,
            mealTiming: payload.mealTiming,
            totalDays: payload.totalDays,
            slots: payload.slots
          })
        });
        await loadCloudWorkspace(context);
        showToast('ok', `✓ 已更新「${payload.medicationName}」每日次數與時段`);
      }
      setScheduleModalOpen(false);
    } catch (err) {
      showToast('err', err instanceof ApiError ? err.message : '儲存排程失敗');
    } finally {
      setScheduleSaving(false);
    }
  }

  async function handleDeletePrescription(prescriptionId: string) {
    setScheduleSaving(true);
    try {
      if (!context) {
        setSchedules((prev) => prev.filter((s) => s.prescription_id !== prescriptionId));
        setScheduleModalOpen(false);
        showToast('ok', '✓ 已移除該餵食 / 用藥項目');
        return;
      }
      await apiFetch('/api/doses', {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete_prescription',
          prescriptionId
        })
      });
      await loadCloudWorkspace(context);
      setScheduleModalOpen(false);
      showToast('ok', '✓ 已停用並移除該餵食 / 用藥排程');
    } catch (err) {
      showToast('err', err instanceof ApiError ? err.message : '移除失敗');
    } finally {
      setScheduleSaving(false);
    }
  }

  async function handleAcknowledgeConflict(conflictId: string) {
    if (!context) return;
    try {
      await apiFetch('/api/doses', {
        method: 'POST',
        body: JSON.stringify({ action: 'acknowledge_conflict', conflictId })
      });
      await loadCloudWorkspace(context);
      showToast('ok', '✓ 已確認並標記該衝突紀錄為已處理');
    } catch {
      showToast('err', '更新失敗');
    }
  }

  async function handleAddPet(e: React.FormEvent) {
    e.preventDefault();
    if (!newPetName.trim()) return;

    if (!context) {
      if (pets.length >= 1) {
        openPaywall('Trigger C：一般版僅限 1 隻寵物！請先連動雲端帳號並升級 PRO 或輸入好友邀請碼。');
        return;
      }
      return;
    }

    try {
      await apiFetch('/api/pets', {
        method: 'POST',
        body: JSON.stringify({
          name: newPetName.trim(),
          species: newPetSpecies,
          breed: newPetBreed.trim() || undefined
        })
      });
      setNewPetName('');
      setNewPetBreed('');
      setShowAddPet(false);
      await loadCloudWorkspace(context);
      showToast('ok', '✓ 已新增毛孩檔案至雲端！');
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        openPaywall(err.message);
      } else {
        showToast('err', err instanceof ApiError ? err.message : '新增失敗');
      }
    }
  }

  function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setOcrPreviewUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleRunOcr() {
    if (!context) {
      const demoDraft: OcrDraft = {
        medicationName: { value: '心安舒 HeartCalm 膠囊', confidence: 0.94, confidenceLevel: 'high', uiHighlight: 'green_verified' },
        clinicName: { value: null, confidence: 0.58, confidenceLevel: 'low', uiHighlight: 'yellow_review' },
        dosageText: { value: null, confidence: 0.61, confidenceLevel: 'low', uiHighlight: 'yellow_review' },
        mealTiming: { value: 'after_meal', confidence: 0.89, confidenceLevel: 'high', uiHighlight: 'green_verified' },
        totalDays: { value: null, confidence: 0, confidenceLevel: 'missing', uiHighlight: 'red_required' },
        times: ['08:00', '20:30'],
        requiresHumanConfirmation: true,
        confirmationCheckboxText: '我已逐項核對實體動物醫院藥袋文字與上述排程時間無誤（本工具僅供照護紀錄，非醫療建議）'
      };
      setOcrDraft(demoDraft);
      setOcrForm({
        medicationName: demoDraft.medicationName.value || '',
        clinicName: '',
        dosageText: '',
        mealTiming: 'after_meal',
        totalDays: '',
        timesText: demoDraft.times.join(', '),
        humanConfirmed: false
      });
      showToast('ok', '已產生三級信心覆核預覽！登入雲端後可儲存排程並累計/觸發好友 VIP 獎勵。');
      return;
    }

    setOcrLoading(true);
    try {
      const res = await apiFetch<{ ok: boolean; draft: OcrDraft }>('/api/ocr', {
        method: 'POST',
        body: JSON.stringify({
          action: 'parse',
          petId: selectedPetId,
          presetKey: ocrPreset,
          filename: ocrFilename || undefined
        })
      });
      setOcrDraft(res.draft);
      setOcrForm({
        medicationName: res.draft.medicationName.value || '',
        clinicName: res.draft.clinicName.value || '',
        dosageText: res.draft.dosageText.value || '',
        mealTiming: res.draft.mealTiming.value || 'after_meal',
        totalDays: res.draft.totalDays.value ? String(res.draft.totalDays.value) : '',
        timesText: res.draft.times.join(', '),
        humanConfirmed: false
      });
      const refreshed = await apiFetch<{ context: AuthContext }>('/api/auth');
      if (refreshed.context) setContext(refreshed.context);
      showToast('ok', '✓ OCR 文字轉錄完成，請依紅/黃/綠標示核對後勾選建立排程');
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        openPaywall(`Trigger B：${err.message}`);
      } else {
        showToast('err', err instanceof ApiError ? err.message : '辨識失敗');
      }
    } finally {
      setOcrLoading(false);
    }
  }

  async function handleConfirmOcr(e: React.FormEvent) {
    e.preventDefault();
    if (!ocrForm.humanConfirmed) {
      showToast('warn', '法規安全要求：請先勾選「我已逐項核對實體藥袋無誤」');
      return;
    }
    if (!context) {
      setAuthModalOpen(true);
      return;
    }

    setOcrLoading(true);
    try {
      const times = ocrForm.timesText
        .split(/[,，\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await apiFetch<{ ok: boolean; referralRewarded: boolean; context: AuthContext }>('/api/ocr', {
        method: 'POST',
        body: JSON.stringify({
          action: 'confirm',
          petId: selectedPetId,
          medicationName: ocrForm.medicationName,
          clinicName: ocrForm.clinicName,
          dosageText: ocrForm.dosageText,
          mealTiming: ocrForm.mealTiming,
          totalDays: Number(ocrForm.totalDays || 7),
          times,
          humanConfirmed: ocrForm.humanConfirmed
        })
      });
      setOcrDraft(null);
      await loadCloudWorkspace(res.context);
      setActiveTab('today');
      if (res.referralRewarded) {
        showToast('ok', '🎉 完成首次藥袋掃描！已為您與推薦好友雙方發放 +14 天 VIP 體驗！');
      } else {
        showToast('ok', '✓ 已建立照護排程並同步至家庭所有成員！');
      }
    } catch (err) {
      showToast('err', err instanceof ApiError ? err.message : '建立排程失敗');
    } finally {
      setOcrLoading(false);
    }
  }

  async function handleJoinFamily(e: React.FormEvent) {
    e.preventDefault();
    if (!context) {
      setAuthModalOpen(true);
      return;
    }
    try {
      const res = await apiFetch<{ ok: boolean; joinedFamilyName?: string; message?: string; context: AuthContext }>(
        '/api/family',
        {
          method: 'POST',
          body: JSON.stringify({ action: 'join', inviteCode: joinCodeInput.trim() })
        }
      );
      setJoinCodeInput('');
      await loadCloudWorkspace(res.context);
      showToast('ok', res.joinedFamilyName ? `✓ 已成功連線加入「${res.joinedFamilyName}」！` : res.message || '✓ 已更新家庭狀態');
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        openPaywall(`Trigger A：${err.message}`);
      } else {
        showToast('err', err instanceof ApiError ? err.message : '加入家庭失敗');
      }
    }
  }

  const selectedPet = pets.find((p) => p.id === selectedPetId) ?? pets[0] ?? GUEST_DEFAULT_PETS[0];
  const filteredSchedules = schedules.filter((s) => s.pet_id === selectedPetId || pets.length <= 1);
  const doneCount = filteredSchedules.filter((s) => Boolean(s.today_log_id)).length;
  const pendingCount = Math.max(0, filteredSchedules.length - doneCount);
  const unresolvedConflicts = conflicts.filter((c) => c.resolution_state === 'unresolved');

  const editingPrescriptionData = editingPrescriptionId
    ? (() => {
        const matched = filteredSchedules.filter((s) => s.prescription_id === editingPrescriptionId);
        if (matched.length === 0) return null;
        return {
          prescriptionId: editingPrescriptionId,
          medicationName: matched[0].medication_name,
          dosageText: matched[0].dosage_text,
          mealTiming: matched[0].meal_timing || 'after_meal',
          totalDays: matched[0].total_days || 7,
          slots: matched.map((m) => ({
            scheduleId: m.schedule_id,
            scheduledTime: m.scheduled_time,
            todayDone: Boolean(m.today_log_id)
          }))
        };
      })()
    : null;

  function highlightClass(level?: 'high' | 'low' | 'missing') {
    if (level === 'missing') return 'border-2 border-[#D32F2F] bg-white focus:ring-[#D32F2F]/30';
    if (level === 'low') return 'border border-[#E6B800] bg-[#FFF8E1] focus:ring-[#E6B800]/30';
    if (level === 'high') return 'border border-[#81C784] bg-[#E8F5E9] focus:ring-[#4CAF50]/30';
    return 'border border-white/80 bg-white/85';
  }

  return (
    <div className="ambient-canvas min-h-screen">
      {/* Safe Harbor Non-Medical Banner */}
      <div className="border-b border-white/70 bg-white/55 backdrop-blur-md px-4 py-2 text-center text-[11px] font-medium text-[var(--ink-secondary)]">
        <span className="mr-2 inline-block rounded-md bg-[var(--status-ok-bg)] px-2 py-0.5 font-bold text-[var(--status-ok)]">
          非醫療輔助工具
        </span>
        本服務僅供毛孩日常照護紀錄與排程備忘，絕不構成獸醫診斷、處方或劑量推算；有任何健康疑慮請洽合格實體動物醫院。
        <a href="/landing.html" className="ml-2 font-bold text-[var(--brand-primary)] underline">
          官網與早鳥名單
        </a>
      </div>

      {/* Main Centered App Shell */}
      <div className="mx-auto max-w-4xl px-4 pt-5">
        {/* Top Liquid Glass Header */}
        <header className="liquid-glass relative z-30 rounded-[28px] px-4 py-3.5 sm:px-6 mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-gold)] text-white shadow-md">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight">PetCare AI 拍立得寵物護理</h1>
                {context?.entitlement.isVip ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-gold)] px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-sm">
                    <Crown className="h-3 w-3" /> VIP
                  </span>
                ) : (
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-[var(--ink-secondary)]">
                    Free 一般版
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--ink-secondary)]">
                {context
                  ? `Neon 雲端同步中 ・ ${context.family.name}（${context.family.memberCount}/${context.entitlement.maxFamilyMembers} 人）`
                  : '目前為本機試用模式 ・ 登入即開啟 Neon 雲端帳號連動'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeSwitcher themeId={themeId} onChange={handleChangeTheme} variant="pill" />

            {!context ? (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-hover)] px-4 py-2 text-xs font-extrabold text-white shadow-md hover:brightness-105"
                style={{ boxShadow: '0 8px 18px var(--brand-primary-shadow)' }}
              >
                <Cloud className="h-3.5 w-3.5" />
                連動雲端帳號
              </button>
            ) : (
              <button
                type="button"
                onClick={() => loadCloudWorkspace(context)}
                className="flex items-center gap-1.5 rounded-2xl bg-white/80 px-3 py-2 text-xs font-bold text-[var(--brand-secondary)] hover:bg-white border border-white"
                title="從 Neon 重新同步"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">已連線雲端</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => openPaywall()}
              className="flex items-center gap-1 rounded-2xl bg-white/85 px-3 py-2 text-xs font-extrabold text-[var(--ink-primary)] border border-white hover:bg-white"
            >
              <Sparkles className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
              {context?.entitlement.isVip ? 'VIP 方案' : '升級 PRO'}
            </button>
          </div>
        </header>

        {/* Guest Cloud Sync Upsell Strip */}
        {!bootLoading && !context && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[var(--brand-secondary-border)] bg-white/75 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center gap-2.5 text-xs text-[var(--ink-primary)]">
              <CloudOff className="h-4 w-4 text-[var(--brand-primary)] shrink-0" />
              <span>
                <strong>尚未連動雲端帳號：</strong>目前資料僅暫存於瀏覽器。註冊或登入即可將毛孩資料上雲並領取 <strong>+14 天好友 VIP</strong> 資格！
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="rounded-xl bg-[var(--brand-secondary)] px-3.5 py-1.5 text-xs font-bold text-white"
            >
              註冊 / 登入同步
            </button>
          </div>
        )}

        {/* Toast Banner */}
        {toast && (
          <div
            className={`mb-4 rounded-2xl px-4 py-3 text-xs font-bold shadow-lg backdrop-blur-md ${
              toast.kind === 'ok'
                ? 'bg-[var(--status-ok-bg)] text-[var(--status-ok)] border border-[var(--status-ok-border)]'
                : toast.kind === 'warn'
                ? 'bg-[var(--status-warn-bg)] text-[var(--status-warn)] border border-[var(--status-warn-border)]'
                : 'bg-[#FEECEC]/95 text-[#B71C1C] border border-[#EF9A9A]'
            }`}
          >
            {toast.text}
          </div>
        )}

        {/* TAB 1: TODAY */}
        {activeTab === 'today' && (
          <div className="space-y-4">
            {/* Unresolved 409 Conflict Alert Banner */}
            {unresolvedConflicts.map((c) => (
              <div
                key={c.id}
                className="rounded-[24px] border-2 border-[#D32F2F]/60 bg-[#FFF4F4]/90 p-4 shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="h-5 w-5 text-[#D32F2F] shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <div className="font-extrabold text-[#B71C1C]">
                        偵測到重複餵藥回報衝突 ({c.scheduled_time} {c.medication_name})
                      </div>
                      <p className="mt-1 text-[var(--ink-secondary)]">
                        原已由 <strong>{c.winning_logged_by}</strong> 完成打卡；<strong>{c.conflicting_name_snapshot}</strong> 稍後亦回報該時段，系統已自動攔截寫入，請觀察毛孩狀況。
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAcknowledgeConflict(c.id)}
                    className="shrink-0 rounded-xl bg-[#D32F2F] px-3 py-1.5 text-[11px] font-bold text-white"
                  >
                    我已確認狀況
                  </button>
                </div>
              </div>
            ))}

            {/* Multi-pet Selector Pill Bar */}
            <div className="liquid-glass rounded-[24px] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <span className="text-xs font-extrabold text-[var(--ink-secondary)]">毛孩健康檔案</span>
                <button
                  type="button"
                  onClick={() => {
                    if (context && !context.entitlement.isVip && pets.length >= 1) {
                      openPaywall('Trigger C：一般版僅支援 1 隻毛孩檔案，升級 PRO 或輸入好友邀請碼即可新增第 2 隻毛孩！');
                    } else {
                      setShowAddPet((v) => !v);
                    }
                  }}
                  className="flex items-center gap-1 rounded-xl bg-white/85 px-3 py-1.5 text-xs font-bold text-[var(--brand-primary)] border border-white"
                >
                  <Plus className="h-3.5 w-3.5" /> 新增毛孩
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {pets.map((pet) => {
                  const selected = pet.id === selectedPetId;
                  return (
                    <button
                      key={pet.id}
                      type="button"
                      onClick={() => {
                        setSelectedPetId(pet.id);
                        setConfirmResetAll(false);
                      }}
                      className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition ${
                        selected
                          ? 'bg-[var(--ink-primary)] text-white shadow-md'
                          : 'bg-white/75 text-[var(--ink-primary)] hover:bg-white border border-white'
                      }`}
                    >
                      {pet.species === 'other' ? (
                        <span>{pet.avatar_emoji}</span>
                      ) : (
                        <img
                          src={getPetMascotSrc(pet.species)}
                          alt={pet.name}
                          className="h-6 w-6 rounded-full bg-white/90 object-contain p-0.5 shadow-sm"
                          draggable={false}
                        />
                      )}
                      <span>{pet.name}</span>
                      {pet.breed && <span className="opacity-70">({pet.breed})</span>}
                    </button>
                  );
                })}
              </div>

              {showAddPet && (
                <form onSubmit={handleAddPet} className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-2 pt-3 border-t border-white/70">
                  <input
                    type="text"
                    required
                    value={newPetName}
                    onChange={(e) => setNewPetName(e.target.value)}
                    placeholder="毛孩名字（如 麻糬）"
                    className="rounded-xl border border-white bg-white/90 px-3 py-2 text-xs outline-none"
                  />
                  <select
                    value={newPetSpecies}
                    onChange={(e) => setNewPetSpecies(e.target.value as 'dog' | 'cat' | 'other')}
                    className="rounded-xl border border-white bg-white/90 px-3 py-2 text-xs outline-none"
                  >
                    <option value="dog">🐶 狗狗</option>
                    <option value="cat">🐱 貓咪</option>
                    <option value="other">🐾 其他毛孩</option>
                  </select>
                  <input
                    type="text"
                    value={newPetBreed}
                    onChange={(e) => setNewPetBreed(e.target.value)}
                    placeholder="品種（選填）"
                    className="rounded-xl border border-white bg-white/90 px-3 py-2 text-xs outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-[var(--brand-primary)] px-3 py-2 text-xs font-bold text-white"
                  >
                    確認新增
                  </button>
                </form>
              )}
            </div>

            {/* Today Summary Metric Card with Interactive 3D Pet Companion */}
            <div className="liquid-glass rounded-[28px] p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-5">
              <div className="flex-1 w-full">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--brand-secondary)]">
                  <CalendarDays className="h-4 w-4" />
                  <span>今日照護進度 ({new Date().toLocaleDateString('zh-TW')})</span>
                </div>
                <div className="mt-1 text-2xl font-black tracking-tight">
                  已完成 {doneCount} / {filteredSchedules.length} 次照護打卡
                </div>
                <div className="mt-2.5 h-2 w-full max-w-sm overflow-hidden rounded-full bg-white/75 border border-white">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${filteredSchedules.length ? Math.round((doneCount / filteredSchedules.length) * 100) : 0}%`,
                      background:
                        filteredSchedules.length > 0 && doneCount >= filteredSchedules.length
                          ? 'var(--status-ok)'
                          : 'linear-gradient(90deg, var(--brand-primary), var(--brand-gold))'
                    }}
                  />
                </div>
                <p className="text-xs text-[var(--ink-secondary)] mt-2">
                  可隨時新增或修改每日餵食／用藥次數；點擊「我已餵藥打卡」即同步家人，按「重置」即可取消誤觸紀錄。
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={openCreateScheduleModal}
                    className="flex items-center gap-1.5 rounded-2xl bg-[var(--brand-primary)] px-4 py-2.5 text-xs font-bold text-white shadow-md hover:brightness-105"
                    style={{ boxShadow: '0 8px 18px var(--brand-primary-shadow)' }}
                  >
                    <Plus className="h-4 w-4" /> 新增餵食 / 用藥
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ocr')}
                    className="flex items-center gap-1.5 rounded-2xl bg-white/85 px-4 py-2.5 text-xs font-bold text-[var(--ink-primary)] border border-white hover:bg-white"
                  >
                    <Camera className="h-4 w-4 text-[var(--brand-primary)]" /> 拍藥袋建排程
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportOpen(true)}
                    className="flex items-center gap-1.5 rounded-2xl bg-white/85 px-4 py-2.5 text-xs font-bold text-[var(--ink-primary)] border border-white hover:bg-white"
                  >
                    <FileText className="h-4 w-4 text-[var(--brand-secondary)]" /> 匯出紀錄
                  </button>
                  {doneCount > 0 && (
                    !confirmResetAll ? (
                      <button
                        type="button"
                        onClick={() => setConfirmResetAll(true)}
                        className="flex items-center gap-1.5 rounded-2xl bg-white/85 px-3.5 py-2.5 text-xs font-bold text-[var(--brand-secondary)] border border-white hover:bg-white"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> 重置今日次數
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 rounded-2xl bg-[var(--status-warn-bg)] border border-[var(--status-warn-border)] px-3 py-1.5">
                        <span className="text-[11px] font-bold text-[var(--status-warn)]">清空今日打卡？</span>
                        <button
                          type="button"
                          onClick={handleResetTodayAll}
                          className="rounded-xl bg-[var(--brand-primary)] px-2.5 py-1 text-[11px] font-bold text-white"
                        >
                          確定重置
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmResetAll(false)}
                          className="rounded-xl bg-white px-2.5 py-1 text-[11px] font-bold text-[var(--ink-secondary)]"
                        >
                          取消
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="shrink-0 rounded-[24px] bg-white/55 px-4 py-3 border border-white/80 shadow-inner">
                <PetCompanion3D
                  species={selectedPet.species}
                  petName={selectedPet.name}
                  pendingCount={pendingCount}
                  doneCount={doneCount}
                  totalCount={filteredSchedules.length}
                />
              </div>
            </div>

            {/* Today Schedule List */}
            <div className="space-y-3">
              {filteredSchedules.length === 0 ? (
                <div className="liquid-glass rounded-[24px] p-7 flex flex-col items-center gap-2 text-center text-sm text-[var(--ink-secondary)]">
                  <PetCompanion3D
                    species={selectedPet.species}
                    petName={selectedPet.name}
                    pendingCount={0}
                    doneCount={0}
                    totalCount={0}
                    compact
                  />
                  <p className="font-bold text-[var(--ink-primary)]">
                    {selectedPet.name}目前尚無照護排程
                  </p>
                  <p className="text-xs text-[var(--ink-secondary)]">
                    點擊「新增餵食 / 用藥」自訂每日次數，或使用「拍藥袋建排程」快速建立提醒！
                  </p>
                  <button
                    type="button"
                    onClick={openCreateScheduleModal}
                    className="mt-2 flex items-center gap-1.5 rounded-2xl bg-[var(--brand-primary)] px-4 py-2 text-xs font-bold text-white shadow"
                  >
                    <Plus className="h-3.5 w-3.5" /> 立即新增排程
                  </button>
                </div>
              ) : (
                filteredSchedules.map((item) => {
                  const done = Boolean(item.today_log_id);
                  const prescriptionSlotCount = filteredSchedules.filter(
                    (s) => s.prescription_id === item.prescription_id
                  ).length;
                  return (
                    <div
                      key={item.schedule_id}
                      className={`liquid-glass rounded-[24px] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 transition ${
                        done ? 'opacity-95' : 'ring-1 ring-[var(--brand-primary-border)]'
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl font-black text-xs ${
                            done
                              ? 'bg-[var(--status-ok-bg)] text-[var(--status-ok)]'
                              : 'bg-[var(--brand-primary-light)] text-[var(--brand-primary)]'
                          }`}
                        >
                          <Clock className="h-3.5 w-3.5 mb-0.5" />
                          {item.scheduled_time}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-extrabold">{item.medication_name}</span>
                            <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-[var(--ink-secondary)]">
                              {item.pet_emoji} {item.pet_name}
                            </span>
                            <span className="rounded-full bg-[var(--brand-primary-light)] px-2 py-0.5 text-[10px] font-bold text-[var(--brand-primary-hover)]">
                              每日 {prescriptionSlotCount} 次
                            </span>
                          </div>
                          <div className="mt-0.5 text-xs text-[var(--ink-secondary)]">
                            {item.dosage_text} {item.clinic_name ? `・ ${item.clinic_name}` : ''}
                          </div>
                          {done ? (
                            <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-[var(--status-ok)]">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              已由「{item.today_logged_by}」完成打卡
                            </div>
                          ) : (
                            <div className="mt-1 text-[11px] font-semibold text-[var(--brand-gold)]">等待照護者打卡中</div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditScheduleModal(item.prescription_id)}
                          className="flex items-center gap-1 rounded-2xl bg-white/85 px-3 py-2 text-xs font-bold text-[var(--ink-secondary)] border border-white hover:bg-white transition"
                          title="修改每日餵食 / 用藥次數與時間"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span>修改次數</span>
                        </button>

                        {done ? (
                          <button
                            type="button"
                            onClick={() => handleResetDose(item)}
                            className="flex items-center gap-1 rounded-2xl border border-[var(--brand-secondary-border)] bg-white/85 px-3.5 py-2 text-xs font-bold text-[var(--brand-secondary)] hover:bg-white transition"
                            title="重置這一次的打卡狀態"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>重置</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleCheckIn(item)}
                            className="rounded-2xl bg-gradient-to-r from-[var(--brand-secondary)] to-[var(--brand-secondary-hover)] px-5 py-2.5 text-xs font-extrabold text-white shadow-md hover:brightness-110"
                          >
                            ✓ 我已餵藥打卡
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: OCR SCAN */}
        {activeTab === 'ocr' && (
          <div className="space-y-4">
            <div className="liquid-glass rounded-[28px] p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <PetCompanion3D
                    species={selectedPet.species}
                    petName={selectedPet.name}
                    pendingCount={pendingCount}
                    doneCount={doneCount}
                    totalCount={filteredSchedules.length}
                    compact
                  />
                  <div>
                    <h2 className="text-lg font-extrabold flex items-center gap-2">
                      <Camera className="h-5 w-5 text-[var(--brand-primary)]" />
                      拍立得藥袋 OCR 轉錄・人機協同核對
                    </h2>
                    <p className="text-xs text-[var(--ink-secondary)]">
                      辨識信心 &lt; 85% 自動留空標黃、必填缺失標紅，並強制經飼主目視核對才建立鬧鐘（100% 虛擬示範藥名）。
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl bg-white/80 px-3.5 py-2 text-xs font-bold">
                  本月額度：
                  {context?.entitlement.isVip ? (
                    <span className="text-[var(--status-ok)] ml-1">VIP 無限次</span>
                  ) : (
                    <span className="text-[var(--brand-primary)] ml-1">
                      {context ? `${context.entitlement.ocrUsedThisMonth} / 3 次` : '免費試用（登入追蹤 3 次/月）'}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="rounded-2xl bg-white/70 p-4 border border-white space-y-3">
                  <label className="block text-xs font-bold text-[var(--ink-secondary)]">1. 上傳實體藥袋照片或選擇虛擬範例</label>
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--brand-secondary-border)] bg-white/60 p-4 text-center hover:bg-white transition">
                    <Upload className="h-6 w-6 text-[var(--brand-secondary)] mb-1.5" />
                    <span className="text-xs font-bold text-[var(--ink-primary)]">
                      {ocrFilename ? `已選取：${ocrFilename}` : '點擊拍照 / 選擇藥袋圖片'}
                    </span>
                    <span className="text-[10px] text-[var(--ink-muted)] mt-0.5">支援 JPG / PNG（隱私不落地永久原圖）</span>
                    <input type="file" accept="image/*" onChange={handlePhotoSelected} className="hidden" />
                  </label>

                  {ocrPreviewUrl && (
                    <img
                      src={ocrPreviewUrl}
                      alt="藥袋預覽"
                      className="h-32 w-full rounded-xl object-cover border border-white"
                    />
                  )}
                </div>

                <div className="rounded-2xl bg-white/70 p-4 border border-white space-y-3">
                  <label className="block text-xs font-bold text-[var(--ink-secondary)]">2. 選擇模擬掃描情境（測試三級信心色碼）</label>
                  <div className="space-y-2">
                    {[
                      {
                        key: 'heartcalm' as const,
                        title: '心安舒 HeartCalm（含 <85% 留空與紅框必填）',
                        desc: '測試低信心黃底覆核＋必填紅框自動聚焦'
                      },
                      {
                        key: 'gastrowell' as const,
                        title: '胃潰寧 GastroWell（高信心綠色辨識）',
                        desc: '全部欄位 >= 85% 綠底顯示，快速核對送出'
                      },
                      {
                        key: 'soothecoat' as const,
                        title: '舒敏錠 SootheCoat（診所名稱低信心留空）',
                        desc: '適合睡前照護排程示範'
                      }
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setOcrPreset(opt.key)}
                        className={`w-full text-left rounded-xl p-2.5 text-xs border transition ${
                          ocrPreset === opt.key
                            ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)]'
                            : 'border-white bg-white/80 hover:bg-white'
                        }`}
                      >
                        <div className="font-bold">{opt.title}</div>
                        <div className="text-[10px] text-[var(--ink-secondary)]">{opt.desc}</div>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={ocrLoading}
                    onClick={handleRunOcr}
                    className="w-full rounded-2xl bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-hover)] py-3 text-xs font-extrabold text-white shadow-md hover:brightness-105 disabled:opacity-60"
                    style={{ boxShadow: '0 8px 18px var(--brand-primary-shadow)' }}
                  >
                    {ocrLoading ? '雲端辨識轉錄中...' : '開始拍立得文字轉錄'}
                  </button>
                </div>
              </div>

              {/* 3-tier Confidence Manual Review Form */}
              {ocrDraft && (
                <form onSubmit={handleConfirmOcr} className="rounded-[24px] bg-white/90 p-5 border border-white space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)]">
                    <span className="text-sm font-extrabold">3. 飼主逐項核對與人工確認</span>
                    <div className="flex gap-2 text-[10px] font-bold">
                      <span className="rounded bg-[#E8F5E9] px-2 py-0.5 text-[#2E7D32]">高信心 &ge;85%</span>
                      <span className="rounded bg-[#FFF8E1] px-2 py-0.5 text-[#9A6B00]">低信心 &lt;85% 留空覆核</span>
                      <span className="rounded border border-[#D32F2F] px-2 py-0.5 text-[#D32F2F]">必填未識別</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-bold">藥包名稱（必填）</label>
                      <input
                        type="text"
                        required
                        value={ocrForm.medicationName}
                        onChange={(e) => setOcrForm({ ...ocrForm, medicationName: e.target.value })}
                        className={`w-full rounded-xl px-3 py-2 text-xs outline-none ${highlightClass(ocrDraft.medicationName.confidenceLevel)}`}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold">動物醫院名稱（選填）</label>
                      <input
                        type="text"
                        value={ocrForm.clinicName}
                        onChange={(e) => setOcrForm({ ...ocrForm, clinicName: e.target.value })}
                        placeholder={ocrDraft.clinicName.confidenceLevel === 'low' ? '信心度不足，請手動對照藥袋填寫' : ''}
                        className={`w-full rounded-xl px-3 py-2 text-xs outline-none ${highlightClass(ocrDraft.clinicName.confidenceLevel)}`}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold">藥袋指示用量文字（必填，不自動計算劑量）</label>
                      <input
                        type="text"
                        required
                        value={ocrForm.dosageText}
                        onChange={(e) => setOcrForm({ ...ocrForm, dosageText: e.target.value })}
                        placeholder="請依藥袋填寫（如：每次 1 顆・每日 2 次）"
                        className={`w-full rounded-xl px-3 py-2 text-xs outline-none ${highlightClass(ocrDraft.dosageText.confidenceLevel)}`}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold">療程總天數（必填）</label>
                      <input
                        type="number"
                        min={1}
                        max={90}
                        required
                        value={ocrForm.totalDays}
                        onChange={(e) => setOcrForm({ ...ocrForm, totalDays: e.target.value })}
                        placeholder="必填天數（如 7）"
                        className={`w-full rounded-xl px-3 py-2 text-xs outline-none ${highlightClass(ocrDraft.totalDays.confidenceLevel)}`}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold">每日提醒時間（逗號分隔）</label>
                      <input
                        type="text"
                        required
                        value={ocrForm.timesText}
                        onChange={(e) => setOcrForm({ ...ocrForm, timesText: e.target.value })}
                        className="w-full rounded-xl border border-[#81C784] bg-[#E8F5E9] px-3 py-2 text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold">飯前 / 飯後備註</label>
                      <select
                        value={ocrForm.mealTiming}
                        onChange={(e) => setOcrForm({ ...ocrForm, mealTiming: e.target.value })}
                        className="w-full rounded-xl border border-[#81C784] bg-[#E8F5E9] px-3 py-2 text-xs outline-none"
                      >
                        <option value="after_meal">飯後照護</option>
                        <option value="before_meal">飯前照護</option>
                        <option value="before_bed">睡前照護</option>
                      </select>
                    </div>
                  </div>

                  <label className="flex items-start gap-2.5 rounded-2xl bg-[var(--bg-canvas)] p-3 text-xs font-bold text-[var(--ink-primary)]">
                    <input
                      type="checkbox"
                      checked={ocrForm.humanConfirmed}
                      onChange={(e) => setOcrForm({ ...ocrForm, humanConfirmed: e.target.checked })}
                      className="mt-0.5 h-4 w-4 accent-[var(--brand-primary)]"
                    />
                    <span>{ocrDraft.confirmationCheckboxText}</span>
                  </label>

                  <button
                    type="submit"
                    disabled={ocrLoading}
                    className="w-full rounded-2xl bg-[var(--brand-secondary)] py-3 text-xs font-extrabold text-white shadow-md hover:brightness-110 disabled:opacity-60"
                  >
                    {context ? '確認無誤・寫入雲端建立排程' : '註冊 / 登入雲端帳號以儲存排程'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: FAMILY SYNC */}
        {activeTab === 'family' && (
          <div className="space-y-4">
            <div className="liquid-glass rounded-[28px] p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-extrabold flex items-center gap-2">
                    <Users className="h-5 w-5 text-[var(--brand-secondary)]" />
                    家庭連線共享中心（PRO 上限 10 人）
                  </h2>
                  <p className="text-xs text-[var(--ink-secondary)]">
                    任何家人完成打卡後即時同步 Neon 雲端，其他成員即刻消退提醒、並透過資料庫鎖擋下重複餵藥。
                  </p>
                </div>
                {!context?.entitlement.isVip && (
                  <button
                    type="button"
                    onClick={() => openPaywall('Trigger A：多人家庭同步為 VIP / PRO 專屬功能，升級後支援最多 10 人即時連線！')}
                    className="rounded-xl bg-[var(--brand-primary)] px-3.5 py-2 text-xs font-bold text-white"
                  >
                    升級解鎖 10 人同步
                  </button>
                )}
              </div>

              {context ? (
                <>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/80 p-4 border border-white">
                    <div>
                      <div className="text-[11px] text-[var(--ink-muted)]">我的家庭空間邀請碼（最多 10 位成員）</div>
                      <div className="text-2xl font-black tracking-widest text-[var(--brand-primary)]">{context.family.inviteCode}</div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(context.family.inviteCode).catch(() => undefined);
                        setCopiedFamilyCode(true);
                        setTimeout(() => setCopiedFamilyCode(false), 1800);
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-[var(--ink-primary)] px-4 py-2 text-xs font-bold text-white"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copiedFamilyCode ? '已複製家庭代碼' : '複製邀請家人'}
                    </button>
                  </div>

                  <div className="mb-4">
                    <div className="text-xs font-bold text-[var(--ink-secondary)] mb-2">
                      已連線成員（{members.length} / {context.entitlement.maxFamilyMembers}）
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {members.map((m) => (
                        <div key={m.id} className="flex items-center justify-between rounded-2xl bg-white/75 p-3 border border-white">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black text-white"
                              style={{ backgroundColor: m.avatar_color }}
                            >
                              {m.display_name.slice(0, 1)}
                            </div>
                            <div>
                              <div className="text-xs font-extrabold">{m.display_name}</div>
                              <div className="text-[10px] text-[var(--ink-muted)]">{m.timezone}</div>
                            </div>
                          </div>
                          <span className="rounded-full bg-[var(--bg-canvas)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--brand-secondary)]">
                            {m.role === 'owner' ? '建立者' : '成員'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={handleJoinFamily} className="rounded-2xl bg-[var(--bg-canvas)] p-4 border border-white">
                    <label className="block text-xs font-bold mb-2">輸入家人分享的代碼，加入現有家庭空間</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={joinCodeInput}
                        onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                        placeholder="例如：PET-4X9K"
                        className="flex-1 rounded-xl border border-white bg-white px-3 py-2 text-xs uppercase tracking-wider outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!joinCodeInput.trim()}
                        className="rounded-xl bg-[var(--brand-secondary)] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                      >
                        連線加入
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="rounded-2xl bg-white/75 p-6 text-center space-y-3">
                  <p className="text-xs text-[var(--ink-secondary)]">請先登入或註冊雲端帳號，即可建立家庭邀請碼或輸入家人代碼連線同步。</p>
                  <button
                    type="button"
                    onClick={() => setAuthModalOpen(true)}
                    className="rounded-2xl bg-[var(--brand-primary)] px-5 py-2.5 text-xs font-bold text-white"
                  >
                    立即連動雲端帳號
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: HISTORY & PDF */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="liquid-glass rounded-[28px] p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-extrabold flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-[var(--brand-secondary)]" />
                    歷史照護紀錄與回診摘要
                  </h2>
                  <p className="text-xs text-[var(--ink-secondary)]">
                    {context?.entitlement.isVip
                      ? 'VIP 永久完整保存所有打卡紀錄，並支援完整區間 PDF 匯出。'
                      : '一般版保留最近 14 天紀錄與當週單張摘要；升級 PRO 永久保存。'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReportOpen(true)}
                  className="flex items-center gap-1.5 rounded-2xl bg-[var(--ink-primary)] px-4 py-2 text-xs font-bold text-white"
                >
                  <FileText className="h-4 w-4" /> 預覽 / 列印 PDF 報表
                </button>
              </div>

              {historyLockedCount > 0 && !context?.entitlement.isVip && (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-[var(--status-warn-bg)] border border-[var(--status-warn-border)] p-3.5 text-xs">
                  <span className="font-bold text-[var(--status-warn)]">
                    <Lock className="inline h-3.5 w-3.5 mr-1" />
                    另有 {historyLockedCount} 筆超過 14 天的歷史紀錄已封存（VIP 可立即解鎖查閱）
                  </span>
                  <button
                    type="button"
                    onClick={() => openPaywall('超過 14 天的歷史照護紀錄為 VIP 專屬功能，升級後立即完整解鎖！')}
                    className="rounded-xl bg-[var(--brand-primary)] px-3 py-1.5 text-[11px] font-bold text-white"
                  >
                    解鎖全部紀錄
                  </button>
                </div>
              )}

              <div className="space-y-2.5">
                {historyLogs.length === 0 ? (
                  <div className="rounded-2xl bg-white/65 p-6 flex flex-col items-center gap-2 text-center text-xs text-[var(--ink-secondary)]">
                    <PetCompanion3D
                      species={selectedPet.species}
                      petName={selectedPet.name}
                      pendingCount={pendingCount}
                      doneCount={doneCount}
                      totalCount={filteredSchedules.length}
                      compact
                    />
                    <span>
                      {context
                        ? '目前尚無歷史打卡紀錄，回到「今日看板」完成首筆打卡後即可在此查閱！'
                        : '登入雲端帳號後，您的每日餵藥打卡歷程將永久同步至此時間軸。'}
                    </span>
                  </div>
                ) : (
                  historyLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between rounded-2xl bg-white/75 p-3.5 border border-white text-xs">
                      <div>
                        <div className="font-extrabold">
                          {log.pet_emoji} {log.pet_name} ・ {log.medication_name}
                        </div>
                        <div className="text-[11px] text-[var(--ink-secondary)]">
                          {log.slot_date} {log.scheduled_time} ・ {log.dosage_text}
                        </div>
                      </div>
                      <span className="rounded-full bg-[var(--status-ok-bg)] px-3 py-1 text-[11px] font-bold text-[var(--status-ok)]">
                        {log.logged_by_name_snapshot} 已打卡
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SETTINGS & VIP MATRIX */}
        {activeTab === 'settings' && (
          <SettingsTab
            context={context}
            referrals={referrals}
            themeId={themeId}
            onChangeTheme={handleChangeTheme}
            onOpenAuth={() => setAuthModalOpen(true)}
            onOpenPaywall={openPaywall}
            onUpdated={(ctx) => loadCloudWorkspace(ctx)}
            onLoggedOut={() => {
              setContext(null);
              setPets(GUEST_DEFAULT_PETS);
              setSelectedPetId('guest-pet-1');
              setSchedules(GUEST_DEFAULT_SCHEDULES);
              setConflicts([]);
              setHistoryLogs([]);
              setMembers([]);
              setReferrals([]);
              showToast('ok', '已登出雲端帳號，返回本機試用模式');
            }}
          />
        )}
      </div>

      {/* Interactive Liquid Glass Floating Bottom Tabbar */}
      <LiquidGlassTabbar activeTab={activeTab} onChangeTab={setActiveTab} />

      {/* Modals */}
      <ScheduleEditorModal
        open={scheduleModalOpen}
        mode={scheduleModalMode}
        pet={selectedPet}
        initialPrescription={editingPrescriptionData}
        saving={scheduleSaving}
        onClose={() => setScheduleModalOpen(false)}
        onSave={handleSaveScheduleModal}
        onDelete={handleDeletePrescription}
      />

      <AuthModal
        open={authModalOpen}
        guestPets={pets}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={(ctx) => {
          loadCloudWorkspace(ctx);
          showToast('ok', `✓ 已成功連動雲端帳號：${ctx.user.displayName}`);
        }}
      />

      <PaywallModal
        open={paywallOpen}
        triggerReason={paywallReason}
        context={context}
        plans={plans}
        onClose={() => setPaywallOpen(false)}
        onUpdated={(ctx) => loadCloudWorkspace(ctx)}
        onRequireAuth={() => setAuthModalOpen(true)}
      />

      <ReportModal
        open={reportOpen}
        context={context}
        pets={pets}
        logs={historyLogs}
        onClose={() => setReportOpen(false)}
        onUpgrade={() => openPaywall('升級 PRO 解鎖完整歷史區間 PDF 報表！')}
      />
    </div>
  );
}
