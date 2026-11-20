import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthContext } from './_lib/auth.js';
import { getSql, todayInTimezone } from './_lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: '請先登入雲端帳號' });
    }

    const sql = getSql();
    const todayDate = todayInTimezone(ctx.user.timezone || 'Asia/Taipei');

    if (req.method === 'GET') {
      const schedules = await sql`
        SELECT
          ds.id AS schedule_id,
          ds.pet_id,
          p.name AS pet_name,
          p.avatar_emoji AS pet_emoji,
          pr.id AS prescription_id,
          pr.medication_name,
          pr.clinic_name,
          pr.dosage_text,
          pr.meal_timing,
          to_char(ds.scheduled_time, 'HH24:MI') AS scheduled_time,
          ds.label,
          dl.id AS today_log_id,
          dl.logged_by_name_snapshot AS today_logged_by,
          dl.logged_at AS today_logged_at
        FROM dose_schedules ds
        JOIN pets p ON p.id = ds.pet_id
        JOIN prescriptions pr ON pr.id = ds.prescription_id
        LEFT JOIN dose_logs dl
          ON dl.schedule_id = ds.id AND dl.slot_date = ${todayDate}::date
        WHERE ds.family_id = ${ctx.family.id}
          AND ds.is_active = TRUE
          AND p.is_archived = FALSE
        ORDER BY ds.scheduled_time ASC
      `;

      const conflicts = await sql`
        SELECT
          dc.id,
          dc.schedule_id,
          dc.slot_date::text AS slot_date,
          dc.conflicting_name_snapshot,
          dc.resolution_state,
          dc.resolution_notes,
          dc.created_at,
          pr.medication_name,
          to_char(ds.scheduled_time, 'HH24:MI') AS scheduled_time,
          dl.logged_by_name_snapshot AS winning_logged_by,
          dl.logged_at AS winning_logged_at
        FROM dose_conflicts dc
        JOIN dose_schedules ds ON ds.id = dc.schedule_id
        JOIN prescriptions pr ON pr.id = ds.prescription_id
        JOIN dose_logs dl ON dl.id = dc.winning_dose_log_id
        WHERE dc.family_id = ${ctx.family.id}
        ORDER BY dc.created_at DESC
        LIMIT 20
      `;

      const historyLimitClause = ctx.entitlement.isVip ? 3650 : 14;
      const historyLogs = await sql`
        SELECT
          dl.id,
          dl.slot_date::text AS slot_date,
          dl.logged_by_name_snapshot,
          dl.notes,
          dl.logged_at,
          p.name AS pet_name,
          p.avatar_emoji AS pet_emoji,
          pr.medication_name,
          pr.dosage_text,
          to_char(ds.scheduled_time, 'HH24:MI') AS scheduled_time
        FROM dose_logs dl
        JOIN pets p ON p.id = dl.pet_id
        JOIN dose_schedules ds ON ds.id = dl.schedule_id
        JOIN prescriptions pr ON pr.id = ds.prescription_id
        WHERE dl.family_id = ${ctx.family.id}
          AND dl.slot_date >= (${todayDate}::date - make_interval(days => ${historyLimitClause}))
        ORDER BY dl.logged_at DESC
        LIMIT 100
      `;

      const lockedRows = !ctx.entitlement.isVip
        ? await sql`
            SELECT COUNT(*)::int AS cnt
            FROM dose_logs
            WHERE family_id = ${ctx.family.id}
              AND slot_date < (${todayDate}::date - INTERVAL '14 days')
          `
        : [{ cnt: 0 }];

      return res.status(200).json({
        ok: true,
        todayDate,
        schedules,
        conflicts,
        historyLogs,
        historyLockedCount: lockedRows[0]?.cnt ?? 0
      });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const action = String(body.action || 'log');

      if (action === 'acknowledge_conflict') {
        const conflictId = String(body.conflictId || '');
        const notes = String(body.notes || '已向家人確認僅餵藥一次，毛孩精神食慾正常').slice(0, 200);
        await sql`
          UPDATE dose_conflicts
          SET resolution_state = 'acknowledged', resolution_notes = ${notes}, resolved_at = NOW()
          WHERE id = ${conflictId} AND family_id = ${ctx.family.id}
        `;
        return res.status(200).json({ ok: true });
      }

      const scheduleId = String(body.scheduleId || '');
      const slotDate = String(body.slotDate || todayDate);
      const clientLogId = String(body.clientLogId || `web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
      const notes = body.notes ? String(body.notes).slice(0, 200) : null;
      const actorSnapshot = String(body.actorOverride || ctx.user.displayName);

      if (!scheduleId) {
        return res.status(400).json({ error: 'MISSING_SCHEDULE_ID' });
      }

      const schedRows = await sql`
        SELECT id, pet_id FROM dose_schedules WHERE id = ${scheduleId} AND family_id = ${ctx.family.id} LIMIT 1
      `;
      if (schedRows.length === 0) {
        return res.status(404).json({ error: 'SCHEDULE_NOT_FOUND' });
      }
      const petId = schedRows[0].pet_id;

      // Check existing idempotent client_log_id
      const existingClient = await sql`
        SELECT id, logged_by_name_snapshot, logged_at FROM dose_logs WHERE client_log_id = ${clientLogId} LIMIT 1
      `;
      if (existingClient.length > 0) {
        return res.status(200).json({ ok: true, idempotent: true, log: existingClient[0] });
      }

      // Check slot collision -> 409 Conflict + dose_conflicts write (QA Fix 7.5 & 7.6)
      const existingSlot = await sql`
        SELECT id, logged_by_name_snapshot, logged_at
        FROM dose_logs
        WHERE schedule_id = ${scheduleId} AND slot_date = ${slotDate}::date
        LIMIT 1
      `;

      if (existingSlot.length > 0) {
        const winner = existingSlot[0];
        const conflictRows = await sql`
          INSERT INTO dose_conflicts (
            family_id, schedule_id, slot_date, winning_dose_log_id, conflicting_user_id, conflicting_name_snapshot, conflicting_client_log_id
          )
          VALUES (
            ${ctx.family.id}, ${scheduleId}, ${slotDate}::date, ${winner.id}, ${ctx.user.id}, ${actorSnapshot}, ${clientLogId}
          )
          ON CONFLICT (conflicting_client_log_id) DO NOTHING
          RETURNING id
        `;

        return res.status(409).json({
          code: 'DUPLICATE_DOSE_CONFLICT',
          alreadyLogged: true,
          conflictId: conflictRows[0]?.id ?? null,
          takenBy: winner.logged_by_name_snapshot,
          takenAt: winner.logged_at,
          message: `⚠️ 本時段已由「${winner.logged_by_name_snapshot}」完成打卡！已為您攔截重複餵藥並記錄衝突提醒。`
        });
      }

      const inserted = await sql`
        INSERT INTO dose_logs (
          family_id, pet_id, schedule_id, slot_date, client_log_id, logged_by_user_id, logged_by_name_snapshot, notes
        )
        VALUES (
          ${ctx.family.id}, ${petId}, ${scheduleId}, ${slotDate}::date, ${clientLogId}, ${ctx.user.id}, ${actorSnapshot}, ${notes}
        )
        RETURNING id, logged_by_name_snapshot, logged_at
      `;

      return res.status(201).json({
        ok: true,
        log: inserted[0]
      });
    }

    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  } catch (err) {
    console.error('Doses API error:', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: '打卡同步服務暫時異常' });
  }
}
