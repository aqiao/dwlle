-- LLM 分析结果表:与 raw_content 通过 content_id 关联
CREATE TABLE IF NOT EXISTS opinion.article_analysis (
    content_id      VARCHAR(64)   NOT NULL COMMENT '关联 raw_content.content_id',
    summary_zh      VARCHAR(2048) NOT NULL DEFAULT '' COMMENT '中文摘要',
    summary_en      VARCHAR(2048) NOT NULL DEFAULT '' COMMENT '英文摘要',
    sentiment       VARCHAR(16)   NOT NULL DEFAULT '' COMMENT 'positive/negative/neutral',
    sentiment_score DOUBLE        NOT NULL DEFAULT 0 COMMENT '情感分值 -1 ~ 1',
    topics          VARCHAR(1024) NOT NULL DEFAULT '' COMMENT '话题标签 JSON 数组',
    keywords        VARCHAR(1024) NOT NULL DEFAULT '' COMMENT '关键词 JSON 数组',
    heat_score      INT           NOT NULL DEFAULT 0 COMMENT '热度分 0-100',
    model           VARCHAR(128)  NOT NULL DEFAULT '' COMMENT '分析所用模型 ID',
    analyzed_at     DATETIME      NOT NULL COMMENT '分析时间'
) PRIMARY KEY(content_id)
DISTRIBUTED BY HASH(content_id)
PROPERTIES ("replication_num" = "1");
