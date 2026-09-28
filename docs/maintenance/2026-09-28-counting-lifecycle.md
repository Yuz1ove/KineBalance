# 量測生命週期與短促假週期修補

起點是已實際核對的 3602c829 checkout、同版 Vercel preview 與 4511 launchd backend；不回退、不更換 MediaPipe 0.4.1675469240 模型、參數或 ARCI。演算法識別升為 V1.2.1，原 V1.2.0 歷史紀錄照原檔讀回，不重新計算。

## 查實根因

1. 舊 HandDetectorService.acceptResult 不分預覽／正式量測，都把 capturedFrames 送入 analyzeFingerTapping；預覽採最近 60 幀滑動視窗，UI 在 isCameraActive 時就顯示數值。因此未按開始也會出現預覽累計，且當下無效影格不會抹去先前已完成的次數。截圖不能辨認其中的 1 是哪一段影格產生；沒有該段原始資料，不宣稱已查實截圖的單筆誤計數。
2. 舊核心 0.01 palm-ratio 門檻可被單幀指尖跳動跨越，沒有開啟階段持續觀測要求。靜止 .8 倍掌長訊號加每四幀一次 1.8 px 脈衝（掌長 100 px）可重現 16 個假週期。
3. 舊 onResults 接受完後 pending 仍存在，直到 send promise 返回；重複結果可重複採納。新 callback 綁定每次 inference ticket 並先消耗一次，run/recording generation 同時隔離舊輪與預覽晚到結果。
4. 原品質驗證已進入計數器，無效幀不是只有 UI 警告。本輪保留手別／完整座標／邊界／幾何／既有 confidence／重新取得判斷，沒有發明逐關節 confidence。OCCLUDED 的實際判斷是座標超出畫面，不足以辨別哪一根手指被遮擋。

## 資料流與生命週期

camera mediaTime → 原 MediaPipe 關鍵點 → 既有品質判定 → image-plane tip distance / wrist–middle-MCP 掌長 → 原始未平滑訊號 → 同一 analyzeFingerTapping → UI／完成結果／backend 保存重算。

預覽：獨立最多 60 幀 tracking buffer，只做品質與準備估計，analysis 為 null、沒有週期分析與正式保存。getCapturedFrames 保留既有診斷介面，可取 preview raw observations；UI 有獨立 RECORDING gate，只有正式量測可完成並保存，正式 buffer 不含預覽。

開始：使用者按開始且準備成立 → 三秒準備倒數；倒數結束重新確認就緒 → 清空本次 buffer、分析、次數、未完成週期、頻率及保存 session → 用 performance.now() 計時 20 秒。錄影來源維持逐幀媒體時間分析，不假稱真人即時或固定 20 秒。

量測：主要顯示剩餘時間／品質；週期數、頻率與原始距離在預設收合的詳細資訊。未知值用「—」。失追不暫停也不延長 20 秒；無效影格保留缺值和理由但不產生事件。推論若超過 monotonic deadline 不再納入。

完成：一次性 phase transition，失效 UI callback generation，再取正式 frames 並停止 capture；後續動作不改結果。取消／錯誤不產生完成結果或成功保存；再測從新一輪開始。不足三週期時保留頻率等 null，解釋限制並提供重測，不以疾病／正常推論取代缺值。

## 完整週期與噪聲界限

從本段基準出發，觀測超過原 causal open threshold（0.01 palm-ratio noise floor、上一有效 excursion 的 55% 遲滯），開啟狀態有至少 40 ms 的觀測支持，再回到 baseline + excursion × 35% 才完成。初始化、單次穿越、單幀峰值及半次動作不計次。40 ms 是排除孤立脈衝的工程條件：原凍結的小幅 5 Hz fixture 有 50 ms 的開啟支持，保持其精確完成時間；不是人體量測校準參數，也不是提高固定幅度門檻。

品質失敗／時間異常／超過 400 ms 缺口沿用保守規則，丟棄未完成週期並重新取得，不抹去已完成週期；不補零、插值或沿用舊座標。新增重複 frameIndex/sourceTimestamp 拒絕。既有 duplicate/backwards fixture 仍維持 7 個完成週期，未改 expected。前後端共用此核心，trace 留下 TRANSIENT_EXCURSION_REJECTED、INITIAL_PARTIAL_REJECTED、INVALID_RESET、TIME_GAP_RESET 等理由，prefix 完成事件不可被未來資料改寫。

持續的模型噪聲若在幅度／時序上與真實小幅運動相同，僅靠本訊號無法保證分辨。已驗證的是明示合成訊號與授權錄影；真人靜止、緩慢小幅動作與不同距離仍待相機驗證，不宣稱所有靜止誤計數已被證明消除。

## 驗證與交付證據

`output/counting-lifecycle-20260928`（workspace root）保存 before regression、核心／完整 UI tests、build、錄影 raw replay 比較、最終 preview 跨 HTTPS 保存與讀回、虛擬相機流程、無手負例、原資料保留及部署身分。原核心三個測試檔與 frozen fixtures 不變；既有 UI 測試只在操作 helper 等待新倒數，原 assertions 不變。

原有維護文件 dirty 保留；不切換 production、不推送無關變更。後端更新時先移除舊 preview origin，避免舊前端向新演算法保存；新 preview 的確切 origin 取得後才加入 allowlist。本輪 deploy identity 與驗收結果以輸出目錄最終收據為準。
