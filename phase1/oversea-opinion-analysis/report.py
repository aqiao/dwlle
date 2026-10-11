"""中文舆情日报生成。

从 StarRocks 读取指定日期(默认今天)已分析的文章,按话题聚合排序,
生成 Markdown 日报到 REPORT_DIR/YYYY-MM-DD.md。

用法:
    python report.py                  # 今天的日报
    python report.py --date 2026-10-11
"""

import argparse
import json
from collections import defaultdict
from datetime import date

import pymysql

import oa_config

QUERY_SQL = """
SELECT r.source, r.title, r.url, r.published_at,
       a.summary_zh, a.sentiment, a.sentiment_score, a.heat_score, a.topics
FROM raw_content r
JOIN article_analysis a ON r.content_id = a.content_id
WHERE DATE(r.crawled_at) = %s
ORDER BY a.heat_score DESC
"""

SENTIMENT_LABEL = {
    "positive": "正面",
    "negative": "负面",
    "neutral": "中性",
}

TOP_N_TOPICS = 10
TOP_N_ARTICLES_PER_TOPIC = 3


def fetch_articles(conn, day: date) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute(QUERY_SQL, (day.isoformat(),))
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]


def aggregate_topics(articles: list[dict]) -> dict[str, list[dict]]:
    """按话题分组,组内按热度降序。"""
    topics: dict[str, list[dict]] = defaultdict(list)
    for art in articles:
        try:
            names = json.loads(art["topics"]) if art["topics"] else []
        except ValueError:
            names = []
        for name in names or ["未分类"]:
            topics[name].append(art)
    for arts in topics.values():
        arts.sort(key=lambda a: a["heat_score"], reverse=True)
    return topics


def render(day: date, articles: list[dict]) -> str:
    lines = [f"# 海外舆情日报 {day.isoformat()}", ""]

    if not articles:
        lines.append("当日没有已分析的文章。")
        return "\n".join(lines)

    total = len(articles)
    avg_sentiment = sum(a["sentiment_score"] for a in articles) / total
    neg = sum(1 for a in articles if a["sentiment"] == "negative")
    pos = sum(1 for a in articles if a["sentiment"] == "positive")
    sources = sorted({a["source"] for a in articles})

    lines += [
        "## 今日概览",
        "",
        f"- 收录文章:**{total}** 篇,来自 {len(sources)} 家媒体({', '.join(sources)})",
        f"- 情感分布:正面 {pos} 篇 / 负面 {neg} 篇 / 中性 {total - pos - neg} 篇,"
        f"平均情感分值 {avg_sentiment:+.2f}",
        "",
        "## 热点话题 Top 10",
        "",
    ]

    topics = aggregate_topics(articles)
    ranked = sorted(
        topics.items(),
        key=lambda kv: sum(a["heat_score"] for a in kv[1]),
        reverse=True,
    )[:TOP_N_TOPICS]

    for i, (topic, arts) in enumerate(ranked, 1):
        total_heat = sum(a["heat_score"] for a in arts)
        lines.append(f"### {i}. {topic}({len(arts)} 篇,总热度 {total_heat})")
        lines.append("")
        for art in arts[:TOP_N_ARTICLES_PER_TOPIC]:
            label = SENTIMENT_LABEL.get(art["sentiment"], art["sentiment"])
            lines.append(f"- **[{art['title']}]({art['url']})** — {art['source']}")
            lines.append(f"  {art['summary_zh']} *(情感:{label},热度 {art['heat_score']})*")
        lines.append("")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="生成中文舆情日报")
    parser.add_argument("--date", default=None, help="日期 YYYY-MM-DD,默认今天")
    args = parser.parse_args()
    day = date.fromisoformat(args.date) if args.date else date.today()

    conn = pymysql.connect(**oa_config.sr_mysql_conn_kwargs())
    try:
        articles = fetch_articles(conn, day)
    finally:
        conn.close()

    report = render(day, articles)

    oa_config.REPORT_DIR.mkdir(exist_ok=True)
    out = oa_config.REPORT_DIR / f"{day.isoformat()}.md"
    out.write_text(report, encoding="utf-8")
    print(f"[DONE] 日报已生成: {out}({len(articles)} 篇文章)")


if __name__ == "__main__":
    main()
