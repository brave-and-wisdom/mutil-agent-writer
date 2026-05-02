import { tool } from "@langchain/core/tools";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import "dotenv/config";

export const imageTool = tool(
  async ({ prompt, filename, outputDir, size, negativePrompt }) => {
    const body = {
      model: "qwen-image-2.0-pro",
      input: {
        messages: [
          {
            role: "user",
            content: [{ text: prompt }],
          },
        ],
      },
      parameters: {
        prompt_extend: true,
        watermark: false,
        size: size || "2048*2048",
        ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
      },
    };

    console.log(`[image] 开始生成图片: ${filename}`);

    const res = await fetch(
      "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
        },
        body: JSON.stringify(body),
      }
    );

    const data = await res.json();

    if (!res.ok || data.code) {
      const errMsg = data.message || `${res.status} ${res.statusText}`;
      console.error(`[image] 生成失败: ${errMsg}`);
      throw new Error(`DashScope image generation failed: ${errMsg}`);
    }

    const imageUrl = data.output?.choices?.[0]?.message?.content?.find(
      (c) => c.image
    )?.image;

    if (!imageUrl) {
      console.error("[image] 响应中未找到图片URL:", JSON.stringify(data));
      throw new Error("DashScope response missing image URL");
    }

    console.log(`[image] 下载图片: ${imageUrl}`);

    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      throw new Error(`Download image failed: ${imageRes.status}`);
    }
    const buffer = Buffer.from(await imageRes.arrayBuffer());

    const dir = outputDir || "output/images";
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, filename);

    fs.writeFileSync(filePath, buffer);
    console.log(`[image] 已保存: ${filePath}`);

    return filePath;
  },
  {
    name: "generate_image",
    description: "根据英文提示词生成技术配图，下载并保存到本地，返回文件路径。使用阿里百炼 qwen-image-2.0-pro 模型。",
    schema: z.object({
      prompt: z.string().describe("英文图片生成提示词，详细描述图片内容"),
      filename: z.string().describe("保存文件名（如 architecture_overview.png）"),
      outputDir: z.string().optional().describe("输出目录，默认 output/images"),
      size: z.string().optional().describe("图片尺寸，默认 2048*2048"),
      negativePrompt: z.string().optional().describe("负面提示词，排除不需要的元素"),
    }),
  }
);
