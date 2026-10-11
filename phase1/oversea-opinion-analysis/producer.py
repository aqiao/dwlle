"""海外新闻采集 -> Kafka 生产者

从 config/sources.yaml 读取海外媒体 RSS,发现新文章后抓取正文,
组装成 JSON 消息发送到 Kafka,由 Consumer 消费写入 StarRocks。

用法:
    python producer.py --once          # 跑一轮退出(配 cron)
    python producer.py --loop 1800     # 常驻,每 1800 秒一轮(默认)
"""

import argparse
import hashlib
import json
import socket
import time
from datetime import datetime, timezone

import feedparser
import requests
from bs4 import BeautifulSoup
from confluent_kafka import Producer

import oa_config

# feedparser 底层用 urllib,没有超时参数;用全局默认超时兜底,防止单个源挂死整轮采集
socket.setdefaulttimeout(15)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/126.0.0.0 Safari/537.36"
    )
}

SEEN_FILE = oa_config.STATE_DIR / "seen.json"
SEEN_TTL_DAYS = 7  # 去重窗口:近 7 天推送过的文章不再重复推送


def load_seen() -> dict:
    """读取已推送记录,并清理超出窗口的旧记录。格式: {content_id: 推送时间戳}"""
    try:
        seen = json.loads(SEEN_FILE.read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError):
        return {}
    cutoff = time.time() - SEEN_TTL_DAYS * 86400
    return {cid: ts for cid, ts in seen.items() if ts > cutoff}


def save_seen(seen: dict) -> None:
    oa_config.STATE_DIR.mkdir(exist_ok=True)
    SEEN_FILE.write_text(json.dumps(seen), encoding="utf-8")


def fetch_article_text(url: str) -> str:
    """抓取文章页,提取正文文本(去掉脚本/样式)。"""
    resp = requests.get(url, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    resp.encoding = resp.apparent_encoding or resp.encoding

    soup = BeautifulSoup(resp.text, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    lines = [ln.strip() for ln in soup.get_text("\n").splitlines() if ln.strip()]
    return "\n".join(lines)


def entry_to_record(source: dict, entry) -> dict | None:
    """RSS entry -> Kafka 消息。没有链接的条目返回 None。"""
    url = getattr(entry, "link", "")
    if not url:
        return None

    published_at = None
    parsed = getattr(entry, "published_parsed", None) or getattr(
        entry, "updated_parsed", None
    )
    if parsed:
        published_at = datetime.fromtimestamp(
            time.mktime(parsed), tz=timezone.utc
        ).strftime("%Y-%m-%d %H:%M:%S")

    return {
        "platform": "news",
        "source": source["name"],
        "url": url,
        # 用 URL 的 md5 作为内容主键,与 StarRocks 主键模型对应,便于 upsert
        "content_id": hashlib.md5(url.encode()).hexdigest(),
        "title": getattr(entry, "title", "").strip(),
        "content": fetch_article_text(url),
        "crawled_at": int(time.time()),
        "published_at": published_at,
    }


def delivery_report(err, msg):
    if err is not None:
        print(f"[FAIL] {msg.key()}: {err}")


def run_once(producer: Producer, seen: dict) -> int:
    """采集一轮,返回新推送的文章数。"""
    pushed = 0
    for source in oa_config.load_sources():
        try:
            feed = feedparser.parse(source["rss_url"])
        except Exception as e:
            print(f"[SKIP] {source['name']}: RSS 解析失败: {e}")
            continue

        for entry in feed.entries:
            url = getattr(entry, "link", "")
            if not url:
                continue
            content_id = hashlib.md5(url.encode()).hexdigest()
            if content_id in seen:
                continue
            try:
                record = entry_to_record(source, entry)
            except Exception as e:
                print(f"[SKIP] {url}: {e}")
                continue
            if record is None:
                continue

            producer.produce(
                oa_config.KAFKA_TOPIC,
                key=record["content_id"].encode(),
                value=json.dumps(record, ensure_ascii=False).encode(),
                on_delivery=delivery_report,
            )
            seen[content_id] = int(time.time())
            pushed += 1

    producer.flush()  # 阻塞直到所有消息发送完成
    save_seen(seen)
    print(f"[DONE] 本轮新推送 {pushed} 篇")
    return pushed


def main():
    parser = argparse.ArgumentParser(description="海外新闻采集 -> Kafka")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--once", action="store_true", help="跑一轮退出")
    group.add_argument(
        "--loop", type=int, default=1800, metavar="秒", help="常驻轮询间隔(默认 1800)"
    )
    args = parser.parse_args()

    producer = Producer({
        "bootstrap.servers": oa_config.KAFKA_BOOTSTRAP,
        "compression.type": "zstd",  # 开启压缩,文本可压到 1/5~1/10
    })

    if args.once:
        run_once(producer, load_seen())
        return

    while True:
        try:
            run_once(producer, load_seen())
        except Exception as e:
            print(f"[ERROR] 本轮采集失败: {e}")
        time.sleep(args.loop)


if __name__ == "__main__":
    main()
