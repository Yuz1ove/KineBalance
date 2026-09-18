# KineBalance Animation Ownership

本文件定義 KineBalance 展覽模式與完整操作模式的動畫責任邊界。目標是在不改變醫療安全邏輯與功能狀態的前提下，引入 Motion for React 與 Anime.js v4，並避免多套引擎同時改寫同一元素。

## 核心規則

每一個會動的 DOM 或 SVG 元素都必須有且只有一個 animation owner。

同一元素的下列屬性不得由 Motion、Anime.js、CSS animation/transition 或既有 GSAP 同時控制：

- `transform`
- `translate`
- `scale`
- `rotate`
- `opacity`

owner 是以「元素」為單位，而不是以整個章節為單位。Motion 可以移動章節外框，Anime.js 可以同時編排外框內的 SVG 子元素；兩者不可同時以同一個元素為 target。

建議在複雜場景標示責任邊界：

```tsx
<motion.section data-motion-owner="motion">
  <div ref={stageRef} data-motion-owner="anime">
    {/* Anime.js 只查找並控制這個 stage 內部的元素 */}
  </div>
</motion.section>
```

Anime.js selector 必須從場景 `ref` 向內查找，不可使用可能命中其他章節的全域 selector。Motion 不得在 `data-motion-owner="anime"` 的元素本身使用 `animate`、`layout`、`layoutId` 或 `while*`。

## Owner 分工

| Owner | 負責 | 不負責 |
| --- | --- | --- |
| React 狀態與 business timer | 指尖測試倒數與有效時間、`DispensePhase`、異常批次隔離、照顧者確認、60 分鐘快速模擬、趨勢規則與通知門檻 | 視覺 easing、SVG 路徑、章節淡入 |
| Motion for React | 模式切換、`AnimatePresence`、章節外框進退場、sticky caption、scroll progress、導覽狀態、drawer、layout transition、hover/press/focus 回饋 | 設備內部零件、藥丸路徑、SVG 線條繪製、數據編舞 |
| Anime.js v4 | 開場時間軸、多元素 stagger、章節內 SVG path drawing、用藥節點、設備剖面流程、數據計數、趨勢圖線與資料點的精確編舞 | React 路由、章節 mounting、醫療狀態判定 |
| CSS | 靜態樣式、focus indicator、顏色與非動畫狀態、獨立裝飾性 ambient pseudo-element | 功能流程、同時被 Motion/Anime.js 控制元素的 transform 或 opacity |

React 狀態永遠是功能真相來源。動畫完成 callback 不得決定藥物是否核對通過、是否隔離異常批次、測試是否有效或是否通知照顧者。動畫只呈現既有狀態。

## 場景責任表

| 場景 | Motion | Anime.js | React / CSS |
| --- | --- | --- | --- |
| Opening | 章節外框、捲動提示、離場 | 品牌清晰化、時間線、節點依序形成 | React 控制是否已播放；CSS 提供靜態最終畫面 |
| Medication | sticky caption、章節進度、CTA | 時間線建立與節點聚焦 | React 保存目前時段；文字與安全註記永遠在 DOM |
| Motion Test | 展件外框、模式切換、按鈕回饋 | 完成後數值的短計數動畫 | React 控制倒數、F/J、點擊、有效性與結果；測試執行中停用 narrative motion |
| Verified Dispense | 展件外框、情境 tab、操作按鈕 | 藥匣、分藥盤、攝影機、核對盤、分流閘門、抽屜與藥丸路徑 | React `DispensePhase` 與 pausable timer 控制正常／異常／重試語意狀態 |
| Response Window | 章節外框與內容切換 | 可選的時間帶形成 | React 控制快速模擬與提醒方式；CSS 顯示靜態進度 |
| Personal Pattern | tab、insight layout transition | 初次基線與折線繪製；狀態切換時只轉場既有點與線 | React 計算個人趨勢與通知級別 |
| Human Review | 人員關係、摘要與 mode transition | 只用於一次性的連線形成 | React 保存偏離資料、確認狀態與回診摘要 |

## 功能時間與動畫時間

功能 timer 與場景動畫必須讀取同一組 phase duration token，但維持不同責任：

1. React reducer 進入一個語意 phase。
2. Anime.js 依該 phase 播放呈現。
3. pausable business timer 在同一時長後派發下一個 phase。
4. viewport、頁面可見性或方向遮罩暫停時，business timer 與 Anime.js timeline 必須一起暫停。
5. Reduced Motion 下可以縮短呈現時間，但 reducer 仍要走過相同語意狀態，不可跳過隔離、確認或安全提示。

測試應以 React 狀態、可存取文字與既有 `data-location` 等語意結果驗證流程，不以動畫像素或 easing 驗證醫療邏輯。

## Timing tokens

| Token | 範圍 | 建議預設 | 用途 |
| --- | --- | --- | --- |
| `motion.micro` | 120–220ms | 180ms | hover、press、focus、tab 回饋 |
| `motion.component` | 350–650ms | 480ms | 一般元件進場與局部 layout transition |
| `motion.chapter` | 700–1100ms | 880ms | 章節與模式轉場 |
| `motion.choreography` | 1200–2800ms | 2200ms | 設備、圖表與多階段展件 |
| `motion.opening` | 最多 3500ms | 3000ms | 品牌開場完整時間軸 |
| `motion.tapFeedback` | 90–140ms | 110ms | 指尖測試按壓視覺回饋 |

建議 easing：

- 操作回饋：快速 ease-out，不 overshoot。
- 展覽內容形成：柔和 ease-in-out。
- 數據點：短促、穩定的 ease-out。
- 設備移動：主要路徑維持線性時間感，起停點使用局部 ease。
- 醫療資訊、標題與警示不得使用 bounce、旋轉飛入或誇張 spring。

開場不可阻擋捲動；使用者不必等待 3 秒才能操作。

## Reduced Motion policy

Reduced Motion 必須由單一 runtime policy 提供給 Motion、Anime.js 與 React controller。Motion 使用 `useReducedMotion`；Anime.js 與非 Motion 程式讀取相同的 `prefers-reduced-motion` 狀態，不各自建立互不一致的判斷。

在 Reduced Motion 模式：

- 不播放長開場，立即呈現品牌與完整時間線。
- 不使用視差、scroll-scrub 位移或長 sticky 動畫等待。
- Anime.js stage 直接設定到該 React phase 的最終狀態。
- 章節與模式切換改為立即或非常短的狀態變化。
- 保留按鈕、focus、成功、異常隔離與通知等必要功能回饋。
- 不因跳過動畫而隱藏文字、SVG 說明或安全限制。
- 導覽跳轉使用 instant scroll，不呼叫強制 smooth scroll。

Reduced Motion 不是另一套內容樹。動畫開關前後必須有相同的 DOM 閱讀順序與功能控制。

## Runtime pause policy

以下任一條件成立時，場景內的 narrative timeline 與相關 business timer 應暫停：

- 場景離開 viewport。
- `document.visibilityState !== 'visible'`。
- 手機方向提示或其他 modal overlay 使背景 inert。
- 目前功能不是 active feature。

指尖測試進入 countdown 或 running 時，應啟用 interaction lock：暫停 ambient 與 narrative motion，只保留計時、按壓、下一側提示與必要狀態變更。

離開 viewport 不應重設患者已完成的功能狀態。返回時依 controller 保存的 phase 恢復；純敘事動畫可設定為只播放一次。

## Anime.js lifecycle 與清理

- 使用 Anime.js v4 的 `animate`、`createTimeline`、`stagger` 等 API，不使用舊版 `anime.timeline()`。
- 在 `useLayoutEffect` 或專用 hook 中建立 timeline，並以場景 root `ref` 限定 target。
- 每次 effect 只建立一個需要的 timeline；不要因一般 React rerender 重建。
- effect cleanup 必須 cancel/revert timeline，移除 inline animation state（若該 API 需要），並解除 listener。
- timeline、observer、RAF、timeout、interval 與 media-query listener 都必須在 unmount 時清理。
- React Strict Mode 的 setup → cleanup → setup 不得留下雙重 timeline 或重複計時器。
- Anime.js callback 若會 dispatch React action，cleanup 後不得再執行。
- 動畫離開 viewport 後 pause 或 cancel；不可讓未顯示章節持續消耗主執行緒。

## GSAP migration rule

目前 GSAP 僅用於發藥設備。替換順序如下：

1. 保留現有 `DispensePhase`、藥丸 identity、`data-location`、正常與異常重試流程。
2. 以同一 SVG 結構建立 Anime.js animator，與 GSAP 版本逐 phase 對照。
3. 驗證一般、異常整批隔離、照顧者確認、全新批次重試、暫停／恢復及 Reduced Motion。
4. 一次只啟用一個設備 animator。
5. Anime.js 達成功能與視覺 parity 後，才移除 GSAP dependency 與其 CSS fallback。

不得長期讓 Motion、Anime.js、GSAP 三套引擎同時控制正式畫面。若 Anime.js parity 尚未完成，保留 GSAP 並回報風險，不能為了移除套件破壞發藥安全流程。

## Review checklist

- [ ] 每個動畫 target 都能辨識唯一 owner。
- [ ] Motion 與 Anime.js 沒有命中同一元素的 transform/opacity。
- [ ] CSS transition/keyframe 沒有覆寫 Anime.js 或 Motion target。
- [ ] React phase 是功能真相，動畫 callback 不做醫療判定。
- [ ] Reduced Motion 顯示完整內容與最終狀態。
- [ ] 離開 viewport、背景頁籤與 modal overlay 會暫停相關工作。
- [ ] unmount 後沒有 timeline、RAF、timer、observer 或 listener 殘留。
- [ ] 指尖測試執行中沒有干擾操作的 ambient/narrative motion。
- [ ] 動畫不使用快速閃爍、刺眼紅色或醫療警示 overshoot。

