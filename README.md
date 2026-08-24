# Pulse Courier: Neon Run

一款不需要安裝遊戲引擎、下載素材或連線伺服器的短回合瀏覽器遊戲。你是一名在不穩定能量場中工作的 Courier：把散落的能量帶回中央 Relay，決定要安全地少量運送，還是多帶一些換取更高分數倍率，同時躲開越來越密集的敵方無人機。

**v1.2.2 的目標：在不改玩法的前提下重新平衡整體視覺重心、提高深色場景的文字可讀性，讓簡單／普通難度有更清楚的色彩識別，並把選單與升級動畫改得更柔順。**

## 🎮 線上遊玩

[▶ 立即遊玩 Pulse Courier: Neon Run](https://trtattitan7788139.github.io/ai-easy-little-games/)

GitHub Pages 啟用後，直接點上面的連結就能在瀏覽器玩，不需要下載、Clone、安裝 npm、Python 或任何遊戲引擎。之後 `main` 分支更新時，線上版也會跟著重新部署。

> GitHub Pages 第一次啟用：`Settings → Pages → Build and deployment → Deploy from a branch → main → /(root) → Save`。這個設定只需要做一次。

## 離線遊玩

### Windows：推薦

1. 下載或 Clone 這個 repository。
2. 進入資料夾。
3. 雙擊 `PLAY.bat`。
4. 瀏覽器會直接開啟遊戲。

不需要安裝 npm、不需要 Python，也不需要任何遊戲引擎。

### 直接開啟

也可以直接雙擊根目錄的 `index.html`。本專案刻意使用一般 JavaScript classic script，而不是需要 HTTP 環境的 ES Module，因此支援直接從本機檔案開啟。瀏覽器 runtime 以 6 個基礎 script 加上 v1.2.1 的 3 個小型增量 script 組成，刻意控制單檔大小以利可靠傳輸與維護；遊戲仍視為同一個 runtime。

建議瀏覽器：最新版 Microsoft Edge、Google Chrome 或 Firefox。

### 可選：用本機 HTTP Server 開啟

如果你本來就有 Python，也可以在專案目錄執行：

```bash
python -m http.server 8000
```

然後在瀏覽器開啟 `http://localhost:8000`。


## 手機遊玩

手機版不需要外接鍵盤。左側使用 360° 虛擬搖桿：拖動方向決定移動方向，拖動距離決定移動強度；放手後搖桿會自動回中並停止移動。右側保留「衝刺」與「脈衝」，支援多點觸控，因此可以推住搖桿的同時使用能力。暫停、升級與結算視窗也會自動縮成手機可操作尺寸。

直向與橫向都能玩。v1.2 不再把固定 16:10 畫面硬縮到手機：直向會使用較高的戰場與更大的 HUD／搖桿／能力鍵；橫向則會把邏輯 Arena 擴寬，真正顯示更多左右遊戲世界。v1.2.1 進一步改用 `visualViewport` 的實際可視高度，因此 Safari 網址列展開／收合或手機旋轉時，遊戲會重新計算可用高度，不再要求往下滑才能找到控制器。

右上角新增 **全螢幕** 按鈕。支援 Fullscreen API 的瀏覽器會直接進入／離開全螢幕；iPhone Safari 若不開放網頁全螢幕，遊戲只會在頁面底部顯示非阻塞式提示，不會跳出 modal／alert 或暫停遊戲。提示會建議使用「分享 → 加入主畫面」；從主畫面啟動後會以 standalone Web App 模式執行，減少網址列與分頁列佔用的空間。

## 完全沒玩過這類遊戲？

主選單先按 **「新手教學」**。教學不是文字牆，而是六個實際操作步驟：

1. 用 WASD / 方向鍵移動；手機使用左側 360° 虛擬搖桿。
2. 靠近黃色能量，自動拾取。
3. 回中央 Relay，自動存入能量。
4. 按 SPACE 使用 Dash。
5. Pulse 充滿後按 E 清除附近敵人。
6. 認識 HULL、CARGO、RISK、BANKED 與任務目標。

完成後可以直接從教學開始正式任務。

## 操作

| 動作 | 鍵位 | 用途 |
| --- | --- | --- |
| 移動 | `WASD` / 方向鍵；手機 360° 搖桿 | 控制 Courier，手機可類比控制移動強度 |
| Dash | `SPACE` | 短時間高速移動並暫時無敵 |
| Pulse | `E` | 能量滿時清除附近敵人 |
| 暫停 / 繼續 | `P` 或 `ESC` | 暫停任務計時與敵人 |
| 音效 | 右上角 `♪` | 開啟 / 關閉遊戲音效 |
| 全螢幕 | 右上角 `⛶` | 支援時直接全螢幕；iPhone Safari 不支援時顯示加入主畫面指引 |

## 難度

開始正式任務前可以直接選擇：

- **簡單**：維持原本完整擊殺分數。Dash Impact、Pulse 等擊殺分數都是 100%。
- **普通**：敵人數量、速度與生成節奏目前和簡單相同，但所有「擊殺敵人」所得分數只有 50%。非擊殺分數（撿能量、存入、風險倍率）不受影響。

普通模式的半分會在內部累積，例如 Pulse 單殺原本 +3，普通模式兩次單殺合計仍會精確得到 +3，不會因四捨五入破壞 50% 規則。升級里程碑仍使用未折扣的戰鬥進度，因此普通模式不會因為顯示分數較低而被額外拖慢升級。簡單與普通各自保存最佳分數。

## 怎麼玩

場上黃色菱形是 Energy Cell。碰到就會自動撿起來；中央藍色圓環是 Relay，碰到 Relay 就會自動把身上的貨存入。

你身上帶的 Energy 越多，`RISK` 倍率越高，存入時分數越高。但代價是移動速度會下降，而且敵人生成壓力會增加。因此遊戲真正的選擇不是「撿不撿」，而是「這一趟要貪到什麼程度才回家」。

敵人撞到 Courier 會扣 1 點 HULL，並讓一半尚未存入的貨物掉回場上。HULL 歸零則任務失敗。

正式任務需要同時達成兩件事：

- 存活至少 4 分鐘。
- 累計存入至少 60 Energy。

如果 4 分鐘到時仍不足 60 Energy，會進入 OVERTIME，直到達標或 HULL 歸零。

## 兩種敵人

**Chaser** 會持續追蹤玩家，是主要的場面壓力來源。

**Charger** 會先用紅色路徑預告衝刺方向，再高速突進。它在任務後段開始出現，逼玩家不能只繞著場地無腦跑圈。

## 升級

達到分數里程碑時遊戲會暫停，出現三選一升級。v1 包含：

- 超載推進：移動速度 +12%。
- 強化船體：最大船體 +1，並修復 1 格船體。
- 貨艙擴充：貨艙容量 +2，存入分數額外 +5%。
- 相位冷卻：衝刺冷卻時間 -15%，最低 1.4 秒。
- 廣域脈衝：脈衝範圍 +22%。
- 高效電容：脈衝充能速度 +20%。
- 衝刺撞擊：第一次取得後，Dash 撞到敵人會直接擊破並得分；Dash 結束時會再釋放一圈衝擊波，把周圍敵人向外推。若敵群太密、推完仍留在核心區，會被爆炸餘波清除，但這些餘波擊殺 **不會得到分數**。再次取得會提升撞擊爆破、衝擊波範圍／推力與直接擊殺分數。
- **緊急修復**：立即恢復 2 格 HULL，不增加最大血量；不會超過目前最大 HULL。滿血時仍可能出現但權重很低，血量越危急越容易抽到。

每一局抽到的組合不同，因此可以走速度、容量、生存、Pulse 或衝刺撞擊等不同方向。衝刺撞擊未取得前，Dash 只提供高速移動與短暫無敵，不會消滅敵人。

### 天賦充能進度

正式任務中會顯示 `NEXT UPGRADE` 進度條，直接反映真正的天賦觸發值。每一次升級都使用自己的分段門檻（16 → 38 → 72 → 118 → 180），例如第一段 11 分會顯示 `11 / 16`；完成第一次升級後若總進度來到 27，第二段會顯示 `11 / 22`。達到 80% 以上時進度條會亮黃提示，五次升級全部完成後顯示 `UPGRADES MAX`。普通模式也顯示未折扣的真正升級進度，因此不會再出現「畫面分數看起來不夠卻突然跳天賦」的情況。

每次選完任意天賦後，Courier 會進入 **1.5 秒藍白閃爍無敵保護期**，期間碰撞不扣 HULL；同時會出現一圈小型 Cyan 保護環。

## v1.2.2 視覺調整

- 橫向主選單改為水平置中構圖，內容區最大寬度提高，但標題、說明與按鈕文字仍維持左對齊，避免大螢幕右側留下過多空白。
- 整體深藍黑背景與面板亮度微幅提高，主要文字改為接近純白，次要文字改為較亮的藍灰，提高暗場可讀性。
- **簡單**維持 Cyan；**普通**改為 Pantone 165 C 的螢幕近似色 `#FF671F`；**新手教學**維持提高亮度後的 Violet。
- HUD、能力說明、統計、教學、NEXT UPGRADE 與全螢幕提示同步提高文字與邊框對比。
- 按鈕 hover / press 改用較柔和的 `cubic-bezier(0.22, 1, 0.36, 1)` 動態曲線。
- Overlay、主選單與 Modal 新增淡入／微位移進場；天賦三選一卡片改為分段 stagger 進場，減少突然彈出的感覺。
- 保留 `prefers-reduced-motion`，系統要求減少動畫時會自動停用新增動效。

## v1.2.1 調整

- 手機版改用 `visualViewport` 的實際可視高度，Safari 網址列與分頁列造成的可用高度變化會即時重算。
- 手機控制器改為覆蓋在 Arena 內，不再依賴額外的頁面下方空間，直向不用往下滑才能操作。
- 新增全螢幕按鈕；支援 Fullscreen API 時直接切換，不支援時改用不遮住遊戲、不暫停操作的頁面內提示，提供 iPhone「加入主畫面」standalone 指引。
- 新增 Web App Manifest，主畫面啟動可使用 standalone 顯示模式。
- 新增「緊急修復」天賦：立即恢復 2 HULL、不增加最大 HULL，低血量時提高抽選權重。
- 所有天賦選完後新增 1.5 秒閃爍無敵保護期。
- 新增分段式 `NEXT UPGRADE` 天賦充能進度條，80% 以上發亮，全部五次完成後顯示 `UPGRADES MAX`。

## v1.2.0 調整

- 新增 **簡單 / 普通** 兩種難度；簡單維持完整擊殺分數，普通擊殺分數 ×0.5。
- 簡單與普通最佳分數分開保存，普通模式的 0.5 分會精確累積。
- 普通模式只折扣顯示／紀錄用的擊殺分數，升級進度仍按完整戰鬥價值計算。
- 衝刺撞擊新增 Dash 結束後的二段衝擊波：Lv.1 範圍 145 px、基礎推力 70 px；每升一級範圍 +10 px、推力 +6 px。
- 衝擊波會把敵人向外震散；密集敵群會產生「群聚阻力」，未能推出 65 px 核心區的敵人會被餘波炸掉且 0 分。
- 手機直向戰場、HUD、搖桿與 Dash / Pulse 按鈕再次放大。
- 手機橫向不再維持固定 16:10：Arena 會依實際可用長寬比擴展，844×390 測試時邏輯寬度可從直向約 682 擴到約 1439。
- 直向 ↔ 橫向旋轉會重新映射玩家、敵人、能量與 Relay 的相對位置，不會重開當前任務。
- 保留 v1.1 的 Energy Cell 降頻、敵人分離、360° 搖桿與多點觸控。

## 本機紀錄

遊戲會嘗試透過 `localStorage` 保存：

- 簡單模式最佳分數。
- 普通模式最佳分數。
- 單局最高 Banked Energy。
- 音效設定。
- 是否完成過新手教學。

若瀏覽器的本機檔案政策禁止 `localStorage`，遊戲仍可正常玩，只是不會保留紀錄。

## 專案結構

```text
.
├─ index.html                  # 遊戲頁面、HUD、選單與 Overlay
├─ styles.css                 # 基礎 Neon UI 與響應式版面
├─ mobile-v120.css            # v1.2 手機放大 UI、動態 Arena 與橫向版面
├─ mobile-v121.css            # v1.2.1 Safari 可視區、全螢幕、控制覆蓋與天賦進度 HUD
├─ theme-v122.css             # v1.2.2 置中構圖、高對比配色與柔順動畫
├─ manifest.webmanifest       # 手機加入主畫面的 standalone Web App 設定
├─ PLAY.bat                   # Windows 一鍵開啟
├─ src/
│  ├─ game-core.js            # 可測試的純遊戲規則 / 數學
│  ├─ game.js                 # Runtime 第 1 段：啟動、狀態與輸入
│  ├─ game-02.js              # Runtime 第 2 段
│  ├─ game-03.js              # Runtime 第 3 段
│  ├─ game-04.js              # Runtime 第 4 段
│  ├─ game-05.js              # Runtime 第 5 段：HUD、儲存與啟動
│  ├─ game-06.js              # Runtime 第 6 段：難度、衝擊波與動態 Arena
│  ├─ game-v121-core.js       # v1.2.1 純規則：回血、保護期、viewport 與進度計算
│  ├─ game-07.js              # v1.2.1：緊急修復、保護期、全螢幕與 visualViewport
│  └─ game-08.js              # v1.2.1：天賦充能進度 HUD
├─ tests/
│  ├─ game-core.test.js       # 核心規則測試
│  ├─ static-shell.test.js    # DOM / 啟動結構測試
│  ├─ release-files.test.js   # Release 完整性測試
│  ├─ browser-smoke.js        # Chromium 真實互動 Smoke Test
│  ├─ v121-core.test.js       # v1.2.1 純規則測試
│  ├─ v121-runtime.test.js    # v1.2.1 runtime 狀態整合測試
│  ├─ v121-static.test.js     # v1.2.1 DOM / PWA / CSS 結構測試
│  ├─ v122-visual.test.js     # v1.2.2 視覺主題、色票與動態結構測試
│  └─ release-files-v122.test.js # v1.2.2 主題載入順序與檔案安全檢查
└─ docs/superpowers/          # v1 設計與實作計畫
```

## 測試

核心與 release 測試不需要 npm install。需要 Node.js 18+，在 repository 根目錄執行：

```bash
node --test tests/game-core.test.js tests/static-shell.test.js tests/release-files.test.js tests/v121-core.test.js tests/v121-runtime.test.js tests/v121-static.test.js tests/v122-visual.test.js tests/release-files-v122.test.js
```

Chromium 互動 Smoke Test：

```bash
node tests/browser-smoke.js
```

Smoke Test 會驗證：

- 遊戲 runtime 成功啟動。
- 開始任務。
- 實際鍵盤移動。
- Dash 與衝刺撞擊結束衝擊波。
- 暫停與繼續。
- 完整走完六步新手教學。
- 教學完成後切換到正式任務。
- 簡單 / 普通難度與普通擊殺分數 50% 累積。
- 衝擊波推散敵人、密集核心餘波 0 分。
- 390×844 直向大型類比搖桿、斜向移動、放手停止與較大戰場。
- 844×390 橫向寬 Arena、類比搖桿與 Dash 多點觸控。
- 直向 → 橫向 → 直向旋轉不重開任務且會重新計算 Arena。
- 瀏覽器執行期間沒有 JavaScript exception。

v1.2.1 另外提供 `v121-core.test.js`、`v121-runtime.test.js`、`v121-static.test.js`，驗證天賦後 1.5 秒無敵、緊急修復 +2 HULL、Safari `visualViewport` 高度、非阻塞式全螢幕 fallback、公開 API 延後整合，以及天賦進度 HUD。v1.2.2 再加入 `v122-visual.test.js` 與 `release-files-v122.test.js`，鎖定橫向置中、白字高對比、Pantone 165 C 普通難度色票、柔順動態曲線、reduced-motion fallback，以及主題檔載入順序與 9 KB 上傳安全限制。

## v1.2.2 內容範圍

目前第一版是單機、鍵盤操作、單一競技場的完整短回合遊戲。沒有帳號、排行榜伺服器、多人連線、付費、分析追蹤或外部素材。所有畫面以 Canvas/CSS 繪製，音效由 WebAudio 即時產生。

後續若要擴充，適合增加新敵人、角色機體、每日挑戰、不同 Relay 規則或更多 upgrade synergy，但這些不屬於 v1 必要範圍。

## License

MIT License。詳見 `LICENSE`。
