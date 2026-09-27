# KineBalance 金源獎維護修補（2026-09-27）

## 正式版本與隔離

- 正式網域： https://kinebalance.yuz1ove.space/#measure
- Vercel project `doseloop-pd-prototype` / `prj_HgInv9tWJVA0sNGZX4NtfBO1CZMP`，team `team_NeJ9lhAjDaMt817az9FVxe6y`。
- 正式部署 `dpl_2S7P3M7aghypPz6rurNP8TLgUFCa`，部署來源 `main / d36004d7beeab81e9d87dbd59f40335bad2d88d7`；部署 metadata 仍使用 repo 舊名 `doseloop-pd-prototype`，GitHub 現名 `Yuz1ove/KineBalance` 的 main SHA 相同。
- Root Directory `.`，Vite，原 build `npm run build`、Vite 預設輸出 `dist`。正式 JS `index-C2zgqrdf.js` 與此 commit 重建 JS 的 SHA-256 均為 `c5ed879463724fade1e7ebb5555b5b0a6a830117aefb13b1ab8508d813329845`。
- 新 checkout：`releases/kinebalance-production-repair-20260927`，branch `codex/kinebalance-production-repair`。原候選及 `releases/kbpd-hand-tracking-02-release` 未修改；外層無初始 commit 的工作區未 reset、clean 或 stash。

## 已查實根因

1. 正式站 `/vendor/mediapipe/hands.js` 回應 HTTP 404，body 為 Vercel `NOT_FOUND`。原 repo 的 public 只有 favicon，build 沒有複製 MediaPipe 模型及 WASM；不是已證實的外部 CDN 不穩。
2. 舊 loader 將 ErrorEvent 串成 `[object Event]`；失敗的 script 留在 DOM，重試只掛上已錯過的 load/error 事件且沒有 timeout。
3. 原「真實同儕審查影片回放」實際請求 `/api/fixtures/real-video?disturbed=false`，正式站同樣 HTTP 404。catch 吞錯後進入 step 4，但 analysisResult 為 null，造成空白成果頁。原入口沒有選檔、解碼或逐幀分析。
4. 原頁面以推估次數、固定 0.88/0.12/0.08/0.05 等指標產生成果，且空相機資料會嘗試補 fixture；保存還能補一個虛構影格。這些路徑已移除。
5. 正式部署未提供同源 `/api` 保存服務。修補新增**顯式 browser build 模式**，只在此瀏覽器保存；原 API 模式與身分 key 保留且不遷移、不覆寫原 DB。此變更須與產品部署一併審閱。

沒有證據支持 CSP 或 CORS 為本次根因。正式回應未送出 CSP；404 是同源 Vercel missing asset。Cloudflare 的舊錯誤資產路徑可快取四小時，因此改用包含套件版本的全新 URL，不能僅在原路徑補檔後假定快取立刻更新。

## 修補內容與範圍

- 固定 `@mediapipe/hands 0.4.1675469240`，保留原 maxNumHands=1、modelComplexity=1、兩項 confidence=0.5。隨建置產出 JS、binarypb、tflite、WASM、packed assets、Apache-2.0 授權及 SHA-256 manifest；build 後逐檔校驗。新路徑 `/vendor/mediapipe/0.4.1675469240/`。
- 從既有 `31e9499` 接回已接受的 `KBPD-DETECTOR-V1.2.0`。`detector.ts`、`frame-validity.ts`、`contracts.ts` 原位元組完全一致，未變更模型、門檻或 ARCI core。與舊正式版相較，這是把既有修正核心接回正式前端，取代展示數字，不是重新設計演算法。
- 初始化、權限、設備不支援、解碼、模型及推論錯誤分開；逾時、取消及換來源會停止 tracks、回呼與模型，script 失敗可重新載入。
- 相機以 20 秒牆鐘時間收束，只接受新來源影格。影片暫停播放後按影片時間每 1/30 秒 seek、解碼、snapshot、send 串行處理，最多 30 秒／900 samples；推論慢不會以牆鐘時間提前結束。這是 30Hz 來源時間取樣，不宣稱能讀出任意編碼的原生每一影格。
- 影片檔最多 10MB；小於 1 秒、無法解碼及沒有有效手部資料都有明確出口。無有效資料顯示缺值並禁止保存，沒有正常、零異常或虛構分數。
- `VITE_STORAGE_MODE=browser` 使用同源 IndexedDB，以交易保存原始影格、來源、時間戳及原生分析輸出；本機身份與 API 身份使用不同 key。50MB 配額，10MB 單次輸入；刪除與保存使用相同 transaction，已刪除身份不能晚到寫入。UI 明示不跨裝置同步、清除網站資料會刪除紀錄、影像不保存。ARCI 服務未佈署，不假造 LIVE 解讀。

## 驗證結果

- 單元／UI：169 PASS；原分析核心：32 PASS。TypeScript、production build、15 個資產完整性及 git diff --check 通過。
- 原始真實影片：Narongrit Kasemsap, *Example Video: Finger tapping for bradykinesia detection*, DOI https://doi.org/10.6084/m9.figshare.28930706.v1 ，CC BY 4.0；11.8 秒、960×540、30fps、2,410,894 bytes。原始影片未裁切或改造用於影片驗收。
- Chromium 桌面：354/354 有效左手影格、22 cycles、1.88Hz，保存 raw/input/output，reload 及新分頁精確讀回。右手設定同片為 0 有效，禁止保存。
- WebKit 手機尺寸模擬：354/354 有效左手影格、23 cycles、1.90Hz，保存及讀回完全一致。**不是實體手機**。
- 兩個瀏覽器的原生核心均回報 `LOW_EXCURSION_UNCERTAIN`，未放寬門檻；22/23 的差異如實保留，不主張跨瀏覽器數值一致、人工真值或臨床驗證。
- 真實影片餵入 Chromium **虛擬鏡頭**：133 有效擷取影格、20 秒量測、34 cycles、保存及讀回成功。這只是鏡頭控制鏈工程驗證，不是實體鏡頭／真人操作驗收。
- MCP 瀏覽器嘗試實際鏡頭：PERMISSION_DENIED，畫面有明確提示與重試。真人相機從預覽至結果仍為 NOT_RUN。
- 受控失敗驗證：損壞影片、0.5 秒影片、script abort 後重試、無手部色條影片、再次量測、影片切鏡頭及停止釋放資源。這些受控素材不能當作真實影像準確度證據。

## 部署與回退

目前正式網域仍是上述舊 deployment。本輪先提供 preview 與本地 diff；沒有查到先前正式 production promotion 授權，**不得把 preview PASS 寫成正式修復完成**。

1. `npm ci --ignore-scripts`，`npm test`，`npm run test:core`，`npm run build:hosted`。
2. 使用原 Vercel project 產生 preview；傳入 `KBPD_SOURCE_COMMIT`，核對 `/build-identity.json` 的 source SHA 與本機一致。不得部署測試影片、存檔紀錄、.env 或本機 DB。
3. 核准後才以原專案正式部署流程部署此 commit，或 promote 已完成核對的 preview。保留原 deployment 作 rollback。
4. 正式網域重新載入、查 build identity、15 個資產 hash、重跑真實影片、保存與讀回及 failure retry。另以真實相機手動驗收。若失敗則回退原 deployment 並保留失敗證據。
5. 不代寄信、不修改競賽報名資料。正式維護完成後使用者仍須在 9/30 17:00 前自行重新編輯並儲存報名資料。

## 五分鐘人工複驗

1. 開正式或指定 preview 的 `/#measure`，重新整理。先到設定建立「此瀏覽器」紀錄身分。
2. 鏡頭選正確側別，啟用並允許權限；見預覽與骨架後開始 20 秒，拇指食指反覆開合。確認有效結果，保存，到紀錄頁重新整理讀回。
3. 重新量測，選 1–30 秒／10MB 內的單手影片與正確側別。確認進度持續前進、片尾自動完成；保存後重整讀回。慢速裝置處理可超過影片片長。
4. 用無手部影片，應顯示無有效資料與缺值、禁止保存。拒絕鏡頭權限應顯示權限提示；允許後按重試。
5. 來回切換影片／相機，再量測一次；確認舊結果不殘留，離開量測頁相機指示燈熄滅。手機需另以實機驗證。
