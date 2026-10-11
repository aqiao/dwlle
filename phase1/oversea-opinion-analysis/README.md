# oversea-opinion-analysis 海外舆情分析

采集海外主要新闻媒体的热点文章,经 Kafka 写入 StarRocks,由 AWS Bedrock
上的 Kimi 模型做摘要、情感和话题分析,产出中文日报;仪表盘由客户侧的
Amazon Quick Suite 连接 StarRocks 提供。

## 架构

```
海外媒体 RSS ──▶ producer.py ──▶ Kafka(raw_content)
                                      │
                                      ▼
                              consumer.py(Stream Load)
                                      │
                                      ▼
                        StarRocks  opinion.raw_content
                                      │
                                      ▼
              analyzer.py(Bedrock Kimi 分析, 写回 article_analysis)
                                      │
                      ┌───────────────┴───────────────┐
                      ▼                               ▼
              report.py 中文日报                Amazon Quick Suite
              reports/YYYY-MM-DD.md          (MySQL 协议连 FE 9030, 读 v_* 视图)
```

## 部署(服务器)

前置:服务器上已有 Kafka(9092)和 StarRocks(FE 9030 / BE 8040),Python 3.11+,uv。
**服务器必须能访问海外网站**(采集海外媒体 RSS 和正文、调用 Bedrock);如果服务器在国内,
需要在 `.env` 中配置 `HTTP_PROXY` / `HTTPS_PROXY` 代理(对本进程内 requests 和 feedparser 同时生效)。

```bash
cd oversea-opinion-analysis
uv sync
cp .env.example .env   # 按实际环境修改:StarRocks 密码、AWS_REGION、BEDROCK_MODEL_ID、代理
uv run python init_db.py
```

AWS 凭证:使用实例角色,或在 `.env` 中配置 `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`。

## 运行

| 组件 | 常驻模式 | cron 模式 |
|---|---|---|
| 采集 | `uv run python producer.py --loop 1800` | `*/30 * * * * cd <dir> && uv run python producer.py --once` |
| 入仓 | `uv run python consumer.py`(必须常驻) | — |
| 分析 | `uv run python analyzer.py --loop 1800` | `*/30 * * * * cd <dir> && uv run python analyzer.py --once` |
| 日报 | — | `0 8 * * * cd <dir> && uv run python report.py` |

## 验证 checklist

1. `uv run python init_db.py` —— 每个 sql 文件提示执行成功
2. `uv run python producer.py --once` —— 输出 `[DONE] 本轮新推送 N 篇`
3. 启动 consumer 后,StarRocks 里 `SELECT COUNT(*) FROM opinion.raw_content;` 增长
4. `uv run python analyzer.py --once` —— 输出 `[OK] ...`,分析表有数据
5. `uv run python report.py` —— 生成 `reports/<日期>.md`

## Amazon Quick Suite 对接

1. Quick Suite 中添加数据源,类型选 **MySQL**(StarRocks 兼容 MySQL 协议),
   主机填 StarRocks FE 地址,端口 **9030**,数据库 `opinion`,使用只读账号
2. 选用以下视图建仪表盘:
   - `v_daily_overview` —— 每日文章数 / 来源数 / 平均情感 / 平均热度
   - `v_sentiment_trend` —— 按天的正 / 负 / 中性文章数
   - `v_daily_top_topics` —— 按天 + 话题的文章数与热度
   - `v_top_articles` —— 热点文章明细(标题、链接、中文摘要、情感、热度)
3. 建议为 Quick Suite 单独建只读账号:

```sql
CREATE USER 'quicksuite_ro'@'%' IDENTIFIED BY '<强密码>';
GRANT SELECT ON opinion.* TO 'quicksuite_ro'@'%';
```

## 目录说明

```
config/sources.yaml   # 海外媒体数据源清单
sql/                  # StarRocks DDL(init_db.py 幂等执行)
oa_config.py          # .env 配置加载
producer.py           # RSS 采集 -> Kafka
consumer.py           # Kafka -> StarRocks(Stream Load)
analyzer.py           # StarRocks -> Bedrock Kimi -> 分析表
report.py             # 中文日报生成
llm.py                # Bedrock 客户端封装
```
