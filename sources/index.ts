import Parser from 'rss-parser';
import { CONFIG } from '../config.js';
import { makeId } from '../store.js';
import { getJson, safely } from './http.js';
import type { Candidate } from '../types.js';

const since = () => Math.floor((Date.now() - CONFIG.lookbackHours * 3600_000) / 1000);

/* ---------- Hacker News（Algolia，免金鑰） ---------- */

interface HnHit {
  objectID: string;
  title: string | null;
  url: string | null;
  points: number | null;
  story_text: string | null;
  created_at: string;
}

async function fetchHN(): Promise<Candidate[]> {
  const { minPoints } = CONFIG.sources.hackernews;
  const q = new URLSearchParams({
    tags: 'story',
    numericFilters: `created_at_i>${since()},points>${minPoints}`,
    hitsPerPage: '100',
  });
  const data = await getJson<{ hits: HnHit[] }>(`https://hn.algolia.com/api/v1/search_by_date?${q}`);

  return data.hits
    .filter((h) => h.title)
    .map((h) => {
      // Ask HN / Show HN 這類純文字貼文沒有外部 url，退回 HN 討論串
      const url = h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`;
      return {
        id: makeId(url),
        title: h.title!,
        url,
        source: 'hn' as const,
        score: h.points ?? 0,
        blurb: h.story_text?.replace(/<[^>]+>/g, ' ').slice(0, 400),
        publishedAt: h.created_at,
      };
    });
}

/* ---------- Lobsters ---------- */

interface LobsterStory {
  short_id: string;
  title: string;
  url: string;
  score: number;
  comments_url: string;
  created_at: string;
  description_plain?: string;
  tags: string[];
}

async function fetchLobsters(): Promise<Candidate[]> {
  const { tags } = CONFIG.sources.lobsters;
  const cutoff = Date.now() - CONFIG.lookbackHours * 3600_000;
  const results: Candidate[] = [];

  for (const tag of tags) {
    const stories = await getJson<LobsterStory[]>(`https://lobste.rs/t/${tag}.json`);
    for (const s of stories) {
      if (Date.parse(s.created_at) < cutoff) continue;
      const url = s.url || s.comments_url;
      results.push({
        id: makeId(url),
        title: s.title,
        url,
        source: 'lobsters',
        score: s.score,
        blurb: s.description_plain?.slice(0, 400) ?? `tags: ${s.tags.join(', ')}`,
        publishedAt: s.created_at,
      });
    }
  }
  return results;
}

/* ---------- GitHub 新星專案 ---------- */

interface GhRepo {
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  created_at: string;
}

async function fetchGitHub(): Promise<Candidate[]> {
  const { createdWithinDays, minStars } = CONFIG.sources.github;
  const from = new Date(Date.now() - createdWithinDays * 86_400_000).toISOString().slice(0, 10);
  const q = new URLSearchParams({
    q: `created:>${from} stars:>${minStars}`,
    sort: 'stars',
    order: 'desc',
    per_page: '30',
  });

  const headers: Record<string, string> = { accept: 'application/vnd.github+json' };
  // GitHub Actions 會自動注入 GITHUB_TOKEN，帶上可把限流從 10/min 拉到 30/min
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const data = await getJson<{ items: GhRepo[] }>(
    `https://api.github.com/search/repositories?${q}`,
    headers,
  );

  return data.items.map((r) => ({
    id: makeId(r.html_url),
    title: `${r.full_name} — ${r.description ?? '(無描述)'}`.slice(0, 200),
    url: r.html_url,
    source: 'github' as const,
    score: r.stargazers_count,
    blurb: [r.description, r.language && `主要語言 ${r.language}`].filter(Boolean).join(' · '),
    publishedAt: r.created_at,
  }));
}

/* ---------- RSS ---------- */

async function fetchRss(): Promise<Candidate[]> {
  const parser = new Parser({ timeout: 15_000 });
  const cutoff = Date.now() - CONFIG.lookbackHours * 3600_000;
  const out: Candidate[] = [];

  // 逐一處理，單一 feed 壞掉不影響其他
  await Promise.all(
    CONFIG.sources.rss.feeds.map(async (feed) => {
      try {
        const parsed = await parser.parseURL(feed);
        for (const item of parsed.items) {
          const url = item.link;
          if (!url || !item.title) continue;
          const at = item.isoDate ?? item.pubDate;
          if (at && Date.parse(at) < cutoff) continue;
          out.push({
            id: makeId(url),
            title: item.title,
            url,
            source: 'rss',
            blurb: item.contentSnippet?.slice(0, 400),
            publishedAt: at,
          });
        }
      } catch (err) {
        console.warn(`  rss ${feed}: 失敗（已跳過）— ${(err as Error).message}`);
      }
    }),
  );
  return out;
}

/* ---------- 匯總 ---------- */

export async function collectCandidates(): Promise<Candidate[]> {
  console.log('抓取候選：');
  const groups = await Promise.all([
    CONFIG.sources.hackernews.enabled ? safely('hn', fetchHN) : [],
    CONFIG.sources.lobsters.enabled ? safely('lobsters', fetchLobsters) : [],
    CONFIG.sources.github.enabled ? safely('github', fetchGitHub) : [],
    CONFIG.sources.rss.enabled ? safely('rss', fetchRss) : [],
  ]);

  // 同一篇文章可能同時上 HN 跟 Lobsters，用 id 去重
  const seen = new Map<string, Candidate>();
  for (const c of groups.flat()) {
    const prev = seen.get(c.id);
    if (!prev || (c.score ?? 0) > (prev.score ?? 0)) seen.set(c.id, c);
  }
  return [...seen.values()];
}
