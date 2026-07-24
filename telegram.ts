import type { Candidate, Pick, Verdict } from './types.js';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? '';
const API = `https://api.telegram.org/bot${TOKEN}`;

async function call<T = unknown>(method: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json()) as { ok: boolean; result: T; description?: string };
  if (!json.ok) throw new Error(`Telegram ${method}: ${json.description}`);
  return json.result;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const SOURCE_LABEL: Record<Candidate['source'], string> = {
  hn: 'Hacker News',
  lobsters: 'Lobsters',
  github: 'GitHub',
  rss: 'RSS',
};

/* ---------- 推播 ---------- */

export async function sendHeader(count: number, wildcards: number): Promise<void> {
  const today = new Date().toLocaleDateString('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'numeric',
    day: 'numeric',
  });
  await call('sendMessage', {
    chat_id: CHAT_ID,
    text: `☀️ <b>${today} 技術雷達</b> · ${count} 則（含 ${wildcards} 張野生卡）`,
    parse_mode: 'HTML',
  });
}

export async function sendPick(index: number, pick: Pick, item: Candidate): Promise<void> {
  const tag = pick.wildcard ? '🎲 野生卡' : `${index}.`;
  const lines = [
    `${tag} <a href="${esc(item.url)}"><b>${esc(item.title.slice(0, 110))}</b></a>`,
    '',
    esc(pick.hook),
  ];
  if (pick.extensions.length) {
    lines.push('');
    for (const ext of pick.extensions) lines.push(`↳ ${esc(ext)}`);
  }
  lines.push('', `<i>${SOURCE_LABEL[item.source]}</i>`);

  await call('sendMessage', {
    chat_id: CHAT_ID,
    text: lines.join('\n'),
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
    reply_markup: {
      inline_keyboard: [
        [
          { text: '👍 有興趣', callback_data: `v|${pick.id}|like` },
          { text: '🤔 已知道', callback_data: `v|${pick.id}|known` },
          { text: '👎 沒興趣', callback_data: `v|${pick.id}|dislike` },
        ],
      ],
    },
  });
}

export async function sendNote(text: string): Promise<void> {
  await call('sendMessage', { chat_id: CHAT_ID, text, parse_mode: 'HTML' });
}

/* ---------- 收回饋 ---------- */

export interface Tap {
  updateId: number;
  callbackId: string;
  chatId: number;
  messageId: number;
  itemId: string;
  verdict: Verdict;
}

interface RawUpdate {
  update_id: number;
  callback_query?: {
    id: string;
    data?: string;
    message?: { message_id: number; chat: { id: number } };
  };
}

const VERDICTS: readonly Verdict[] = ['like', 'known', 'dislike'];

export async function fetchTaps(offset: number): Promise<Tap[]> {
  const updates = await call<RawUpdate[]>('getUpdates', {
    offset: offset + 1,
    limit: 100,
    timeout: 0,
    allowed_updates: ['callback_query'],
  });

  const taps: Tap[] = [];
  for (const u of updates) {
    const cq = u.callback_query;
    const parts = cq?.data?.split('|');
    if (!cq || !cq.message || !parts || parts[0] !== 'v') continue;
    const [, itemId, verdict] = parts;
    if (!itemId || !VERDICTS.includes(verdict as Verdict)) continue;
    taps.push({
      updateId: u.update_id,
      callbackId: cq.id,
      chatId: cq.message.chat.id,
      messageId: cq.message.message_id,
      itemId,
      verdict: verdict as Verdict,
    });
  }
  return taps;
}

const ACK: Record<Verdict, string> = {
  like: '👍 記下了',
  known: '🤔 之後只推進階的',
  dislike: '👎 降權',
};

/** 回饋收到後把按鈕換成結果，避免重複點 */
export async function acknowledge(tap: Tap): Promise<void> {
  await call('answerCallbackQuery', {
    callback_query_id: tap.callbackId,
    text: ACK[tap.verdict],
  }).catch(() => {}); // 超過 24h 的 callback 無法 answer，不影響記錄

  await call('editMessageReplyMarkup', {
    chat_id: tap.chatId,
    message_id: tap.messageId,
    reply_markup: { inline_keyboard: [[{ text: ACK[tap.verdict], callback_data: 'noop' }]] },
  }).catch(() => {});
}

/** 取最新的 update_id，避免第一次執行時把歷史訊息全撈進來 */
export async function currentOffset(): Promise<number> {
  const updates = await call<RawUpdate[]>('getUpdates', { limit: 1, offset: -1, timeout: 0 });
  return updates[0]?.update_id ?? 0;
}
