import { useState } from "react";
import { allItems } from "../content/loader";
import { ItemCard } from "../components/ItemCard";
import { noun, site } from "../lib/site";

export function ItemsPage() {
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const items = allItems().filter(
    (b) => (category === "all" || b.category === category) && b.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <div>
      <h1>{noun.One} guide</h1>
      <p className="muted">Every {noun.one} in the course, with its identifying traits and sources.</p>
      <div className="card controls row">
        <label>
          Search <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <label>
          {site.catalog.categoryLabel}{" "}
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All</option>
            {site.catalog.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {items.length === 0 && <p>No {noun.many} match.</p>}
      {items.map((b) => (
        <ItemCard key={b.slug} item={b} />
      ))}
    </div>
  );
}
