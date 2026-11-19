-- PetCare AI (拍立得寵物護理) - Neon PostgreSQL Schema v2.0
-- Aligned with PetCare_AI_Decisions_v2.md & QA Rigel Fix 7.1-7.9

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_color TEXT NOT NULL DEFAULT '#FF7E47',
  timezone TEXT NOT NULL DEFAULT 'Asia/Taipei',
  referral_code TEXT UNIQUE NOT NULL,
  referred_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  referral_bonus_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  vip_bonus_expires_at TIMESTAMPTZ,
  terms_accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  terms_version TEXT NOT NULL DEFAULT 'v1.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS waitlist_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_hash TEXT UNIQUE NOT NULL,
  email_provider_type TEXT NOT NULL,
  pet_type TEXT NOT NULL DEFAULT 'not_collected',
  selected_plan_intent TEXT DEFAULT 'none',
  form_source TEXT NOT NULL DEFAULT 'hero_form',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  device_label TEXT DEFAULT 'Web Cloud Sync',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Taipei',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referral_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code_used TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_first_scan' CHECK (status IN ('pending_first_scan', 'rewarded')),
  bonus_days INTEGER NOT NULL DEFAULT 14,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rewarded_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID,
  actor_user_id UUID,
  action TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  display_name_in_family TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (family_id, user_id)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID UNIQUE NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  subscriber_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro_weekly', 'pro_monthly', 'pro_annual')),
  product_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'expired', 'canceled')),
  is_trial BOOLEAN NOT NULL DEFAULT FALSE,
  is_intro_offer BOOLEAN NOT NULL DEFAULT FALSE,
  orphan_state TEXT,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  current_period_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_weekly_no_trial CHECK (NOT (plan = 'pro_weekly' AND is_trial = TRUE))
);

CREATE TABLE IF NOT EXISTS pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  species TEXT NOT NULL CHECK (species IN ('dog', 'cat', 'other')),
  breed TEXT,
  weight_kg NUMERIC(5,2),
  avatar_emoji TEXT NOT NULL DEFAULT '🐶',
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ocr_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  billing_month TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'succeeded' CHECK (status IN ('reserved', 'succeeded', 'failed')),
  is_billable BOOLEAN NOT NULL DEFAULT TRUE,
  sample_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  clinic_name TEXT,
  dosage_text TEXT NOT NULL,
  meal_timing TEXT NOT NULL DEFAULT 'after_meal',
  total_days INTEGER NOT NULL DEFAULT 7,
  source TEXT NOT NULL DEFAULT 'ocr_confirmed' CHECK (source IN ('ocr_confirmed', 'manual_input')),
  human_confirmed BOOLEAN NOT NULL DEFAULT TRUE,
  user_confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION enforce_family_member_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  PERFORM 1 FROM families WHERE id = NEW.family_id FOR UPDATE;
  SELECT COUNT(*) INTO current_count FROM family_members WHERE family_id = NEW.family_id;
  IF current_count >= 10 THEN
    RAISE EXCEPTION 'FAMILY_MEMBER_LIMIT_REACHED: Maximum 10 members allowed per family';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_family_member_limit ON family_members;
CREATE TRIGGER trg_enforce_family_member_limit
BEFORE INSERT ON family_members
FOR EACH ROW
EXECUTE FUNCTION enforce_family_member_limit();

CREATE TABLE IF NOT EXISTS dose_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  scheduled_time TIME NOT NULL,
  label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dose_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES dose_schedules(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  client_log_id TEXT UNIQUE NOT NULL,
  logged_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  logged_by_name_snapshot TEXT NOT NULL,
  notes TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_schedule_slot UNIQUE (schedule_id, slot_date)
);

CREATE TABLE IF NOT EXISTS dose_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES dose_schedules(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  winning_dose_log_id UUID NOT NULL REFERENCES dose_logs(id) ON DELETE CASCADE,
  conflicting_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  conflicting_name_snapshot TEXT NOT NULL,
  conflicting_client_log_id TEXT UNIQUE NOT NULL,
  resolution_state TEXT NOT NULL DEFAULT 'unresolved' CHECK (resolution_state IN ('unresolved', 'acknowledged', 'dismissed')),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ocr_usage_family_month ON ocr_usage_logs(family_id, billing_month);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_dose_logs_family_date ON dose_logs(family_id, slot_date DESC);
CREATE INDEX IF NOT EXISTS idx_prescriptions_pet ON prescriptions(pet_id);
