import { describe, expect, it } from "vitest";
import type { Item } from "../src/content/schema";
import { itemCard, parseCard, questionCard } from "../src/lib/cards";
import type { ImageSource } from "../src/lib/images";
import { liveImageSource } from "../src/lib/images";
import { seededRng } from "../src/lib/random";
import {
  buildCardQuestion,
  buildLessonQuiz,
  cardExists,
  cardLabel,
  isCorrect,
  pickDistractors,
  pickPracticeTarget,
} from "../src/lib/quiz";
import { ITEMS, catalogCourse, textOnlyCourse } from "./fixtures";

const bySlug = new Map(ITEMS.map((b) => [b.slug, b]));
const get = (slug: string) => bySlug.get(slug)!;
const firstPinned: ImageSource = (b, exclude) =>
  Promise.resolve(b.images.map((i) => i.url).find((u) => !exclude.has(u)) ?? b.images[0].url);

describe("pickDistractors", () => {
  it("prefers look-alikes, then the same category", () => {
    const pool = ["aa", "bb", "cc", "ee", "ff", "gg"].map(get);
    const picks = pickDistractors(get("aa"), pool, ITEMS, 3, [], seededRng(1)).map((b) => b.slug);
    expect(picks[0]).toBe("bb");
    expect(picks[1]).toBe("cc");
  });

  it("puts explicit distractors first and never includes the answer", () => {
    const picks = pickDistractors(get("aa"), [get("aa")], ITEMS, 3, ["hh", "aa"], seededRng(2));
    expect(picks[0].slug).toBe("hh");
    expect(picks.map((b) => b.slug)).not.toContain("aa");
    expect(new Set(picks.map((b) => b.slug)).size).toBe(3);
  });

  it("fills from the whole catalog when the pool is too small", () => {
    const picks = pickDistractors(get("ee"), [get("ee"), get("ff")], ITEMS, 3, [], seededRng(3));
    expect(picks).toHaveLength(3);
    expect(picks[0].slug).toBe("ff");
  });
});

describe("buildLessonQuiz", () => {
  const { content } = catalogCourse();

  it("builds one question per authored entry, each with the answer among 4 choices", async () => {
    for (const lesson of content.lessons.values()) {
      const qs = await buildLessonQuiz(lesson, content.items, firstPinned, seededRng(4));
      expect(qs).toHaveLength(lesson.quiz.length);
      for (const q of qs) {
        if (q.kind === "text") {
          expect(q.choices).toContain(q.answer);
          expect(isCorrect(q, q.answer)).toBe(true);
          continue;
        }
        expect(q.choices).toHaveLength(4);
        const slugs = q.choices.map((c) => ("item" in c ? c.item.slug : (c as Item).slug));
        expect(slugs).toContain(q.item.slug);
        expect(new Set(slugs).size).toBe(4);
        expect(isCorrect(q, q.item.slug)).toBe(true);
      }
    }
  });

  it("uses only pinned images from the right item, with distinct images per find question", async () => {
    const qs = await buildLessonQuiz(content.lessons.get("one-01")!, content.items, firstPinned, seededRng(5));
    for (const q of qs) {
      if (q.kind === "identify") expect(q.item.images.map((i) => i.url)).toContain(q.image);
      if (q.kind === "find") {
        for (const c of q.choices) expect(c.item.images.map((i) => i.url)).toContain(c.image);
        expect(new Set(q.choices.map((c) => c.image)).size).toBe(4);
      }
    }
  });

  it("tags item questions with item cards and text questions with question cards", async () => {
    const qs = await buildLessonQuiz(content.lessons.get("one-01")!, content.items, firstPinned, seededRng(6));
    expect(qs.map((q) => q.card)).toEqual([
      "item:aa",
      "item:bb",
      "item:aa",
      "q:one-01:3",
      "q:one-01:4",
    ]);
  });
});

describe("cards", () => {
  it("round-trips card keys", () => {
    expect(parseCard(itemCard("falcon-9"))).toEqual({ kind: "item", slug: "falcon-9" });
    expect(parseCard(questionCard("unit-01-intro", 12))).toEqual({ kind: "question", lessonId: "unit-01-intro", index: 12 });
    expect(parseCard("other:x")).toBeNull();
  });

  it("rebuilds text questions from their card key", async () => {
    const { content } = textOnlyCourse();
    const q = await buildCardQuestion("q:t-02:1", { content, pool: [], images: firstPinned, itemMode: "mixed" });
    expect(q).toMatchObject({ kind: "text", card: "q:t-02:1", prompt: "Q7", answer: "B" });
    expect(cardLabel(content, "q:t-02:1")).toBe("Q7");
  });

  it("rebuilds item questions in the requested mode", async () => {
    const { content } = catalogCourse();
    const ctx = { content, pool: ITEMS, images: firstPinned, rng: seededRng(8) };
    expect((await buildCardQuestion("item:ee", { ...ctx, itemMode: "identify" }))?.kind).toBe("identify");
    expect((await buildCardQuestion("item:ee", { ...ctx, itemMode: "find" }))?.kind).toBe("find");
  });

  it("treats cards for removed content as missing", async () => {
    const { content } = catalogCourse();
    const ctx = { content, pool: ITEMS, images: firstPinned, itemMode: "mixed" as const };
    for (const card of ["item:gone", "q:gone-01:0", "q:one-01:0", "q:one-01:99"]) {
      expect(cardExists(content, card), card).toBe(false);
      expect(await buildCardQuestion(card, ctx), card).toBeNull();
    }
    expect(cardExists(content, "q:one-01:3")).toBe(true);
  });
});

describe("liveImageSource", () => {
  it("uses the live list, and falls back to pinned images when fetching fails", async () => {
    const live = liveImageSource(async (b) => (b.slug === "aa" ? ["https://live.example.com/aa.jpg"] : Promise.reject(new Error("down"))));
    expect(await live(get("aa"), new Set())).toBe("https://live.example.com/aa.jpg");
    expect(get("bb").images.map((i) => i.url)).toContain(await live(get("bb"), new Set()));
  });
});

describe("pickPracticeTarget", () => {
  it("avoids repeating the previous card", () => {
    const cards = ["item:aa", "q:x-01:0"];
    for (let i = 0; i < 20; i++) {
      expect(pickPracticeTarget(cards, () => undefined, "item:aa", seededRng(i))).toBe("q:x-01:0");
    }
  });

  it("favors cards with low accuracy", () => {
    const cards = ["item:aa", "item:bb"];
    const rng = seededRng(7);
    let misses = 0;
    for (let i = 0; i < 1000; i++) {
      if (pickPracticeTarget(cards, (c) => (c === "item:aa" ? 0 : 1), undefined, rng) === "item:aa") misses++;
    }
    expect(misses).toBeGreaterThan(700);
  });
});
