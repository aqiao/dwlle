# 0007 技术栈
状态：已接受（部分被 0009、0017 调整）
日期：2026-10-09

> 现行架构声明（2026-11-08）：SQL 解析使用 Trino 方言；解析结果只是 OpenMetadata 血缘的生成依据，OpenMetadata 才是 LineageEdge 唯一权威存储，见 ADR-0017。AgentCore SDK 不是必需依赖，模型访问通过可替换的 ModelProvider，见 ADR-0009、0016。其余技术栈决策不变。

## 决策
| 层 | 选型 |
|---|---|
| IaC | AWS CDK v2，TypeScript，Node.js 22 LTS |
| 后端 | Python 3.12，FastAPI，SQLAlchemy 2，包管理用 uv |
| SQL 解析 | sqlglot（Trino 方言），解析结果通过受控适配器写入 OpenMetadata |
| 前端 | React 18 + TypeScript + Vite，编辑器用 Monaco |
| 测试 | CDK：jest + assertions；Python：pytest；前端：vitest |
| 仓库 | 单仓库（monorepo），结构见 AGENTS.md |

## 理由
- CDK 用 TypeScript：它是 CDK 的一等公民，示例和社区资源最多。
- 后端用 Python：可以直接复用 sqlglot、模型提供方 SDK 和数据生态的库。

## 后果
仓库里有 TypeScript 和 Python 两种语言，各自的 lint 和测试工具都要配置好。
