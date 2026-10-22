import { Link } from "react-router";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { content } from "../content/loader";
import { useProgress } from "../hooks/useProgress";
import { LessonStatusToggle } from "../components/LessonStatusToggle";
import { StatusBadge } from "../components/StatusBadge";
import { lessonStatus } from "../lib/progress";

export function CurriculumPage() {
  const { progress } = useProgress();
  return (
    <div>
      <h1>{content.curriculum.title}</h1>
      {content.curriculum.intro && (
        <div className="muted">
          <Markdown remarkPlugins={[remarkGfm]}>{content.curriculum.intro}</Markdown>
        </div>
      )}
      {content.curriculum.units.map((unit) => {
        const lessons = unit.lessons.map((id) => content.lessons.get(id)!);
        const done = lessons.filter((l) => lessonStatus(progress, l) === "completed").length;
        return (
          <section key={unit.id} className="card unit">
            <header className="unit-header">
              <div>
                <h2>{unit.title}</h2>
                <p className="muted">{unit.description}</p>
              </div>
              <span className="unit-count">
                {done}/{lessons.length}
              </span>
            </header>
            <ol className="lesson-list">
              {lessons.map((lesson) => {
                const status = lessonStatus(progress, lesson);
                return (
                  <li key={lesson.id} className={`lesson-row ${status}`}>
                    <div className="lesson-row-main">
                      <Link to={`/lesson/${lesson.id}`}>{lesson.title}</Link>
                      <span className="muted small">{lesson.summary}</span>
                    </div>
                    <StatusBadge status={status} record={progress.lessons[lesson.id]} />
                    <LessonStatusToggle lesson={lesson} compact />
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
