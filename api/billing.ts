import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthContext } from './_lib/auth.js';
import { getSql } from './_lib/db.js';

const PLAN_CATALOG = [
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx) {
      if (req.method === 'GET') {
        return res.status(200).json({ ok: true, plans: PLAN_CATALOG, referrals: [] });
      }
      return res.status(401).json({ error: 'UNAUTHORIZED', message: '請先登入雲端帳號' });
    }

    const sql = getSql();

    if (req.method === 'GET') {
      const referrals = await sql`
        SELECT
          rr.id,
          rr.status,
          rr.bonus_days,
          rr.created_at,
          rr.rewarded_at,
          u.display_name AS friend_name
        FROM referral_redemptions rr
        JOIN users u ON u.id = rr.referred_user_id
        WHERE rr.referrer_user_id = ${ctx.user.id}
        ORDER BY rr.created_at DESC
        LIMIT 20
      `;

      return res.status(200).json({
        ok: true,
        plans: PLAN_CATALOG,
        referrals,
        context: ctx
      });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const action = String(body.action || '');

      if (action === 'subscribe') {
        const planId = String(body.planId || '');
        const isIntroOffer = Boolean(body.isIntroOffer);
        const plan = PLAN_CATALOG.find((p) => p.id === planId);
        if (!plan) {
          return res.status(400).json({ error: 'INVALID_PLAN' });
        }

        if (plan.planKey === 'free') {
          await sql`
            UPDATE subscriptions
            SET plan = 'free', product_id = NULL, status = 'active', is_trial = FALSE, is_intro_offer = FALSE,
                current_period_end = NULL, updated_at = NOW()
            WHERE family_id = ${ctx.family.id}
          `;
        } else {
          // Enforce chk_weekly_no_trial: weekly NEVER has free trial
          const isTrial = plan.planKey === 'pro_annual' ? true : false;
          const status = isTrial ? 'trialing' : 'active';
          const days = plan.planKey === 'pro_annual' ? 365 : plan.planKey === 'pro_monthly' ? 30 : 7;
          const effectiveIntro = plan.planKey === 'pro_weekly' || plan.planKey === 'pro_monthly' ? isIntroOffer : false;

          await sql`
            INSERT INTO subscriptions (
              family_id, subscriber_user_id, plan, product_id, status, is_trial, is_intro_offer, current_period_end, updated_at
            )
            VALUES (
              ${ctx.family.id}, ${ctx.user.id}, ${plan.planKey}, ${plan.productId}, ${status}, ${isTrial}, ${effectiveIntro},
              NOW() + make_interval(days => ${days}), NOW()
            )
            ON CONFLICT (family_id) DO UPDATE SET
              subscriber_user_id = EXCLUDED.subscriber_user_id,
              plan = EXCLUDED.plan,
              product_id = EXCLUDED.product_id,
              status = EXCLUDED.status,
              is_trial = EXCLUDED.is_trial,
              is_intro_offer = EXCLUDED.is_intro_offer,
              orphan_state = NULL,
              cancel_at_period_end = FALSE,
              current_period_end = EXCLUDED.current_period_end,
              updated_at = NOW()
          `;
        }

        const updatedCtx = await getAuthContext(req);
        return res.status(200).json({ ok: true, context: updatedCtx });
      }

      if (action === 'redeem_referral') {
        const code = String(body.referralCode || '').trim().toUpperCase();
        if (!code) {
          return res.status(400).json({ error: 'MISSING_CODE', message: '請輸入好友邀請碼' });
        }
        if (code === ctx.user.referralCode) {
          return res.status(400).json({ error: 'SELF_REFERRAL', message: '不能輸入自己的邀請碼喔' });
        }

        const already = await sql`
          SELECT id FROM referral_redemptions WHERE referred_user_id = ${ctx.user.id} LIMIT 1
        `;
        if (already.length > 0) {
          return res.status(409).json({ error: 'ALREADY_REDEEMED', message: '此帳號已綁定過好友邀請碼' });
        }

        const refRows = await sql`SELECT id, display_name FROM users WHERE referral_code = ${code} LIMIT 1`;
        if (refRows.length === 0) {
          return res.status(404).json({ error: 'INVALID_REFERRAL_CODE', message: '查無此好友邀請碼' });
        }
        const referrer = refRows[0];

        // Check if user has already completed at least one confirmed prescription scan
        const scanRows = await sql`
          SELECT COUNT(*)::int AS cnt FROM prescriptions WHERE created_by = ${ctx.user.id} AND source = 'ocr_confirmed'
        `;
        const hasCompletedScan = (scanRows[0]?.cnt ?? 0) > 0;

        if (hasCompletedScan) {
          await sql`
            INSERT INTO referral_redemptions (referrer_user_id, referred_user_id, referral_code_used, status, bonus_days, rewarded_at)
            VALUES (${referrer.id}, ${ctx.user.id}, ${code}, 'rewarded', 14, NOW())
          `;
          await sql`
            UPDATE users
            SET referral_bonus_unlocked = TRUE,
                referred_by_user_id = ${referrer.id},
                vip_bonus_expires_at = LEAST(
                  NOW() + INTERVAL '90 days',
                  GREATEST(COALESCE(vip_bonus_expires_at, NOW()), NOW()) + INTERVAL '14 days'
                )
            WHERE id = ${ctx.user.id} OR id = ${referrer.id}
          `;
        } else {
          await sql`
            INSERT INTO referral_redemptions (referrer_user_id, referred_user_id, referral_code_used, status, bonus_days)
            VALUES (${referrer.id}, ${ctx.user.id}, ${code}, 'pending_first_scan', 14)
          `;
          await sql`
            UPDATE users SET referred_by_user_id = ${referrer.id} WHERE id = ${ctx.user.id}
          `;
        }

        const updatedCtx = await getAuthContext(req);
        return res.status(200).json({
          ok: true,
          immediateReward: hasCompletedScan,
          referrerName: referrer.display_name,
          message: hasCompletedScan
            ? `已綁定好友「${referrer.display_name}」邀請碼！雙方已立即獲得 +14 天 VIP 體驗。`
            : `已綁定好友「${referrer.display_name}」邀請碼！完成第 1 次藥袋掃描並確認排程後，雙方將立即解鎖 +14 天 VIP。`,
          context: updatedCtx
        });
      }

      return res.status(400).json({ error: 'UNKNOWN_ACTION' });
    }

    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  } catch (err) {
    console.error('Billing API error:', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: '方案與邀請碼服務暫時異常' });
  }
}
