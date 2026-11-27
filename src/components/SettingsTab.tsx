import React, { useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  Copy,
  Crown,
  Gift,
  Lock,
  LogOut,
  Palette,
  ShieldAlert,
  Trash2,
  UserCheck
} from 'lucide-react';
import { apiFetch, ApiError, setStoredToken } from '../lib/api';
import { getEffectiveEntitlement } from '../lib/entitlements';
import type { ThemeId } from '../lib/theme';
import type { AuthContext } from '../types';
import { RoundedSelect, type RoundedSelectOption } from './RoundedSelect';
import { ThemeSwitcher } from './ThemeSwitcher';

interface SettingsTabProps {
  context: AuthContext | null;
  referrals: Array<{ id: string; status: string; bonus_days: number; friend_name: string; created_at: string }>;
  themeId: ThemeId;
  onChangeTheme: (id: ThemeId) => void;
  onOpenAuth: () => void;
  onOpenPaywall: (reason?: string) => void;
  onUpdated: (ctx: AuthContext) => void;
  onLoggedOut: () => void;
}

const TIMEZONE_OPTIONS: RoundedSelectOption[] = [
  { value: 'Asia/Taipei', label: 'Asia/Taipei (UTC+8 台北)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (UTC+9 東京)' },
  { value: 'Asia/Hong_Kong', label: 'Asia/Hong_Kong (UTC+8 香港)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (美西)' }
];

const MATRIX_ROWS = [
  {
    feature: '寵物健康檔案數量',
    free: '最多 1 隻',
    vip: '無上限',
    key: 'pets'
  },
  {
    feature: '藥袋拍照 OCR 轉錄額度',
    free: '每月 3 次（含 3s 本地備援）',
    vip: '無限次掃描',
    key: 'ocr'
  },
  {
    feature: '家庭多人連線同步',
    free: '✕ 單人本機使用',
    vip: '✓ 最多 10 人即時同步＋防重複餵藥',
    key: 'family'
  },
  {
    feature: '照護與用藥歷史保存',
    free: '最近 14 天',
    vip: '永久完整保存',
    key: 'history'
  },
  {
    feature: '回診日常照護 PDF 報表',
    free: '僅當週單張摘要',
    vip: '無限次匯出完整區間報表',
    key: 'pdf'
  },
  {
    feature: '跨時區浮動時間排程',
    free: '✓ 基本提醒',
    vip: '✓ 全家成員跨時區精準同步',
    key: 'tz'
  }
];

export const SettingsTab: React.FC<SettingsTabProps> = ({
  context,
  referrals,
  themeId,
  onChangeTheme,
  onOpenAuth,
  onOpenPaywall,
  onUpdated,
  onLoggedOut
}) => {
  const [displayName, setDisplayName] = useState(context?.user.displayName || '');
  const [timezone, setTimezone] = useState(context?.user.timezone || 'Asia/Taipei');
  const [copiedCode, setCopiedCode] = useState(false);
  const [referralInput, setReferralInput] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm'>('idle');
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);

  const eff = getEffectiveEntitlement(context);
  const isVip = eff.isVip;

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!context) return;
    try {
      const res = await apiFetch<{ ok: boolean; context: AuthContext }>('/api/auth', {
        method: 'POST',
        body: JSON.stringify({
          action: 'update_profile',
          displayName,
          timezone
        })
      });
      onUpdated(res.context);
      setStatusMsg('✓ 已同步個人設定與時區至 Neon 雲端');
    } catch (err) {
      setStatusMsg(err instanceof ApiError ? err.message : '儲存失敗');
    }
  }

  async function handleCopyReferral() {
    if (!context) return;
    try {
      await navigator.clipboard.writeText(context.user.referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      setStatusMsg(`您的邀請碼：${context.user.referralCode}`);
    }
  }

  async function handleRedeemReferral(e: React.FormEvent) {
    e.preventDefault();
    if (!context) {
      onOpenAuth();
      return;
    }
    try {
      const res = await apiFetch<{ ok: boolean; message: string; context: AuthContext }>('/api/billing', {
        method: 'POST',
        body: JSON.stringify({ action: 'redeem_referral', referralCode: referralInput.trim() })
      });
      onUpdated(res.context);
      setStatusMsg(res.message);
      setReferralInput('');
    } catch (err) {
      setStatusMsg(err instanceof ApiError ? err.message : '兌換失敗');
    }
  }

  async function handleLogout() {
    try {
      await apiFetch('/api/auth', {
        method: 'POST',
        body: JSON.stringify({ action: 'logout' })
      });
    } catch {
      // ignore
    }
    setStoredToken(null);
    onLoggedOut();
  }

  async function handleDeletePreflight() {
    if (!context) return;
    try {
      const res = await apiFetch<{ blockingWarningMessage: string | null }>('/api/auth', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete_account', mode: 'preflight' })
      });
      setDeleteWarning(res.blockingWarningMessage);
      setDeleteStep('confirm');
    } catch (err) {
      setStatusMsg(err instanceof ApiError ? err.message : '預檢失敗');
    }
  }

  async function handleDeleteExecute() {
    try {
      await apiFetch('/api/auth', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete_account', mode: 'execute', transferOwner: true })
      });
      setStoredToken(null);
      onLoggedOut();
    } catch (err) {
      setStatusMsg(err instanceof ApiError ? err.message : '刪除失敗');
    }
  }

  return (
    <div className="space-y-4 pb-6">
      {/* 0. Warm Theme Palette Picker */}
      <div className="liquid-glass rounded-[26px] p-5">
        <div className="flex items-center gap-2 mb-1">
          <Palette className="h-4 w-4 text-[var(--brand-primary)]" />
          <h3 className="text-base font-extrabold">網站暖色系主題配色</h3>
        </div>
        <p className="text-xs text-[var(--ink-secondary)] mb-3">
          選擇您喜歡的暖色調，主應用與產品介紹頁會自動同步套用並保存於此裝置。
        </p>
        <ThemeSwitcher themeId={themeId} onChange={onChangeTheme} variant="cards" />
      </div>

      {/* 1. Cloud Account Status Card */}
      <div className="liquid-glass rounded-[26px] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-white font-black text-lg shadow"
              style={{ backgroundColor: context?.user.avatarColor || 'var(--brand-primary)' }}
            >
              {context ? context.user.displayName.slice(0, 1) : '訪'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold">
                  {context ? context.user.displayName : '本機試用模式（未綁定雲端帳號）'}
                </h3>
                {context ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--status-ok-bg)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--status-ok)]">
                    <Cloud className="h-3 w-3" /> Neon 雲端已連線
                  </span>
                ) : (
                  <span className="rounded-full bg-[var(--status-warn-bg)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--status-warn)]">
                    僅儲存於本機
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--ink-secondary)]">
                {context ? `${context.user.email} ・ ${context.family.name}` : '登入或註冊即可同步寵物資料、多端打卡與好友 VIP 獎勵'}
              </p>
            </div>
          </div>

          {context ? (
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-2xl bg-white/80 px-3.5 py-2 text-xs font-bold text-[var(--ink-secondary)] hover:bg-white border border-white"
            >
              <LogOut className="h-3.5 w-3.5" /> 登出切換帳號
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 rounded-2xl bg-[var(--brand-primary)] px-4 py-2 text-xs font-bold text-white shadow-md"
              style={{ boxShadow: '0 8px 18px var(--brand-primary-shadow)' }}
            >
              <UserCheck className="h-3.5 w-3.5" /> 立即連動雲端帳號
            </button>
          )}
        </div>

        {context && (
          <form onSubmit={handleSaveProfile} className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-4 border-t border-white/60">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="顯示名稱"
              className="rounded-2xl border border-white/80 bg-white/85 px-3.5 py-2.5 text-xs outline-none focus:border-[var(--brand-primary)]"
            />
            <RoundedSelect
              value={timezone}
              options={TIMEZONE_OPTIONS}
              onChange={setTimezone}
              ariaLabel="選擇時區"
            />
            <button
              type="submit"
              className="rounded-2xl bg-[var(--brand-secondary)] px-4 py-2.5 text-xs font-bold text-white hover:brightness-110"
            >
              儲存雲端個人設定
            </button>
          </form>
        )}
      </div>

      {/* 2. VIP vs Free Entitlements Matrix */}
      <div className="liquid-glass rounded-[26px] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-base font-extrabold flex items-center gap-2">
              <Crown className="h-4 w-4 text-[var(--brand-primary)]" />
              一般功能 vs. VIP (PRO) 會員權限設定
            </h3>
            <p className="text-xs text-[var(--ink-secondary)]">
              目前等級：
              <strong className={isVip ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-secondary)]'}>
                {eff.isTempProUnlock
                  ? ` PRO 完整權限（限時全站開放體驗中）`
                  : isVip
                  ? ` VIP / PRO 啟用中`
                  : ' 一般版 (Free NT$0)'}
              </strong>
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenPaywall()}
            className="rounded-2xl bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-gold)] px-4 py-2 text-xs font-bold text-white shadow"
          >
            {isVip ? '查看 / 管理 PRO 方案' : '升級 PRO 方案（週/月首購 NT$60）'}
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/80 bg-white/65">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/80 text-[var(--ink-secondary)]">
              <tr>
                <th className="px-3.5 py-2.5">功能設定項目</th>
                <th className="px-3.5 py-2.5">一般版 (Free)</th>
                <th className="px-3.5 py-2.5">VIP / PRO 版</th>
                <th className="px-3.5 py-2.5 text-right">目前狀態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/70">
              {MATRIX_ROWS.map((row) => {
                const unlocked = isVip || row.key === 'tz';
                return (
                  <tr key={row.key}>
                    <td className="px-3.5 py-2.5 font-bold">{row.feature}</td>
                    <td className="px-3.5 py-2.5 text-[var(--ink-secondary)]">{row.free}</td>
                    <td className="px-3.5 py-2.5 font-semibold text-[var(--ink-primary)]">{row.vip}</td>
                    <td className="px-3.5 py-2.5 text-right">
                      {unlocked ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--status-ok-bg)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--status-ok)]">
                          <CheckCircle2 className="h-3 w-3" /> PRO 已解鎖
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-canvas)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--ink-muted)]">
                          <Lock className="h-3 w-3" /> 一般額度
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. MGM Friend Invite Code Center */}
      <div className="liquid-glass rounded-[26px] p-5">
        <div className="flex items-center gap-2 mb-1">
          <Gift className="h-4 w-4 text-[var(--brand-secondary)]" />
          <h3 className="text-base font-extrabold">好友邀請碼體驗（MGM 雙方各得 +14 天 VIP）</h3>
        </div>
        <p className="text-xs text-[var(--ink-secondary)] mb-3">
          分享您的專屬邀請碼給毛孩朋友；對方完成雲端註冊並完成「第 1 次藥袋掃描排程」後，系統自動為雙方各加贈 14 天 VIP（最高可累積至 90 天）。
        </p>

        {context ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/80 p-3.5 border border-white">
              <div>
                <div className="text-[11px] text-[var(--ink-muted)]">我的專屬好友邀請碼</div>
                <div className="text-lg font-black tracking-widest text-[var(--brand-secondary)]">{context.user.referralCode}</div>
              </div>
              <button
                type="button"
                onClick={handleCopyReferral}
                className="flex items-center gap-1.5 rounded-2xl bg-[var(--brand-secondary)] px-3.5 py-2 text-xs font-bold text-white"
              >
                <Copy className="h-3.5 w-3.5" />
                {copiedCode ? '已複製邀請碼！' : '複製邀請碼分享'}
              </button>
            </div>

            <form onSubmit={handleRedeemReferral} className="flex gap-2">
              <input
                type="text"
                value={referralInput}
                onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                placeholder="輸入朋友給您的邀請碼（例如 VIP-XXXXXX）"
                className="flex-1 rounded-2xl border border-white/80 bg-white/85 px-3.5 py-2 text-xs uppercase outline-none focus:border-[var(--brand-secondary)]"
              />
              <button
                type="submit"
                disabled={!referralInput.trim()}
                className="rounded-2xl bg-[var(--ink-primary)] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                輸入領取 +14 天
              </button>
            </form>

            {referrals.length > 0 && (
              <div className="rounded-2xl bg-white/60 p-3 text-xs">
                <div className="font-bold mb-1.5">邀請紀錄（共 {referrals.length} 位）</div>
                <div className="space-y-1">
                  {referrals.map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-[11px]">
                      <span>{r.friend_name}</span>
                      <span className={r.status === 'rewarded' ? 'font-bold text-[var(--status-ok)]' : 'text-[var(--status-warn)]'}>
                        {r.status === 'rewarded' ? '✓ 已發放 +14 天 VIP' : '等待完成第 1 次藥袋掃描'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenAuth}
            className="rounded-2xl bg-[var(--brand-secondary)] px-4 py-2 text-xs font-bold text-white"
          >
            登入或註冊取得專屬好友邀請碼
          </button>
        )}
      </div>

      {/* 4. Legal Safe Harbor & PDPA Account Deletion */}
      <div className="liquid-glass rounded-[26px] p-5">
        <div className="flex items-start gap-2.5 text-xs text-[var(--ink-secondary)] mb-4">
          <ShieldAlert className="h-4 w-4 shrink-0 text-[var(--brand-secondary)] mt-0.5" />
          <div>
            <strong>台灣法規安全邊界（Safe Harbor）</strong>：PetCare AI 為生活生產力與照護排程工具（分類：Productivity / Lifestyle），絕不提供醫療診斷、處方開立或劑量推算。
            <a href="/landing.html" target="_blank" rel="noreferrer" className="ml-2 font-bold text-[var(--brand-primary)] underline">
              前往官網介紹頁
            </a>
            {' ・ '}
            <a href="/privacy.html" target="_blank" rel="noreferrer" className="font-bold text-[var(--brand-secondary)] underline">
              隱私權政策 (PDPA)
            </a>
          </div>
        </div>

        {context && (
          <div className="border-t border-white/60 pt-3">
            {deleteStep === 'idle' ? (
              <button
                type="button"
                onClick={handleDeletePreflight}
                className="flex items-center gap-1.5 text-xs font-bold text-[#D32F2F] hover:underline"
              >
                <Trash2 className="h-3.5 w-3.5" /> 申請永久刪除雲端帳號與個資（PDPA）
              </button>
            ) : (
              <div className="rounded-2xl border border-[#D32F2F]/35 bg-[#FEECEC] p-3.5 text-xs space-y-2">
                <div className="font-bold text-[#B71C1C]">確認永久刪除帳號？</div>
                {deleteWarning && <p className="text-[#B71C1C]">{deleteWarning}</p>}
                <p className="text-[var(--ink-secondary)]">刪除後您的帳號與個人連線紀錄將從 Neon 雲端抹除，無法復原。</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDeleteExecute}
                    className="rounded-xl bg-[#D32F2F] px-3.5 py-1.5 font-bold text-white"
                  >
                    確認永久刪除
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteStep('idle')}
                    className="rounded-xl bg-white px-3.5 py-1.5 font-bold text-[var(--ink-secondary)]"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {statusMsg && (
          <div className="mt-3 rounded-xl bg-[var(--status-ok-bg)] px-3 py-2 text-xs font-semibold text-[var(--status-ok)]">
            {statusMsg}
          </div>
        )}
      </div>
    </div>
  );
};
