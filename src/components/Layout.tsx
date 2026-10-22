import { useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import Markdown from "react-markdown";
import { content } from "../content/loader";
import { useProgress } from "../hooks/useProgress";
import { knownDueCards } from "../lib/learning";
import { noun, site } from "../lib/site";

export function Layout() {
  const { progress, store } = useProgress();
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  const due = knownDueCards(content, progress).length;
  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <NavLink to="/" className="brand">
          <span aria-hidden="true">{site.emoji}</span> {site.name}
        </NavLink>
        <nav aria-label="Main">
          <NavLink to="/learn">Learn</NavLink>
          <NavLink to="/practice">Practice</NavLink>
          <NavLink to="/review">
            Review{due > 0 && <span className="badge" aria-label={`${due} due`}>{due}</span>}
          </NavLink>
          {site.catalog.enabled && <NavLink to="/catalog">{noun.Many}</NavLink>}
          <NavLink to="/progress">Progress</NavLink>
        </nav>
      </header>
      {store.loadError && (
        <div className="banner warning" role="alert">
          {store.loadError} <NavLink to="/progress">Go to Progress</NavLink>
        </div>
      )}
      <main id="main" className="site-main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <Markdown>{site.footer}</Markdown>
      </footer>
    </div>
  );
}
