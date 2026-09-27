# 原後端定位與接線審閱

狀態：原後端及原 DB 已定位，本機原資料保存／讀回 PASS；雲端 HTTPS API／preview 接線 BLOCKED，待常駐主機或固定代理位置。沒有 production promotion。

## 身分與保留

- 指定 checkout／branch：`releases/kinebalance-production-repair-20260927` / `codex/kinebalance-production-repair`，本輪起點 `31f5f5c9cbf0b6e32c61049e0349aada0dc5014f`。
- 進場唯一 tracked dirty 檔：`docs/maintenance/2026-09-27-production-repair.md`，保留，未納入本輪提交。
- 原後端：工作區根目錄 `kbpd-core/src/index.ts`；`START.command` 將 cwd 設為該 `kbpd-core`，以 Node strip-types 啟動。原 `PORT` 預設 4498，僅監聽 127.0.0.1。本輪進場 4498 沒有 listener。
- 原 SQLite：`/Users/Yuz1ove/Documents/ChatGPT/ARCI 醫/kbpd-core/.data/kbpd-operational.db`，進場 5,050,368 bytes，SHA-256 `1ba3f7cbd968834bbde1358bd3f128c8125984c669b712f5067d2fc7361560c4`。14 users、16 user_sessions、16 measurements、16 analyses、12 raw payloads；SQLite quick_check=ok。這是原資料庫，沒有替換成 fixture／臨時 DB。
- 原 API 並無已查實的正式可達 URL。原 Vercel project 的 env list 為空；可存取的同 team 12 個 projects 未找到 KineBalance 專用後端。工作區啟動／部署文件只指向本機，沒有 Cloudflare tunnel config 或 KineBalance launch agent。此結論限已查閱的本機與可存取 Vercel 設定，不能排除使用者另有未提供的主機。
- 原 preview `dpl_45CURZan1cwRhC1oBsePT63cBLaC` 仍 READY，對应 `31f5f5c`，未被本輪修改取代。其舊分析驗收不能作為本輪後端接線 PASS。

## 原生契約

| 用途 | 路由／契約 |
|---|---|
| 建立身分 | POST `/api/auth/register` → userId、token；新 session 保存在原 SQLite |
| 恢復 | POST `/api/auth/restore`，原 Bearer token 或 body token |
| 前端身分 | `kbpd_user_token`、`kbpd_user_id`；localStorage 僅保存身分，並非量測儲存 adapter |
| 認證 | Authorization: Bearer；原隨機 session token，有效期 24 小時；本輪未改 |
| 建立紀錄 | POST `/api/measurements`，handSide、source → 原生 session ID |
| 保存 | POST `/api/measurements/:id/analyze`，完整 MeasurementInput；後端重新計算 |
| 列表 | GET `/api/me/measurements`，只依已驗證身分列出 |
| 單筆 | GET `/api/me/measurements/:id` → session、metadata、rawInput、measurementOutput |
| 保存位置 | 原 SQLite measurement_payloads / analysis_results，及原 `.data/analyses/<owner>/<session>.json` |

不得將伺服器秘密放入 `VITE_*`。`VITE_API_BASE_URL` 只可為已核對的公開 API base；build identity 會記錄該非秘密值；雲端 build 拒絕 HTTP／含帳密或 query 的 API URL。

## 查實缺陷與修補

1. 原根目錄後端仍是 `KBPD-DETECTOR-V1.0.0`，保存會重新計算，與前端已接受的 V1.2.0 不一致。本輪將原 storage / identity / ARCI 程式帶入**指定修補 checkout**，共用已接受 V1.2.0 的原位元組。原後端目錄未覆蓋；沒有改模型、參數、品質門檻或 ARCI 原碼。
2. 原 GET 單筆由 SQLite 欄位重組，會漏掉 V1.2 的 trace；新紀錄從既有實體分析檔補回 trace，並逐欄比對 DB 和檔案的共同內容。保留原 schema、原 raw payloads，未做 schema migration。
3. 原前端每次保存重試都重新 POST session，實測留下空白重複紀錄；修為同一次量測重用 session。只有 analyze 成功才顯示保存成功，保存期間不能開始另一輪量測。
4. 建立 session 傳遞原有 source 欄位；原 API 也在分析寫入前拒絕零有效影格。沒有補造資料。
5. 原 CORS 為 `*`；部署入口使用精確 origin 清單，未允許來源回 403，Bearer 原樣傳遞。既有本機 synthetic demo 限制未放寬。
6. 新 `kbpd-core/src/hosted.ts` 綁定明確 `KBPD_DATA_DIR`，先唯讀查驗既有 schema；缺 DB／錯誤 schema 即停止，不會悄悄建立另一 DB。預設只綁 loopback；對外只開原 API，不暴露本機 fixture/vendor/test-harness。
7. 舊驗收脚本只比較第一次頁面的讀回，新頁面只有 heading；本輪改為新頁面自己實際讀回同一 ID，比對 UI POST 原始影格、完整 analyze 回應、accepted core 確定性輸出，以及匿名與第二身分隔離。保存失敗使用真後端 401，不用 mock response。

## 本輪驗收

證據根目錄：`output/backend-connection-20260927`。

- `original-db-real-video-final/receipt.json`：真實授權影片，LEFT，354 / 354 有效影格，22 次，1.88Hz，品質受限；record ID `4e942942-b65f-4a39-97a5-b4332f3fdefb`。原始 payload、完整 output（含 trace）、reload、新頁面全部 exact match。重試前後同一 session，列表只有 1 筆。
- 同一腳本：真的移除一次 Authorization，原 API 回 401；沒有成功提示、沒有 rawInput 或 analysis 寫入；恢復原認證重試成功。另建立必要第二測試身分，列表為空，存取他人紀錄回 SESSION_NOT_FOUND；匿名回 401。未輸出 token。
- `no-hand/receipt.json`：新 build 的色條負例維持缺值、保存 disabled、零保存請求；不作真實手部證據。
- `no-hand-api.json`：原 API 拒絕受控零有效影格，原本測試紀錄維持逐欄一致。
- `cors-local.json`：指定 loopback origin 預檢 204，未允許來源 403 且無 allow-origin。
- `targeted-tests.log`：受影響 MeasurePage 3/3 PASS；新 TypeScript/build 與資產檢查 PASS。未重跑上一輪未受影響的全部追蹤測試。
- `original-data-preservation.json`：所有原有資料列與 29 個原有資料檔逐項雜湊一致；只新增本輪授權的測試身分、session、raw payload 與分析。第一次缺陷定位留下的空測試 session 保留，不刪除資料美化收據。
- `core-preservation.json`：已接受的 3 個 measurement core 檔與原 ARCI 程式雜湊一致。

上述仍是**本機原資料驗收**，不是雲端／正式站保存 PASS。實體相機、實體手機與跨網路 HTTPS 保存：NOT_RUN。

## 部署相容性與必要決定

原 API 是常駐 Node 22（本機驗證 22.22.3）加 node:sqlite 及檔案系統。Vercel Functions 沒有此方案需要的共享永久本機檔案系統，不可直接把 `.data` 丟進現有靜態部署或 serverless tmp。參考：[Vercel SQLite 說明](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel)。本輪不改用新 DB 產品。

建議方案：原 Vercel 前端維持原 project；原後端跑單一常駐 Node 程序，綁定同一完整持久資料目錄，由 HTTPS reverse proxy 對外。需使用者確認常駐主機／容器、持久磁碟目錄、API 網域及可使用的部署方式，或提供這台電腦的固定 HTTPS tunnel。沒有授權自行新增付費主機或將現有 DB 暴露至臨時 public tunnel。

部署準備檔：`deployment/backend.env.example`、`deployment/kinebalance-backend.service.example`。這些是可審閱範本，尚未安装至任何主機。

1. 停止原 backend 寫入，備份**完整** `.data`（含 DB、media、analyses、demo-profile），保留來源雜湊；經核准移交至指定持久磁碟，不建立空 DB、不只搬 SQLite。舊 absolute analysis path 欄位與 ARCI 封存檔路徑也需核對，不能宣稱換主機即全部相容。
2. 以非 root 服務帳號部署本輪原後端來源。`KBPD_DATA_DIR` 指原目錄；`KBPD_ALLOWED_ORIGINS` 指待验收 preview 的精確 HTTPS origin；`PORT` / `KBPD_BIND_HOST` 依反向代理配置。無 wildcard CORS，Authorization 不得被代理剝除。
3. ARCI 原碼仍含兩個已封存本機絕對路徑與 digest；遠端需提供同一封存來源唯讀掛載並核對 hash，否則維持既有 UNAVAILABLE 行為。保存與讀回不依賴 ARCI 可用性，不趁本輪改 ARCI。
4. 查 HTTPS health 的 algorithmVersion/sourceSha256，核對 DB 資料 lineage 與既有紀錄；記錄後端版本。確認是原 DB 才允許測試新增。
5. 新 frontend build 設 `VITE_API_BASE_URL=<已確認原API>`。原 Vercel project 部署 preview，取得精確 hostname，再將其加入後端 origin allowlist。
6. 對**新 build** 執行 `VERIFY_BACKEND=1 BASE_URL=<new-preview> API_BASE=<confirmed-api> HAND_SIDE=LEFT EVIDENCE_DIR=<new-receipts> node --experimental-strip-types scripts/verify-real-video.mjs`，並跑 `scripts/verify-no-hand.mjs`。保存、reload、新頁面、隔離、失敗不成功、原資料保留皆需重新取得雲端收據。
7. 完成才提出明確的新 frontend deployment ID + backend revision + API URL + data volume identity 供使用者批准。本輪不 promote production。

## 回退

- 前端正式 deployment 保持 `dpl_2S7P3M7aghypPz6rurNP8TLgUFCa`，本輪未切換。
- 上線核准後如需回退，將原 Vercel project 回到該部署；後端停修補程序、回到原程式與原資料目錄。不得用舊 DB 備份覆蓋上線後新增資料；本輪沒有 schema migration。
- 原後端程式仍是 V1.0；退回它會恢復已記錄的前後端算法版本落差。因此故障時應停止新保存，保留資料與證據，再決定恢復版本；不能把回退當成缺陷已修復。
