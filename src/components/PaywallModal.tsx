import React, { useState } from 'react';
import { Check, Crown, Gift, ShieldCheck, Sparkles, X } from 'lucide-react';
import { apiFetch, ApiError } from '../lib/api';
import type { AuthContext, PlanItem } from '../types';

interface PaywallModalProps {
  open: boolean;
  triggerReason?: string | null;
  context: AuthContext | null;
  plans: PlanItem[];
  onClose: () => void;
  onUpdated: (ctx: AuthContext) => void;
  onRequireAuth: () => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  open,
  triggerReason,
  context,
  plans,
  onClose,
  onUpdated,
  onRequireAuth
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<PlanItem['id']>('annual_1290');
  const [useIntroOffer, setUseIntroOffer] = useState(true);
  const [referralInput, setReferralInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  if (!open) return null;

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? plans[3] ?? plans[0];

  async function handleSubscribe() {
    if (!context) {
      onClose();
      onRequireAuth();
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      const res = await apiFetch<{ ok: boolean; context: AuthContext }>('/api/billing', {
        method: 'POST',
        body: JSON.stringify({
          action: 'subscribe',
          planId: selectedPlanId,
          isIntroOffer: useIntroOffer && (selectedPlanId === 'weekly_150' || selectedPlanId === 'monthly_240')
        })
      });
      onUpdated(res.context);
      setFeedback({ type: 'ok', text: `已同步方案變更至雲端：${selectedPlan?.name}` });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof ApiError ? err.message : '方案切換失敗'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRedeemReferral(e: React.FormEvent) {
    e.preventDefault();
    if (!context) {
      onClose();
      onRequireAuth();
      return;
    }
    if (!referralInput.trim()) return;
    setLoading(true);
    setFeedback(null);
    try {
      const res = await apiFetch<{ ok: boolean; message: string; context: AuthContext }>('/api/billing', {
        method: 'POST',
        body: JSON.stringify({
          action: 'redeem_referral',
          referralCode: referralInput.trim()
        })
      });
      onUpdated(res.context);
      setFeedback({ type: 'ok', text: res.message });
      setReferralInput('');
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof ApiError ? err.message : '邀請碼兌換失敗'
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-3 sm:p-5 overflow-y-auto">
      <div className="liquid-glass-strong relative my-auto w-full max-w-2xl rounded-[30px] p-5 sm:p-7 text-[#2B2623]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-white/80 p-2 text-[#5C554F] hover:bg-white transition"
          aria-label="關閉"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF7E47] to-[#D97706] text-white shadow-md">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <span className="inline-block rounded-full bg-[#FF7E47]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#C95A41]">
              PetCare PRO 家庭照護升級中心
            </span>
            <h2 className="text-xl font-extrabold tracking-tight">全家人即時同步・守護毛孩每次照護</h2>
          </div>
        </div>

        {triggerReason && (
          <div className="mb-4 rounded-2xl border border-[#FF7E47]/35 bg-[#FFF6F0] px-4 py-2.5 text-xs font-semibold text-[#B44A26]">
            {triggerReason}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {plans.map((plan) => {
            const active = selectedPlanId === plan.id;
            const currentActive = context?.entitlement.plan === plan.planKey;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlanId(plan.id)}
                className={`text-left rounded-[22px] p-4 transition border ${
                  active
                    ? 'border-[#FF7E47] bg-white/95 shadow-lg shadow-[#FF7E47]/15 ring-2 ring-[#FF7E47]/30'
                    : 'border-white/75 bg-white/60 hover:bg-white/85'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-extrabold">{plan.name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      plan.id === 'annual_1290'
                        ? 'bg-[#FF7E47] text-white'
                        : 'bg-[#4E878C]/15 text-[#4E878C]'
                    }`}
                  >
                    {currentActive ? '目前方案' : plan.badge}
                  </span>
                </div>

                <div className="flex items-baseline gap-1.5 my-1.5">
                  {plan.introPriceTwd !== null && useIntroOffer ? (
                    <>
                      <span className="text-2xl font-black text-[#FF7E47]">NT$ {plan.introPriceTwd}</span>
                      <span className="text-xs line-through text-[#8E857C]">NT$ {plan.priceTwd}</span>
                      <span className="text-xs text-[#5C554F]">首期體驗，後續 {plan.priceTwd}{plan.periodLabel}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl font-black text-[#2B2623]">NT$ {plan.priceTwd.toLocaleString()}</span>
                      <span className="text-xs text-[#5C554F]">{plan.periodLabel}</span>
                    </>
                  )}
                </div>

                <ul className="space-y-1 mt-2">
                  {plan.highlights.map((h) => (
                    <li key={h} className="flex items-center gap-1.5 text-[11px] text-[#5C554F]">
                      <Check className="h-3.5 w-3.5 shrink-0 text-[#4E878C]" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        {(selectedPlanId === 'weekly_150' || selectedPlanId === 'monthly_240') && (
          <label className="mb-3 flex items-center justify-between rounded-2xl bg-white/70 px-4 py-2.5 text-xs">
            <span className="font-semibold text-[#2B2623]">套用商店首購 NT$60 體驗價（單一帳號限領一次）</span>
            <input
              type="checkbox"
              checked={useIntroOffer}
              onChange={(e) => setUseIntroOffer(e.target.checked)}
              className="h-4 w-4 accent-[#FF7E47]"
            />
          </label>
        )}

        <div className="mb-4 rounded-2xl bg-[#FAF7F2]/90 px-4 py-2.5 text-[11px] leading-relaxed text-[#5C554F]">
          <ShieldCheck className="inline h-3.5 w-3.5 mr-1 text-[#4E878C]" />
          {selectedPlanId === 'annual_1290' &&
            '訂閱說明：含 7 天免費試用（第 5 天推播提醒），試用期滿將以 NT$ 1,290 / 年自動續訂；可隨時於帳戶訂閱管理取消。'}
          {selectedPlanId === 'weekly_150' &&
            '訂閱說明：週方案無免費試用（0 天試用）。確認後首週以 NT$ 60（或原價 NT$ 150）計費，次週起以 NT$ 150 / 週自動續訂，可隨時取消。'}
          {selectedPlanId === 'monthly_240' &&
            '訂閱說明：單月方案首購享首月 NT$ 60 體驗價，次月起以 NT$ 240 / 月自動續訂；商店首購優惠與年訂 7 天試用互斥，每人限領一次。'}
          {selectedPlanId === 'free_0' &&
            '切換為一般版 (Free)：保留 1 隻寵物、每月 3 次掃描額度與最近 14 天歷史紀錄，不收取任何費用。'}
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={handleSubscribe}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF7E47] to-[#E66530] py-3 text-sm font-extrabold text-white shadow-lg shadow-[#FF7E47]/25 transition hover:brightness-105 disabled:opacity-60"
        >
          <Sparkles className="h-4 w-4" />
          {loading ? '正在寫入 Neon 雲端訂閱狀態...' : `確認啟用：${selectedPlan?.name}`}
        </button>

        <form onSubmit={handleRedeemReferral} className="rounded-2xl border border-[#4E878C]/25 bg-[#EBF5F0]/70 p-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#2E676B] mb-2">
            <Gift className="h-4 w-4" />
            <span>或輸入好友邀請碼（完成註冊＋第 1 次藥袋掃描，雙方各得 +14 天 VIP，最高可累積 90 天）</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={referralInput}
              onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
              placeholder="輸入好友邀請碼（如 VIP-XXXXXX）"
              className="flex-1 rounded-xl border border-white bg-white/90 px-3 py-2 text-xs uppercase tracking-wider outline-none focus:border-[#4E878C]"
            />
            <button
              type="submit"
              disabled={loading || !referralInput.trim()}
              className="rounded-xl bg-[#4E878C] px-4 py-2 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              綁定兌換
            </button>
          </div>
        </form>

        {feedback && (
          <div
            className={`mt-3 rounded-2xl px-3.5 py-2 text-xs font-semibold ${
              feedback.type === 'ok' ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-[#FEECEC] text-[#C62828]'
            }`}
          >
            {feedback.text}
          </div>
        )}
      </div>
    </div>
  );
};
