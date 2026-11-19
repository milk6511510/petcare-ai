import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthContext } from './_lib/auth';
import { getSql } from './_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: '請先登入雲端帳號' });
    }

    const sql = getSql();

    if (req.method === 'GET') {
      const members = await sql`
        SELECT
          fm.id,
          fm.user_id,
          fm.role,
          fm.display_name_in_family AS display_name,
          u.avatar_color,
          u.timezone,
          fm.joined_at
        FROM family_members fm
        JOIN users u ON u.id = fm.user_id
        WHERE fm.family_id = ${ctx.family.id}
        ORDER BY fm.joined_at ASC
      `;

      return res.status(200).json({
        ok: true,
        family: ctx.family,
        members
      });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const action = String(body.action || '');

      if (action === 'update_name') {
        const name = String(body.name || '').trim();
        if (!name) return res.status(400).json({ error: 'INVALID_NAME' });
        await sql`UPDATE families SET name = ${name} WHERE id = ${ctx.family.id}`;
        const updated = await getAuthContext(req);
        return res.status(200).json({ ok: true, context: updated });
      }

      if (action === 'join') {
        const inviteCode = String(body.inviteCode || '').trim().toUpperCase();
        if (!inviteCode) {
          return res.status(400).json({ error: 'MISSING_INVITE_CODE', message: '請輸入家庭邀請碼' });
        }

        const targetFamilies = await sql`
          SELECT f.id, f.name, s.plan, s.status, s.current_period_end,
            (SELECT COUNT(*)::int FROM family_members fm WHERE fm.family_id = f.id) AS member_count
          FROM families f
          LEFT JOIN subscriptions s ON s.family_id = f.id
          WHERE f.invite_code = ${inviteCode}
          LIMIT 1
        `;

        if (targetFamilies.length === 0) {
          return res.status(404).json({ error: 'INVALID_INVITE_CODE', message: '找不到此家庭邀請碼，請向家人確認代碼' });
        }

        const target = targetFamilies[0];
        if (target.id === ctx.family.id) {
          return res.status(200).json({ ok: true, status: 'already_member', message: '您已經在此家庭空間內' });
        }

        const targetIsPro =
          target.plan &&
          target.plan !== 'free' &&
          (target.status === 'active' || target.status === 'trialing') &&
          (!target.current_period_end || new Date(target.current_period_end).getTime() > Date.now());

        if (!ctx.entitlement.isVip && !targetIsPro) {
          return res.status(402).json({
            error: 'FAMILY_PRO_REQUIRED',
            paywallTrigger: 'FAMILY_SYNC_GATE',
            message: '多人家庭連線同步為 VIP / PRO 專屬功能。升級 PRO 或輸入好友邀請碼即可加入！'
          });
        }

        if (target.member_count >= 10) {
          return res.status(409).json({
            error: 'FAMILY_MEMBER_LIMIT_REACHED',
            message: '此家庭已達系統安全上限 10 位成員，無法再新增成員。'
          });
        }

        try {
          await sql`
            INSERT INTO family_members (family_id, user_id, role, display_name_in_family)
            VALUES (${target.id}, ${ctx.user.id}, 'member', ${ctx.user.displayName})
            ON CONFLICT (family_id, user_id) DO NOTHING
          `;
        } catch (dbErr) {
          const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
          if (msg.includes('FAMILY_MEMBER_LIMIT_REACHED')) {
            return res.status(409).json({
              error: 'FAMILY_MEMBER_LIMIT_REACHED',
              message: '此家庭已達系統安全上限 10 位成員，無法再新增成員。'
            });
          }
          throw dbErr;
        }

        const updated = await getAuthContext(req);
        return res.status(200).json({
          ok: true,
          joinedFamilyName: target.name,
          context: updated
        });
      }

      return res.status(400).json({ error: 'UNKNOWN_ACTION' });
    }

    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  } catch (err) {
    console.error('Family API error:', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: '家庭同步服務暫時異常' });
  }
}
