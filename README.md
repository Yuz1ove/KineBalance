# KineBalance 數位醫療展覽體驗

KineBalance 是帕金森氏症居家用藥節律與動作反應追蹤原型。首頁以七章滾動敘事呈現每日照護節律；需要快速操作時，可切換至保留六個完整功能的 Clinical Demo Mode。

本專案為 2026 AI 創新獎「智慧照護與居家健康創新」組的 2D 互動概念驗證。

## 啟動

需求：Node.js 20 以上（含 Playwright 真實瀏覽器驗收）。

```bash
npm install
npm run dev
```

終端會顯示本機網址，通常為 `http://localhost:5173`。

## 驗證

```bash
npm run typecheck
npm run test
npm run build
npm run preview
```

第一次執行真實瀏覽器驗收前，安裝 Chromium 與 WebKit runtime：

```bash
npm run test:e2e:install
npm run test:e2e
```

Playwright 會驗證桌面 Chromium、手機 Chromium、手機 WebKit、Reduced Motion、鍵盤與核心功能流程。WebKit 模擬無法完整重現 iOS Safari 動態網址列與實體安全區，正式上線前仍需以實體 iPhone Safari 驗收一次。

## 已完成

- Exhibition Mode：Opening、Medication、Motion Test、Verified Dispense、Response Window、Personal Pattern、Human Review 七章敘事。
- Clinical Demo Mode：六個原有功能的緊湊操作介面；展覽 CTA 與完整模式使用同一個功能元件實例，切換呈現方式不重建目前進度。
- 桌面、平板與手機直向響應式介面；手機使用章節 sheet 與底部導覽，不再以方向遮罩阻擋內容。
- Motion for React 負責模式、章節與版面生命週期；Anime.js v4 負責 SVG 路徑與設備精確編舞；CSS 僅處理靜態及裝飾層。
- 發藥流程已由 GSAP 完整遷移到 Anime.js v4，保留正常、異常整批隔離、照顧者確認與全新批次重試。
- 首屏只同步載入展覽 shell 與 Opening；Medication 至 Human Review 形成獨立 async chunk。Clinical 場景則在第一次造訪時各自動態載入。
- 20 秒左右交替點擊測試，以及固定節奏、可重現的 6 秒展示模式。
- 即時計算有效點擊、每秒速度、間隔變異、速度衰減及資料品質。
- 2.5D SVG 分藥器、正常發藥與數量異常隔離／重新分發流程。
- 約 60 分鐘服藥後追蹤與非阻斷式提醒。
- 個人基線帶、前後差值、資料不足及連續偏離狀態。
- 單次偏離不通知；符合原型連續條件後才可建立共同複核摘要。
- Physical AI 感知—決策—行動與不可由 AI 跨越的處方安全邊界。
- 研究依據、限制、模擬資料與非診斷定位。
- 支援 `prefers-reduced-motion`：移除視差與長時間線等待，但保留所有內容與必要狀態回饋。
- 鍵盤操作、44 px 以上核心控制、清楚 focus indicator、對話框背景 `inert` 與模式切換後焦點管理。

## 架構文件

- `docs/exhibition-architecture.md`：雙模式、章節／場景映射、手機與效能策略。
- `docs/animation-ownership.md`：Motion、Anime.js、React 與 CSS 的動畫責任、時間 token、Reduced Motion 與清理規範。

## 尚未完成

- 真實控制板、馬達、旋轉分藥盤、重量感測器與攝影機整合。
- 模型藥物的實體核對、錯誤隔離與端到端桌上型驗證。
- 患者資料蒐集、臨床研究、診斷／療效或醫療器材驗證。
- 正式後端、身分權限、通知服務、資安與醫療系統串接。

## 安全定位

此原型不決定是否給藥、不修改劑量或處方，也不以未完成指尖測試阻擋發藥。「已發藥」與「藥杯已取出」都不等於患者已吞下藥物。所有藥物、重量、分數、基線與趨勢數據均為概念展示或模擬資料。
