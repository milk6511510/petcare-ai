# PetCare AI 拍立得寵物護理 (v2.0)

專為台灣毛孩多照護者家庭打造的 **日常照護紀錄・藥袋 OCR 轉錄・家庭連線防重複餵藥** 雲端平台（Apple Liquid Glass 視覺設計 × Neon PostgreSQL 雲端同步 × Vercel Serverless API）。

> **非醫療工具 Safe Harbor 聲明**：本產品定位為生活生產力與排程備忘工具（Store 分類：`Productivity` / `Lifestyle`），絕不進行醫療診斷、處方開立或劑量推算；所有用藥時間以合格執業獸醫師開立之實體藥袋與飼主人工逐項核對為唯一依據。

## 專案架構

```text
petcare-ai/
├── api/                     # Vercel Serverless Functions (TypeScript + @neondatabase/serverless)
│   ├── _lib/                # DB client, scrypt Auth, Session cookies, VIP entitlement helper
│   ├── auth.ts              # 雲端帳號註冊/登入/登出/訪客資料上雲/PDPA刪帳前置與執行
│   ├── billing.ts           # 全方案訂閱 (Free / 週150首週60 / 月240首月60 / 年1290試用7天) & 好友邀請碼
│   ├── doses.ts             # 每日餵藥打卡、Postgres 23505 409 重複餵藥衝突攔截與紀錄確認
│   ├── family.ts            # 家庭 Invite Code 連線同步（DB FOR UPDATE + Trigger 嚴限 10 人）
│   ├── health.ts            # Neon PostgreSQL 連線健康檢查
│   ├── ocr.ts               # 免費版每月 3 次額度原子閘門 (402 Paywall) + 3 級信心覆核 + MGM 首掃解鎖
│   ├── pets.ts              # 多寵物檔案管理（免費版 1 隻上限，第 2 隻觸發 Paywall）
│   └── waitlist.ts          # 官網 Waitlist 名單收集（SHA-256 Email 雜湊 + UTM 歸因）
├── db/
│   └── 0001_init_neon.sql   # Neon PostgreSQL 完整資料表與 10 人家庭上限觸發器
├── public/
│   ├── landing.html         # 官網 Waitlist Landing Page（已修復雙重 page_view 與 PII 風險）
│   └── privacy.html         # 台灣《個資法》第 8 條隱私權政策
├── src/                     # React 18 + Vite + TypeScript + Tailwind Apple Liquid Glass Web App
└── docs/                    # 完整 PRD、QA 檢查表、前後端規格書、GTM 與分析追蹤規範
```
