-- 面向 Amazon Quick Suite 的 BI 视图
-- Quick Suite 通过 MySQL 协议连接 StarRocks(FE 9030),直接选用以下视图建仪表盘

-- 每日概览:文章数、来源数、平均情感、平均热度
CREATE OR REPLACE VIEW opinion.v_daily_overview AS
SELECT
    DATE(r.crawled_at)          AS dt,
    COUNT(*)                    AS article_cnt,
    COUNT(DISTINCT r.source)    AS source_cnt,
    AVG(a.sentiment_score)      AS avg_sentiment,
    AVG(a.heat_score)           AS avg_heat
FROM opinion.raw_content r
JOIN opinion.article_analysis a ON r.content_id = a.content_id
GROUP BY DATE(r.crawled_at);

-- 情感趋势:按天统计正/负/中性文章数
CREATE OR REPLACE VIEW opinion.v_sentiment_trend AS
SELECT
    DATE(r.crawled_at) AS dt,
    a.sentiment        AS sentiment,
    COUNT(*)           AS cnt
FROM opinion.raw_content r
JOIN opinion.article_analysis a ON r.content_id = a.content_id
GROUP BY DATE(r.crawled_at), a.sentiment;

-- 每日话题热度:展开 topics JSON 数组后按天+话题聚合
CREATE OR REPLACE VIEW opinion.v_daily_top_topics AS
SELECT
    DATE(r.crawled_at)  AS dt,
    j.topic             AS topic,
    COUNT(*)            AS article_cnt,
    AVG(a.heat_score)   AS avg_heat,
    SUM(a.heat_score)   AS total_heat
FROM opinion.raw_content r
JOIN opinion.article_analysis a ON r.content_id = a.content_id,
     json_each(CAST(a.topics AS JSON)) AS j(topic)
GROUP BY DATE(r.crawled_at), j.topic;

-- 热点文章明细:供列表类图表使用
CREATE OR REPLACE VIEW opinion.v_top_articles AS
SELECT
    DATE(r.crawled_at) AS dt,
    r.source,
    r.title,
    r.url,
    a.summary_zh,
    a.sentiment,
    a.sentiment_score,
    a.heat_score,
    a.topics,
    r.published_at,
    r.crawled_at
FROM opinion.raw_content r
JOIN opinion.article_analysis a ON r.content_id = a.content_id;
