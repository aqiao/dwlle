-- 原始内容表:采集到的网页正文
-- 主键模型,content_id 为 md5(url),重复写入即覆盖,配合管道实现幂等去重
CREATE DATABASE IF NOT EXISTS opinion;

CREATE TABLE IF NOT EXISTS opinion.raw_content (
    platform     VARCHAR(32)   NOT NULL DEFAULT 'news' COMMENT '平台类型: news/social/...',
    source       VARCHAR(64)   NOT NULL DEFAULT '' COMMENT '来源标识, 如 bbc_world',
    content_id   VARCHAR(64)   NOT NULL COMMENT 'md5(url)',
    url          VARCHAR(2048) NOT NULL DEFAULT '',
    title        VARCHAR(1024) NOT NULL DEFAULT '',
    content      STRING        NOT NULL DEFAULT '',
    crawled_at   DATETIME      NOT NULL COMMENT '采集时间',
    published_at DATETIME      NULL COMMENT '发布时间(RSS 提供时)'
) PRIMARY KEY(content_id)
DISTRIBUTED BY HASH(content_id)
PROPERTIES ("replication_num" = "1");
