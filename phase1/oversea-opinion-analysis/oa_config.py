"""配置加载:集中读取 .env,供各脚本使用。"""

import os
from pathlib import Path

import yaml
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / ".env")

# Kafka
KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "localhost:9092")
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "raw_content")

# StarRocks
SR_BE_HTTP = os.getenv("SR_BE_HTTP", "http://localhost:8040")
SR_FE_HOST = os.getenv("SR_FE_HOST", "localhost")
SR_FE_PORT = int(os.getenv("SR_FE_PORT", "9030"))
SR_DB = os.getenv("SR_DB", "opinion")
SR_USER = os.getenv("SR_USER", "root")
SR_PASSWORD = os.getenv("SR_PASSWORD", "")

# Bedrock
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
BEDROCK_MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "moonshot.kimi-k2-thinking")

# 分析参数
ANALYZE_BATCH_SIZE = int(os.getenv("ANALYZE_BATCH_SIZE", "50"))
ANALYZE_LOOKBACK_DAYS = int(os.getenv("ANALYZE_LOOKBACK_DAYS", "3"))

# 日报
REPORT_DIR = Path(os.getenv("REPORT_DIR", str(BASE_DIR / "reports")))

STATE_DIR = BASE_DIR / ".state"


def load_sources() -> list[dict]:
    """读取数据源清单 config/sources.yaml。"""
    with open(BASE_DIR / "config" / "sources.yaml", encoding="utf-8") as f:
        return yaml.safe_load(f)["sources"]


def sr_mysql_conn_kwargs() -> dict:
    """pymysql 连接参数(FE 9030, MySQL 协议)。"""
    return {
        "host": SR_FE_HOST,
        "port": SR_FE_PORT,
        "user": SR_USER,
        "password": SR_PASSWORD,
        "database": SR_DB,
        "charset": "utf8mb4",
        "autocommit": True,
    }
