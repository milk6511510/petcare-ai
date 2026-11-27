import React, { useState } from 'react';
import { Cloud, Gift, Lock, Mail, Sparkles, User, X } from 'lucide-react';
import { apiFetch, ApiError, setStoredToken } from '../lib/api';
import type { AuthContext, Pet } from '../types';

interface AuthModalProps {
  open: boolean;
  initialMode?: 'login' | 'register';
  guestPets?: Pet[];
  onClose: () => void;
  onAuthenticated: (ctx: AuthContext) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  open,
  initialMode = 'register',
  guestPets = [],
  onClose,
  onAuthenticated
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [inviteReferralCode, setInviteReferralCode] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === 'register' && !agreedTerms) {
      setError('請先勾選同意隱私權政策與非醫療工具服務條款');
      return;
    }

    setLoading(true);
    try {
      const payload =
        mode === 'register'
          ? {
              action: 'register',
              email,
              password,
              displayName: displayName || '毛孩家長',
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Taipei',
              inviteReferralCode: inviteReferralCode.trim() || undefined,
              guestPets: guestPets.map((p) => ({
                name: p.name,
                species: p.species,
                breed: p.breed,
                weightKg: p.weight_kg,
                avatarEmoji: p.avatar_emoji,
                appearance: p.appearance || undefined
              }))
            }
          : {
              action: 'login',
              email,
              password
            };

      const res = await apiFetch<{ ok: boolean; token: string; context: AuthContext }>('/api/auth', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setStoredToken(res.token);
      onAuthenticated(res.context);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('雲端連線失敗，請稍後再試');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-md p-4">
      <div className="liquid-glass-strong relative w-full max-w-md rounded-[28px] p-6 text-[var(--ink-primary)]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-white/70 p-2 text-[var(--ink-secondary)] hover:bg-white transition"
          aria-label="關閉"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-gold)] text-white shadow-md">
            <Cloud className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight">雲端帳號連動・跨裝置同步</h2>
            <p className="text-xs text-[var(--ink-secondary)]">連線 Neon PostgreSQL 雲端資料庫，與家人即時共享照護紀錄</p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-2xl bg-black/5 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`rounded-xl py-2 text-xs font-bold transition ${
              mode === 'register' ? 'bg-white text-[var(--ink-primary)] shadow-sm' : 'text-[var(--ink-secondary)]'
            }`}
          >
            建立雲端帳號（並匯入訪客資料）
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`rounded-xl py-2 text-xs font-bold transition ${
              mode === 'login' ? 'bg-white text-[var(--ink-primary)] shadow-sm' : 'text-[var(--ink-secondary)]'
            }`}
          >
            登入既有帳號
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--ink-secondary)]">家庭顯示稱謂</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-[var(--ink-muted)]" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="例如：媽媽、爸爸、Kiki"
                  className="w-full rounded-2xl border border-white/80 bg-white/80 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[var(--brand-primary)]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--ink-secondary)]">電子郵件 (Email)</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[var(--ink-muted)]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-white/80 bg-white/80 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[var(--brand-primary)]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--ink-secondary)]">密碼（至少 6 字元）</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[var(--ink-muted)]" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-2xl border border-white/80 bg-white/80 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[var(--brand-primary)]"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-secondary)]">
                <Gift className="h-3.5 w-3.5" />
                好友邀請碼（選填：完成首次掃描雙方各得 +14 天 VIP）
              </label>
              <input
                type="text"
                value={inviteReferralCode}
                onChange={(e) => setInviteReferralCode(e.target.value.toUpperCase())}
                placeholder="例如：VIP-AB12CD"
                className="w-full rounded-2xl border border-[var(--brand-secondary-border)] bg-white/75 px-3.5 py-2 text-sm uppercase tracking-wider outline-none focus:border-[var(--brand-secondary)]"
              />
            </div>
          )}

          {mode === 'register' && (
            <label className="flex items-start gap-2 rounded-2xl bg-[var(--bg-canvas)] p-2.5 text-[11px] leading-relaxed text-[var(--ink-secondary)]">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-0.5 rounded accent-[var(--brand-primary)]"
              />
              <span>
                我同意{' '}
                <a href="/privacy.html" target="_blank" rel="noreferrer" className="font-semibold text-[var(--brand-primary)] underline">
                  隱私權政策（台灣個資法第 8 條）
                </a>{' '}
                與非醫療工具條款；本服務僅供日常照護紀錄與提醒。
              </span>
            </label>
          )}

          {error && (
            <div className="rounded-2xl border border-[#D32F2F]/30 bg-[#FEECEC] px-3 py-2 text-xs font-semibold text-[#B71C1C]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-hover)] py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-105 disabled:opacity-60"
            style={{ boxShadow: '0 10px 24px var(--brand-primary-shadow)' }}
          >
            <Sparkles className="h-4 w-4" />
            {loading ? '雲端同步中...' : mode === 'register' ? '建立帳號並同步至雲端' : '登入並載入雲端資料'}
          </button>
        </form>
      </div>
    </div>
  );
};
