import crypto from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { billingMonthNow, getSql } from './db.js';

const COOKIE_NAME = 'petcare_session';

// Temporary full PRO unlock for early access experience
export const TEMP_FULL_PRO_ACCESS = true;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, originalHex] = stored.split(':');
  if (!salt || !originalHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const original = Buffer.from(originalHex, 'hex');
  if (derived.length !== original.length) return false;
  return crypto.timingSafeEqual(derived, original);
}

export function hashToken(token: string): string {
  const secret = process.env.AUTH_SECRET || 'petcare-dev-fallback-secret';
  return crypto.createHmac('sha256', secret).update(token).digest('hex');
}

export function generateOpaqueToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateShortCode(prefix: string, length = 6): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return `${prefix}-${out}`;
}

export function setSessionCookie(res: VercelResponse, token: string, maxAgeSeconds = 60 * 60 * 24 * 30) {
  const isProd = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`
  ];
  if (isProd) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearSessionCookie(res: VercelResponse) {
  const isProd = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
  const parts = [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (isProd) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function extractToken(req: VercelRequest): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    const bearer = auth.slice(7).trim();
    if (bearer) return bearer;
  }
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';');
    for (const entry of cookies) {
      const idx = entry.indexOf('=');
      if (idx === -1) continue;
      const k = entry.slice(0, idx).trim();
      if (k === COOKIE_NAME) {
        return decodeURIComponent(entry.slice(idx + 1).trim());
      }
    }
  }
  return null;
}

export interface AuthContext {
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarColor: string;
    timezone: string;
    referralCode: string;
    referralBonusUnlocked: boolean;
    vipBonusExpiresAt: string | null;
  };
  family: {
    id: string;
    name: string;
    inviteCode: string;
    timezone: string;
    role: 'owner' | 'member';
    memberCount: number;
  };
  entitlement: {
    isVip: boolean;
    plan: 'free' | 'pro_weekly' | 'pro_monthly' | 'pro_annual';
    status: string;
    isTrial: boolean;
    isIntroOffer: boolean;
    vipSource: 'subscription' | 'referral_bonus' | 'promo_temp' | 'free';
    currentPeriodEnd: string | null;
    vipDaysRemaining: number;
    ocrMonthlyLimit: number | null;
    ocrUsedThisMonth: number;
    petLimit: number | null;
    maxFamilyMembers: number;
    historyDaysLimit: number | null;
    pdfFullExport: boolean;
  };
}

export async function getAuthContext(req: VercelRequest): Promise<AuthContext | null> {
  const token = extractToken(req);
  if (!token) return null;

  const sql = getSql();
  const tokenHash = hashToken(token);

  const sessionRows = await sql`
    SELECT
      u.id,
      u.email,
      u.display_name,
      u.avatar_color,
      u.timezone,
      u.referral_code,
      u.referral_bonus_unlocked,
      u.vip_bonus_expires_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${tokenHash}
      AND s.expires_at > NOW()
    LIMIT 1
  `;

  if (sessionRows.length === 0) return null;
  const u = sessionRows[0];

  const familyRows = await sql`
    SELECT
      f.id,
      f.name,
      f.invite_code,
      f.timezone,
      fm.role,
      (SELECT COUNT(*)::int FROM family_members fm2 WHERE fm2.family_id = f.id) AS member_count
    FROM family_members fm
    JOIN families f ON f.id = fm.family_id
    WHERE fm.user_id = ${u.id}
    ORDER BY fm.joined_at ASC
    LIMIT 1
  `;

  if (familyRows.length === 0) return null;
  const f = familyRows[0];

  const subRows = await sql`
    SELECT plan, status, is_trial, is_intro_offer, current_period_end
    FROM subscriptions
    WHERE family_id = ${f.id}
    LIMIT 1
  `;

  const sub = subRows[0] ?? {
    plan: 'free',
    status: 'active',
    is_trial: false,
    is_intro_offer: false,
    current_period_end: null
  };

  const nowMs = Date.now();
  const subEndMs = sub.current_period_end ? new Date(sub.current_period_end).getTime() : 0;
  const hasPaidSub =
    sub.plan !== 'free' &&
    (sub.status === 'active' || sub.status === 'trialing') &&
    (!sub.current_period_end || subEndMs > nowMs);

  const bonusEndMs = u.vip_bonus_expires_at ? new Date(u.vip_bonus_expires_at).getTime() : 0;
  const hasReferralVip = bonusEndMs > nowMs;

  const isVip = TEMP_FULL_PRO_ACCESS || hasPaidSub || hasReferralVip;
  const effectiveEndMs = Math.max(hasPaidSub ? subEndMs : 0, hasReferralVip ? bonusEndMs : 0);
  const vipDaysRemaining =
    effectiveEndMs > nowMs
      ? Math.ceil((effectiveEndMs - nowMs) / 86400000)
      : TEMP_FULL_PRO_ACCESS
      ? 30
      : 0;

  const billingMonth = billingMonthNow(u.timezone || 'Asia/Taipei');
  const ocrRows = await sql`
    SELECT COUNT(*)::int AS cnt
    FROM ocr_usage_logs
    WHERE family_id = ${f.id}
      AND billing_month = ${billingMonth}
      AND is_billable = TRUE
      AND status IN ('reserved', 'succeeded')
  `;
  const ocrUsedThisMonth = ocrRows[0]?.cnt ?? 0;

  return {
    user: {
      id: u.id,
      email: u.email,
      displayName: u.display_name,
      avatarColor: u.avatar_color,
      timezone: u.timezone,
      referralCode: u.referral_code,
      referralBonusUnlocked: Boolean(u.referral_bonus_unlocked),
      vipBonusExpiresAt: u.vip_bonus_expires_at ? new Date(u.vip_bonus_expires_at).toISOString() : null
    },
    family: {
      id: f.id,
      name: f.name,
      inviteCode: f.invite_code,
      timezone: f.timezone,
      role: f.role,
      memberCount: f.member_count
    },
    entitlement: {
      isVip,
      plan: hasPaidSub ? sub.plan : TEMP_FULL_PRO_ACCESS ? 'pro_annual' : sub.plan,
      status: sub.status,
      isTrial: Boolean(sub.is_trial),
      isIntroOffer: Boolean(sub.is_intro_offer),
      vipSource: hasPaidSub
        ? 'subscription'
        : hasReferralVip
        ? 'referral_bonus'
        : TEMP_FULL_PRO_ACCESS
        ? 'promo_temp'
        : 'free',
      currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end).toISOString() : null,
      vipDaysRemaining,
      ocrMonthlyLimit: isVip ? null : 3,
      ocrUsedThisMonth,
      petLimit: isVip ? null : 1,
      maxFamilyMembers: isVip ? 10 : 1,
      historyDaysLimit: isVip ? null : 14,
      pdfFullExport: isVip
    }
  };
}
