# 0007 技术栈
状态：已接受
日期：2026-10-09

## 决策
| 层 | 选型 |
|---|---|
| IaC | AWS CDK v2，TypeScript，Node.js 22 LTS |
| 后端 | Python 3.12，FastAPI，SQLAlchemy 2，包管理用 uv |
| SQL 解析与血缘 | sqlglot（StarRocks 方言） |
| 前端 | React 18 + TypeScript + Vite，编辑器用 Monaco |
| 测试 | CDK：jest + assertions；Python：pytest；前端：vitest |
| 仓库 | 单仓库（monorepo），结构见 AGENTS.md |

## 理由
- CDK 用 TypeScript：它是 CDK 的一等公民，示例和社区资源最多。
- 后端用 Python：可以直接复用 sqlglot、AgentCore SDK 和数据生态的库。

## 后果
仓库里有 TypeScript 和 Python 两种语言，各自的 lint 和测试工具都要配置好。
