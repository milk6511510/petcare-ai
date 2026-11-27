import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  clearSessionCookie,
  extractToken,
  generateOpaqueToken,
  generateShortCode,
  getAuthContext,
  hashPassword,
  hashToken,
  setSessionCookie,
  verifyPassword
} from './_lib/auth.js';
import { getSql } from './_lib/db.js';

interface GuestPetPayload {
  name?: string;
  species?: 'dog' | 'cat' | 'other';
  breed?: string;
  weightKg?: number | null;
  avatarEmoji?: string;
  appearance?: Record<string, unknown>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const ctx = await getAuthContext(req);
      return res.status(200).json({
        authenticated: Boolean(ctx),
        context: ctx
      });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const action = String(body.action || req.query.action || '');
    const sql = getSql();

    if (action === 'register') {
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const displayName = String(body.displayName || '').trim() || '毛孩家長';
      const timezone = String(body.timezone || 'Asia/Taipei').trim() || 'Asia/Taipei';
      const inviteReferralCode = String(body.inviteReferralCode || '').trim().toUpperCase();
      const guestPets = Array.isArray(body.guestPets) ? (body.guestPets as GuestPetPayload[]) : [];

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'INVALID_EMAIL', message: '請輸入有效的 Email 地址' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'WEAK_PASSWORD', message: '密碼至少需 6 個字元' });
      }

      const existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
      if (existing.length > 0) {
        return res.status(409).json({ error: 'EMAIL_EXISTS', message: '此 Email 已註冊，請直接登入以同步雲端帳號' });
      }

      let referrerId: string | null = null;
      if (inviteReferralCode) {
        const refRows = await sql`SELECT id FROM users WHERE referral_code = ${inviteReferralCode} LIMIT 1`;
        if (refRows.length === 0) {
          return res.status(400).json({ error: 'INVALID_REFERRAL_CODE', message: '查無此好友邀請碼，請確認後重試或留空' });
        }
        referrerId = refRows[0].id;
      }

      const passwordHash = hashPassword(password);
      const myReferralCode = generateShortCode('VIP', 6);
      const familyInviteCode = generateShortCode('PET', 4);
      const palette = ['#FF7E47', '#4E878C', '#D97706', '#2E7D6F'];
      const avatarColor = palette[Math.floor(Math.random() * palette.length)];

      const createdUsers = await sql`
        INSERT INTO users (
          email, password_hash, display_name, avatar_color, timezone,
          referral_code, referred_by_user_id
        )
        VALUES (
          ${email}, ${passwordHash}, ${displayName}, ${avatarColor}, ${timezone},
          ${myReferralCode}, ${referrerId}
        )
        RETURNING id
      `;
      const userId = createdUsers[0].id;

      const createdFamilies = await sql`
        INSERT INTO families (name, invite_code, timezone, created_by)
        VALUES (${`${displayName}的毛孩家`}, ${familyInviteCode}, ${timezone}, ${userId})
        RETURNING id
      `;
      const familyId = createdFamilies[0].id;

      await sql`
        INSERT INTO family_members (family_id, user_id, role, display_name_in_family)
        VALUES (${familyId}, ${userId}, 'owner', ${displayName})
      `;

      await sql`
        INSERT INTO subscriptions (family_id, subscriber_user_id, plan, status, is_trial)
        VALUES (${familyId}, ${userId}, 'free', 'active', FALSE)
      `;

      if (referrerId) {
        await sql`
          INSERT INTO referral_redemptions (referrer_user_id, referred_user_id, referral_code_used, status, bonus_days)
          VALUES (${referrerId}, ${userId}, ${inviteReferralCode}, 'pending_first_scan', 14)
        `;
      }

      // Ensure appearance column safely before migrating guest pets
      let hasAppearance = false;
      try {
        await sql`ALTER TABLE pets ADD COLUMN IF NOT EXISTS appearance JSONB`;
        hasAppearance = true;
      } catch {
        hasAppearance = false;
      }

      const petsToInsert = guestPets.length > 0 ? guestPets.slice(0, 10) : [{}];
      let primaryPetId = '';
      for (let i = 0; i < petsToInsert.length; i++) {
        const gp = petsToInsert[i];
        const petName = gp?.name?.trim() || (i === 0 ? '波波' : `毛孩 ${i + 1}`);
        const petSpecies = gp?.species === 'cat' || gp?.species === 'other' ? gp.species : 'dog';
        const petBreed = gp?.breed?.trim() || (petSpecies === 'cat' ? '米克斯橘貓' : '柴犬');
        const petWeight = typeof gp?.weightKg === 'number' ? gp.weightKg : 9.4;
        const petEmoji = gp?.avatarEmoji || (petSpecies === 'cat' ? '🐱' : petSpecies === 'other' ? '🐾' : '🐶');
        const appJson = gp?.appearance ? JSON.stringify(gp.appearance) : null;

        const petRows = hasAppearance
          ? await sql`
              INSERT INTO pets (family_id, name, species, breed, weight_kg, avatar_emoji, appearance)
              VALUES (${familyId}, ${petName}, ${petSpecies}, ${petBreed}, ${petWeight}, ${petEmoji}, ${appJson}::jsonb)
              RETURNING id
            `
          : await sql`
              INSERT INTO pets (family_id, name, species, breed, weight_kg, avatar_emoji)
              VALUES (${familyId}, ${petName}, ${petSpecies}, ${petBreed}, ${petWeight}, ${petEmoji})
              RETURNING id
            `;
        if (i === 0) primaryPetId = petRows[0].id;
      }

      const rxRows = await sql`
        INSERT INTO prescriptions (
          family_id, pet_id, medication_name, clinic_name, dosage_text, meal_timing, total_days, source, created_by
        )
        VALUES (
          ${familyId}, ${primaryPetId}, '胃潰寧 GastroWell (範例)', '晴空動物醫院 (範例)', '每次 1 顆・每日 2 次', 'after_meal', 7, 'manual_input', ${userId}
        )
        RETURNING id
      `;
      const rxId = rxRows[0].id;

      await sql`
        INSERT INTO dose_schedules (family_id, pet_id, prescription_id, scheduled_time, label)
        VALUES
          (${familyId}, ${primaryPetId}, ${rxId}, '08:30:00', '早飯後照護紀錄'),
          (${familyId}, ${primaryPetId}, ${rxId}, '20:00:00', '晚飯後照護紀錄')
      `;

      const token = generateOpaqueToken();
      const tokenHash = hashToken(token);
      await sql`
        INSERT INTO sessions (user_id, token_hash, device_label, expires_at)
        VALUES (${userId}, ${tokenHash}, 'Web Cloud Sync', NOW() + INTERVAL '30 days')
      `;

      setSessionCookie(res, token);
      req.headers.authorization = `Bearer ${token}`;
      const ctx = await getAuthContext(req);
      return res.status(201).json({ ok: true, token, context: ctx });
    }

    if (action === 'login') {
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const userRows = await sql`
        SELECT id, password_hash FROM users WHERE email = ${email} LIMIT 1
      `;
      if (userRows.length === 0 || !verifyPassword(password, userRows[0].password_hash)) {
        return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Email 或密碼不正確' });
      }
      const userId = userRows[0].id;

      const token = generateOpaqueToken();
      const tokenHash = hashToken(token);
      await sql`
        INSERT INTO sessions (user_id, token_hash, device_label, expires_at)
        VALUES (${userId}, ${tokenHash}, 'Web Cloud Sync', NOW() + INTERVAL '30 days')
      `;
      setSessionCookie(res, token);
      req.headers.authorization = `Bearer ${token}`;
      const ctx = await getAuthContext(req);
      return res.status(200).json({ ok: true, token, context: ctx });
    }

    if (action === 'logout') {
      const token = extractToken(req);
      if (token) {
        await sql`DELETE FROM sessions WHERE token_hash = ${hashToken(token)}`;
      }
      clearSessionCookie(res);
      return res.status(200).json({ ok: true });
    }

    const ctx = await getAuthContext(req);
    if (!ctx) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: '請先登入雲端帳號' });
    }

    if (action === 'update_profile') {
      const displayName = String(body.displayName || '').trim() || ctx.user.displayName;
      const timezone = String(body.timezone || '').trim() || ctx.user.timezone;
      const avatarColor = String(body.avatarColor || '').trim() || ctx.user.avatarColor;

      await sql`
        UPDATE users
        SET display_name = ${displayName}, timezone = ${timezone}, avatar_color = ${avatarColor}, updated_at = NOW()
        WHERE id = ${ctx.user.id}
      `;
      await sql`
        UPDATE family_members
        SET display_name_in_family = ${displayName}
        WHERE user_id = ${ctx.user.id} AND family_id = ${ctx.family.id}
      `;
      const updated = await getAuthContext(req);
      return res.status(200).json({ ok: true, context: updated });
    }

    if (action === 'delete_account') {
      const mode = String(body.mode || 'preflight');
      const soleOwnerFamilies = await sql`
        SELECT f.id, f.name,
          (SELECT COUNT(*)::int FROM family_members fm2 WHERE fm2.family_id = f.id) AS total_members
        FROM family_members fm
        JOIN families f ON f.id = fm.family_id
        WHERE fm.user_id = ${ctx.user.id} AND fm.role = 'owner'
      `;
      const hasActivePaidSub =
        ctx.entitlement.plan !== 'free' &&
        (ctx.entitlement.status === 'active' || ctx.entitlement.status === 'trialing');

      if (mode === 'preflight') {
        return res.status(200).json({
          ok: true,
          hasActiveStoreSubscription: hasActivePaidSub,
          blockingWarningMessage: hasActivePaidSub
            ? '提醒：您目前仍有生效中的 PRO 訂閱方案，刪除帳號前請先確認取消自動續訂，以免商店端繼續扣款。'
            : null,
          soleOwnerFamilies
        });
      }

      for (const fam of soleOwnerFamilies) {
        if (fam.total_members > 1 && body.transferOwner === true) {
          const candidates = await sql`
            SELECT user_id FROM family_members
            WHERE family_id = ${fam.id} AND user_id <> ${ctx.user.id}
            ORDER BY joined_at ASC LIMIT 1
          `;
          if (candidates.length > 0) {
            await sql`
              UPDATE family_members SET role = 'owner'
              WHERE family_id = ${fam.id} AND user_id = ${candidates[0].user_id}
            `;
            await sql`
              UPDATE subscriptions
              SET subscriber_user_id = NULL, orphan_state = 'subscriber_deleted', cancel_at_period_end = TRUE
              WHERE family_id = ${fam.id}
            `;
          }
        } else {
          await sql`DELETE FROM families WHERE id = ${fam.id}`;
        }
      }

      await sql`
        INSERT INTO audit_logs (actor_user_id, action, payload)
        VALUES (${ctx.user.id}, 'ACCOUNT_DELETED', ${JSON.stringify({ deletedAt: new Date().toISOString() })}::jsonb)
      `;
      await sql`DELETE FROM users WHERE id = ${ctx.user.id}`;
      clearSessionCookie(res);
      return res.status(200).json({ ok: true, deleted: true });
    }

    return res.status(400).json({ error: 'UNKNOWN_ACTION' });
  } catch (err) {
    console.error('Auth API error:', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: '雲端帳號服務暫時異常' });
  }
}
