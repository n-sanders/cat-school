import type { Item } from "../content/schema";
import { ItemImage } from "./ItemImage";

export function CompareItems({ a, b }: { a: Item; b: Item }) {
  return (
    <div className="card compare">
      <h3>
        Spot the difference: {a.name} vs {b.name}
      </h3>
      <div className="compare-grid">
        {[a, b].map((item) => (
          <div key={item.slug} className="compare-col">
            <h4>{item.name}</h4>
            <ItemImage src={item.images[0].url} alt={item.name} />
            <ul className="traits">
              {item.traits.map((t) => (
                <li key={t.text}>{t.text}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
