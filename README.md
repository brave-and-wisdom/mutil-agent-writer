# Multi-Agent AI Writer

基于 LangGraph 的多智能体协作写作系统，从规划、写作、配图到评审全流程自动化，支持 Human-in-the-Loop 人工介入。

## 架构流程

```
START → planner → writer → illustratorPlan → illustratorGenerate → illustratorAssemble → reviewer → hitl
                                                                                                   ↓
                                                          ┌─ accept/abort → END
                                                          ├─ revise → writer (修订循环)
                                                          └─ edit → illustratorPlan (跳过写作，重新配图)
```

## 项目结构

```
├── agents/
│   ├── index.js          # 统一导出
│   ├── planner.js        # 大纲规划 Agent（搜索 + 生成大纲）
│   ├── writer.js         # 写作 Agent（初稿 + 修订）
│   ├── illustrator.js    # 配图 Agent（计划、生成、插入）
│   ├── reviewer.js       # 评审 Agent（4 维度质量评估）
│   └── hitl.js           # HITL Agent（人工审核中断）
├── lib/
│   ├── state.js          # LangGraph 状态定义
│   └── model.js          # LLM 模型工厂
├── tools/
│   ├── index.js          # 统一导出
│   ├── search.js         # Tavily 网页搜索
│   ├── outline.js        # 结构化大纲生成
│   └── image.js          # DashScope 图片生成
├── graph.js              # 工作流编排 & 路由
├── main.js               # 入口 & CLI 交互
└── output/               # 生成产物（gitignored）
    ├── images/           # AI 生成配图
    └── article.md        # 最终文章
```

## 环境配置

```bash
cp .env.example .env
```

在 `.env` 中配置：

```env
DEEPSEEK_API_KEY=sk-xxxx          # DeepSeek 大模型
DASHSCOPE_API_KEY=sk-xxxx         # 阿里百炼 图片生成
TAVILY_API_KEY=tvly-xxxx          # 搜索工具
```

## 运行

```bash
npm install
node main.js "Python 装饰器原理"
```

运行时，工具链会依次执行规划 → 写作 → 配图 → 评审，遇到 HITL 节点时暂停，等待人工选择操作：

```
══════════════════════════════════════
[HITL] 第 1 轮评审
[HITL] 反馈: ...
[HITL] 文章预览: ...
──────────────────────────────────────
  [revise] 继续迭代：回到写作节点
  [accept] 人工强制通过：直接结束
  [abort] 人工终止：直接结束
  [edit] 人工替换 draft：跳过写作，直接进入配图
══════════════════════════════════════
选择操作:
```

## Agent 说明

| Agent | 职责 | 模型 |
|---|---|---|
| `plannerAgent` | 搜索资料 + 生成结构化大纲 | DeepSeek |
| `writeAgent` | 初稿生成 & 评审修订 | DeepSeek |
| `illustratorPlanAgent` | 分析文章找出配图位置 | DeepSeek |
| `illustratorGenerateAgent` | 调用 DashScope 生成图片（失败自动修复重试） | qwen-image-2.0-pro |
| `illustratorAssembleAgent` | 将图片按位置插入文章 | — |
| `reviewerAgent` | 4 维度质量评审（准确性/结构/代码/可读性） | DeepSeek |
| `hitlAgent` | 中断等待人工决策，Command 控制流程去向 | — |

## 评审标准

1. 内容准确性 — 技术细节是否正确
2. 结构清晰度 — 逻辑是否流畅
3. 代码示例 — 是否有可运行的代码
4. 读者友好度 — 是否易于理解

## 技术栈

- **LangGraph** — 状态图编排 & 中断/恢复
- **LangChain** — Agent & Tool 抽象
- **DeepSeek** — 文本生成
- **DashScope** — 图片生成 (qwen-image-2.0-pro)
- **Tavily** — 联网搜索
