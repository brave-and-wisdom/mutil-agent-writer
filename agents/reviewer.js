import { z } from "zod";
import { createModel } from "../lib/model.js";

const ReviewOutput = z.object({
  approved: z.boolean(),
  feedback: z.string(),
});

const REVIEW_SYSTEM_PROMPT = `你是严格的技术编辑，负责评审文章质量。
评审标准：
1. 内容准确性（技术细节是否正确）
2. 结构清晰度（逻辑是否流畅）
3. 代码示例（是否有可运行的代码）
4. 读者友好度（是否易于理解）

你必须只输出一行合法的 JSON，不要有任何多余文字，不要用 markdown 代码块包裹：
{"approved": true/false, "feedback": "具体修改意见，通过则为空字符串"}`;

const reviewerModel = createModel({ temperature: 0.3 });

export async function reviewerAgent(state) {
  try {
    const response = await reviewerModel.invoke([
      { role: "system", content: REVIEW_SYSTEM_PROMPT },
      {
        role: "user",
        content: `请评审以下技术文章：\n\n主题：${state.topic}\n\n大纲：${state.outline}\n\n草稿：${state.draft}\n\n配图后文章：${state.articleWithImages || "无配图"}`,
      },
    ]);

    const text = response.content.trim();
    const json = JSON.parse(text.replace(/```json|```/g, "").trim());
    const parsed = ReviewOutput.safeParse(json);

    if (!parsed.success) {
      console.error("[reviewer] 评审结果解析失败:", parsed.error.message);
      return { review: "", approved: false };
    }

    console.log(`[reviewer] 评审完成，通过: ${parsed.data.approved}`);
    return {
      review: parsed.data.feedback,
      approved: parsed.data.approved,
    };
  } catch (e) {
    console.error("[reviewer] reviewAgent 调用失败:", e.message);
    return { review: "", approved: false };
  }
}
