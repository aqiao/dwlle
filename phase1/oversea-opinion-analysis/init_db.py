"""初始化 StarRocks 库表:按顺序执行 sql/ 下的 DDL,幂等,可重复运行。"""

import re
import sys
from pathlib import Path

import pymysql

import oa_config

SQL_DIR = Path(__file__).resolve().parent / "sql"


def split_statements(sql_text: str) -> list[str]:
    """按分号切分 SQL 语句,去掉注释行和空语句。"""
    lines = [
        ln for ln in sql_text.splitlines()
        if not re.match(r"^\s*--", ln)
    ]
    return [s.strip() for s in "\n".join(lines).split(";") if s.strip()]


def main() -> None:
    # 连接时不指定 database,DDL 里自带库名,且需要先建库
    kwargs = oa_config.sr_mysql_conn_kwargs()
    kwargs.pop("database")
    conn = pymysql.connect(**kwargs)

    sql_files = sorted(SQL_DIR.glob("*.sql"))
    if not sql_files:
        print("[dwlle] sql/ 下没有找到 .sql 文件", file=sys.stderr)
        sys.exit(1)

    try:
        with conn.cursor() as cur:
            for path in sql_files:
                stmts = split_statements(path.read_text(encoding="utf-8"))
                for stmt in stmts:
                    cur.execute(stmt)
                print(f"[dwlle] {path.name}: {len(stmts)} 条语句执行成功")
    finally:
        conn.close()

    print("[dwlle] 初始化完成")


if __name__ == "__main__":
    main()
