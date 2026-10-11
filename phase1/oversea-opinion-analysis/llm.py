"""Bedrock LLM 客户端封装。

通过 boto3 bedrock-runtime 的 Converse API 调用模型(默认 Kimi,
model ID 由 .env 的 BEDROCK_MODEL_ID 决定),对文章做舆情分析,
返回结构化 dict。模型凭证走标准 AWS 凭证链(实例角色 / 环境变量)。
"""

import json

import boto3

import oa_config

MAX_CONTENT_CHARS = 6000  # 正文截断长度,控制 token 消耗

SYSTEM_PROMPT = """你是舆情分析助手。对输入的新闻文章进行分析,只输出一个 JSON 对象,不要输出任何其他文字。JSON 字段:
- summary_zh: 中文摘要,150 字以内
- summary_en: 英文摘要,100 词以内
- sentiment: 整体情感倾向,取值 "positive" / "negative" / "neutral"
- sentiment_score: 情感分值,-1(非常负面)到 1(非常正面)
- topics: 话题标签数组,最多 3 个,用中文短词,如 ["中美关系", "人工智能"]
- keywords: 关键词数组,最多 5 个
- heat_score: 预估公众关注热度,0-100 的整数"""

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = boto3.client("bedrock-runtime", region_name=oa_config.AWS_REGION)
    return _client


def analyze_article(title: str, content: str) -> dict:
    """分析一篇文章,返回结构化结果 dict。解析失败时抛异常,由调用方决定重试。"""
    text = content[:MAX_CONTENT_CHARS]
    resp = _get_client().converse(
        modelId=oa_config.BEDROCK_MODEL_ID,
        system=[{"text": SYSTEM_PROMPT}],
        messages=[{
            "role": "user",
            "content": [{"text": f"标题: {title}\n\n正文:\n{text}"}],
        }],
        inferenceConfig={"maxTokens": 1024, "temperature": 0.2},
    )
    output = resp["output"]["message"]["content"][0]["text"]
    # 模型可能在 JSON 外面包 ```json 代码块,剥离后再解析
    output = output.strip()
    if output.startswith("```"):
        output = output.split("```")[1]
        if output.startswith("json"):
            output = output[4:]
    return json.loads(output.strip())
