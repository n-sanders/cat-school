import type { Item } from "../content/schema";
import { categoryLabel, site } from "../lib/site";
import { ItemImage } from "./ItemImage";

export function ItemFacts({ item }: { item: Item }) {
  const sources = new Map(item.sources.map((s) => [s.id, s]));
  return (
    <>
      <p className="item-meta">
        <span className="chip">
          {site.catalog.categoryLabel}: {categoryLabel(item.category)}
        </span>
        {site.catalog.attributes
          .filter((a) => item.attributes[a.id])
          .map((a) => (
            <span key={a.id} className="chip">
              {a.label}: {item.attributes[a.id]}
            </span>
          ))}
      </p>
      <p>{item.summary}</p>
      <ul className="traits">
        {item.traits.map((t) => {
          const s = sources.get(t.source);
          return (
            <li key={t.text}>
              {t.text}{" "}
              {s && (
                <a className="cite" href={s.url} target="_blank" rel="noreferrer" title={s.title}>
                  [source]
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function ItemCard({ item, showImages = true }: { item: Item; showImages?: boolean }) {
  return (
    <article className="card item-card" id={`item-${item.slug}`}>
      <h3>{item.name}</h3>
      <ItemFacts item={item} />
      {showImages && (
        <div className="gallery">
          {item.images.map((img, i) => (
            <ItemImage key={img.url} src={img.url} alt={`${item.name}, example image ${i + 1}`} />
          ))}
        </div>
      )}
    </article>
  );
}
