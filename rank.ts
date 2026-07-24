import Anthropic from '@anthropic-ai/sdk';
import { CONFIG } from './config.js';
import type { Candidate, Pick } from './types.js';

const client = new Anthropic(); // 讀 ANTHROPIC_API_KEY

async function ask(model: string, system: string, prompt: string, maxTokens = 4000): Promise<string> {
  const msg = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: prompt }],
  });
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

/** 模型偶爾會包 code fence 或加前言，容錯一下 */
function extractJson<T>(raw: string): T {
  const cleaned = raw.replace(/```(?:json)?/g, '').trim();
  const start = cleaned.search(/[[{]/);
  if (start === -1) throw new Error(`回應中找不到 JSON：${raw.slice(0, 200)}`);
  const end = Math.max(cleaned.lastIndexOf(']'), cleaned.lastIndexOf('}'));
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

/* ---------- 第一段：粗篩 ---------- */

export async function prefilter(candidates: Candidate[], profile: string): Promise<Candidate[]> {
  if (candidates.length <= CONFIG.shortlistSize) return candidates;

  const list = candidates.map((c) => `${c.id} [${c.source}] ${c.title}`).join('\n');

  const system = [
    '你在替一位資深後端工程師做技術資訊的初步篩選。你只會看到標題，資訊有限，所以判斷從寬。',
    '你的任務不是選出最好的，而是刪掉明顯不相關的。',
  ].join('\n');

  const prompt = `<興趣輪廓>
${profile}
</興趣輪廓>

<候選>
${list}
</候選>

從候選中挑出 ${CONFIG.shortlistSize} 則進入下一輪。

配額（務必遵守，否則下一輪會失去多樣性）：
- 約 3/4 選跟興趣輪廓相關的
- 剩下 1/4 刻意選**輪廓外但技術上有份量**的東西。這些是留給「野生卡」的素材，不留就會讓推薦在幾週內塌縮成同溫層。

排除：純產品發布公告、募資與商業新聞、跑分比較、標題殺人的清單文。

只輸出 JSON 陣列，元素是 id 字串，不要任何其他文字。
例：["a1b2c3d4","e5f6a7b8"]`;

  const raw = await ask(CONFIG.models.prefilter, system, prompt, 2000);
  const ids = new Set(extractJson<string[]>(raw));
  const kept = candidates.filter((c) => ids.has(c.id));

  // 模型亂回時的保底：至少要有東西進下一輪
  return kept.length >= 5 ? kept : candidates.slice(0, CONFIG.shortlistSize);
}

/* ---------- 第二段：精排 + 寫延伸 ---------- */

export async function rank(
  shortlist: Candidate[],
  profile: string,
  recentTitles: string[],
): Promise<Pick[]> {
  const list = shortlist
    .map((c) => `<item id="${c.id}" source="${c.source}">\n${c.title}\n${c.blurb ?? ''}\n</item>`)
    .join('\n');

  const system = [
    '你在替一位資深後端工程師挑選每日技術資訊。他的口味偏工程實踐、開發流程自動化與架構方法論，不是追新框架的人。',
    '你的價值在於誠實。寧可少推一則，也不要為了湊數放一則你自己都覺得普通的東西。',
  ].join('\n');

  const normal = CONFIG.picksPerDay - CONFIG.wildcards;

  const prompt = `<興趣輪廓>
${profile}
</興趣輪廓>

<最近推過的_不要重複>
${recentTitles.slice(0, 60).join('\n') || '（無）'}
</最近推過的_不要重複>

<候選>
${list}
</候選>

挑出 ${normal} 則命中輪廓的，加 ${CONFIG.wildcards} 則野生卡。

野生卡規則：刻意挑輪廓**之外**的東西，但必須是紮實的技術內容。這個名額的用途是讓他發現自己還不知道自己感興趣的領域，所以不要挑「勉強沾得上邊」的，要挑真的不一樣的。

每則要寫：
- hook：一句話（30 字內）說清楚**它解決什麼問題**。禁止改寫標題、禁止「這篇文章介紹了…」這種句型。
- extensions：1-2 個延伸。硬性規定——延伸必須是下列其中一種：
  (a) 同層的替代方案（例：husky → Lefthook）
  (b) 上下游的搭配工具（例：husky → lint-staged、commitlint）
  (c) 其他語言生態的對應物（例：husky → Python 的 pre-commit）
  絕對不可以是同一主題的另一篇文章或同義換句話說。
  每個延伸自己也要是一句話，講清楚它跟主題的關係。
- why：為什麼選它。如果輪廓裡標了「已知道」而這則正好命中該主題，說明你選的是什麼進階角度。

用繁體中文（台灣用語）。只輸出 JSON，不要任何其他文字：

{"picks":[{"id":"...","hook":"...","extensions":["...","..."],"wildcard":false,"why":"..."}]}`;

  const raw = await ask(CONFIG.models.rank, system, prompt, 4000);
  const parsed = extractJson<{ picks: Pick[] }>(raw);

  const valid = new Set(shortlist.map((c) => c.id));
  return parsed.picks.filter((p) => valid.has(p.id)).slice(0, CONFIG.picksPerDay);
}
