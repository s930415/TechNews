# 興趣輪廓

最後更新：2026-08-25（依據 65 筆回饋）

## 核心命中

- 軟體設計方法論：DDD、TDD、SDD、EventStorming、Hexagonal / Clean Architecture、形式化規格撰寫（SpecForge 類工具）、測試設計與可組合性（assertion/matcher 設計、composable tests）
- 開發流程自動化：git hooks、husky、lint-staged、commitlint、CI 守門機制、把開發管線當成正式生產系統看待
- AI coding agent 的工程化：規則檔／agent.md 設計、context 管理與 compaction、agent memory（如 MCP Memory）、skills / subagents、agent 邊界劃分、多 agent 協作（merge queue、LLM router 自建/棄用經驗）、agent 執行細節觀察（如 Claude Code 動態調整 effort level）
- 讓 AI 產出可被驗證的工程手法：規格先行、契約測試（含 LLM 產生 GPU kernel 的 contract-grade verifier）、架構相依性檢查、防 AI 產生低品質程式碼的 lint 規則（anti-slop）、AI 輔助抓漏／逆向工程／程式碼遷移實證案例（Chrome bug fix、COBOL→Java 遷移、用小模型做逆向工程）
- 團隊層級的工程實踐：code review 流程（含 stacked PR、code comments vs PR description 之爭）、trunk-based development、技術債／「就是一團亂」的處理態度、接受不完美的 git history、commit 型態的實證研究（如 fix commit 占比）
- 開發工具鏈與 AI agent 的資安：npm / GitHub Actions 供應鏈攻擊防禦、agent 憑證與機密管理、雲端與硬體層級的深度漏洞剖析（Cosmos DB、RowHammer、KVM guest-to-host escape）
- 資料庫與基礎設施內部機制：SQLite 可靠性與 WAL 除錯故事、Postgres 分析查詢效能優化（SIMD／operator fusion）、資料庫選型 tradeoff（Redis vs MySQL）、測試資料庫技巧（pgtestdb）、以物件儲存為基礎的訊息佇列設計（PicoMQ）、每日出貨資料庫的持續交付實務
- GPU／平行運算程式設計：kernel 正確性驗證、Rust 的可攜式安全 GPU offload、CUDA 應用於實際問題（如地理定位計算）

## 已知道，別再推入門篇

（尚無。按「🤔 已知道」的項目會累積到這裡。）

## 明確不要

- 前端框架的版本更新與發布公告
- 新創募資、商業策略、AI 產業新聞（含「AI 生產力提升多少 %」這類討論）
- 模型跑分比較、benchmark 排行
- 「10 個你必須知道的…」這類清單文
- 純觀念思辨／論戰類文章（如形式化驗證的哲學辯論），偏好有實作案例的內容
- 無真實問題驅動的懷舊重現／炫技型專案（老電腦 emulator、獵奇 build 技巧展示）

## 觀察中（訊號不足）

- 低階系統／繪圖驅動移植（如 RADV 移植到 Win32）
- 大規模資料查詢引擎的資源效率（如用 10GB RAM 跑十億級圖的 DataFusion）
- 大型系統維運與基礎設施戰記（如 Compiler Explorer 雲端部署、長期對抗爬蟲、Infrastructure Gravity）
- 系統設計中複雜度與控制權的取捨討論
- 創意型硬體／演算法應用小品（如鐵路網路掃描器、CUDA 地理定位、PPPoE 除錯）——持續有反應但主題分散，尚未收斂成單一領域
- 純方法論框架類文章（如 Diátaxis）持續反應冷淡，待更多訊號判斷

## 手動指定

<!-- 這個區塊模型不會動。想強制加減什麼直接寫在這裡。 -->

- 偏好有實作細節與取捨討論的內容，不要純觀念介紹
