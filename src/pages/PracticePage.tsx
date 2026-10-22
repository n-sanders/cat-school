import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router";
import { allItems, content } from "../content/loader";
import { useProgress } from "../hooks/useProgress";
import { PracticeSession } from "../components/PracticeSession";
import {
  allCards,
  availableModes,
  cardsForMode,
  itemModeFor,
  studiedCards,
  studiedItems,
  type PracticeMode,
} from "../lib/learning";
import { getProgressStore, accuracy } from "../lib/progress";
import { pickPracticeTarget } from "../lib/quiz";
import { noun, site } from "../lib/site";

type Scope = "studied" | "all";

const MODE_LABELS: Record<PracticeMode, string> = {
  identify: `Identify: image → ${noun.one} name`,
  find: `Find: ${noun.one} name → image`,
  mixed: `Mixed ${noun.one} questions`,
  questions: "Lesson questions",
  all: "Everything",
};

export function PracticePage() {
  const { progress } = useProgress();
  const modes = availableModes(site.catalog.enabled);
  const [mode, setMode] = useState<PracticeMode>(modes[0]);
  const [scope, setScope] = useState<Scope>("studied");
  const [started, setStarted] = useState(false);

  const studied = studiedCards(content, progress);
  const studiedKey = cardsForMode(studied, mode).join(",");
  // Only rebuild the card list when the set of cards changes, not on every answer.
  const cards = useMemo(
    () => (scope === "all" ? cardsForMode(allCards(content), mode) : studiedKey ? studiedKey.split(",") : []),
    [scope, mode, studiedKey],
  );
  const studiedItemSlugs = studiedItems(content, progress)
    .map((b) => b.slug)
    .join(",");
  const pool = useMemo(
    () =>
      scope === "studied" && studiedItemSlugs
        ? studiedItemSlugs.split(",").map((s) => content.items.get(s)!)
        : allItems(),
    [scope, studiedItemSlugs],
  );

  const nextTarget = useCallback(
    (previous: string | undefined) =>
      cards.length ? pickPracticeTarget(cards, (c) => accuracy(getProgressStore().getSnapshot(), c), previous) : null,
    [cards],
  );

  const totalForMode = cardsForMode(allCards(content), mode).length;
  const firstLesson = content.lessons.get(content.lessonOrder[0])!;

  return (
    <div>
      <h1>Practice</h1>
      <p className="muted">
        Practice as much as you like. Questions you get wrong come up more often.
      </p>

      <div className="card controls">
        {modes.length > 1 && (
          <fieldset>
            <legend>Question type</legend>
            {modes.map((value) => (
              <label key={value}>
                <input
                  type="radio"
                  name="mode"
                  checked={mode === value}
                  onChange={() => {
                    setMode(value);
                    setStarted(false);
                  }}
                />{" "}
                {MODE_LABELS[value]}
              </label>
            ))}
          </fieldset>
        )}
        <fieldset>
          <legend>Questions from</legend>
          <label>
            <input type="radio" name="scope" checked={scope === "studied"} onChange={() => setScope("studied")} />{" "}
            Lessons I have completed ({studiedKey ? studiedKey.split(",").length : 0})
          </label>
          <label>
            <input type="radio" name="scope" checked={scope === "all"} onChange={() => setScope("all")} /> The whole
            course ({totalForMode}, challenge)
          </label>
        </fieldset>
        {!started && (
          <button className="btn primary" onClick={() => setStarted(true)} disabled={cards.length < 1}>
            Start practicing
          </button>
        )}
      </div>

      {cards.length < 1 ? (
        <div className="card">
          Complete a lesson (starting with <Link to={`/lesson/${firstLesson.id}`}>{firstLesson.title}</Link>) to
          practice what it taught, or choose <em>The whole course</em>.
        </div>
      ) : (
        started && (
          <PracticeSession key={`${mode}:${scope}`} pool={pool} itemMode={itemModeFor(mode)} nextTarget={nextTarget} />
        )
      )}
    </div>
  );
}
