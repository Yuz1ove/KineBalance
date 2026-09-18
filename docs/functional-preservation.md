# KineBalance 功能保存清單

此清單是改版前後的功能與安全驗收基準。Exhibition 只負責敘事；下列功能仍由原 Clinical scene 與既有純規則函式執行。

| Scene | 必須保留的狀態與操作 | 安全不變量 | 驗證 |
| --- | --- | --- | --- |
| 用藥時程 | 08:00／11:00／14:00／18:00、目前第 3 時段、處方／家屬／設備狀態 | 已發藥不等於已服藥；測試不阻擋或延誤用藥 | App unit + desktop browser |
| 指尖測試 | 6 秒可重現展示、20 秒標準測試、F/J、左右大按鍵、有效點擊、速度、間隔變異、速度衰減、交替錯誤、有效性、中止與重測 | 非診斷；結果不影響依醫囑用藥；急性危險不可由點擊速度推論 | Tap unit + rapid F→J browser flow |
| 發藥核對 | 正常流程、數量異常、整批隔離、照顧者確認、全新批次重試、重播 | 異常批次不可進入取藥抽屜；AI 不停藥、不改藥、不改劑量或時間 | Dispense unit + normal/anomaly browser flows |
| 反應追蹤 | 約 60 分鐘時間窗、快速預覽、提醒偏好、完成狀態 | 未完成測試仍不影響用藥；提醒不是危急警報 | Scene unit + browser fast-forward |
| 個人趨勢 | 個人基線、資料無效、單次偏離、3 次中 2 次、連續 3 次、五種圖表狀態 | 不與他人比較；單次結果不做臨床結論 | Trend unit + five-state browser flow |
| 團隊複核 | 單次記錄、非緊急照護提醒、連續偏離摘要、照顧者／醫療團隊共同複核 | 單次不通知；只有重複且有效偏離才升級；處方永不自動變更 | Rules/App unit + browser escalation flow |

## 跨模式與生命週期

- Clinical scene 第一次造訪時 lazy load，之後保留同一 instance。
- Exhibition CTA overlay → 完整 Clinical mode 不重建目前功能。
- 切到其他 Clinical scene 再返回，既有結果不遺失。
- 非 active 的 Tap、Dispense、Follow-up runtime 暫停，不在背景消耗時間或接受鍵盤輸入。
- Research 與 Clinical modal 都限制焦點、支援 Escape、隔離背景並還原觸發焦點。
- Reduced Motion 直接呈現完整內容與最終動畫狀態，不移除安全文字。
