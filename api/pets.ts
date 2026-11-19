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
      const pets = await sql`
        SELECT id, name, species, breed, weight_kg, avatar_emoji, is_archived, created_at
        FROM pets
        WHERE family_id = ${ctx.family.id} AND is_archived = FALSE
        ORDER BY created_at ASC
      `;

      const prescriptions = await sql`
        SELECT id, pet_id, medication_name, clinic_name, dosage_text, meal_timing, total_days, source, user_confirmed_at
        FROM prescriptions
        WHERE family_id = ${ctx.family.id}
        ORDER BY created_at DESC
      `;

      const schedules = await sql`
        SELECT id, pet_id, prescription_id, scheduled_time::text AS scheduled_time, label, is_active
        FROM dose_schedules
        WHERE family_id = ${ctx.family.id} AND is_active = TRUE
        ORDER BY scheduled_time ASC
      `;

      return res.status(200).json({
        ok: true,
        pets,
        prescriptions,
        schedules
      });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const name = String(body.name || '').trim();
      const species = body.species === 'cat' || body.species === 'other' ? body.species : 'dog';
      const breed = String(body.breed || '').trim() || null;
      const weightKg = body.weightKg !== undefined && body.weightKg !== '' ? Number(body.weightKg) : null;
      const avatarEmoji = String(body.avatarEmoji || (species === 'cat' ? '🐱' : species === 'other' ? '🐾' : '🐶'));

      if (!name) {
        return res.status(400).json({ error: 'INVALID_PET_NAME', message: '請輸入毛孩名稱' });
      }

      const activePets = await sql`
        SELECT COUNT(*)::int AS cnt FROM pets WHERE family_id = ${ctx.family.id} AND is_archived = FALSE
      `;
      if (!ctx.entitlement.isVip && (activePets[0]?.cnt ?? 0) >= 1) {
        return res.status(402).json({
          error: 'PET_LIMIT_REACHED',
          paywallTrigger: 'MULTI_PET_LIMIT',
          message: '一般版僅支援 1 隻毛孩檔案，升級 PRO 或輸入好友邀請碼即可解鎖無限寵物！'
        });
      }

      const created = await sql`
        INSERT INTO pets (family_id, name, species, breed, weight_kg, avatar_emoji)
        VALUES (${ctx.family.id}, ${name}, ${species}, ${breed}, ${weightKg}, ${avatarEmoji})
        RETURNING id, name, species, breed, weight_kg, avatar_emoji, is_archived, created_at
      `;

      return res.status(201).json({ ok: true, pet: created[0] });
    }

    if (req.method === 'PATCH') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const petId = String(body.id || '');
      if (!petId) return res.status(400).json({ error: 'MISSING_PET_ID' });

      if (body.archive === true) {
        await sql`
          UPDATE pets SET is_archived = TRUE WHERE id = ${petId} AND family_id = ${ctx.family.id}
        `;
        return res.status(200).json({ ok: true });
      }

      const name = String(body.name || '').trim();
      const breed = String(body.breed || '').trim() || null;
      const weightKg = body.weightKg !== undefined && body.weightKg !== '' ? Number(body.weightKg) : null;
      await sql`
        UPDATE pets
        SET name = COALESCE(NULLIF(${name}, ''), name),
            breed = ${breed},
            weight_kg = ${weightKg}
        WHERE id = ${petId} AND family_id = ${ctx.family.id}
      `;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  } catch (err) {
    console.error('Pets API error:', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: '寵物資料讀取或寫入失敗' });
  }
}
