export async function getJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(url, {
    headers: { 'user-agent': 'tech-radar/1.0 (personal daily digest)', ...headers },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return (await res.json()) as T;
}

/**
 * 單一來源掛掉不該讓整天的推播消失。
 * 抓不到就記一筆警告、回空陣列，繼續跑其他來源。
 */
export async function safely<T>(label: string, fn: () => Promise<T[]>): Promise<T[]> {
  try {
    const out = await fn();
    console.log(`  ${label}: ${out.length} 則`);
    return out;
  } catch (err) {
    console.warn(`  ${label}: 失敗（已跳過）— ${(err as Error).message}`);
    return [];
  }
}
