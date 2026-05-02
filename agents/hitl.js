import { interrupt, Command } from "@langchain/langgraph";

export async function hitlAgent(state) {
  const payload = {
    kind: "review",
    iterationCount: state.iteration,
    feedback: state.review || "",
    article: state.articleWithImages || state.draft || "",
    actions: [
      { action: "revise", description: "继续迭代：回到写作节点" },
      { action: "accept", description: "人工强制通过：直接结束" },
      { action: "abort", description: "人工终止：直接结束" },
      { action: "edit", description: "人工替换 draft：跳过写作，直接进入配图" },
    ],
  };

  const decision = interrupt(payload);

  switch (decision.action) {
    case "accept":
      console.log("[hitl] 人工通过");
      return new Command({ update: { approved: true }, goto: "__end__" });
    case "abort":
      console.log("[hitl] 人工终止");
      return new Command({ update: { approved: true }, goto: "__end__" });
    case "edit":
      console.log("[hitl] 人工替换草稿，跳过写作直接配图");
      return new Command({
        update: { draft: decision.draft, approved: false },
        goto: "illustratorPlan",
      });
    case "revise":
    default:
      console.log("[hitl] 进入修订迭代");
      return new Command({ update: { approved: false }, goto: "writer" });
  }
}
