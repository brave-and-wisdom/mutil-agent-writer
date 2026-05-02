import { Command } from "@langchain/langgraph";
import { writerGraph } from "./graph.js";
import "dotenv/config";

async function main() {
  const topic = process.argv[2] || "AI 如何改变软件开发流程";

  const config = { configurable: { thread_id: `writer-${Date.now()}` } };

  console.log(`[main] 开始写作，主题: ${topic}\n`);

  let result = await writerGraph.invoke({ topic }, config);

  while (result.__interrupt__) {
    const payload = result.__interrupt__[0].value;
    console.log("\n══════════════════════════════════════");
    console.log(`[HITL] 第 ${payload.iterationCount} 轮评审`);
    console.log(`[HITL] 反馈: ${payload.feedback || "无"}`);
    console.log(`[HITL] 文章预览: ${payload.article.slice(0, 200)}...`);
    console.log("──────────────────────────────────────");
    payload.actions.forEach((a) => {
      console.log(`  [${a.action}] ${a.description}`);
    });
    console.log("══════════════════════════════════════");

    const action = await promptUser(payload.actions);

    const resumeCmd =
      action === "edit"
        ? new Command({ resume: { action, draft: "" } })
        : new Command({ resume: { action } });

    result = await writerGraph.invoke(resumeCmd, config);
  }

  const article = result.articleWithImages || result.draft || "";

  console.log("\n[main] 写作完成！");
  console.log(`[main] 通过: ${result.approved ?? "人工操作"}`);
  console.log(`[main] 迭代次数: ${result.iteration}`);
  console.log(`[main] 最终文章长度: ${article.length} 字`);

  const fs = await import("node:fs");
  fs.writeFileSync("output/article.md", article, "utf-8");
  console.log(`[main] 文章已保存到 output/article.md`);
}

async function promptUser(actions) {
  // 简单 CLI 交互，实际项目可替换为 Web UI / Slack 等
  const readline = (await import("node:readline")).default;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  return new Promise((resolve) => {
    rl.question("选择操作: ", (answer) => {
      rl.close();
      const found = actions.find((a) => a.action === answer.trim());
      resolve(found ? answer.trim() : "revise");
    });
  });
}

main().catch((e) => {
  console.error("[main] 运行失败:", e.message);
  process.exit(1);
});
