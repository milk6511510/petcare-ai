import React from 'react';
import { Crown, FileText, Printer, X } from 'lucide-react';
import { getEffectiveEntitlement } from '../lib/entitlements';
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

  const isVip = getEffectiveEntitlement(context).isVip;
  const visibleLogs = isVip ? logs : logs.slice(0, 7);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 overflow-y-auto">
      <div className="liquid-glass-strong relative my-auto w-full max-w-2xl rounded-[28px] p-6 text-[var(--ink-primary)]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-white/80 p-2 text-[var(--ink-secondary)] hover:bg-white transition"
          aria-label="關閉"
        >
          <X className="h-4 w-4" />
        </button>

        <div id="printable-care-report" className="rounded-2xl bg-white p-6 border border-[var(--border-subtle)]">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-4 mb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--brand-secondary)]">
                <FileText className="h-4 w-4" />
                <span>PetCare AI 拍立得寵物護理</span>
              </div>
              <h3 className="text-xl font-black mt-1">日常照護紀錄摘要（非醫療證明）</h3>
              <p className="text-xs text-[var(--ink-secondary)] mt-0.5">
                家庭空間：{context?.family.name || '本機試用家庭'} ・ 彙整毛孩數：{pets.length} 隻
              </p>
            </div>
            <span className="rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] px-3 py-1 text-[11px] font-bold">
              {isVip ? 'PRO 完整區間報表' : '一般版當週單張摘要'}
            </span>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-[var(--bg-canvas)] p-3">
              <div className="text-[11px] text-[var(--ink-muted)]">本報告打卡筆數</div>
              <div className="text-lg font-black text-[var(--ink-primary)]">{visibleLogs.length} 次</div>
            </div>
            <div className="rounded-xl bg-[var(--bg-canvas)] p-3">
              <div className="text-[11px] text-[var(--ink-muted)]">毛孩照護對象</div>
              <div className="text-lg font-black text-[var(--brand-primary)]">{pets.map((p) => p.name).join('、') || '波波'}</div>
            </div>
            <div className="rounded-xl bg-[var(--bg-canvas)] p-3">
              <div className="text-[11px] text-[var(--ink-muted)]">產出日期</div>
              <div className="text-sm font-bold text-[var(--ink-primary)] mt-1">{new Date().toLocaleDateString('zh-TW')}</div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-canvas)] text-[var(--ink-secondary)]">
                <tr>
                  <th className="px-3 py-2">日期 / 時段</th>
                  <th className="px-3 py-2">毛孩</th>
                  <th className="px-3 py-2">紀錄項目</th>
                  <th className="px-3 py-2">打卡家人</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {visibleLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-[var(--ink-muted)]">
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
                        <div className="text-[10px] text-[var(--ink-muted)]">{log.dosage_text}</div>
                      </td>
                      <td className="px-3 py-2 font-semibold text-[var(--brand-secondary)]">{log.logged_by_name_snapshot}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-xl bg-[var(--status-warn-bg)] border border-[var(--status-warn-border)] px-3.5 py-2.5 text-[11px] text-[var(--status-warn)]">
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
              className="flex items-center gap-1.5 rounded-xl bg-[var(--brand-primary-soft)] px-3.5 py-2 text-xs font-bold text-[var(--brand-primary-hover)] hover:brightness-95"
            >
              <Crown className="h-3.5 w-3.5" />
              解鎖無限次完整歷史區間 PDF 報表 (VIP)
            </button>
          ) : (
            <span className="text-xs font-semibold text-[var(--brand-secondary)]">✓ 已享有 PRO 完整區間報表匯出權限</span>
          )}

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-2xl bg-[var(--ink-primary)] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:opacity-90"
          >
            <Printer className="h-4 w-4" />
            列印 / 另存 PDF
          </button>
        </div>
      </div>
    </div>
  );
};
