import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthContext } from './_lib/auth';
import { billingMonthNow, getSql } from './_lib/db';

interface OcrField<T> {
  value: T | null;
  confidence: number;
  confidenceLevel: 'high' | 'low' | 'missing';
  uiHighlight: 'green_verified' | 'yellow_review' | 'red_required';
}

function buildField<T>(rawValue: T | null, confidence: number, required = false): OcrField<T> {
  if (rawValue === null || rawValue === '' || confidence <= 0) {
    return {
      value: null,
      confidence: 0,
      confidenceLevel: required ? 'missing' : 'low',
      uiHighlight: required ? 'red_required' : 'yellow_review'
    };
  }
  if (confidence < 0.85) {
    return {
      value: null,
      confidence,
      confidenceLevel: 'low',
      uiHighlight: 'yellow_review'
    };
  }
  return {
    value: rawValue,
    confidence,
    confidenceLevel: 'high',
    uiHighlight: 'green_verified'
  };
}

const FICTIONAL_PRESETS: Record<
  string,
  {
    label: string;
    medication: [string, number];
    clinic: [string | null, number];
    dosageText: [string | null, number];
    mealTiming: [string, number];
    totalDays: [number | null, number];
    times: string[];
  }
> = {
  gastrowell: {
    label: '晴空動物醫院 - 胃潰寧 GastroWell',
    medication: ['胃潰寧 GastroWell 照護錠', 0.96],
    clinic: ['晴空動物醫院（虛擬示範）', 0.91],
    dosageText: ['每次 1 顆・早晚飯後', 0.93],
    mealTiming: ['after_meal', 0.92],
    totalDays: [7, 0.94],
    times: ['08:30', '20:00']
  },
  heartcalm: {
    label: '暖陽寵護院 - 心安舒 HeartCalm（含低信心覆核）',
    medication: ['心安舒 HeartCalm 膠囊', 0.94],
    clinic: [null, 0.58],
    dosageText: [null, 0.61],
    mealTiming: ['after_meal', 0.89],
    totalDays: [null, 0],
    times: ['08:00', '20:30']
  },
  soothecoat: {
    label: '微風動物診所 - 舒敏錠 SootheCoat',
    medication: ['舒敏錠 SootheCoat 口服劑', 0.95],
    clinic: ['微風動物診所（虛擬示範）', 0.72],
    dosageText: ['每次半顆・睡前輔助', 0.88],
    mealTiming: ['before_bed', 0.87],
    totalDays: [14, 0.90],
    times: ['21:30']
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const ctx = await getAuthContext(req);
    if (!ctx) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: '請先登入雲端帳號' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const action = String(body.action || 'parse');
    const sql = getSql();
    const billingMonth = billingMonthNow(ctx.user.timezone || 'Asia/Taipei');

    if (action === 'parse') {
      const presetKey = String(body.presetKey || 'heartcalm');
      const customFilename = String(body.filename || '').trim();
      const petId = String(body.petId || '');

      if (!petId) {
        return res.status(400).json({ error: 'MISSING_PET_ID', message: '請選擇要建立排程的毛孩' });
      }

      const usageRows = await sql`
        SELECT COUNT(*)::int AS cnt
        FROM ocr_usage_logs
        WHERE family_id = ${ctx.family.id}
          AND billing_month = ${billingMonth}
          AND is_billable = TRUE
          AND status IN ('reserved', 'succeeded')
      `;
      const usedCount = usageRows[0]?.cnt ?? 0;

      if (!ctx.entitlement.isVip && usedCount >= 3) {
        return res.status(402).json({
          code: 'QUOTA_EXCEEDED',
          error: 'QUOTA_EXCEEDED',
          paywallTrigger: 'OCR_QUOTA_EXCEEDED',
          billingMonth,
          monthlyLimit: 3,
          usedCount,
          message: '本月免費藥袋掃描額度（3 次）已用盡，請升級 PRO 方案或兌換好友邀請碼繼續使用。'
        });
      }

      const preset = FICTIONAL_PRESETS[presetKey] ?? FICTIONAL_PRESETS.heartcalm;
      const sampleLabel = customFilename ? `上傳影像: ${customFilename.slice(0, 60)}` : preset.label;

      const logRows = await sql`
        INSERT INTO ocr_usage_logs (family_id, user_id, billing_month, status, is_billable, sample_label)
        VALUES (${ctx.family.id}, ${ctx.user.id}, ${billingMonth}, 'succeeded', TRUE, ${sampleLabel})
        RETURNING id
      `;

      const draft = {
        medicationName: buildField(preset.medication[0], preset.medication[1], true),
        clinicName: buildField(preset.clinic[0], preset.clinic[1], false),
        dosageText: buildField(preset.dosageText[0], preset.dosageText[1], true),
        mealTiming: buildField(preset.mealTiming[0], preset.mealTiming[1], false),
        totalDays: buildField(preset.totalDays[0], preset.totalDays[1], true),
        times: preset.times,
        requiresHumanConfirmation: true,
        confirmationCheckboxText: '我已逐項核對實體動物醫院藥袋文字與上述排程時間無誤（本工具僅供照護紀錄，非醫療建議）'
      };

      return res.status(200).json({
        ok: true,
        usageLogId: logRows[0].id,
        quota: {
          isVip: ctx.entitlement.isVip,
          billingMonth,
          monthlyLimit: ctx.entitlement.isVip ? null : 3,
          usedCount: usedCount + 1
        },
        draft
      });
    }

    if (action === 'confirm') {
      const petId = String(body.petId || '');
      const medicationName = String(body.medicationName || '').trim();
      const clinicName = String(body.clinicName || '').trim() || null;
      const dosageText = String(body.dosageText || '').trim();
      const mealTiming = String(body.mealTiming || 'after_meal').trim();
      const totalDays = Math.max(1, Math.min(90, Number(body.totalDays || 7)));
      const times = Array.isArray(body.times) ? body.times.map((t: unknown) => String(t).trim()).filter(Boolean) : ['08:30'];
      const humanConfirmed = body.humanConfirmed === true;

      if (!humanConfirmed) {
        return res.status(400).json({
          error: 'HUMAN_CONFIRMATION_REQUIRED',
          message: '法規安全要求：建立提醒前，必須勾選「我已逐項核對實體藥袋無誤」'
        });
      }
      if (!petId || !medicationName || !dosageText || times.length === 0) {
        return res.status(400).json({
          error: 'MISSING_REQUIRED_FIELDS',
          message: '請完整填寫必填欄位（藥包名稱、實體藥袋用量說明、提醒時間）'
        });
      }

      const rxRows = await sql`
        INSERT INTO prescriptions (
          family_id, pet_id, medication_name, clinic_name, dosage_text, meal_timing, total_days, source, human_confirmed, created_by
        )
        VALUES (
          ${ctx.family.id}, ${petId}, ${medicationName}, ${clinicName}, ${dosageText}, ${mealTiming}, ${totalDays}, 'ocr_confirmed', TRUE, ${ctx.user.id}
        )
        RETURNING id
      `;
      const rxId = rxRows[0].id;

      for (const t of times.slice(0, 4)) {
        const normalizedTime = /^\d{2}:\d{2}$/.test(t) ? `${t}:00` : '08:30:00';
        const mealLabel =
          mealTiming === 'before_meal' ? '飯前照護' : mealTiming === 'before_bed' ? '睡前照護' : '飯後照護';
        await sql`
          INSERT INTO dose_schedules (family_id, pet_id, prescription_id, scheduled_time, label)
          VALUES (${ctx.family.id}, ${petId}, ${rxId}, ${normalizedTime}::time, ${mealLabel})
        `;
      }

      let referralRewarded = false;
      const pendingRef = await sql`
        SELECT id, referrer_user_id, bonus_days
        FROM referral_redemptions
        WHERE referred_user_id = ${ctx.user.id} AND status = 'pending_first_scan'
        LIMIT 1
      `;

      if (pendingRef.length > 0) {
        const ref = pendingRef[0];
        await sql`
          UPDATE referral_redemptions
          SET status = 'rewarded', rewarded_at = NOW()
          WHERE id = ${ref.id}
        `;
        await sql`
          UPDATE users
          SET referral_bonus_unlocked = TRUE,
              vip_bonus_expires_at = LEAST(
                NOW() + INTERVAL '90 days',
                GREATEST(COALESCE(vip_bonus_expires_at, NOW()), NOW()) + make_interval(days => ${ref.bonus_days})
              )
          WHERE id = ${ctx.user.id} OR id = ${ref.referrer_user_id}
        `;
        referralRewarded = true;
      }

      const updatedCtx = await getAuthContext(req);
      return res.status(201).json({
        ok: true,
        prescriptionId: rxId,
        referralRewarded,
        context: updatedCtx
      });
    }

    return res.status(400).json({ error: 'UNKNOWN_ACTION' });
  } catch (err) {
    console.error('OCR API error:', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: '藥袋辨識與排程建立異常' });
  }
}
