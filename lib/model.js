import { ChatOpenAI } from "@langchain/openai";
import "dotenv/config";

export function createModel(options = {}) {
  const { modelKwargs, ...rest } = options;
  return new ChatOpenAI({
    model: "deepseek-v4-pro",
    apiKey: process.env.DEEPSEEK_API_KEY,
    configuration: {
      baseURL: "https://api.deepseek.com/v1",
    },
    modelKwargs: {
      thinking: { type: "disabled" },
      ...(modelKwargs || {}),
    },
    ...rest,
  });
}
