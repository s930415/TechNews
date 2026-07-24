/** 從各來源抓回來的原始候選 */
export interface Candidate {
  /** 8 字元短 id，塞得進 Telegram callback_data 的 64 bytes 限制 */
  id: string;
  title: string;
  url: string;
  source: 'hn' | 'lobsters' | 'github' | 'rss';
  /** 熱度訊號，僅供粗篩參考，不當作排序主軸 */
  score?: number;
  /** 摘要／README 開頭／文章前段，粗篩不看，精排才看 */
  blurb?: string;
  publishedAt?: string;
}

/** 精排後、準備推播的一則 */
export interface Pick {
  id: string;
  /** 一句話說清楚它解決什麼問題，不可以抄標題 */
  hook: string;
  /** 1-2 個延伸：同層替代方案／上下游工具／其他生態的對應物 */
  extensions: string[];
  /** true = 野生卡，刻意偏離輪廓 */
  wildcard: boolean;
  /** 為什麼選它（只給你 debug 用，不推播） */
  why: string;
}

export type Verdict = 'like' | 'known' | 'dislike';

export interface FeedbackEntry {
  at: string;
  id: string;
  title: string;
  url: string;
  source: Candidate['source'];
  verdict: Verdict;
  wildcard: boolean;
}

export interface HistoryEntry {
  at: string;
  id: string;
  title: string;
  url: string;
  source: Candidate['source'];
  wildcard: boolean;
}

export interface State {
  /** Telegram getUpdates 的 offset 游標 */
  lastUpdateId: number;
  /** 上次重寫輪廓時，feedback.jsonl 的行數 */
  lastReprofileAtCount: number;
}
