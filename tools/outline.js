import { tool } from "@langchain/core/tools";
import { z } from "zod";
import "dotenv/config";

export const outlineTool = tool(
  async ({ topic, context }) => {
    const prompt = context
      ? `根据主题"${topic}"和以下参考资料，生成结构化的文章大纲：\n${context}`
      : `根据主题"${topic}"生成结构化的文章大纲`;

    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-v4-pro",
        messages: [
          {
            role: "system",
            content:
              "你是一个专业的内容策划。根据用户提供的主题和参考资料，生成结构化的文章大纲。输出JSON格式：{\"title\": \"文章标题\", \"sections\": [\"章节1\", \"章节2\", ...]}，sections按顺序排列。",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI API failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data.choices[0].message.content;
  },
  {
    name: "generate_outline",
    description:
      "生成结构化的文章大纲。在搜索完资料、确定文章框架后使用，输出标题和章节列表。",
    schema: z.object({
      topic: z.string().describe("文章标题/主题"),
      context: z.string().optional().describe("搜索到的参考资料或背景信息"),
    }),
  }
);
