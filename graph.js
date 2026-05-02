import { StateGraph } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import { WriterState } from "./lib/state.js";
import {
  plannerAgent,
  writeAgent,
  illustratorPlanAgent,
  illustratorGenerateAgent,
  illustratorAssembleAgent,
  reviewerAgent,
  hitlAgent,
} from "./agents/index.js";

const writerGraph = new StateGraph(WriterState)
  .addNode("planner", plannerAgent)
  .addNode("writer", writeAgent)
  .addNode("illustratorPlan", illustratorPlanAgent)
  .addNode("illustratorGenerate", illustratorGenerateAgent)
  .addNode("illustratorAssemble", illustratorAssembleAgent)
  .addNode("reviewer", reviewerAgent)
  .addNode("hitl", hitlAgent)
  .addEdge("__start__", "planner")
  .addEdge("planner", "writer")
  .addEdge("writer", "illustratorPlan")
  .addEdge("illustratorPlan", "illustratorGenerate")
  .addEdge("illustratorGenerate", "illustratorAssemble")
  .addEdge("illustratorAssemble", "reviewer")
  .addEdge("reviewer", "hitl")
  .addEdge("hitl", "__end__")
  .compile({ checkpointer: new MemorySaver() });

export { writerGraph };
