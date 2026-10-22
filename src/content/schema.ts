import { z } from "zod";
import site from "../../site.config";

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be kebab-case");

const categoryIds = site.catalog.categories.map((c) => c.id);
const attributeIds = site.catalog.attributes.map((a) => a.id);

/** An https URL, or a path under public/images/ (written without a leading slash, e.g. "images/x.jpg"). */
export const imageUrl = z
  .string()
  .refine((u) => /^https:\/\/\S+$/.test(u) || /^images\/\S+$/.test(u), {
    message: "must be an https URL or a path starting with 'images/'",
  });

export const SourceSchema = z.object({
  id: slug,
  title: z.string().min(1),
  url: z.url(),
});

export const PinnedImageSchema = z.object({
  url: imageUrl,
  note: z.string().default(""),
  reviewed: z.boolean().default(false),
});

export const ItemSchema = z.object({
  slug,
  name: z.string().min(1),
  category: z.string().refine((c) => categoryIds.includes(c), {
    message: `must be one of the categories in site.config.ts (${categoryIds.join(", ") || "none defined"})`,
  }),
  attributes: z
    .record(z.string(), z.string())
    .default({})
    .refine((a) => Object.keys(a).every((k) => attributeIds.includes(k)), {
      message: `keys must be attributes listed in site.config.ts (${attributeIds.join(", ") || "none defined"})`,
    }),
  /** Passed to a live image provider, if one is configured (for example an API path). */
  imageQuery: z.string().optional(),
  summary: z.string().min(1),
  traits: z
    .array(z.object({ text: z.string().min(1), source: slug }))
    .min(1, "each item needs at least one identifying trait"),
  lookAlikes: z.array(slug).default([]),
  sources: z.array(SourceSchema).min(1, "each item needs at least one source"),
  images: z.array(PinnedImageSchema).min(1, "pin at least one image per item"),
  reviewedBy: z.string().default(""),
  reviewedOn: z.string().default(""),
});

const IdentifyItem = z.object({
  type: z.literal("identify"),
  item: slug,
  image: imageUrl.optional(),
  distractors: z.array(slug).optional(),
});

const FindItem = z.object({
  type: z.literal("find"),
  item: slug,
  distractors: z.array(slug).optional(),
});

const QuestionItem = z
  .object({
    type: z.literal("question"),
    prompt: z.string().min(1),
    choices: z.array(z.string().min(1)).min(2),
    answer: z.string().min(1),
    explanation: z.string().optional(),
  })
  .refine((q) => q.choices.includes(q.answer), {
    message: "answer must be one of the choices",
    path: ["answer"],
  });

export const QuizItemSchema = z.discriminatedUnion("type", [IdentifyItem, FindItem, QuestionItem]);

export const LessonImageSchema = z.object({
  /** The catalog item shown, if any. Lesson images may also be general illustrations. */
  item: slug.optional(),
  url: imageUrl,
  caption: z.string().min(1),
});

export const LessonFrontmatterSchema = z.object({
  id: slug,
  title: z.string().min(1),
  unit: slug,
  summary: z.string().min(1),
  prerequisites: z.array(slug).default([]),
  objectives: z.array(z.string().min(1)).min(1),
  items: z.array(slug).default([]),
  images: z.array(LessonImageSchema).default([]),
  compare: z.array(z.tuple([slug, slug])).default([]),
  sources: z.array(SourceSchema).default([]),
  quiz: z.array(QuizItemSchema).min(5, "each lesson quiz needs at least five items"),
  passMark: z.number().min(0).max(1).default(0.8),
  reviewedBy: z.string().default(""),
  reviewedOn: z.string().default(""),
});

export const CurriculumSchema = z.object({
  title: z.string(),
  /** Optional Markdown shown at the top of the Learn page. */
  intro: z.string().optional(),
  units: z
    .array(
      z.object({
        id: slug,
        title: z.string().min(1),
        description: z.string().min(1),
        lessons: z.array(slug).min(1),
      }),
    )
    .min(1),
});

export type Source = z.infer<typeof SourceSchema>;
export type PinnedImage = z.infer<typeof PinnedImageSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type QuizItem = z.infer<typeof QuizItemSchema>;
export type LessonImage = z.infer<typeof LessonImageSchema>;
export type LessonFrontmatter = z.infer<typeof LessonFrontmatterSchema>;
export type Lesson = LessonFrontmatter & { body: string; file: string };
export type Curriculum = z.infer<typeof CurriculumSchema>;
export type Unit = Curriculum["units"][number];
