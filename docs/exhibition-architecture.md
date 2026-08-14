# KineBalance Exhibition Architecture

本文件描述目前已落地的 Exhibition Mode 與 Clinical Demo Mode 邊界。兩種模式提供不同的資訊節奏，但所有真正可操作、會產生照護狀態的功能都只存在於持久化的 Clinical scene instance；展覽章節只做靜態敘事預覽，CTA 會開啟同一個 Clinical instance，而不複製醫療規則。

## Architecture invariants

1. 每個已造訪的 Clinical 功能只有一個 stateful scene instance；切換場景只隱藏，不卸載或複製。
2. Exhibition 的圖表與設備是敘事預覽，不寫入照護狀態；所有會改變結果的 CTA 都開啟持久化 Clinical scene。
3. Clinical layer 關閉時整層 `hidden`／`aria-hidden`，各 runtime 收到 inactive/pause 訊號；只有目前 scene 可操作。
4. Exhibition overlay、完整 Clinical mode 與跨 scene 往返都重用同一個已造訪 instance，因此進度與結果不遺失。
5. `calculateTapMetrics`、`evaluateTestAssistance`、`evaluatePersonalTrend` 等純規則維持唯一來源。
6. 動畫與捲動狀態不得成為醫療／功能狀態來源。
7. 展覽首頁不以現有 Dashboard sidebar 作為主要構圖；完整操作模式仍可沿用緊湊導覽。

## Implemented component tree

```text
App (mode, chapter, active scene, visited scenes)
├── ExhibitionMode
│   ├── ExhibitionHeader / ChapterRail / MobileChapterNav
│   └── seven narrative chapters
├── ClinicalExperience (persistent layer)
│   ├── existing clinical header/sidebar
│   └── visited scene slots
│       ├── current slot: visible + active runtime
│       └── prior slots: hidden + paused runtime + preserved state
└── GlobalResearchDrawer (modal focus/inert manager)
```

`TapTestScene`、`DispenseScene` 與 `FollowUpScene` 接收 `active`，隱藏時暫停 listener、timer 與 Anime timeline。場景以 dynamic import 在第一次造訪時載入；已造訪場景保留 instance，且 `SceneShell` 使用 React `useId()` 避免重複 heading id。

## Chapter and scene manifest

Exhibition 有七章，Clinical 保持目前六個 `SceneId`。Opening 不應加入現有 `SceneId`，應新增獨立的 `ChapterId`。

| ChapterId | 展覽章節 | Shared functional surface | Clinical SceneId |
| --- | --- | --- | --- |
| `rhythm` | Opening / Rhythm of Care | 品牌與敘事專用 | `schedule` fallback |
| `medication` | Medication as a Time Anchor | `ScheduleSurface` | `schedule` |
| `motion` | A 20-Second Motion Snapshot | `TapTestSurface` | `tap` |
| `dispense` | Verified Physical Dispensing | `DispenseSurface` | `dispense` |
| `response` | The Response Window | `ResponseWindowSurface` | `followup` |
| `pattern` | Your Pattern, Not Other People’s | `TrendSurface` | `trend` |
| `review` | Human Review | `ReviewSurface` | `review` |

Manifest 應集中保存章節 id、標題、短標籤、hash、對應 SceneId 與 lazy loader。導覽、章節軌、手機選單與模式映射都讀取同一 manifest，不能分別硬編碼。

現有 `SceneShell` 固定使用 `id="scene-title"`，只適合一次 mount 一個 Clinical scene。連續 Exhibition 頁面必須使用新的 `ChapterShell`，並以 `${chapterId}-title` 建立唯一 heading id。

## Single-instance functional surfaces

目前場景仍將 controller 與 Clinical surface 封裝在一起。為了在不重寫醫療規則的情況下保證狀態一致，App 將每個已造訪場景保留為唯一 instance：

```text
ClinicalExperience
└── persistent visited scene slot
    └── existing scene controller + functional surface
```

Exhibition 的時間線、設備切面與趨勢圖只解釋流程，不宣告「完成測試／已發藥／已通知」等功能結果。使用者點擊「開啟…」後，會進入上述唯一 Clinical instance；從 overlay 轉為完整操作或先切到其他 scene 再返回，狀態都保留。

不得用以下方式假裝共享：

- 建立第二套可操作 Exhibition controller，再用 CSS 隱藏其中一套。
- 將 controller 複製到兩個 hook。
- 讓 Exhibition CTA 開啟一個與 Clinical 不同的測試 component。
- 只共享 mock data，但各自維護 phase、timer 或安全門檻。

## Shared state boundaries

### Global navigation state

- `mode: 'exhibition' | 'clinical'`
- `activeChapter: ChapterId`
- `activeClinicalScene: SceneId`
- 已瀏覽章節
- 研究依據 drawer 狀態

### Functional domain state

- Tap Test：模式、倒數、有效時間、tap intervals、交替側、無效點擊、中斷、有效性、協助紀錄。
- Dispense：正常／異常情境、`DispensePhase`、inspection step、異常批次隔離、照顧者確認、retry batch。
- Follow-up：提醒偏好、response window、快速預覽進度與完成狀態。
- Trend + Review：同一組個人基線、有效配對、偏離序列、通知層級、回診摘要與照顧者確認。

Trend 與 Review 必須共用同一 domain provider。目前兩者各自產生模擬偏離狀態；改版後 Review 必須呈現 Trend controller 的同一份資料，而不是重新計算另一個故事。

### Local presentation state

以下狀態不進入 shared store：

- scroll progress
- sticky caption step
- 展件是否已播放過敘事動畫
- hover/focus
- Anime.js timeline instance
- Motion value
- 手機選單局部展開狀態（若離開模式不需要保存）

## Navigation and hash strategy

不需要為此原型加入完整 router dependency。使用 manifest、History API 與 hash 即可提供 direct link、上一頁／下一頁與模式映射。

建議 URL：

- Exhibition：`#rhythm`、`#medication`、`#motion`、`#dispense`、`#response`、`#pattern`、`#review`
- Clinical：`#clinical/schedule`、`#clinical/tap`、`#clinical/dispense`、`#clinical/followup`、`#clinical/trend`、`#clinical/review`

模式切換映射：

- Exhibition `rhythm` 或 `medication` → Clinical `schedule`
- `motion` → `tap`
- `dispense` → `dispense`
- `response` → `followup`
- `pattern` → `trend`
- `review` → `review`
- Clinical 返回 Exhibition 時使用反向映射；`schedule` 回到 `medication`

導覽行為：

1. Exhibition 使用 IntersectionObserver 或 Motion in-view 計算目前章節，observer 僅更新導覽狀態，不更新功能狀態。
2. 章節穩定進入主要 viewport 區域後才 `replaceState` 更新 hash，避免滾動時污染 browser history。
3. 使用者明確點擊章節導覽時使用 `pushState`，確保 Back 可返回上一章。
4. hash navigation 必須先確保 deferred exhibit 已排程載入，再捲動至永遠存在的章節 anchor。
5. Reduced Motion 使用 instant scroll；其他模式可使用短 smooth scroll。
6. 模式切換後將 focus 移到新模式的 `main` heading，不讓鍵盤焦點停在已卸載按鈕。

頁面不應把每個 scroll threshold 寫進 history，也不能依 hash 重建功能 controller。

## Exhibition composition

每個章節分成永遠可讀的 narrative shell 與可延遲載入的 exhibit body：

```text
ChapterShell (eager, semantic content and safety copy)
├── chapter label / heading / explanation
├── safety boundary copy
└── DeferredExhibit
    └── SharedFunctionalSurface or Anime stage
```

Opening 與 Medication eager load，以確保首屏與第一段敘事立即可用。Motion Test、Dispense、Trend 與 Human Review 的重型展件可 deferred load。

安全文字不能放在 deferred placeholder、tooltip 或只有動畫完成才出現的區域。AI 不停止用藥、不調藥、測試不阻斷用藥、已發藥不等於已吞服、非診斷等核心限制必須在相關章節的 eager shell 中存在。

## Mobile portrait behavior

Exhibition Mode 必須支援手機直向，不得渲染目前會把整個背景設為 inert/`aria-hidden` 的強制方向 gate。

Clinical Demo Mode 在遷移期間可暫時保留既有方向事件作為 pause compatibility layer，但最終仍應提供直向操作。若確實需要橫向建議，必須是可關閉、非阻斷的提示，不得是完成核心功能的必要條件。

手機直向規則：

- 760px 以下取消長 sticky section、視差與多層固定背景。
- 章節改為正常文件流，敘事文字在展件之前。
- Medication 時間軸改為垂直。
- 指尖測試保留兩個大型點擊區；每個控制至少 44 × 44px，且不要求精準拖曳。
- 發藥 SVG 使用簡化標籤或圖外部件清單，不能只縮小桌面版文字。
- Trend 圖優先顯示可讀的近期範圍與狀態摘要；若需要水平捲動，要有明確提示且不能產生頁面水平溢出。
- 使用底部章節導覽或可開啟的章節 sheet，不依賴 hover。
- 支援 `dvh`、safe-area inset、200% zoom 與粗指標。
- 低效能／粗指標裝置降低模糊、陰影、同時動畫數量與 ambient motion。

版面主要由 CSS media/container query 控制。裝置偵測只負責 motion/performance policy，不應用 JavaScript 複製一套桌面與手機 DOM。

既有 `kinebalance:orientation-gate-change` 事件可在 controller 遷移期間保留，讓 Tap、Dispense 與 Follow-up 的 pausable timer 測試繼續成立。之後由單一 RuntimePolicyProvider 接收事件，場景不再各自註冊重複 listener。

## Performance and lazy loading

### Eager

- mode/navigation shell
- Opening chapter
- 全域安全邊界與 Research drawer trigger
- 小型 provider/reducer 與純安全規則

### Deferred

- Medication 至 Human Review 的展覽章節 async chunk（Suspense slot 保留穩定 hash anchor）
- Tap Test interactive body
- Dispense SVG and Anime.js choreography
- Trend chart animator
- Human Review interactive simulator

Deferred loading policy：

- 章節 heading、anchor、說明與安全文字永遠 eager render。
- 使用 IntersectionObserver 並設定約 600–1000px `rootMargin`，在進入 viewport 前預載下一個展件。
- 使用者點擊章節導覽或 CTA 時立即觸發對應 chunk 載入。
- 不同功能以獨立 chunk 載入；首頁不可因 import 六個完整場景而等待。
- 不同模式不得各自建立相同 feature chunk。
- 不同章節不可為了保存狀態而全部 hidden mount；狀態由 provider 保存。
- 未 active 的 timeline、RAF、timer 與 observer 必須 pause 或 cleanup。
- `content-visibility` 只用於非 sticky 的普通章節；不可放在需要 sticky positioning 的祖先上。

Anime.js timeline 僅在 exhibit 已載入且接近 viewport 時建立。React rerender 不得重建 timeline；離開 viewport 後停止；unmount 後完整清理。

## Styling isolation

既有 Clinical 介面依賴大型全域 `styles.css`，且目前有多層後置 override。最小風險做法是：

- 第一階段不重寫既有 Clinical CSS。
- 新 Exhibition 元件使用 CSS Modules，或所有 selector 嚴格 scope 在 `.exhibition-mode` 下。
- 共用色彩、字體與 spacing token 可以抽出，但不得一次機械式重排整份既有 stylesheet。
- 不再追加第三套無 scope 的 `:root`／元件 override。
- mode root 使用 `data-experience-mode="exhibition|clinical"`，讓少量必要的 shared primitive 可以安全分流。

## Persistence and refresh policy

模式切換必須保存目前 provider state。若加入 session persistence，需版本化並只保存可安全還原的資料：

- 可保存：完成的 Tap result、提醒偏好、已完成的發藥 outcome、異常隔離狀態、趨勢資料、確認狀態與上次 mode。
- 不直接恢復：正在 countdown/running 的測試、動畫播放位置、尚未完成的普通 phase timer。
- 異常批次若已隔離，不得因 refresh 被還原成正常取藥抽屜。

hydration 必須經 reducer normalization，不可直接信任任意 storage JSON。

## Migration order

1. 建立 mode root、manifest、hash navigation 與 provider 外框；先將現有 App 完整包裝為 Clinical Demo Mode，畫面與功能不變。
2. 建立 Exhibition Opening 與 Medication，使用獨立 `ChapterShell`。
3. 逐一抽出 controller 與 shared surface；每次只遷移一個功能並先保持 Clinical 測試通過。
4. 合併 Trend 與 Review domain state。
5. 加入 deferred exhibit loader 與 runtime pause policy。
6. 依 animation ownership 文件加入 Motion 與 Anime.js。
7. 最後單獨進行 Dispense GSAP → Anime.js parity migration。
8. 驗證模式切換、手機直向、Reduced Motion、鍵盤、refresh normalization、timer/listener cleanup 與六個功能。

建議不要在同一 commit 同時進行 controller extraction、視覺重構與動畫引擎替換。每一步都應保留一個可啟動、可測試的 Clinical fallback。

## Architecture acceptance checks

- [ ] Exhibition 與 Clinical 使用同一 feature provider 與 shared surface。
- [ ] mode switch 後功能進度與結果一致，沒有第二套 state。
- [ ] Exhibition 有七個唯一 heading id，Clinical 保持六個 SceneId。
- [ ] hash direct link、Back/Forward 與章節跳轉可用。
- [ ] 手機直向可閱讀並操作，不受強制方向 gate 阻擋。
- [ ] Reduced Motion 不隱藏章節、展件結果或安全文字。
- [ ] 首屏不載入所有重型展件。
- [ ] hidden/offscreen 場景沒有持續 timeline 或 timer。
- [ ] Trend 與 Review 呈現同一份偏離與通知狀態。
- [ ] 異常發藥隔離、照顧者確認與 retry batch 在兩種模式一致。
