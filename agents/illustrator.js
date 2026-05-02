import { Overwrite } from "@langchain/langgraph";
import { z } from "zod";
import { createModel } from "../lib/model.js";
import { imageTool } from "../tools/index.js";

const ImageItem = z.object({
  position: z.string().describe("插图在文章中的位置说明"),
  prompt: z.string().describe("英文图片生成提示词，适合生成技术示意图"),
  filename: z.string().describe("简短英文 snake_case 文件名，扩展名 .png"),
  altText: z.string().describe("中文替代文本"),
});

const PLAN_SYSTEM_PROMPT = `你是专业的技术文章配图编辑。你会分析文章结构，找出 2-4 个最适合插图的位置（重点概念、流程图、架构示意等）。
你必须只输出一行合法的 JSON，不要有任何多余文字，不要用 markdown 代码块包裹：
{"images": [{"position": "插图位置说明", "prompt": "英文提示词", "filename": "short_snake_case.png", "altText": "中文替代文本"}]}`;

const REPAIR_SYSTEM_PROMPT = `你是图像生成提示词专家。输入会包含原始 prompt 与失败原因。你的任务是输出一个改进后的英文 prompt，保证更清晰、更可生成（流程图/架构图风格、白底、线条简洁、避免过长）。
你必须只输出一行合法的 JSON，不要有任何多余文字，不要用 markdown 代码块包裹：
{"prompt": "修复后的英文提示词"}`;

const illustratorModel = createModel({ temperature: 0.7 });
const repairModel = createModel({ temperature: 0.3 });

async function generateWithRepair({ prompt, filename, outputDir, size }) {
  try {
    return await imageTool.invoke({ prompt, filename, outputDir, size });
  } catch (e) {
    console.warn(`[illustrator] 首次生成失败 ${filename}: ${e.message}，尝试修复 prompt...`);

    let repairText;
    try {
      const response = await repairModel.invoke([
        { role: "system", content: REPAIR_SYSTEM_PROMPT },
        { role: "user", content: `原始 prompt: ${prompt}\n失败原因: ${e.message}\n请修复上述提示词。` },
      ]);
      repairText = response.content.trim();
    } catch {
      console.error("[illustrator] repairPrompt 调用失败，跳过该图片");
      return null;
    }

    let repairJson;
    try {
      repairJson = JSON.parse(repairText.replace(/```json|```/g, "").trim());
    } catch {
      console.error("[illustrator] repairPrompt JSON 解析失败，跳过该图片");
      return null;
    }

    const repairedPrompt = repairJson.prompt;
    if (!repairedPrompt) {
      console.error("[illustrator] prompt 修复结果为空，跳过该图片");
      return null;
    }

    console.log(`[illustrator] 修复后 prompt: ${repairedPrompt}`);

    try {
      return await imageTool.invoke({ prompt: repairedPrompt, filename, outputDir, size });
    } catch (e2) {
      console.error(`[illustrator] 修复后仍失败 ${filename}: ${e2.message}`);
      return null;
    }
  }
}

export async function illustratorGenerateAgent(state) {
  const { imagePlan, outputDir } = state;
  const generatedImages = [];
  const insertedImages = [];

  if (!imagePlan || imagePlan.length === 0) {
    console.warn("[illustrator] imagePlan 为空，跳过图片生成");
    return { generatedImages, insertedImages };
  }

  console.log(`[illustrator] 开始生成 ${imagePlan.length} 张图片，输出目录: ${outputDir || "output/images"}`);

  for (const item of imagePlan) {
    console.log(`[illustrator] 生成: ${item.filename}`);
    const filePath = await generateWithRepair({
      prompt: item.prompt,
      filename: item.filename,
      outputDir,
      size: item.size,
    });
    if (filePath) {
      generatedImages.push({ ...item, filePath });
      insertedImages.push({
        filename: item.filename,
        position: item.position,
        altText: item.altText,
        savedBasename: item.filename,
      });
    }
  }

  console.log(`[illustrator] 图片生成完成，成功 ${generatedImages.length}/${imagePlan.length} 张`);
  return { generatedImages, insertedImages };
}

export async function illustratorAssembleAgent(state) {
  const { insertedImages, imagePlan, draft } = state;

  if (!insertedImages || insertedImages.length === 0) {
    console.warn("[illustrator] insertedImages 为空，跳过图片插入");
    return { articleWithImages: draft };
  }

  const imageMap = new Map(insertedImages.map((img) => [img.filename, img]));

  let article = draft || "";

  for (const plan of imagePlan) {
    const info = imageMap.get(plan.filename);
    if (!info) {
      console.warn(`[illustrator] 未找到 ${plan.filename} 的生成结果，跳过`);
      continue;
    }

    const markdown = `![${info.altText}](${info.savedBasename})`;
    const marker = `<!-- img:${plan.filename} -->`;

    if (article.includes(marker)) {
      article = article.replace(marker, markdown);
      console.log(`[illustrator] 已插入: ${plan.filename} (标记替换)`);
    } else {
      article += `\n\n${markdown}\n\n`;
      console.log(`[illustrator] 已追加: ${plan.filename} (末尾追加)`);
    }
  }

  console.log("[illustrator] 图片插入完成");
  return { articleWithImages: article };
}

export async function illustratorPlanAgent(state) {
  let response;
  try {
    response = await illustratorModel.invoke([
      { role: "system", content: PLAN_SYSTEM_PROMPT },
      {
        role: "user",
        content: `请分析以下文章，规划配图位置：\n\n主题：${state.topic}\n\n大纲：${state.outline}\n\n草稿：${state.draft || "暂无草稿"}`,
      },
    ]);
  } catch (e) {
    console.error("[illustrator] planAgent 调用失败:", e.message);
    return { imagePlan: [], insertedImages: new Overwrite([]), articleWithImages: state.draft };
  }

  let json;
  try {
    json = JSON.parse(response.content.trim().replace(/```json|```/g, "").trim());
  } catch {
    console.warn("[illustrator] planAgent JSON 解析失败，跳过配图");
    return { imagePlan: [], insertedImages: new Overwrite([]), articleWithImages: state.draft };
  }

  const parsed = z.array(ImageItem).safeParse(json.images);
  if (!parsed.success) {
    console.warn("[illustrator] 配图计划解析失败，跳过配图:", parsed.error.message);
    return { imagePlan: [], insertedImages: new Overwrite([]), articleWithImages: state.draft };
  }

  console.log(`[illustrator] 配图计划生成成功，共 ${parsed.data.length} 张图片`);
  return { imagePlan: parsed.data };
}
