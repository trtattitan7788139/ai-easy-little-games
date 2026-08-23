# Pulse Courier: Neon Run

一款不需要安裝遊戲引擎、下載素材或連線伺服器的短回合瀏覽器遊戲。你是一名在不穩定能量場中工作的 Courier：把散落的能量帶回中央 Relay，決定要安全地少量運送，還是多帶一些換取更高分數倍率，同時躲開越來越密集的敵方無人機。

**v1.1.1 的目標很單純：4 分鐘內學會、玩懂，然後想再跑一局；同時加入更清楚的桌面介面與可成長的衝刺攻擊能力。**

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

也可以直接雙擊根目錄的 `index.html`。本專案刻意使用一般 JavaScript classic script，而不是需要 HTTP 環境的 ES Module，因此支援直接從本機檔案開啟。瀏覽器 runtime 依序拆成 5 個可讀的 script 檔，只是為了可靠傳輸與維護，遊戲仍視為同一個 runtime。

建議瀏覽器：最新版 Microsoft Edge、Google Chrome 或 Firefox。

### 可選：用本機 HTTP Server 開啟

如果你本來就有 Python，也可以在專案目錄執行：

```bash
python -m http.server 8000
```

然後在瀏覽器開啟 `http://localhost:8000`。


## 手機遊玩

手機版不需要外接鍵盤。畫面下方會出現專用觸控控制器：左側方向鍵負責移動，右側提供「衝刺」與「脈衝」。支援同時按住方向與能力鍵，因此可以邊移動邊 Dash。暫停、升級與結算視窗也會自動縮成手機可操作尺寸。

建議直向即可遊玩；若想讓戰場顯示得更大，也可以把手機轉成橫向。

## 完全沒玩過這類遊戲？

主選單先按 **「新手教學」**。教學不是文字牆，而是六個實際操作步驟：

1. 用 WASD / 方向鍵移動。
2. 靠近黃色能量，自動拾取。
3. 回中央 Relay，自動存入能量。
4. 按 SPACE 使用 Dash。
5. Pulse 充滿後按 E 清除附近敵人。
6. 認識 HULL、CARGO、RISK、BANKED 與任務目標。

完成後可以直接從教學開始正式任務。

## 操作

| 動作 | 鍵位 | 用途 |
| --- | --- | --- |
| 移動 | `WASD` 或方向鍵 | 控制 Courier |
| Dash | `SPACE` | 短時間高速移動並暫時無敵 |
| Pulse | `E` | 能量滿時清除附近敵人 |
| 暫停 / 繼續 | `P` 或 `ESC` | 暫停任務計時與敵人 |
| 音效 | 右上角 `♪` | 開啟 / 關閉遊戲音效 |

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
- 衝刺撞擊：第一次取得後，Dash 撞到敵人會直接擊破，每隻 +4 分；再次取得會提升等級，每級增加 12 px 爆破範圍與每隻 +2 分。

每一局抽到的組合不同，因此可以走速度、容量、生存、Pulse 或衝刺撞擊等不同方向。衝刺撞擊未取得前，Dash 只提供高速移動與短暫無敵，不會消滅敵人。


## v1.1.1 調整

- 桌面版遊戲外框依螢幕寬高自動放大，最大寬度 1450 px，HUD、能力條與升級卡同步放大。
- 自然 Energy Cell 生成節奏降低為約每 0.95～1.35 秒一顆，額外生成機率 8%，自然場上上限 22 顆。
- 正式任務開場 Energy Cell 從 12 顆調整為 9 顆。
- 新增「衝刺撞擊」能力線與後續等級強化。
- 新增手機觸控方向鍵、Dash / Pulse 能力鍵，並修正手機暫停與升級視窗被裁切的問題。

## 本機紀錄

遊戲會嘗試透過 `localStorage` 保存：

- 最佳分數。
- 單局最高 Banked Energy。
- 音效設定。
- 是否完成過新手教學。

若瀏覽器的本機檔案政策禁止 `localStorage`，遊戲仍可正常玩，只是不會保留紀錄。

## 專案結構

```text
.
├─ index.html                  # 遊戲頁面、HUD、選單與 Overlay
├─ styles.css                 # Neon UI 與響應式版面
├─ PLAY.bat                   # Windows 一鍵開啟
├─ src/
│  ├─ game-core.js            # 可測試的純遊戲規則 / 數學
│  ├─ game.js                 # Runtime 第 1 段：啟動、狀態與輸入
│  ├─ game-02.js              # Runtime 第 2 段
│  ├─ game-03.js              # Runtime 第 3 段
│  ├─ game-04.js              # Runtime 第 4 段
│  └─ game-05.js              # Runtime 第 5 段：HUD、儲存與啟動
├─ tests/
│  ├─ game-core.test.js       # 核心規則測試
│  ├─ static-shell.test.js    # DOM / 啟動結構測試
│  ├─ release-files.test.js   # Release 完整性測試
│  └─ browser-smoke.js        # Chromium 真實互動 Smoke Test
└─ docs/superpowers/          # v1 設計與實作計畫
```

## 測試

核心與 release 測試不需要 npm install。需要 Node.js 18+，在 repository 根目錄執行：

```bash
node --test tests/game-core.test.js tests/static-shell.test.js tests/release-files.test.js
```

Chromium 互動 Smoke Test：

```bash
node tests/browser-smoke.js
```

Smoke Test 會驗證：

- 遊戲 runtime 成功啟動。
- 開始任務。
- 實際鍵盤移動。
- Dash。
- 暫停與繼續。
- 完整走完六步新手教學。
- 教學完成後切換到正式任務。
- 瀏覽器執行期間沒有 JavaScript exception。

## v1.1.1 內容範圍

目前第一版是單機、鍵盤操作、單一競技場的完整短回合遊戲。沒有帳號、排行榜伺服器、多人連線、付費、分析追蹤或外部素材。所有畫面以 Canvas/CSS 繪製，音效由 WebAudio 即時產生。

後續若要擴充，適合增加新敵人、角色機體、每日挑戰、不同 Relay 規則或更多 upgrade synergy，但這些不屬於 v1 必要範圍。

## License

MIT License。詳見 `LICENSE`。
