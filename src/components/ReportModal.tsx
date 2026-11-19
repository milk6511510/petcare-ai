import React from 'react';
import { Crown, FileText, Printer, X } from 'lucide-react';
import type { AuthContext, HistoryLog, Pet } from '../types';

interface ReportModalProps {
  open: boolean;
  context: AuthContext | null;
  pets: Pet[];
  logs: HistoryLog[];
  onClose: () => void;
  onUpgrade: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  open,
  context,
  pets,
  logs,
  onClose,
  onUpgrade
}) => {
  if (!open) return null;

  const isVip = Boolean(context?.entitlement.isVip);
  const visibleLogs = isVip ? logs : logs.slice(0, 7);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 overflow-y-auto">
      <div className="liquid-glass-strong relative my-auto w-full max-w-2xl rounded-[28px] p-6 text-[#2B2623]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-white/80 p-2 text-[#5C554F] hover:bg-white transition"
          aria-label="關閉"
        >
          <X className="h-4 w-4" />
        </button>

        <div id="printable-care-report" className="rounded-2xl bg-white p-6 border border-[#E8E2D9]">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E8E2D9] pb-4 mb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#4E878C]">
                <FileText className="h-4 w-4" />
                <span>PetCare AI 拍立得寵物護理</span>
              </div>
              <h3 className="text-xl font-black mt-1">日常照護紀錄摘要（非醫療證明）</h3>
              <p className="text-xs text-[#5C554F] mt-0.5">
                家庭空間：{context?.family.name || '本機試用家庭'} ・ 彙整毛孩數：{pets.length} 隻
              </p>
            </div>
            <span className="rounded-full bg-[#FAF7F2] border border-[#E8E2D9] px-3 py-1 text-[11px] font-bold">
              {isVip ? 'VIP 完整區間報表' : '一般版當週單張摘要'}
            </span>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-[#FAF7F2] p-3">
              <div className="text-[11px] text-[#8E857C]">本報告打卡筆數</div>
              <div className="text-lg font-black text-[#2B2623]">{visibleLogs.length} 次</div>
            </div>
            <div className="rounded-xl bg-[#FAF7F2] p-3">
              <div className="text-[11px] text-[#8E857C]">毛孩照護對象</div>
              <div className="text-lg font-black text-[#FF7E47]">{pets.map((p) => p.name).join('、') || '波波'}</div>
            </div>
            <div className="rounded-xl bg-[#FAF7F2] p-3">
              <div className="text-[11px] text-[#8E857C]">產出日期</div>
              <div className="text-sm font-bold text-[#2B2623] mt-1">{new Date().toLocaleDateString('zh-TW')}</div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#E8E2D9]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F2] text-[#5C554F]">
                <tr>
                  <th className="px-3 py-2">日期 / 時段</th>
                  <th className="px-3 py-2">毛孩</th>
                  <th className="px-3 py-2">紀錄項目</th>
                  <th className="px-3 py-2">打卡家人</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E2D9]">
                {visibleLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-[#8E857C]">
                      目前尚無照護打卡紀錄，完成首筆打卡後即可匯出給執業獸醫師回診參考。
                    </td>
                  </tr>
                ) : (
                  visibleLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-3 py-2 font-medium">
                        {log.slot_date} {log.scheduled_time}
                      </td>
                      <td className="px-3 py-2">
                        {log.pet_emoji} {log.pet_name}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-semibold">{log.medication_name}</div>
                        <div className="text-[10px] text-[#8E857C]">{log.dosage_text}</div>
                      </td>
                      <td className="px-3 py-2 font-semibold text-[#4E878C]">{log.logged_by_name_snapshot}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-xl bg-[#FFF8E1] border border-[#F5E0A3] px-3.5 py-2.5 text-[11px] text-[#7A5B00]">
            <strong>免責聲明：</strong>本報表為飼主日常照護紀錄彙整，絕非獸醫診斷、處方或醫療證明；實際用藥與療程請以合格實體動物醫院執業獸醫師之醫囑為準。
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {!isVip ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onUpgrade();
              }}
              className="flex items-center gap-1.5 rounded-xl bg-[#FF7E47]/15 px-3.5 py-2 text-xs font-bold text-[#C95A41] hover:bg-[#FF7E47]/25"
            >
              <Crown className="h-3.5 w-3.5" />
              解鎖無限次完整歷史區間 PDF 報表 (VIP)
            </button>
          ) : (
            <span className="text-xs font-semibold text-[#4E878C]">✓ 您已享有 VIP 完整區間報表匯出權限</span>
          )}

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-2xl bg-[#2B2623] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:opacity-90"
          >
            <Printer className="h-4 w-4" />
            列印 / 另存 PDF
          </button>
        </div>
      </div>
    </div>
  );
};
