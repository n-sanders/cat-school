import type { Content } from "../content/parse";
import type { Item, Lesson } from "../content/schema";
import { itemCard, parseCard, questionCard } from "./cards";
import { liveImageSource, pinnedImages, type ImageSource } from "./images";
import { dueCards, isCompleted, lessonStatus, type Progress } from "./progress";
import { cardExists, type ItemMode } from "./quiz";
import { site } from "./site";

export { pinnedImages };
/** Images for Practice and Review: live photos if a provider is configured, otherwise pinned ones. */
export const practiceImages: ImageSource =
  site.images.provider === "live" ? liveImageSource(site.images.fetchList) : pinnedImages;

/** Items taught in lessons the learner has completed (by quiz or by hand). */
export function studiedItems(content: Content, progress: Progress): Item[] {
  const slugs = new Set<string>();
  for (const id of content.lessonOrder) {
    if (isCompleted(progress, id)) content.lessons.get(id)!.items.forEach((s) => slugs.add(s));
  }
  return [...slugs].map((s) => content.items.get(s)!).sort((a, b) => a.name.localeCompare(b.name));
}

/** Every card a lesson teaches: its items, items its quiz asks about, and its text questions. */
export function lessonCards(lesson: Lesson): string[] {
  const cards = new Set(lesson.items.map(itemCard));
  lesson.quiz.forEach((q, i) => cards.add(q.type === "question" ? questionCard(lesson.id, i) : itemCard(q.item)));
  return [...cards];
}

/** Cards from completed lessons, in curriculum order. */
export function studiedCards(content: Content, progress: Progress): string[] {
  const cards = new Set<string>();
  for (const id of content.lessonOrder) {
    if (isCompleted(progress, id)) lessonCards(content.lessons.get(id)!).forEach((c) => cards.add(c));
  }
  return [...cards];
}

export function allCards(content: Content): string[] {
  const cards = new Set<string>();
  for (const id of content.lessonOrder) lessonCards(content.lessons.get(id)!).forEach((c) => cards.add(c));
  for (const slug of content.items.keys()) cards.add(itemCard(slug));
  return [...cards];
}

/** Due cards that still exist in the content (old progress may mention removed lessons or items). */
export function knownDueCards(content: Content, progress: Progress, now?: Date): string[] {
  return dueCards(progress, now).filter((c) => cardExists(content, c));
}

export type PracticeMode = "identify" | "find" | "mixed" | "questions" | "all";

/** Practice modes offered to the learner; photo modes need the catalog. */
export function availableModes(catalogEnabled: boolean): PracticeMode[] {
  return catalogEnabled ? ["identify", "find", "mixed", "questions", "all"] : ["questions"];
}

/** Keeps only the cards a practice mode asks about. */
export function cardsForMode(cards: string[], mode: PracticeMode): string[] {
  return cards.filter((c) => {
    const kind = parseCard(c)?.kind;
    if (mode === "all") return true;
    if (mode === "questions") return kind === "question";
    return kind === "item";
  });
}

/** How item cards are asked in a practice mode. */
export function itemModeFor(mode: PracticeMode): ItemMode {
  return mode === "identify" || mode === "find" ? mode : "mixed";
}

/** The first lesson in curriculum order that is unlocked but not yet completed. */
export function nextLessonId(content: Content, progress: Progress): string | undefined {
  return content.lessonOrder.find((id) => lessonStatus(progress, content.lessons.get(id)!) === "available");
}

export function completedCount(content: Content, progress: Progress): number {
  return content.lessonOrder.filter((id) => isCompleted(progress, id)).length;
}
