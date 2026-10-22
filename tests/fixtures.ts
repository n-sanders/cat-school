import { buildContent, type Content } from "../src/content/parse";
import type { Curriculum, Item, Lesson, QuizItem } from "../src/content/schema";

export function item(slug: string, category = "a", lookAlikes: string[] = []): Item {
  return {
    slug,
    name: slug.toUpperCase(),
    category,
    attributes: {},
    summary: "S",
    traits: [{ text: `${slug} trait`, source: "src" }],
    lookAlikes,
    sources: [{ id: "src", title: "Source", url: "https://example.com/" }],
    images: [1, 2].map((n) => ({ url: `https://img.example.com/${slug}/${n}.jpg`, note: "", reviewed: true })),
    reviewedBy: "",
    reviewedOn: "",
  };
}

export function lesson(id: string, unit: string, opts: Partial<Lesson> = {}): Lesson {
  return {
    id,
    title: id,
    unit,
    summary: "S",
    prerequisites: [],
    objectives: ["O"],
    items: [],
    images: [],
    compare: [],
    sources: [],
    quiz: [],
    passMark: 0.8,
    reviewedBy: "",
    reviewedOn: "",
    body: "Body",
    file: `${id}.md`,
    ...opts,
  };
}

export const textQ = (prompt: string, answer = "A"): QuizItem => ({
  type: "question",
  prompt,
  choices: ["A", "B", "C"],
  answer,
});

/** Eight items in two categories, with a and b, and e and f, as look-alikes. */
export const ITEMS = [
  item("aa", "one", ["bb"]),
  item("bb", "one", ["aa"]),
  item("cc", "one"),
  item("dd", "one"),
  item("ee", "two", ["ff"]),
  item("ff", "two", ["ee"]),
  item("gg", "two"),
  item("hh", "two"),
];

export function catalogCourse(): { curriculum: Curriculum; items: Item[]; lessons: Lesson[]; content: Content } {
  const lessons = [
    lesson("one-01", "one", {
      items: ["aa", "bb"],
      quiz: [
        { type: "identify", item: "aa" },
        { type: "identify", item: "bb" },
        { type: "find", item: "aa" },
        textQ("Q1"),
        textQ("Q2"),
      ],
    }),
    lesson("one-02", "one", {
      prerequisites: ["one-01"],
      items: ["ee", "ff"],
      quiz: [
        { type: "identify", item: "ee" },
        { type: "find", item: "ff", distractors: ["hh"] },
        textQ("Q3"),
        textQ("Q4"),
        textQ("Q5"),
      ],
    }),
  ];
  const curriculum: Curriculum = {
    title: "Test",
    units: [{ id: "one", title: "One", description: "D", lessons: ["one-01", "one-02"] }],
  };
  return { curriculum, items: ITEMS, lessons, content: buildContent(curriculum, ITEMS, lessons) };
}

export function textOnlyCourse(): { curriculum: Curriculum; lessons: Lesson[]; content: Content } {
  const lessons = [
    lesson("t-01", "t", { quiz: ["Q1", "Q2", "Q3", "Q4", "Q5"].map((p) => textQ(p)) }),
    lesson("t-02", "t", { prerequisites: ["t-01"], quiz: ["Q6", "Q7", "Q8", "Q9", "Q10"].map((p) => textQ(p, "B")) }),
  ];
  const curriculum: Curriculum = {
    title: "Text",
    units: [{ id: "t", title: "T", description: "D", lessons: ["t-01", "t-02"] }],
  };
  return { curriculum, lessons, content: buildContent(curriculum, [], lessons) };
}
