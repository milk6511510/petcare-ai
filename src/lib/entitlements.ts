import type { AuthContext } from '../types';

/**
 * 限時完整 PRO 權限體驗旗標：
 * 暫時全面開放無限寵物、無限掃描、10 人家庭同步、完整歷程與 PDF 匯出（含訪客試用）。
 */
export const TEMP_FULL_PRO_ACCESS = true;

export interface EffectiveEntitlement {
  isVip: boolean;
  isTempProUnlock: boolean;
  petLimit: number | null;
  ocrMonthlyLimit: number | null;
  maxFamilyMembers: number;
  historyDaysLimit: number | null;
  pdfFullExport: boolean;
  statusLabel: string;
}

export function getEffectiveEntitlement(context: AuthContext | null): EffectiveEntitlement {
  if (TEMP_FULL_PRO_ACCESS) {
    return {
      isVip: true,
      isTempProUnlock: true,
      petLimit: null,
      ocrMonthlyLimit: null,
      maxFamilyMembers: 10,
      historyDaysLimit: null,
      pdfFullExport: true,
      statusLabel: context?.entitlement.vipSource === 'subscription'
        ? `${context.entitlement.plan}・PRO 完整權限`
        : '限時全站開放 PRO 完整權限中'
    };
  }

  const isVip = Boolean(context?.entitlement.isVip);
  return {
    isVip,
    isTempProUnlock: false,
    petLimit: isVip ? null : 1,
    ocrMonthlyLimit: isVip ? null : 3,
    maxFamilyMembers: isVip ? 10 : 1,
    historyDaysLimit: isVip ? null : 14,
    pdfFullExport: isVip,
    statusLabel: isVip ? 'VIP / PRO 會員' : '一般版 (Free)'
  };
}
