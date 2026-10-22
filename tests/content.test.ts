import { describe, expect, it } from "vitest";
import site from "../site.config";
import { content } from "../src/content/loader";
import { checkIntegrity, parseItem, parseLesson } from "../src/content/parse";
import type { Item, Lesson } from "../src/content/schema";
import { catalogCourse, textOnlyCourse } from "./fixtures";

describe("shipped content", () => {
  it("loads every curriculum lesson", () => {
    expect(content.lessonOrder.length).toBe(content.lessons.size);
    for (const id of content.lessonOrder) expect(content.lessons.get(id)?.body.length).toBeGreaterThan(0);
  });

  it("starts with a lesson that has no prerequisites", () => {
    expect(content.lessons.get(content.lessonOrder[0])!.prerequisites).toEqual([]);
  });

  it("teaches every catalog item in at least one lesson", () => {
    const taught = new Set([...content.lessons.values()].flatMap((l) => l.items));
    for (const slug of content.items.keys()) expect(taught, slug).toContain(slug);
  });

  it("passes the integrity checks", () => {
    const problems = checkIntegrity(content.curriculum, [...content.items.values()], [...content.lessons.values()], {
      catalogEnabled: site.catalog.enabled,
    });
    expect(problems).toEqual([]);
  });
});

describe("integrity checks", () => {
  const { curriculum, items, lessons } = catalogCourse();

  it("passes for a consistent course", () => {
    expect(checkIntegrity(curriculum, items, lessons)).toEqual([]);
  });

  it("catches unknown items, bad prerequisites and cycles", () => {
    const broken: Lesson[] = lessons.map((l) => {
      if (l.id === "one-01") return { ...l, prerequisites: ["one-02"], items: ["not-an-item"] };
      if (l.id === "one-02") return { ...l, prerequisites: ["one-01"] };
      return l;
    });
    const problems = checkIntegrity(curriculum, items, broken).join("\n");
    expect(problems).toMatch(/unknown item 'not-an-item'/);
    expect(problems).toMatch(/comes later in the curriculum/);
    expect(problems).toMatch(/prerequisite cycle/);
  });

  it("catches traits that cite a missing source", () => {
    const wrong: Item = { ...items[0], traits: [{ text: "Made up", source: "nowhere" }] };
    const problems = checkIntegrity(curriculum, [wrong, ...items.slice(1)], lessons);
    expect(problems.join("\n")).toMatch(/unknown source 'nowhere'/);
  });

  it("catches answers listed as distractors", () => {
    const broken = lessons.map((l) =>
      l.id === "one-01" ? { ...l, quiz: [{ type: "find" as const, item: "aa", distractors: ["aa"] }, ...l.quiz] } : l,
    );
    expect(checkIntegrity(curriculum, items, broken).join("\n")).toMatch(/lists the answer as a distractor/);
  });
});

describe("integrity checks with the catalog disabled", () => {
  it("accepts a text-only course", () => {
    const { curriculum, lessons } = textOnlyCourse();
    expect(checkIntegrity(curriculum, [], lessons, { catalogEnabled: false })).toEqual([]);
  });

  it("rejects item files and photo quiz entries", () => {
    const { curriculum, items, lessons } = catalogCourse();
    const problems = checkIntegrity(curriculum, items, lessons, { catalogEnabled: false }).join("\n");
    expect(problems).toMatch(/catalog is disabled in site.config.ts but 8 item file/);
    expect(problems).toMatch(/quiz\[0\] is a 'identify' item but the catalog is disabled/);
  });
});

describe("schema validation", () => {
  const category = site.catalog.categories[0]?.id;
  const itemYaml = (extra: string) =>
    `slug: x\nname: X\ncategory: ${category}\nsummary: Z\ntraits: [{ text: T, source: s }]\nsources: [{ id: s, title: S, url: "https://example.com/" }]\nimages: [{ url: "https://example.com/x.jpg" }]\n${extra}`;

  it.skipIf(!category)("accepts a valid item with https and local image paths", () => {
    expect(parseItem(itemYaml(""), "x.yaml").images[0].reviewed).toBe(false);
    expect(() =>
      parseItem(itemYaml("").replace("https://example.com/x.jpg", "images/x.jpg"), "x.yaml"),
    ).not.toThrow();
  });

  it.skipIf(!category)("rejects unknown categories, attributes and image paths", () => {
    expect(() => parseItem(itemYaml("").replace(`category: ${category}`, "category: nope"), "x.yaml")).toThrow(
      /categories in site.config.ts/,
    );
    expect(() => parseItem(itemYaml("attributes: { nope: '1' }"), "x.yaml")).toThrow(/attributes listed/);
    expect(() =>
      parseItem(itemYaml("").replace("https://example.com/x.jpg", "http://example.com/x.jpg"), "x.yaml"),
    ).toThrow(/https URL or a path/);
  });

  it("rejects an item without sources", () => {
    expect(() => parseItem("slug: x\nname: X\ncategory: c\nsummary: Z\ntraits: []\nsources: []\nimages: []\n", "x.yaml")).toThrow(
      /at least one source/,
    );
  });

  it("rejects a quiz question whose answer is not a choice", () => {
    const md = `---
id: x
title: X
unit: basics
summary: S
objectives: [O]
quiz:
  - { type: question, prompt: P, choices: [A, B], answer: C }
  - { type: identify, item: x }
  - { type: identify, item: x }
  - { type: identify, item: x }
  - { type: identify, item: x }
---
Body`;
    expect(() => parseLesson(md, "x.md")).toThrow(/answer must be one of the choices/);
  });

  it("rejects a lesson quiz with fewer than five items", () => {
    const md = `---
id: x
title: X
unit: basics
summary: S
objectives: [O]
quiz:
  - { type: identify, item: x }
  - { type: identify, item: x }
  - { type: identify, item: x }
  - { type: identify, item: x }
---
Body`;
    expect(() => parseLesson(md, "x.md")).toThrow(/at least five items/);
  });

  it("rejects a lesson without frontmatter", () => {
    expect(() => parseLesson("# Just text", "x.md")).toThrow(/frontmatter/);
  });
});
