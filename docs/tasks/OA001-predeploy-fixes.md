# OA001 oversea-opinion-analysis 部署前修复

分支：`task/OA001-predeploy-fixes` · 依赖：无 · 预计：3~4 小时
工作目录：`phase1/oversea-opinion-analysis/`

## 目标
修复首版代码中会导致线上跑不通或者数据出错的 5 个问题，使"采集 → 入仓 → 分析 → 日报"闭环可以在服务器上稳定运行。

## 范围

### 1. LLM 响应解析（`llm.py`）
现状：`resp["output"]["message"]["content"][0]["text"]`。推理模型（如 `kimi-k2-thinking`）的第一个 content block 可能是 `reasoningContent`，导致 `KeyError`；`maxTokens=1024` 可能被推理过程耗尽，JSON 被截断。

- 拆出两个纯函数，便于测试：
  - `_extract_text(resp: dict) -> str`：遍历 `content`，拼接所有含 `text` 键的 block，忽略 `reasoningContent` 等其他 block。没有任何 text block 时抛 `ValueError`。
  - `_parse_json(text: str) -> dict`：取第一个 `{` 到最后一个 `}` 之间的子串再 `json.loads`。替代现在的 ``` 剥离逻辑。
- `resp["stopReason"] == "max_tokens"` 时抛 `ValueError("output truncated (max_tokens)")`，不要尝试解析。
- 新增配置 `LLM_MAX_TOKENS`（`oa_config.py` + `.env.example`），默认 `4096`。
- 用 `aws bedrock list-foundation-models --region <region>` 查出当前区域可用的 Kimi 模型 ID，在 `.env.example` 注释中列出，并说明：优先用非 thinking 版本（更快更省）；如果用 thinking 版本，`LLM_MAX_TOKENS` 至少 4096。代码对两种模型都必须能正常工作。

### 2. 数据库断线重连（`analyzer.py`）
现状：`--loop` 模式复用同一个 pymysql 连接，StarRocks 断开空闲连接后，每轮都会失败，永远恢复不了。

- `analyze_batch()` 开头调用 `conn.ping(reconnect=True)`。
- `oa_config.sr_mysql_conn_kwargs()` 增加 `connect_timeout=10`、`read_timeout=60`、`write_timeout=60`。

### 3. 统一时区
现状：`crawled_at` 按服务器本地时区写入，`published_at` 是 UTC，StarRocks 的 `NOW()` 默认为 Asia/Shanghai，日报按服务器 `date.today()` 切日。

约定：**库里所有 DATETIME 一律存 UTC；"哪一天"按北京时间（`REPORT_TZ`，默认 `Asia/Shanghai`）切分。**
- `consumer.py`：`crawled_at` 用 `datetime.fromtimestamp(ts, tz=timezone.utc)` 格式化。
- `analyzer.py`：回溯条件用 `UTC_TIMESTAMP()` 代替 `NOW()`；写入时 `analyzed_at` 也用 `UTC_TIMESTAMP()`。
- `report.py`：
  - `--date` 默认值为 `REPORT_TZ` 下的今天（用 `zoneinfo`），不依赖服务器时区。
  - 查询改为按 UTC 区间过滤：把北京时间的 `[day 00:00, day+1 00:00)` 换算成 UTC，写成 `r.crawled_at >= %s AND r.crawled_at < %s`（不要对列套函数，以便利用分区/索引）。
  - 日报中如果展示时间，展示北京时间。
- `sql/003_bi_views.sql`：所有 `DATE(r.crawled_at)` 改为 `DATE(CONVERT_TZ(r.crawled_at, '+00:00', '+08:00'))`。在文件头注释写明：库内时间为 UTC，视图的 `dt` 是北京时间日期。
- `oa_config.py` + `.env.example` 新增 `REPORT_TZ=Asia/Shanghai`。视图里固定用 `+08:00`，在注释中说明它与 `REPORT_TZ` 需要保持一致。
- README 增加一小节"时区约定"，内容同上。

### 4. 话题视图（`sql/003_bi_views.sql` 中的 `v_daily_top_topics`）
现状：`json_each(...) AS j(topic)`。`json_each` 用于展开 JSON 对象，返回两列，这里只给了一个别名，大概率在建视图时报错。

- 改为用 `unnest` 展开数组，例如：
  `CROSS JOIN unnest(CAST(parse_json(a.topics) AS ARRAY<VARCHAR>)) AS j(topic)`
- 以服务器上实际的 StarRocks 版本为准验证；如果这个语法不支持，换成该版本支持的写法，并在交付说明里写明版本号和最终 SQL。
- 展开后的 `topic` 必须是纯字符串（不带 JSON 引号）。

### 5. Producer 只在投递成功后标记已推送（`producer.py`）
现状：`produce()` 之后立刻写入 `seen`；投递失败只打日志，这篇文章 7 天内不会再采集。

- 在 `on_delivery` 回调里，仅当 `err is None` 时写入 `seen[content_id]`（content_id 从 `msg.key()` 解码得到）。用闭包或 `functools.partial` 把 `seen` 传进回调。
- `producer.flush()` 之后再 `save_seen()`，保持现有顺序。
- 本轮结束的日志分别打印"成功投递 N / 失败 M"。
- `seen.json` 改为原子写入：先写 `.tmp` 文件，再 `os.replace`，避免进程中途被杀导致文件损坏。

### 6. 测试
项目目前没有测试。新增 `tests/` 目录，`pytest` 加入 dev 依赖（`uv add --dev pytest`），只测纯函数：
- `_extract_text`：纯 text 响应、reasoningContent + text 响应、没有 text 的响应（抛异常）
- `_parse_json`：裸 JSON、```json 代码块包裹的 JSON、JSON 前后带说明文字
- `consumer.to_row`：给定 unix 时间戳，`crawled_at` 输出的是 UTC 时间（在 `TZ=Asia/Shanghai` 环境下运行也要通过）
- `report.py` 中北京日期 → UTC 区间的换算函数（需要先把它抽成独立函数）

## 不在范围内
- 失败重试上限、正文提取、数据源清理（见 OA002）
- `tools/kafka_tool.py` 和 strands-agents 相关内容（等设计文档出来再做）
- 事件聚类、话题清单

## 验收标准
1. `uv run pytest` 全部通过；在 `TZ=Asia/Shanghai uv run pytest` 下同样通过。
2. 在服务器上执行 `uv run python init_db.py` 成功，再执行一次也不报错。
3. 端到端跑一遍：`producer.py --once` → `consumer.py`（看到 `[COMMIT]` 后 Ctrl-C）→ `analyzer.py --once` → `report.py`。在交付说明中附上：
   - analyzer 输出中的成功数/总数（成功率应 ≥ 90%）
   - 所用的 `BEDROCK_MODEL_ID`
   - 日报文件的前 30 行
4. `SELECT * FROM opinion.v_daily_top_topics ORDER BY total_heat DESC LIMIT 5;` 能返回结果，且 topic 不带引号。
5. 执行 `SELECT crawled_at, UTC_TIMESTAMP() FROM opinion.raw_content ORDER BY crawled_at DESC LIMIT 1;`，两个值相差应在采集间隔之内（不能差 8 小时）。
6. 重连验证：`analyzer.py --loop 60` 运行期间，在 StarRocks 上 `KILL` 掉它的连接（`SHOW PROCESSLIST` 可以查到连接 id），下一轮能自动恢复正常。

## 给评审的关注点
- 时区：所有写入和查询的地方都换过了吗？有没有漏掉的 `NOW()` 或 `DATE(crawled_at)`？
- seen 回调：`flush()` 之前进程崩溃时，不能出现"未投递却已标记"的情况
- `.env.example` 里是否有任何真实凭证
