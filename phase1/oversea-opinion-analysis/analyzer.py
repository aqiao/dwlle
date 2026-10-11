"""LLM 分析 worker:读取 StarRocks 中未分析的文章,调用 Bedrock 分析后写回。

幂等:按 content_id 关联分析表,只处理没有分析记录的文章;失败的文章
下一轮会重新被捞起重试。

用法:
    python analyzer.py --once          # 处理一批退出(配 cron)
    python analyzer.py --loop 1800     # 常驻,每 1800 秒处理一批(默认)
"""

import argparse
import json
import time

import pymysql

import llm
import oa_config

FIND_UNANALYZED_SQL = """
SELECT r.content_id, r.title, r.content
FROM raw_content r
LEFT JOIN article_analysis a ON r.content_id = a.content_id
WHERE a.content_id IS NULL
  AND r.crawled_at >= DATE_SUB(NOW(), INTERVAL %s DAY)
ORDER BY r.crawled_at DESC
LIMIT %s
"""

INSERT_ANALYSIS_SQL = """
INSERT INTO article_analysis
    (content_id, summary_zh, summary_en, sentiment, sentiment_score,
     topics, keywords, heat_score, model, analyzed_at)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
"""


def analyze_batch(conn) -> int:
    """处理一批未分析文章,返回成功分析的数量。"""
    with conn.cursor() as cur:
        cur.execute(
            FIND_UNANALYZED_SQL,
            (oa_config.ANALYZE_LOOKBACK_DAYS, oa_config.ANALYZE_BATCH_SIZE),
        )
        rows = cur.fetchall()

    if not rows:
        print("[DONE] 没有待分析的文章")
        return 0

    ok = 0
    for content_id, title, content in rows:
        try:
            result = llm.analyze_article(title, content)
            with conn.cursor() as cur:
                cur.execute(INSERT_ANALYSIS_SQL, (
                    content_id,
                    result["summary_zh"],
                    result["summary_en"],
                    result["sentiment"],
                    float(result["sentiment_score"]),
                    json.dumps(result["topics"], ensure_ascii=False),
                    json.dumps(result["keywords"], ensure_ascii=False),
                    int(result["heat_score"]),
                    oa_config.BEDROCK_MODEL_ID,
                ))
            ok += 1
            print(f"[OK] {content_id} {title[:40]}")
        except Exception as e:
            # 单篇失败不影响整批;下一轮会重试
            print(f"[FAIL] {content_id} {title[:40]}: {e}")

    print(f"[DONE] 本批分析 {ok}/{len(rows)} 篇")
    return ok


def main():
    parser = argparse.ArgumentParser(description="StarRocks 未分析文章 -> Bedrock LLM 分析")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--once", action="store_true", help="处理一批退出")
    group.add_argument(
        "--loop", type=int, default=1800, metavar="秒", help="常驻轮询间隔(默认 1800)"
    )
    args = parser.parse_args()

    conn = pymysql.connect(**oa_config.sr_mysql_conn_kwargs())
    try:
        if args.once:
            analyze_batch(conn)
            return
        while True:
            try:
                analyze_batch(conn)
            except Exception as e:
                print(f"[ERROR] 本批分析失败: {e}")
            time.sleep(args.loop)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
