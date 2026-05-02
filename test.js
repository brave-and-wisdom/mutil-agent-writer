import "dotenv/config";
import { plannerAgent } from "./agents/planner.js";

const result = await plannerAgent({
  topic: "LangGraph JS入门：用图编排你的AI Agent",
});

console.log("===== 生成的大纲 =====");
console.log(result.outline);
