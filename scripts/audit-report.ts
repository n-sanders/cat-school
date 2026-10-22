/**
 * Writes docs/audit/content-report.md: one document a reviewer can read to audit
 * every lesson, quiz item, catalog fact, source and pinned photo.
 *
 *   npm run audit
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import site from "../site.config";
import { buildContent, checkIntegrity } from "../src/content/parse";
import type { Item, Lesson, QuizItem } from "../src/content/schema";
import { readAllContent, ROOT } from "./lib/content";

const { curriculum, items, lessons, errors } = readAllContent();
if (!curriculum || errors.length) {
  console.error("Content has errors; run `npm run validate` first.\n" + errors.join("\n"));
  process.exit(1);
}
const problems = checkIntegrity(curriculum, items, lessons, { catalogEnabled: site.catalog.enabled });
const content = buildContent(curriculum, items, lessons);
const { singular, plural, categoryLabel } = site.catalog;
const Plural = plural.charAt(0).toUpperCase() + plural.slice(1);
const itemName = (slug: string) => content.items.get(slug)?.name ?? `UNKNOWN(${slug})`;
const status = (by: string, on: string) => (by ? `Reviewed by ${by}${on ? ` on ${on}` : ""}` : "**NOT REVIEWED**");
const esc = (s: string) => s.replaceAll("|", "\\|");

function quizLine(q: QuizItem, i: number): string {
  switch (q.type) {
    case "identify":
      return `${i + 1}. **Identify** (photo -> name): ${itemName(q.item)}${
        q.image ? ` using [pinned photo](${q.image})` : " using a random pinned photo"
      }${q.distractors ? `; wrong choices: ${q.distractors.map(itemName).join(", ")}` : "; wrong choices chosen automatically from look-alikes and same category"}`;
    case "find":
      return `${i + 1}. **Find** (name -> photo): ${itemName(q.item)}${
        q.distractors ? `; wrong choices: ${q.distractors.map(itemName).join(", ")}` : "; wrong choices chosen automatically"
      }`;
    case "question":
      return [
        `${i + 1}. **Question:** ${q.prompt}`,
        ...q.choices.map((c) => `   - ${c === q.answer ? `**${c}** (correct)` : c}`),
        ...(q.explanation ? [`   - _Explanation:_ ${q.explanation}`] : []),
      ].join("\n");
  }
}

function lessonSection(lesson: Lesson): string {
  const lines = [
    `### ${lesson.title}`,
    "",
    `- **ID:** \`${lesson.id}\``,
    `- **File:** \`${lesson.file}\``,
    `- **Review status:** ${status(lesson.reviewedBy, lesson.reviewedOn)}`,
    `- **Prerequisites:** ${lesson.prerequisites.length ? lesson.prerequisites.map((p) => `\`${p}\``).join(", ") : "none"}`,
    `- **Pass mark:** ${Math.round(lesson.passMark * 100)}%`,
    ...(site.catalog.enabled
      ? [`- **${Plural} taught:** ${lesson.items.length ? lesson.items.map(itemName).join(", ") : "none"}`]
      : []),
    "",
    "**Objectives**",
    "",
    ...lesson.objectives.map((o) => `- ${o}`),
    "",
  ];
  if (lesson.compare.length) {
    lines.push("**Comparisons:** " + lesson.compare.map(([a, b]) => `${itemName(a)} vs ${itemName(b)}`).join("; "), "");
  }
  if (lesson.images.length) {
    lines.push("**Lesson photos**", "", `| ${singular} | Caption | Photo |`, "| --- | --- | --- |");
    for (const img of lesson.images)
      lines.push(`| ${img.item ? itemName(img.item) : "-"} | ${esc(img.caption)} | [view](${img.url}) |`);
    lines.push("");
  }
  if (lesson.sources.length) {
    lines.push("**Sources**", "", ...lesson.sources.map((s) => `- [${s.title}](${s.url})`), "");
  }
  lines.push(`**Quiz (${lesson.quiz.length} items)**`, "", ...lesson.quiz.map(quizLine), "");
  lines.push("<details><summary>Lesson text</summary>", "", lesson.body, "", "</details>", "");
  return lines.join("\n");
}

function itemSection(item: Item): string {
  const sources = new Map(item.sources.map((s) => [s.id, s]));
  const attrs = site.catalog.attributes
    .filter((a) => item.attributes[a.id])
    .map((a) => ` | **${a.label}:** ${item.attributes[a.id]}`)
    .join("");
  return [
    `### ${item.name}`,
    "",
    `- **Slug:** \`${item.slug}\` | **${categoryLabel}:** ${item.category}${attrs}`,
    `- **Review status:** ${status(item.reviewedBy, item.reviewedOn)}`,
    `- **Look-alikes:** ${item.lookAlikes.length ? item.lookAlikes.map(itemName).join(", ") : "none"}`,
    `- **Used in lessons:** ${
      lessons
        .filter((l) => l.items.includes(item.slug))
        .map((l) => `\`${l.id}\``)
        .join(", ") || "none"
    }`,
    "",
    "| Identifying trait | Source |",
    "| --- | --- |",
    ...item.traits.map((t) => {
      const s = sources.get(t.source);
      return `| ${esc(t.text)} | ${s ? `[${esc(s.title)}](${s.url})` : `MISSING (${t.source})`} |`;
    }),
    "",
    "| # | Pinned photo | Reviewed | Note |",
    "| --- | --- | --- | --- |",
    ...item.images.map((img, i) => `| ${i + 1} | [${img.url.split("/").pop()}](${img.url}) | ${img.reviewed ? "yes" : "**no**"} | ${esc(img.note)} |`),
    "",
  ].join("\n");
}

const allImages = items.flatMap((b) => b.images);
const out = [
  `# ${curriculum.title} - Content Audit Report`,
  "",
  "_Generated by `npm run audit` from the files in `content/`. Do not edit by hand; edit the content files and regenerate._",
  "",
  "## Summary",
  "",
  `- Units: ${curriculum.units.length}`,
  `- Lessons: ${lessons.length} (${lessons.filter((l) => l.reviewedBy).length} reviewed)`,
  ...(site.catalog.enabled
    ? [
        `- ${Plural}: ${items.length} (${items.filter((b) => b.reviewedBy).length} reviewed)`,
        `- Pinned photos: ${allImages.length} (${allImages.filter((i) => i.reviewed).length} reviewed)`,
      ]
    : []),
  `- Integrity problems: ${problems.length ? problems.length : "none"}`,
  ...problems.map((p) => `  - ${p}`),
  "",
  "## How to audit",
  "",
  "1. For each lesson, check that the text and quiz answers are accurate and match the objectives.",
  `2. For each ${singular}, check every trait against its cited source.`,
  `3. Open each pinned photo and confirm it clearly shows that ${singular}. Set \`reviewed: true\`, or replace the photo.`,
  "4. Fill in `reviewedBy` and `reviewedOn`, then rerun `npm run validate` and `npm run audit`.",
  "",
  "## Curriculum",
  "",
  ...curriculum.units.flatMap((u) => [
    `### ${u.title}`,
    "",
    u.description,
    "",
    ...u.lessons.map((id, i) => `${i + 1}. ${content.lessons.get(id)?.title ?? id} (\`${id}\`)`),
    "",
  ]),
  "## Lessons",
  "",
  ...content.lessonOrder.map((id) => lessonSection(content.lessons.get(id)!)),
  ...(items.length ? [`## ${Plural}`, "", ...[...items].sort((a, b) => a.name.localeCompare(b.name)).map(itemSection)] : []),
].join("\n");

const dir = join(ROOT, "docs", "audit");
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "content-report.md"), out);
console.log(`Wrote docs/audit/content-report.md (${lessons.length} lessons, ${items.length} ${plural}).`);
