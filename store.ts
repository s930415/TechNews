import { readFile, writeFile, appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { PATHS, CONFIG } from './config.js';
import type { FeedbackEntry, HistoryEntry, State } from './types.js';

async function ensureDir(path: string) {
  await mkdir(dirname(path), { recursive: true });
}

async function readOr<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

/** 從 URL 產生穩定的 8 字元 id，用來去重與塞進 callback_data */
export function makeId(url: string): string {
  return createHash('sha1').update(url).digest('hex').slice(0, 8);
}

export async function readProfile(): Promise<string> {
  try {
    return await readFile(PATHS.profile, 'utf8');
  } catch {
    return '（尚未建立興趣輪廓，這是第一次執行。先依常識推薦，並偏向多樣性。）';
  }
}

export async function writeProfile(md: string): Promise<void> {
  await ensureDir(PATHS.profile);
  await writeFile(PATHS.profile, md, 'utf8');
}

export async function readHistory(): Promise<HistoryEntry[]> {
  return readOr<HistoryEntry[]>(PATHS.history, []);
}

export async function appendHistory(entries: HistoryEntry[]): Promise<void> {
  const cutoff = Date.now() - CONFIG.dedupeDays * 86_400_000;
  const kept = (await readHistory()).filter((e) => Date.parse(e.at) > cutoff);
  await ensureDir(PATHS.history);
  await writeFile(PATHS.history, JSON.stringify([...kept, ...entries], null, 2), 'utf8');
}

export async function readFeedback(): Promise<FeedbackEntry[]> {
  try {
    const raw = await readFile(PATHS.feedback, 'utf8');
    return raw
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l) as FeedbackEntry);
  } catch {
    return [];
  }
}

export async function appendFeedback(entry: FeedbackEntry): Promise<void> {
  await ensureDir(PATHS.feedback);
  await appendFile(PATHS.feedback, JSON.stringify(entry) + '\n', 'utf8');
}

export async function readState(): Promise<State> {
  return readOr<State>(PATHS.state, { lastUpdateId: 0, lastReprofileAtCount: 0 });
}

export async function writeState(state: State): Promise<void> {
  await ensureDir(PATHS.state);
  await writeFile(PATHS.state, JSON.stringify(state, null, 2), 'utf8');
}
