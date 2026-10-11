"""Kafka -> StarRocks 消费者

消费 raw_content topic 的网页内容,攒批后通过 Stream Load 写入 StarRocks。
写入成功才提交 Kafka offset,配合 StarRocks 主键模型实现"至少一次 + 幂等去重"。
"""

import json
import time
from datetime import datetime

import requests
from confluent_kafka import Consumer, KafkaException

import oa_config

KAFKA_BOOTSTRAP = oa_config.KAFKA_BOOTSTRAP
TOPIC = oa_config.KAFKA_TOPIC
GROUP_ID = "raw-content-to-starrocks"

SR_HOST = oa_config.SR_BE_HTTP  # 直连 BE:经 FE(8030) 会被 307 重定向, requests 重定向时会丢掉 Authorization 头
SR_DB = oa_config.SR_DB
SR_TABLE = "raw_content"
SR_USER = oa_config.SR_USER
SR_PASSWORD = oa_config.SR_PASSWORD

BATCH_SIZE = 100        # 攒够多少条写一次
FLUSH_INTERVAL = 5.0    # 或间隔多少秒写一次(防止数据少时长时间不落地)


def to_row(record: dict) -> dict:
    """Kafka 消息 -> StarRocks 行,字段名与表列名对应。"""
    return {
        "platform": record["platform"],
        "source": record.get("source", ""),
        "content_id": record["content_id"],
        "url": record.get("url", ""),
        "title": record.get("title", ""),
        "content": record.get("content", ""),
        # unix 时间戳 -> DATETIME 字符串
        "crawled_at": datetime.fromtimestamp(record["crawled_at"]).strftime(
            "%Y-%m-%d %H:%M:%S"
        ),
        # producer 已格式化为 DATETIME 字符串;为 None 时 Stream Load 写入 NULL
        "published_at": record.get("published_at"),
    }


def stream_load(rows: list[dict]) -> None:
    """通过 Stream Load 把一批行写入 StarRocks,失败抛异常(不提交 offset)。"""
    url = f"{SR_HOST}/api/{SR_DB}/{SR_TABLE}/_stream_load"
    headers = {
        "Expect": "100-continue",
        "format": "json",
        "strip_outer_array": "true",
        # label 是 Stream Load 的幂等标识:同一 label 重试不会产生重复导入
        "label": f"{TOPIC}_{int(time.time() * 1000)}",
    }
    body = json.dumps(rows, ensure_ascii=False).encode()

    resp = requests.put(
        url, data=body, headers=headers, auth=(SR_USER, SR_PASSWORD), timeout=60
    )
    resp.raise_for_status()

    result = resp.json()
    if result.get("Status") not in ("Success", "Publish Timeout"):
        raise RuntimeError(f"stream load failed: {result}")

    print(f"[LOAD] {len(rows)} rows, cost {result.get('LoadTimeMs')}ms")


def main():
    consumer = Consumer({
        "bootstrap.servers": KAFKA_BOOTSTRAP,
        "group.id": GROUP_ID,
        "auto.offset.reset": "earliest",
        "enable.auto.commit": False,  # 手动提交:写库成功才提交
    })
    consumer.subscribe([TOPIC])

    rows: list[dict] = []
    last_flush = time.monotonic()

    try:
        while True:
            msg = consumer.poll(timeout=1.0)

            if msg is not None:
                if msg.error():
                    raise KafkaException(msg.error())
                try:
                    rows.append(to_row(json.loads(msg.value())))
                except (KeyError, ValueError) as e:
                    # 坏消息跳过:不让一条脏数据卡死整个管道
                    print(f"[BAD MSG] {e}, offset={msg.offset()}")

            due = len(rows) >= BATCH_SIZE
            timeout = rows and (time.monotonic() - last_flush >= FLUSH_INTERVAL)
            if due or timeout:
                try:
                    stream_load(rows)
                except Exception as e:
                    # 写库失败:不提交 offset,进程退出后消息会被重新消费
                    print(f"[LOAD FAIL] {e}")
                    raise
                consumer.commit()  # 写库成功,提交 offset
                print(f"[COMMIT] offsets committed, {len(rows)} rows")
                rows = []
                last_flush = time.monotonic()
    except KeyboardInterrupt:
        print("stopping...")
    finally:
        consumer.close()


if __name__ == "__main__":
    main()
