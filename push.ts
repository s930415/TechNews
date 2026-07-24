import { collectCandidates } from './sources/index.js';
import { prefilter, rank } from './rank.js';
import { sendHeader, sendPick, sendNote } from './telegram.js';
import { readProfile, readHistory, appendHistory } from './store.js';
import type { HistoryEntry } from './types.js';

const DRY = process.env.DRY_RUN === '1';

async function main() {
  const profile = await readProfile();
  const history = await readHistory();
  const seen = new Set(history.map((h) => h.id));

  const all = await collectCandidates();
  const fresh = all.filter((c) => !seen.has(c.id));
  console.log(`候選 ${all.length} 則，扣掉推過的剩 ${fresh.length} 則`);

  if (fresh.length === 0) {
    if (!DRY) await sendNote('☀️ 今天沒抓到新東西。可能是來源掛了，去看一下 Actions log。');
    return;
  }

  const shortlist = await prefilter(fresh, profile);
  console.log(`粗篩後 ${shortlist.length} 則`);

  const picks = await rank(
    shortlist,
    profile,
    history.slice(-60).map((h) => h.title),
  );
  console.log(`精排後 ${picks.length} 則`);

  const byId = new Map(shortlist.map((c) => [c.id, c]));
  const wildcards = picks.filter((p) => p.wildcard).length;

  if (DRY) {
    for (const p of picks) {
      const item = byId.get(p.id)!;
      console.log(`\n${p.wildcard ? '🎲' : '•'} ${item.title}\n  ${item.url}`);
      console.log(`  ${p.hook}`);
      p.extensions.forEach((e) => console.log(`  ↳ ${e}`));
      console.log(`  [why] ${p.why}`);
    }
    return;
  }

  await sendHeader(picks.length, wildcards);

  const logged: HistoryEntry[] = [];
  let i = 0;
  for (const p of picks) {
    const item = byId.get(p.id)!;
    if (!p.wildcard) i += 1;
    await sendPick(i, p, item);
    logged.push({
      at: new Date().toISOString(),
      id: p.id,
      title: item.title,
      url: item.url,
      source: item.source,
      wildcard: p.wildcard,
    });
    // Telegram 對同一個 chat 有速率限制，慢一點比較保險
    await new Promise((r) => setTimeout(r, 600));
  }

  await appendHistory(logged);
  console.log(`已推播 ${logged.length} 則（野生卡 ${wildcards} 張）`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
