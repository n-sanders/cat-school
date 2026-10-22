import { parse as parseYaml } from "yaml";
import type { ZodType } from "zod";
import {
  CurriculumSchema,
  ItemSchema,
  LessonFrontmatterSchema,
  type Curriculum,
  type Item,
  type Lesson,
  type Unit,
} from "./schema";

export class ContentError extends Error {
  constructor(
    public file: string,
    message: string,
  ) {
    super(`${file}: ${message}`);
  }
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function splitFrontmatter(raw: string, file: string): { data: unknown; body: string } {
  const match = FRONTMATTER.exec(raw);
  if (!match) throw new ContentError(file, "missing '---' frontmatter block");
  return { data: parseYaml(match[1]), body: match[2].trim() };
}

function validate<T>(schema: ZodType<T>, data: unknown, file: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new ContentError(file, `schema errors:\n${issues}`);
  }
  return result.data;
}

export function parseItem(raw: string, file: string): Item {
  return validate(ItemSchema, parseYaml(raw), file);
}

export function parseLesson(raw: string, file: string): Lesson {
  const { data, body } = splitFrontmatter(raw, file);
  if (!body) throw new ContentError(file, "lesson body is empty");
  return { ...validate(LessonFrontmatterSchema, data, file), body, file };
}

export function parseCurriculum(raw: string, file: string): Curriculum {
  return validate(CurriculumSchema, parseYaml(raw), file);
}

export interface Content {
  curriculum: Curriculum;
  items: Map<string, Item>;
  lessons: Map<string, Lesson>;
  /** Lesson ids in curriculum order. */
  lessonOrder: string[];
  unitOf: Map<string, Unit>;
}

export function buildContent(curriculum: Curriculum, items: Item[], lessons: Lesson[]): Content {
  const itemMap = new Map(items.map((b) => [b.slug, b]));
  const lessonMap = new Map(lessons.map((l) => [l.id, l]));
  const unitOf = new Map<string, Unit>();
  const lessonOrder: string[] = [];
  for (const unit of curriculum.units) {
    for (const id of unit.lessons) {
      lessonOrder.push(id);
      unitOf.set(id, unit);
    }
  }
  return { curriculum, items: itemMap, lessons: lessonMap, lessonOrder, unitOf };
}

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const v of values) (seen.has(v) ? dupes : seen).add(v);
  return [...dupes];
}

export interface IntegrityOptions {
  /** When false, any catalog item or photo quiz is a problem. */
  catalogEnabled?: boolean;
}

/**
 * Cross-file checks that need no network access. Returns a list of problems;
 * an empty list means the content is consistent.
 */
export function checkIntegrity(
  curriculum: Curriculum,
  items: Item[],
  lessons: Lesson[],
  { catalogEnabled = true }: IntegrityOptions = {},
): string[] {
  const problems: string[] = [];
  const itemSlugs = new Set(items.map((b) => b.slug));
  const lessonIds = new Set(lessons.map((l) => l.id));
  const unitIds = new Set(curriculum.units.map((u) => u.id));
  const listed = curriculum.units.flatMap((u) => u.lessons);

  if (!catalogEnabled && items.length)
    problems.push(`the catalog is disabled in site.config.ts but ${items.length} item file(s) exist`);
  for (const d of duplicates(items.map((b) => b.slug))) problems.push(`duplicate item slug '${d}'`);
  for (const d of duplicates(lessons.map((l) => l.id))) problems.push(`duplicate lesson id '${d}'`);
  for (const d of duplicates(listed)) problems.push(`lesson '${d}' is listed more than once in curriculum`);
  for (const d of duplicates(curriculum.units.map((u) => u.id))) problems.push(`duplicate unit id '${d}'`);

  for (const id of listed) if (!lessonIds.has(id)) problems.push(`curriculum lists missing lesson '${id}'`);

  for (const item of items) {
    const where = `item '${item.slug}'`;
    const sourceIds = new Set(item.sources.map((s) => s.id));
    for (const t of item.traits)
      if (!sourceIds.has(t.source)) problems.push(`${where}: trait cites unknown source '${t.source}'`);
    for (const la of item.lookAlikes) {
      if (!itemSlugs.has(la)) problems.push(`${where}: unknown look-alike '${la}'`);
      if (la === item.slug) problems.push(`${where}: lists itself as a look-alike`);
    }
    for (const d of duplicates(item.images.map((i) => i.url))) problems.push(`${where}: duplicate image ${d}`);
  }

  for (const lesson of lessons) {
    const where = `lesson '${lesson.id}' (${lesson.file})`;
    if (!listed.includes(lesson.id)) problems.push(`${where}: not listed in curriculum`);
    if (!unitIds.has(lesson.unit)) problems.push(`${where}: unknown unit '${lesson.unit}'`);
    else if (!curriculum.units.find((u) => u.id === lesson.unit)!.lessons.includes(lesson.id))
      problems.push(`${where}: frontmatter unit '${lesson.unit}' does not match its curriculum unit`);
    for (const p of lesson.prerequisites) {
      if (!lessonIds.has(p)) problems.push(`${where}: unknown prerequisite '${p}'`);
      else if (listed.indexOf(p) > listed.indexOf(lesson.id))
        problems.push(`${where}: prerequisite '${p}' comes later in the curriculum`);
    }
    const checkItem = (s: string, ctx: string) => {
      if (!itemSlugs.has(s)) problems.push(`${where}: ${ctx} references unknown item '${s}'`);
    };
    lesson.items.forEach((b) => checkItem(b, "items"));
    lesson.compare.forEach(([a, b]) => {
      checkItem(a, "compare");
      checkItem(b, "compare");
    });
    for (const img of lesson.images) if (img.item) checkItem(img.item, "images");
    lesson.quiz.forEach((q, i) => {
      if (q.type === "question") return;
      if (!catalogEnabled) problems.push(`${where}: quiz[${i}] is a '${q.type}' item but the catalog is disabled`);
      checkItem(q.item, `quiz[${i}]`);
      q.distractors?.forEach((d) => checkItem(d, `quiz[${i}].distractors`));
      if (q.distractors?.includes(q.item)) problems.push(`${where}: quiz[${i}] lists the answer as a distractor`);
    });
  }

  problems.push(...findCycles(lessons));
  return problems;
}

function findCycles(lessons: Lesson[]): string[] {
  const prereqs = new Map(lessons.map((l) => [l.id, l.prerequisites]));
  const state = new Map<string, "visiting" | "done">();
  const problems: string[] = [];
  const visit = (id: string, path: string[]) => {
    if (state.get(id) === "done") return;
    if (state.get(id) === "visiting") {
      problems.push(`prerequisite cycle: ${[...path.slice(path.indexOf(id)), id].join(" -> ")}`);
      return;
    }
    state.set(id, "visiting");
    for (const p of prereqs.get(id) ?? []) visit(p, [...path, id]);
    state.set(id, "done");
  };
  for (const id of prereqs.keys()) visit(id, []);
  return problems;
}
