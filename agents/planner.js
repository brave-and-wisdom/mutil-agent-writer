import { StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { createModel } from "../lib/model.js";
import { PlannerState } from "../lib/state.js";
import { searchTool, outlineTool } from "../tools/index.js";

const tools = [searchTool, outlineTool];

const plannerModel = createModel({ temperature: 0.7 }).bindTools(tools);

async function agentNode(state) {
  const response = await plannerModel.invoke(state.messages);
  return { messages: [response] };
}

function router(state) {
  const last = state.messages[state.messages.length - 1];
  if (last.tool_calls?.length) return "tool";
  return "extract";
}

async function extractNode(state) {
  const last = state.messages[state.messages.length - 1];
  return { outline: last.content };
}

const toolNode = new ToolNode(tools);

const plannerGraph = new StateGraph(PlannerState)
  .addNode("agent", agentNode)
  .addNode("tool", toolNode)
  .addNode("extract", extractNode)
  .addEdge("__start__", "agent")
  .addConditionalEdges("agent", router)
  .addEdge("tool", "agent")
  .addEdge("extract", "__end__")
  .compile();

const SYSTEM_PROMPT = `你是一位资深内容策划，擅长规划技术文章结构。
请为给定主题制定详细大纲，包含：
1. 文章定位和目标读者
2. 核心章节（3-5 个）
3. 每章的关键内容点
工作流程：
1. 先用 web_search 搜索主题的背景资料
2. 基于搜索结果，用 generate_outline 生成结构化大纲
3. 最后用自然语言输出完整的大纲说明`;

export async function plannerAgent(state) {
  const result = await plannerGraph.invoke({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `请为以下主题制定写作大纲：${state.topic}` },
    ],
  });
  return { outline: result.outline };
}
