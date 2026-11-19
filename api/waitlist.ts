import crypto from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql } from './_lib/db';

const PUBLIC_PROVIDERS: Record<string, string> = {
  'gmail.com': 'gmail',
  'googlemail.com': 'gmail',
  'yahoo.com': 'yahoo',
  'yahoo.com.tw': 'yahoo',
  'ymail.com': 'yahoo',
  'icloud.com': 'icloud',
  'me.com': 'icloud',
  'mac.com': 'icloud',
  'hotmail.com': 'microsoft',
  'outlook.com': 'microsoft',
  'live.com': 'microsoft',
  'msn.com': 'microsoft'
};

function classifyEmailProvider(email: string): string {
  const domain = (email.split('@')[1] || '').toLowerCase().trim();
  if (!domain) return 'unknown';
  if (PUBLIC_PROVIDERS[domain]) return PUBLIC_PROVIDERS[domain];
  if (domain.endsWith('.edu.tw') || domain.endsWith('.gov.tw') || domain.endsWith('.edu')) return 'edu_gov';
  return 'other_custom_domain';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const email = String(body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'INVALID_EMAIL' });
    }

    const emailHash = crypto.createHash('sha256').update(email).digest('hex');
    const providerType = classifyEmailProvider(email);
    const petType = String(body.petType || 'not_collected').slice(0, 32);
    const planIntent = String(body.selectedPlanIntent || 'none').slice(0, 32);
    const formSource = String(body.source || 'hero_form').slice(0, 32);
    const utmSource = body.utm_source ? String(body.utm_source).slice(0, 120) : null;
    const utmMedium = body.utm_medium ? String(body.utm_medium).slice(0, 120) : null;
    const utmCampaign = body.utm_campaign ? String(body.utm_campaign).slice(0, 120) : null;
    const utmContent = body.utm_content ? String(body.utm_content).slice(0, 120) : null;

    const sql = getSql();
    const rows = await sql`
      INSERT INTO waitlist_leads (
        email_hash, email_provider_type, pet_type, selected_plan_intent,
        form_source, utm_source, utm_medium, utm_campaign, utm_content
      )
      VALUES (
        ${emailHash}, ${providerType}, ${petType}, ${planIntent},
        ${formSource}, ${utmSource}, ${utmMedium}, ${utmCampaign}, ${utmContent}
      )
      ON CONFLICT (email_hash) DO UPDATE
        SET selected_plan_intent = EXCLUDED.selected_plan_intent,
            pet_type = EXCLUDED.pet_type
      RETURNING id
    `;

    return res.status(201).json({
      ok: true,
      leadUuid: rows[0]?.id,
      emailProviderType: providerType
    });
  } catch (err) {
    console.error('Waitlist error:', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}
