import { describe, expect, it } from "vitest";
import {
  allCards,
  availableModes,
  cardsForMode,
  itemModeFor,
  knownDueCards,
  lessonCards,
  studiedCards,
  studiedItems,
} from "../src/lib/learning";
import { ProgressStore, memoryStorage } from "../src/lib/progress";
import { catalogCourse, textOnlyCourse } from "./fixtures";

describe("cards per lesson", () => {
  it("collects items, quiz items and text questions", () => {
    const { content } = catalogCourse();
    expect(lessonCards(content.lessons.get("one-02")!)).toEqual([
      "item:ee",
      "item:ff",
      "q:one-02:2",
      "q:one-02:3",
      "q:one-02:4",
    ]);
  });

  it("only counts completed lessons as studied", () => {
    const { content } = catalogCourse();
    const store = new ProgressStore(memoryStorage());
    expect(studiedCards(content, store.getSnapshot())).toEqual([]);
    store.setManualCompletion("one-01", true);
    expect(studiedCards(content, store.getSnapshot())).toEqual(["item:aa", "item:bb", "q:one-01:3", "q:one-01:4"]);
    expect(studiedItems(content, store.getSnapshot()).map((b) => b.slug)).toEqual(["aa", "bb"]);
  });

  it("includes untaught catalog items in the whole-course card list", () => {
    const { content } = catalogCourse();
    expect(allCards(content)).toContain("item:hh");
  });
});

describe("practice modes", () => {
  it("offers only lesson questions when the catalog is disabled", () => {
    expect(availableModes(false)).toEqual(["questions"]);
    expect(availableModes(true)).toContain("identify");
  });

  it("filters cards by mode", () => {
    const cards = ["item:aa", "q:x-01:0", "item:bb"];
    expect(cardsForMode(cards, "identify")).toEqual(["item:aa", "item:bb"]);
    expect(cardsForMode(cards, "questions")).toEqual(["q:x-01:0"]);
    expect(cardsForMode(cards, "all")).toEqual(cards);
    expect(itemModeFor("find")).toBe("find");
    expect(itemModeFor("all")).toBe("mixed");
  });
});

describe("text-only course", () => {
  it("feeds text questions into review", () => {
    const { content } = textOnlyCourse();
    const store = new ProgressStore(memoryStorage());
    store.setManualCompletion("t-01", true);
    const studied = studiedCards(content, store.getSnapshot());
    expect(cardsForMode(studied, "questions")).toHaveLength(5);

    store.recordAnswer("q:t-01:0", false);
    store.recordAnswer("q:t-01:1", true);
    store.recordAnswer("q:removed-01:0", false);
    expect(knownDueCards(content, store.getSnapshot())).toEqual(["q:t-01:0"]);
  });
});
