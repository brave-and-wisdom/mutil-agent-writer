import { tool } from "@langchain/core/tools";
import { z } from "zod";
import "dotenv/config";

export const searchTool = tool(
  async ({ query }) => {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
      }),
    });

    if (!res.ok) {
      throw new Error(`Tavily search failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data.results
      .map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.content}`)
      .join("\n\n");
  },
  {
    name: "web_search",
    description:
      "搜索互联网获取最新信息。需要了解某个主题的背景、最新进展或数据时使用。",
    schema: z.object({
      query: z.string().describe("搜索关键词，尽量精确"),
    }),
  }
);
