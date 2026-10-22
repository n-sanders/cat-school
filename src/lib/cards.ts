/**
 * A "card" is one thing the learner is tested on and that spaced repetition tracks:
 * either a catalog item ("item:<slug>") or one text question in a lesson quiz
 * ("q:<lessonId>:<index>").
 */
export type CardRef = { kind: "item"; slug: string } | { kind: "question"; lessonId: string; index: number };

export const itemCard = (slug: string) => `item:${slug}`;
export const questionCard = (lessonId: string, index: number) => `q:${lessonId}:${index}`;

export function parseCard(key: string): CardRef | null {
  const item = /^item:([a-z0-9-]+)$/.exec(key);
  if (item) return { kind: "item", slug: item[1] };
  const q = /^q:([a-z0-9-]+):(\d+)$/.exec(key);
  if (q) return { kind: "question", lessonId: q[1], index: Number(q[2]) };
  return null;
}
