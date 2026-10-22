import { Link } from "react-router";
import { content } from "../content/loader";
import { useProgress } from "../hooks/useProgress";
import { completedCount, knownDueCards, nextLessonId, studiedCards, studiedItems } from "../lib/learning";
import { noun, site } from "../lib/site";

export function HomePage() {
  const { progress } = useProgress();
  const done = completedCount(content, progress);
  const total = content.lessonOrder.length;
  const next = nextLessonId(content, progress);
  const nextLesson = next ? content.lessons.get(next) : undefined;
  const studied = site.catalog.enabled
    ? { count: studiedItems(content, progress).length, label: `${noun.many} studied` }
    : { count: studiedCards(content, progress).length, label: "questions studied" };
  const due = knownDueCards(content, progress).length;

  return (
    <div className="home">
      <section className="hero">
        <h1>{site.tagline}</h1>
        <p>{site.description}</p>
        {nextLesson ? (
          <Link className="btn primary large" to={`/lesson/${nextLesson.id}`}>
            {done === 0 ? "Start the first lesson" : `Continue: ${nextLesson.title}`}
          </Link>
        ) : (
          <p className="banner good">You have completed every lesson in {site.name}. Congratulations!</p>
        )}
      </section>

      <section className="stats" aria-label="Your progress">
        <div className="stat">
          <span className="stat-value">
            {done}/{total}
          </span>
          <span className="stat-label">lessons completed</span>
          <div className="meter" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total}>
            <div style={{ width: `${(done / total) * 100}%` }} />
          </div>
        </div>
        <div className="stat">
          <span className="stat-value">{studied.count}</span>
          <span className="stat-label">{studied.label}</span>
          <Link to="/practice">Practice them</Link>
        </div>
        <div className="stat">
          <span className="stat-value">{due}</span>
          <span className="stat-label">due for review</span>
          <Link to="/review">Start review</Link>
        </div>
      </section>

      <section className="how card">
        <h2>How {site.name} works</h2>
        <ol>
          <li>
            <strong>Learn.</strong> Each lesson teaches a few ideas and ends with a short quiz. Pass the quiz to unlock
            the next lesson.
          </li>
          <li>
            <strong>Practice.</strong> Quiz yourself on what you have studied, as often as you like.
          </li>
          <li>
            <strong>Review.</strong> Questions you miss come back sooner, so you spend time where you need it.
          </li>
        </ol>
        <p className="muted">
          Lost your progress? Open any lesson or the <Link to="/progress">Progress</Link> page and use{" "}
          <em>Mark completed</em>.
        </p>
      </section>
    </div>
  );
}
