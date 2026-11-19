export type TabId = 'today' | 'ocr' | 'family' | 'history' | 'settings';

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
    vipSource: 'subscription' | 'referral_bonus' | 'free';
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

export interface Pet {
  id: string;
  name: string;
  species: 'dog' | 'cat' | 'other';
  breed: string | null;
  weight_kg: number | null;
  avatar_emoji: string;
}

export interface Prescription {
  id: string;
  pet_id: string;
  medication_name: string;
  clinic_name: string | null;
  dosage_text: string;
  meal_timing: string;
  total_days: number;
  source: string;
  user_confirmed_at: string;
}

export interface ScheduleItem {
  schedule_id: string;
  pet_id: string;
  pet_name: string;
  pet_emoji: string;
  prescription_id: string;
  medication_name: string;
  clinic_name: string | null;
  dosage_text: string;
  meal_timing: string;
  scheduled_time: string;
  label: string | null;
  today_log_id: string | null;
  today_logged_by: string | null;
  today_logged_at: string | null;
}

export interface DoseConflict {
  id: string;
  schedule_id: string;
  slot_date: string;
  conflicting_name_snapshot: string;
  resolution_state: 'unresolved' | 'acknowledged' | 'dismissed';
  resolution_notes: string | null;
  created_at: string;
  medication_name: string;
  scheduled_time: string;
  winning_logged_by: string;
  winning_logged_at: string;
}

export interface HistoryLog {
  id: string;
  slot_date: string;
  logged_by_name_snapshot: string;
  notes: string | null;
  logged_at: string;
  pet_name: string;
  pet_emoji: string;
  medication_name: string;
  dosage_text: string;
  scheduled_time: string;
}

export interface FamilyMember {
  id: string;
  user_id: string;
  role: 'owner' | 'member';
  display_name: string;
  avatar_color: string;
  timezone: string;
  joined_at: string;
}

export interface PlanItem {
  id: 'free_0' | 'weekly_150' | 'monthly_240' | 'annual_1290';
  planKey: 'free' | 'pro_weekly' | 'pro_monthly' | 'pro_annual';
  productId: string | null;
  name: string;
  priceTwd: number;
  introPriceTwd: number | null;
  periodLabel: string;
  trialDays: number;
  badge: string;
  highlights: string[];
}

export interface OcrField<T> {
  value: T | null;
  confidence: number;
  confidenceLevel: 'high' | 'low' | 'missing';
  uiHighlight: 'green_verified' | 'yellow_review' | 'red_required';
}

export interface OcrDraft {
  medicationName: OcrField<string>;
  clinicName: OcrField<string>;
  dosageText: OcrField<string>;
  mealTiming: OcrField<string>;
  totalDays: OcrField<number>;
  times: string[];
  requiresHumanConfirmation: boolean;
  confirmationCheckboxText: string;
}
