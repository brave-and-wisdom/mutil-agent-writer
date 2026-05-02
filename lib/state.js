import { Annotation, MessagesAnnotation } from "@langchain/langgraph";
import { z } from "zod";

// ── 图片相关子结构 ──────────────────────────────────────────

const ImageTask = z.object({
  id: z.string().describe("图片任务唯一标识"),
  sectionIndex: z.number().describe("对应大纲章节索引"),
  description: z.string().describe("图片内容描述/提示词"),
  style: z.string().default("realistic").describe("图片风格"),
  priority: z.enum(["high", "medium", "low"]).default("medium").describe("优先级"),
});

const GeneratedImage = z.object({
  taskId: z.string().describe("关联的图片任务ID"),
  url: z.string().describe("生成图片的URL"),
  alt: z.string().describe("替代文本"),
  sectionIndex: z.number().describe("所属章节索引"),
  status: z.enum(["generated", "selected", "rejected"]).default("generated"),
});

const ImagePlanEntry = z.object({
  sectionIndex: z.number().describe("章节索引"),
  sectionHeading: z.string().describe("章节标题"),
  imageCount: z.number().describe("该章节配图数量"),
  descriptions: z.array(z.string()).describe("配图描述列表"),
});

// ── 主状态定义 ──────────────────────────────────────────────

export const WriterState = Annotation.Root({
  // ── 写作流程核心状态 ──
  topic: Annotation({
    default: () => "",
    reducer: (prev, next) => next ? next : prev,
  }),

  outline: Annotation({
    default: () => "",
    reducer: (prev, next) => next ? next : prev,
  }),

  draft: Annotation({
    default: () => "",
    reducer: (prev, next) => next ? next : prev,
  }),

  review: Annotation({
    default: () => "",
    reducer: (prev, next) => next ? next : prev,
  }),

  confirmed: Annotation({
    default: () => false,
    reducer: (_, next) => next,
  }),

  iteration: Annotation({
    default: () => 0,
    reducer: (prev) => prev + 1,
  }),

  // ── 图片配图流程状态 ──

  imageTask: Annotation({
    default: () => null,
    reducer: (prev, next) => next ? next : prev,
  }),

  imagePlan: Annotation({
    default: () => [],
    reducer: (_, next) => next,
  }),

  generatedImages: Annotation({
    default: () => [],
    reducer: (prev, next) => [...prev, ...next],
  }),

  insertedImages: Annotation({
    default: () => [],
    reducer: (prev, next) => [...prev, ...next],
  }),

  articleWithImages: Annotation({
    default: () => "",
    reducer: (_, next) => next,
  }),
});

export const PlannerState = Annotation.Root({
  ...MessagesAnnotation.spec,
  outline: Annotation({
    default: () => "",
    reducer: (prev, next) => next ? next : prev,
  }),
});

export { ImageTask, GeneratedImage, ImagePlanEntry };
