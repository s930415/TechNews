# tech-radar

每天早上把可能對你胃口的技術內容推到 Telegram，你按按鈕給回饋，它自己修正方向。

- 來源：Hacker News、Lobsters、GitHub 新星專案、自訂 RSS
- 排序：Haiku 粗篩 → Sonnet 精排並寫「延伸」
- 儲存：全部是 repo 裡的純文字檔，沒有資料庫
- 執行：GitHub Actions，不需要伺服器

## 每日訊息長這樣

```
☀️ 7/25 技術雷達 · 4 則（含 1 張野生卡）

1. Lefthook — 用 Go 寫的 git hook 管理器
   單一 YAML 管完所有 hook，不吃 Node 依賴，平行執行

   ↳ husky v9 拿掉了樣板目錄，改成直接跑 shell script
   ↳ Python 生態的對應物是 pre-commit，可以 language: system 混搭多語言工具

   Lobsters
   [👍 有興趣] [🤔 已知道] [👎 沒興趣]
```

## 安裝

### 1. 開一個 Telegram bot

跟 [@BotFather](https://t.me/BotFather) 說 `/newbot`，拿到 token。

再跟你剛建好的 bot 隨便說一句話，然後打開：

```
https://api.telegram.org/bot<你的TOKEN>/getUpdates
```

裡面的 `message.chat.id` 就是你的 chat id。

### 2. 設 secrets

把這個 repo 推到 GitHub，在 **Settings → Secrets and variables → Actions** 加三個：

| Secret | 從哪來 |
|---|---|
| `ANTHROPIC_API_KEY` | https://console.anthropic.com/settings/keys |
| `TELEGRAM_BOT_TOKEN` | BotFather 給的 |
| `TELEGRAM_CHAT_ID` | 上一步查到的 |

### 3. 先在本機試跑

```bash
npm install
cp .env.example .env   # 填進去
npm run dry            # 不推播，只把結果印在終端機
```

`npm run dry` 不會發訊息也不會寫任何檔案，可以放心反覆跑到滿意為止。

### 4. 開排程

Actions 分頁 → 選 `tech-radar` → **Run workflow** 手動跑一次確認正常，之後就會自己跑：

- 台灣時間 **06:00**：收回饋 → 推播
- 台灣時間 **22:00**：只收回饋

（分兩次跑是因為 Telegram 的 `getUpdates` 只保留 24 小時，一天撈一次會踩在邊緣，漏掉深夜才點的回饋。）

## 三顆按鈕的意思

| 按鈕 | 意思 | 系統怎麼處理 |
|---|---|---|
| 👍 有興趣 | 這方向對 | 該主題加權 |
| 🤔 已知道 | **主題對，但深度不夠** | 主題保留，記進「已知道」清單，之後只推進階角度 |
| 👎 沒興趣 | 這方向錯了 | 連續多次才降權，單次不作數 |

中間那顆是重點。只有讚／爛兩顆的系統會把「我已經懂了」跟「我不想看」混為一談，然後推薦品質原地打轉。

## 野生卡

每天固定有 1 則是**刻意偏離你興趣輪廓**的，訊息裡標了 🎲。

它的命中率一定不高，但這是唯一能讓你發現新方向的管道。純回饋迴圈會塌縮 —— 你按了三次 DDD 有興趣，三週後整份清單都是 DDD，然後你就不看了。

要調整比例改 `src/config.ts` 的 `wildcards`。設 0 之前想清楚。

## 興趣輪廓

`data/profile.md` 是整個系統的控制面板，純 Markdown，可以直接編輯。

每累積 20 筆回饋，模型會依據回饋紀錄重寫它一次。**`## 手動指定` 區塊模型不會動** —— 想強制加減什麼寫在那裡最保險。

覺得推歪了，先去看這個檔案，通常一眼就知道哪裡出錯。

## 調校

改 `src/config.ts`：

| 設定 | 預設 | 說明 |
|---|---|---|
| `picksPerDay` | 4 | 每天幾則（含野生卡） |
| `wildcards` | 1 | 探索名額 |
| `shortlistSize` | 40 | 進精排的則數，太多會稀釋模型注意力 |
| `lookbackHours` | 30 | 抓多久內的新內容 |
| `dedupeDays` | 45 | 多久內不重複推 |
| `sources.lobsters.tags` | 五個 | Lobsters 的訊噪比比 HN 好，值得多加幾個 tag |
| `sources.rss.feeds` | 四個 | 直接往下加，壞掉的 feed 會被跳過不會炸掉流程 |
| `reprofileEvery` | 20 | 幾筆回饋重寫一次輪廓 |

真正決定品質的是 `src/rank.ts` 裡的兩段 prompt，尤其是「延伸」的硬性規定（必須是同層替代方案／上下游工具／其他生態的對應物，不可以是同主題的另一篇文章）。推薦內容變水的時候先動這裡。

## 成本

一天約 200 則候選走 Haiku、40 則走 Sonnet，加上每 20 筆回饋一次的輪廓重寫。**一天不到台幣一塊**。GitHub Actions 這個用量在免費額度內。

## 已知限制

- **GitHub 的 cron 會延遲。** 尖峰時段十幾分鐘是常態，偶爾更久。這用途無所謂，但別拿它跑需要準時的東西。
- **超過 24 小時沒點的按鈕會失效。** Telegram 端的限制，訊息還在但點了不會被記錄。
- **`data/` 由 bot commit 回 repo。** 如果你本機也改了同一份檔案，記得先 pull。
- **粗篩只看標題。** 標題取得爛的好文章會在第一關就被刷掉，這是為了控成本的取捨。想改善就把 `shortlistSize` 拉大或跳過粗篩。
- 排程 workflow 在 repo 連續 60 天沒動靜時會被 GitHub 自動停用。這支每天都會 commit，所以不會遇到。
