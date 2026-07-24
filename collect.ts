import { CONFIG } from './config.js';
import { fetchTaps, acknowledge, currentOffset } from './telegram.js';
import { readState, writeState, readHistory, readFeedback, appendFeedback } from './store.js';
import { reprofile } from './reprofile.js';

async function main() {
  const state = await readState();

  // 第一次執行：把游標對齊到最新，不要把歷史訊息全撈進來
  if (state.lastUpdateId === 0) {
    const offset = await currentOffset();
    if (offset > 0) {
      await writeState({ ...state, lastUpdateId: offset });
      console.log(`初始化 offset = ${offset}`);
      return;
    }
  }

  const taps = await fetchTaps(state.lastUpdateId);
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
    await acknowledge(tap);
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
