import { useCallback, useEffect, useRef, useState } from "react";
import type { Item } from "../content/schema";
import { content } from "../content/loader";
import { useProgress } from "../hooks/useProgress";
import { useImageRepair } from "../hooks/useImageRepair";
import { practiceImages } from "../lib/learning";
import { buildCardQuestion, type ItemMode, type Question } from "../lib/quiz";
import { QuizQuestion } from "./QuizQuestion";

interface Props {
  /** Items used for wrong answers. */
  pool: Item[];
  /** How item cards are asked. Text-question cards are always asked as written. */
  itemMode: ItemMode;
  /** Returns the next card to ask about, or null when the session is over. */
  nextTarget: (previous: string | undefined) => string | null;
  /** Called after each answer, after progress has been recorded. */
  onAnswered?: (card: string, correct: boolean) => void;
  emptyMessage?: React.ReactNode;
}

function preload(q: Question) {
  const urls = q.kind === "identify" ? [q.image] : q.kind === "find" ? q.choices.map((c) => c.image) : [];
  for (const u of urls) new Image().src = u;
}

export function PracticeSession({ pool, itemMode, nextTarget, onAnswered, emptyMessage }: Props) {
  const { store } = useProgress();
  const [current, setCurrent] = useState<Question | null | undefined>(undefined);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const upcoming = useRef<Promise<Question | null> | null>(null);
  const repair = useImageRepair(practiceImages);

  const build = useCallback(
    async (previous: string | undefined): Promise<Question | null> => {
      // Skip cards whose lesson or item has since been removed from the content.
      let card = nextTarget(previous);
      for (let tries = 0; card && tries < 50; tries++, card = nextTarget(card)) {
        const q = await buildCardQuestion(card, { content, pool, images: practiceImages, itemMode });
        if (q) {
          preload(q);
          return q;
        }
      }
      return null;
    },
    [nextTarget, itemMode, pool],
  );

  // nextTarget may consume a queue, so the first question is built once per `build`
  // even when React runs this effect twice.
  const first = useRef<{ build: typeof build; question: Promise<Question | null> } | null>(null);
  useEffect(() => {
    let cancelled = false;
    setCurrent(undefined);
    setScore({ correct: 0, total: 0 });
    if (first.current?.build !== build) first.current = { build, question: build(undefined) };
    first.current.question.then((q) => !cancelled && setCurrent(q));
    return () => {
      cancelled = true;
    };
  }, [build]);

  if (current === undefined) return <p>Preparing questions...</p>;
  if (current === null) return <div className="card">{emptyMessage ?? "Nothing to practice right now."}</div>;

  const q = current;
  return (
    <div className="card quiz">
      <p className="quiz-progress">
        This session: {score.correct} correct out of {score.total}
      </p>
      <QuizQuestion
        key={q.key}
        question={q}
        onAnswered={(ok) => {
          store.recordAnswer(q.card, ok);
          setScore((s) => ({ correct: s.correct + (ok ? 1 : 0), total: s.total + 1 }));
          onAnswered?.(q.card, ok);
          upcoming.current = build(q.card);
        }}
        onNext={async () => {
          const next = await (upcoming.current ?? build(q.card));
          upcoming.current = null;
          setCurrent(next);
        }}
        onImageError={async (url) => {
          const fixed = await repair(q, url);
          if (fixed) setCurrent((c) => (c?.key === q.key ? fixed : c));
        }}
      />
    </div>
  );
}
