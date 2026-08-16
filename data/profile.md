# 興趣輪廓

最後更新：2026-08-16（依據 45 筆回饋）

## 核心命中

- 軟體設計方法論：DDD、TDD、SDD、EventStorming、Hexagonal / Clean Architecture、形式化規格撰寫（SpecForge 類工具）
- 開發流程自動化：git hooks、husky、lint-staged、commitlint、CI 守門機制、把開發管線當成正式生產系統看待
- AI coding agent 的工程化：規則檔設計、context 管理與 compaction、agent memory（如 MCP Memory）、skills / subagents、agent 邊界劃分、多 agent 協作（merge queue、LLM router 自建/棄用經驗）
- 讓 AI 產出可被驗證的工程手法：規格先行、契約測試（含 LLM 產生 GPU kernel 的 contract-grade verifier）、架構相依性檢查、AI 輔助抓漏與程式碼遷移實證案例（Chrome bug fix、COBOL→Java 遷移）
- 團隊層級的工程實踐：code review 流程（含 stacked PR、code comments vs PR description 之爭）、trunk-based development、技術債／「就是一團亂」的處理態度、接受不完美的 git history
- 開發工具鏈與 AI agent 的資安：npm / GitHub Actions 供應鏈攻擊防禦、agent 憑證與機密管理、雲端與硬體層級的深度漏洞剖析（Cosmos DB、RowHammer、KVM guest-to-host escape）
- 資料庫內部機制與效能工程：SQLite 可靠性與 WAL 除錯故事（Tailscale 案例）、Postgres 分析查詢效能優化（SIMD／operator fusion）、資料庫選型 tradeoff（Redis vs MySQL）、測試資料庫技巧（pgtestdb template cloning）

## 已知道，別再推入門篇

（尚無。按「🤔 已知道」的項目會累積到這裡。）

## 明確不要

- 前端框架的版本更新與發布公告
- 新創募資、商業策略、AI 產業新聞（含「AI 生產力提升多少 %」這類討論）
- 模型跑分比較、benchmark 排行
- 「10 個你必須知道的…」這類清單文

## 觀察中（訊號不足）

- 低階系統／繪圖驅動移植（如 RADV 移植到 Win32）
- 大規模資料查詢引擎的資源效率（如用 10GB RAM 跑十億級圖的 DataFusion）
- 大型系統維運與基礎設施戰記（如 Compiler Explorer 雲端部署、長期對抗爬蟲、Infrastructure Gravity）
- 純方法論框架類文章（如 Diátaxis）持續反應冷淡，待更多訊號判斷

## 手動指定

<!-- 這個區塊模型不會動。想強制加減什麼直接寫在這裡。 -->

- 偏好有實作細節與取捨討論的內容，不要純觀念介紹
