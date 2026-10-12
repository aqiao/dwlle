# OA002 oversea-opinion-analysis 数据质量

分支：`task/OA002-data-quality` · 依赖：OA001 · 预计：3~4 小时
工作目录：`phase1/oversea-opinion-analysis/`

## 目标
控制无效的 LLM 成本、提高送入模型的正文质量、清理失效的数据源，让日报内容可信。

## 范围

### 1. 分析失败的重试上限
现状：分析失败的文章每轮都会被重新捞起，坏数据会一直消耗 Bedrock 费用。

- 新增 `sql/004_analysis_fail.sql`：
  ```sql
  CREATE TABLE IF NOT EXISTS opinion.article_analysis_fail (
      content_id      VARCHAR(64)   NOT NULL,
      fail_count      INT           NOT NULL DEFAULT 0,
      last_error      VARCHAR(1024) NOT NULL DEFAULT '',
      last_attempt_at DATETIME      NOT NULL COMMENT 'UTC'
  ) PRIMARY KEY(content_id)
  DISTRIBUTED BY HASH(content_id)
  PROPERTIES ("replication_num" = "1");
  ```
- `analyzer.py`：
  - 单篇失败时 upsert 这张表：`fail_count + 1`，`last_error` 截断到 1000 字符，`last_attempt_at = UTC_TIMESTAMP()`。实现方式：先查出当前 `fail_count`，再 `INSERT` 覆盖（主键模型的 INSERT 即 upsert）。
  - `FIND_UNANALYZED_SQL` 增加 `LEFT JOIN article_analysis_fail f`，排除 `f.fail_count >= MAX_ANALYZE_ATTEMPTS` 的文章。
  - 新增配置 `MAX_ANALYZE_ATTEMPTS`（`oa_config.py` + `.env.example`），默认 `3`。
  - 分析成功后不需要删除 fail 记录（成功的文章已经不会再被捞起）。
  - 本批结束日志增加"本批跳过的文章数（已达重试上限）"——没有更简单的统计方式时，可以单独执行一条 COUNT 查询。
- 区分两类错误：Bedrock 的限流类错误（`ThrottlingException`、`ServiceUnavailableException`）**不计入** fail_count，直接结束本批（等下一轮）；其余异常（JSON 解析失败、字段缺失、截断）计入 fail_count。

### 2. 正文提取
现状：`soup.get_text()` 会把导航栏、页脚、推荐阅读一起抓进来，截断到 6000 字后正文占比可能很低。

- `uv add trafilatura`。`fetch_article_text()` 仍用 `requests` 下载（保留现有超时、UA 和代理行为），然后用 `trafilatura.extract(html, url=url, include_comments=False, include_tables=False)` 提取正文。
- trafilatura 返回 `None` 或结果少于 200 字符时，回退到现有的 BeautifulSoup 逻辑，并打印 `[FALLBACK] url`。
- 提取结果仍少于 200 字符（多半是付费墙或反爬页面）：跳过这篇，不推送 Kafka，打印 `[THIN] url len=N`。不标记 seen，下一轮会再试——可以接受。

### 3. 数据源清理
现状：`config/sources.yaml` 里有已失效或不可用的源（`feeds.reuters.com` 已在 2020 年停用；`apnews.com/rss` 不是有效的 feed；CNN 的 RSS 基本停止更新；NYT 有付费墙）。

- 新增 `check_sources.py`：对每个源执行 `feedparser.parse`，再对前 3 篇文章执行 `fetch_article_text`，输出一张表：

  | name | HTTP 状态 / bozo | entries 数 | 最新一篇距今小时数 | 正文抽取成功数/3 | 平均正文长度 |

- 判定可用：entries ≥ 5、最新一篇在 48 小时内、正文抽取成功 ≥ 2/3。
- 按检查结果更新 `sources.yaml`：
  - 不可用的源：注释掉，并在注释中写明原因和检查日期，不要直接删除。
  - 补充可用的替代源，使可用源 ≥ 6 个，覆盖至少 3 个国家/地区的媒体（例如：英、美、中东、亚太）。替代源必须是媒体官方提供的 RSS 地址。
- `sources.yaml` 每个源新增字段 `enabled: true/false`，`load_sources()` 只返回 enabled 的源。

## 不在范围内
- 版权合规（只存摘要还是存全文）——由项目负责人与客户确认后再定
- 社交媒体数据源、事件聚类、话题清单

## 验收标准
1. `uv run pytest` 全部通过。新增测试：
   - 重试上限过滤（可以把 SQL 拼装或判定逻辑抽成纯函数来测）
   - 限流错误与普通错误的分类函数
2. 在服务器上执行 `uv run python init_db.py`，成功创建 fail 表。
3. 构造一篇必定失败的文章（例如临时把 `LLM_MAX_TOKENS` 设为 10），连续跑 4 次 `analyzer.py --once`：前 3 次会尝试分析它，第 4 次不再捞起它；`article_analysis_fail` 中对应记录 `fail_count = 3`。
4. 交付说明中附上 `check_sources.py` 的完整输出（清理前、清理后各一份）。
5. 清理后跑一轮 `producer.py --once`：随机抽 5 篇，在 StarRocks 中查看 `content` 的前 300 字符，应全部是正文，没有导航或菜单文本。附上抽样结果。

## 给评审的关注点
- 限流错误是否被误计入 fail_count（会导致好文章被永久跳过）
- 回退逻辑是否会掩盖 trafilatura 的系统性失败（关注 `[FALLBACK]` 的比例，在交付说明中给出）
- 新增数据源是否都是官方 RSS 地址
