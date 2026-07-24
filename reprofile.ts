import Anthropic from '@anthropic-ai/sdk';
import { CONFIG } from './config.js';
import { readProfile, writeProfile, readFeedback } from './store.js';

const client = new Anthropic();

const VERDICT_LABEL = {
  like: '有興趣',
  known: '已知道（主題對、深度不夠）',
  dislike: '沒興趣',
} as const;

export async function reprofile(): Promise<void> {
  const [current, feedback] = await Promise.all([readProfile(), readFeedback()]);
  if (feedback.length === 0) return;

  // 只看最近 120 筆，太久以前的口味不見得還算數
  const recent = feedback.slice(-120);
  const log = recent
    .map(
      (f) =>
        `${f.at.slice(0, 10)} | ${VERDICT_LABEL[f.verdict]}${f.wildcard ? ' | 野生卡' : ''} | ${f.title}`,
    )
    .join('\n');

  const likedWild = recent.filter((f) => f.wildcard && f.verdict === 'like').length;
  const totalWild = recent.filter((f) => f.wildcard).length;

  const system =
    '你在維護一份給推薦系統用的興趣輪廓。它同時是人類會直接打開來手動編輯的檔案，所以必須簡短、具體、講人話。';

  const prompt = `<目前的輪廓>
${current}
</目前的輪廓>

<回饋紀錄>
${log}
</回饋紀錄>

野生卡命中率：${totalWild} 張中有 ${likedWild} 張被按有興趣。

重寫這份輪廓。規則：

1. 「已知道」不等於「沒興趣」。它代表主題正確但深度不足 —— 該主題要保留在核心命中，同時在「已知道」區塊記下不要再推的入門角度。把這兩者混為一談是最常見的錯誤，別犯。

2. 只有連續、明確的「沒興趣」才移進排除區。單筆負回饋可能只是那天沒空點，不要據此下結論。

3. 野生卡被按有興趣時，把該領域升級進「觀察中」；同一領域再命中第二次才升進核心命中。野生卡命中率如果低於 15%，在輪廓最後加一行註記，說明野生卡的挑選方向可能太發散。

4. 訊號不足的東西放「觀察中」，不要硬塞進核心命中。寧可留白。

5. 如果目前的輪廓裡有「## 手動指定」區塊，一字不改原樣保留。那是人手寫的。

6. 全文控制在 40 行內。每一行都要是具體的技術主題，不要出現「對新技術有好奇心」這種廢話。

用繁體中文（台灣用語）輸出完整的 Markdown 檔案內容，不要包 code fence，不要任何說明文字。
第一行是 \`# 興趣輪廓\`，第二行寫 \`最後更新：${new Date().toISOString().slice(0, 10)}（依據 ${feedback.length} 筆回饋）\`。`;

  const msg = await client.messages.create({
    model: CONFIG.models.reprofile,
    max_tokens: 2000,
    system,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .replace(/```(?:markdown)?/g, '')
    .trim();

  if (text.length < 50) {
    console.warn('重寫結果異常短，保留原輪廓');
    return;
  }

  await writeProfile(text + '\n');
  console.log('興趣輪廓已更新');
}

// 也可以單獨執行：npm run reprofile
if (process.argv[1]?.endsWith('reprofile.ts')) {
  reprofile().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
