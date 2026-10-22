import type { Content } from "../content/parse";
import type { Item, Lesson, QuizItem } from "../content/schema";
import { itemCard, parseCard, questionCard } from "./cards";
import type { ImageSource } from "./images";
import { pickRandom, shuffle, type Rng } from "./random";

/** Every question records its answer against `card` (see lib/cards.ts); `key` is unique per question shown. */
export type Question =
  | { kind: "identify"; key: string; card: string; item: Item; image: string; choices: Item[] }
  | { kind: "find"; key: string; card: string; item: Item; choices: { item: Item; image: string }[] }
  | {
      kind: "text";
      key: string;
      card: string;
      prompt: string;
      choices: string[];
      answer: string;
      explanation?: string;
    };

export type ItemMode = "identify" | "find" | "mixed";

/**
 * Picks wrong answers that are plausible rather than random. Tiers, in order:
 * explicit distractors, look-alikes, same category, other items in the pool,
 * then anything else. Items are shuffled within each tier.
 */
export function pickDistractors(
  target: Item,
  pool: Item[],
  all: Item[],
  count = 3,
  explicit: string[] = [],
  rng: Rng = Math.random,
): Item[] {
  const bySlug = new Map(all.map((b) => [b.slug, b]));
  const poolSlugs = new Set(pool.map((b) => b.slug));
  const isLookAlike = (b: Item) => target.lookAlikes.includes(b.slug) || b.lookAlikes.includes(target.slug);
  const tiers: Item[][] = [
    explicit.map((s) => bySlug.get(s)).filter((b): b is Item => !!b),
    shuffle(pool.filter(isLookAlike), rng),
    shuffle(pool.filter((b) => b.category === target.category), rng),
    shuffle(pool, rng),
    shuffle(all.filter((b) => !poolSlugs.has(b.slug) && isLookAlike(b)), rng),
    shuffle(all.filter((b) => !poolSlugs.has(b.slug) && b.category === target.category), rng),
    shuffle(all, rng),
  ];
  const chosen = new Map<string, Item>();
  for (const tier of tiers) {
    for (const b of tier) {
      if (chosen.size >= count) break;
      if (b.slug !== target.slug) chosen.set(b.slug, b);
    }
  }
  return [...chosen.values()];
}

async function buildIdentify(
  key: string,
  item: Item,
  distractors: Item[],
  images: ImageSource,
  rng: Rng,
  fixedImage?: string,
): Promise<Question> {
  const image = fixedImage ?? (await images(item, new Set()));
  return { kind: "identify", key, card: itemCard(item.slug), item, image, choices: shuffle([item, ...distractors], rng) };
}

async function buildFind(key: string, item: Item, distractors: Item[], images: ImageSource, rng: Rng): Promise<Question> {
  const used = new Set<string>();
  const choices = [];
  for (const b of shuffle([item, ...distractors], rng)) {
    const image = await images(b, used);
    used.add(image);
    choices.push({ item: b, image });
  }
  return { kind: "find", key, card: itemCard(item.slug), item, choices };
}

function buildText(key: string, lessonId: string, index: number, q: Extract<QuizItem, { type: "question" }>, rng: Rng): Question {
  return {
    kind: "text",
    key,
    card: questionCard(lessonId, index),
    prompt: q.prompt,
    choices: shuffle(q.choices, rng),
    answer: q.answer,
    explanation: q.explanation,
  };
}

/** Turns a lesson's authored quiz items into concrete questions using pinned photos. */
export async function buildLessonQuiz(
  lesson: Lesson,
  items: Map<string, Item>,
  images: ImageSource,
  rng: Rng = Math.random,
): Promise<Question[]> {
  const all = [...items.values()];
  const pool = lesson.items.map((s) => items.get(s)!).filter(Boolean);
  const questions: Question[] = [];
  const usedTargetImages = new Set<string>();
  for (const [i, q] of lesson.quiz.entries()) {
    const key = `${lesson.id}:${i}`;
    if (q.type === "question") {
      questions.push(buildText(key, lesson.id, i, q, rng));
      continue;
    }
    const item = items.get(q.item)!;
    const distractors = pickDistractors(item, pool, all, 3, q.distractors, rng);
    if (q.type === "identify") {
      // Avoid showing the same photo twice when an item appears in several quiz entries.
      const image = q.image ?? (await images(item, usedTargetImages));
      usedTargetImages.add(image);
      questions.push(await buildIdentify(key, item, distractors, images, rng, image));
    } else {
      questions.push(await buildFind(key, item, distractors, images, rng));
    }
  }
  return questions;
}

export interface CardQuestionContext {
  content: Content;
  /** Items used for wrong answers before falling back to the whole catalog. */
  pool: Item[];
  images: ImageSource;
  itemMode: ItemMode;
  rng?: Rng;
}

/** Builds a fresh question for a card, or null if the card no longer exists in the content. */
export async function buildCardQuestion(card: string, ctx: CardQuestionContext): Promise<Question | null> {
  const rng = ctx.rng ?? Math.random;
  const ref = parseCard(card);
  const key = `${card}:${Math.floor(rng() * 1e9)}`;
  if (ref?.kind === "item") {
    const item = ctx.content.items.get(ref.slug);
    if (!item) return null;
    const distractors = pickDistractors(item, ctx.pool, [...ctx.content.items.values()], 3, [], rng);
    const kind = ctx.itemMode === "mixed" ? (rng() < 0.5 ? "identify" : "find") : ctx.itemMode;
    return kind === "identify"
      ? buildIdentify(key, item, distractors, ctx.images, rng)
      : buildFind(key, item, distractors, ctx.images, rng);
  }
  if (ref?.kind === "question") {
    const q = ctx.content.lessons.get(ref.lessonId)?.quiz[ref.index];
    return q?.type === "question" ? buildText(key, ref.lessonId, ref.index, q, rng) : null;
  }
  return null;
}

/** True if the card refers to an item or text question that exists in the content. */
export function cardExists(content: Content, card: string): boolean {
  const ref = parseCard(card);
  if (ref?.kind === "item") return content.items.has(ref.slug);
  if (ref?.kind === "question") return content.lessons.get(ref.lessonId)?.quiz[ref.index]?.type === "question";
  return false;
}

/** A short human-readable name for a card: the item name or the question prompt. */
export function cardLabel(content: Content, card: string): string {
  const ref = parseCard(card);
  if (ref?.kind === "item") return content.items.get(ref.slug)?.name ?? card;
  if (ref?.kind === "question") {
    const q = content.lessons.get(ref.lessonId)?.quiz[ref.index];
    return q?.type === "question" ? q.prompt : card;
  }
  return card;
}

/** Chooses a practice card, favoring cards the learner gets wrong more often. */
export function pickPracticeTarget(
  cards: string[],
  accuracy: (card: string) => number | undefined,
  avoid: string | undefined,
  rng: Rng = Math.random,
): string {
  const candidates = cards.length > 1 ? cards.filter((c) => c !== avoid) : cards;
  const weights = candidates.map((c) => {
    const acc = accuracy(c);
    return acc === undefined ? 1.5 : 0.5 + (1 - acc) * 2;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (const [i, w] of weights.entries()) {
    r -= w;
    if (r <= 0) return candidates[i];
  }
  return pickRandom(candidates, rng);
}

export function isCorrect(question: Question, answer: string): boolean {
  return question.kind === "text" ? answer === question.answer : answer === question.item.slug;
}
