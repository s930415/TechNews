import { CONFIG } from './config.js';
import { fetchTaps, acknowledge, currentOffset, readTapsFile } from './telegram.js';
import { readState, writeState, readHistory, readFeedback, appendFeedback } from './store.js';
import { reprofile } from './reprofile.js';

// 設了 TAPS_FILE = 檔案模式（伺服器）：bot.mjs 是 token 唯一的 getUpdates 消費者，回饋從它落的檔讀
const TAPS_FILE = process.env.TAPS_FILE;

async function main() {
  const state = await readState();

  // 第一次執行：把游標對齊到最新，不要把歷史訊息全撈進來（僅 getUpdates 模式需要）
  if (!TAPS_FILE && state.lastUpdateId === 0) {
    const offset = await currentOffset();
    if (offset > 0) {
      await writeState({ ...state, lastUpdateId: offset });
      console.log(`初始化 offset = ${offset}`);
      return;
    }
  }

  const taps = TAPS_FILE ? await readTapsFile(TAPS_FILE, state.lastUpdateId) : await fetchTaps(state.lastUpdateId);
  if (taps.length === 0) {
    console.log('沒有新的回饋');
    return;
  }

  const history = await readHistory();
  const byId = new Map(history.map((h) => [h.id, h]));
  const already = new Set((await readFeedback()).map((f) => f.id));

  let written = 0;
  for (const tap of taps) {
    const item = byId.get(tap.itemId);
    if (!item) continue;
    // 同一則只採計第一次的判斷，後面重複點就忽略
    if (!already.has(tap.itemId)) {
      await appendFeedback({
        at: new Date().toISOString(),
        id: item.id,
        title: item.title,
        url: item.url,
        source: item.source,
        verdict: tap.verdict,
        wildcard: item.wildcard,
      });
      already.add(tap.itemId);
      written += 1;
    }
    if (!TAPS_FILE) await acknowledge(tap); // 檔案模式下 bot 端已 ack 過按鈕
  }

  const lastUpdateId = Math.max(state.lastUpdateId, ...taps.map((t) => t.updateId));
  const total = (await readFeedback()).length;
  console.log(`收到 ${taps.length} 次點擊，新增 ${written} 筆回饋（累計 ${total}）`);

  let { lastReprofileAtCount } = state;
  if (total - lastReprofileAtCount >= CONFIG.reprofileEvery) {
    console.log('回饋量足夠，重寫興趣輪廓…');
    await reprofile();
    lastReprofileAtCount = total;
  }

  await writeState({ lastUpdateId, lastReprofileAtCount });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
