export const CONFIG = {
  /** 每天推幾則（含野生卡） */
  picksPerDay: 4,
  /** 野生卡：刻意偏離興趣輪廓的則數。設 0 會讓推薦在三週內塌縮，別關掉。 */
  wildcards: 1,

  /** 粗篩後留幾則進精排。太多會讓精排 prompt 過長、注意力被稀釋。 */
  shortlistSize: 40,

  /** 抓最近幾小時內的新內容 */
  lookbackHours: 30,

  /** 避免重複推薦的回看天數 */
  dedupeDays: 45,

  models: {
    // 粗篩：只看標題，量大，用最便宜的
    prefilter: 'claude-haiku-4-5-20251001',
    // 精排 + 寫延伸：品質決定整個系統好不好用，別省
    rank: 'claude-sonnet-5',
    // 每週重寫興趣輪廓
    reprofile: 'claude-sonnet-5',
  },

  sources: {
    hackernews: {
      enabled: true,
      minPoints: 40,
    },
    lobsters: {
      enabled: true,
      // Lobsters 的 tag 訊噪比比 HN 好很多，挑跟你口味相關的
      tags: ['practices', 'testing', 'devops', 'programming', 'ai'],
    },
    github: {
      enabled: true,
      // 最近 N 天內建立、星星數門檻
      createdWithinDays: 14,
      minStars: 150,
    },
    rss: {
      enabled: true,
      feeds: [
        'https://martinfowler.com/feed.atom',
        'https://blog.thepete.net/atom.xml',
        'https://newsletter.pragmaticengineer.com/feed',
        'https://www.thoughtworks.com/rss/insights.xml',
        // 想加就往下加，壞掉的 feed 會被跳過不會炸掉整支流程
      ],
    },
  },

  /** 每累積幾筆回饋就重寫一次興趣輪廓 */
  reprofileEvery: 20,
} as const;

export const PATHS = {
  profile: 'data/profile.md',
  history: 'data/history.json',
  feedback: 'data/feedback.jsonl',
  state: 'data/state.json',
} as const;
