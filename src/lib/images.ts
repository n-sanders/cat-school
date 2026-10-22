import type { Item } from "../content/schema";
import { pickRandom, type Rng } from "./random";

/** Returns a photo URL for an item, avoiding URLs in `exclude` when possible. */
export type ImageSource = (item: Item, exclude: Set<string>) => Promise<string>;

function pickFresh(urls: string[], exclude: Set<string>, rng?: Rng): string {
  const fresh = urls.filter((u) => !exclude.has(u));
  return pickRandom(fresh.length ? fresh : urls, rng);
}

/** A random pinned (audited) photo of the item. */
export function randomPinnedImage(item: Item, exclude: Set<string> = new Set(), rng?: Rng): string {
  return pickFresh(
    item.images.map((i) => i.url),
    exclude,
    rng,
  );
}

export const pinnedImages: ImageSource = (item, exclude) => Promise.resolve(randomPinnedImage(item, exclude));

/**
 * Wraps a function that lists live photos for an item. Each list is fetched once
 * per session; if fetching fails or returns nothing, the item's pinned photos are used.
 */
export function liveImageSource(fetchList: (item: Item) => Promise<string[]>): ImageSource {
  const lists = new Map<string, Promise<string[]>>();
  const listFor = (item: Item) => {
    let list = lists.get(item.slug);
    if (!list) {
      const pinned = item.images.map((i) => i.url);
      list = fetchList(item)
        .then((urls) => (urls.length ? urls : pinned))
        .catch(() => {
          lists.delete(item.slug);
          return pinned;
        });
      lists.set(item.slug, list);
    }
    return list;
  };
  return async (item, exclude) => pickFresh(await listFor(item), exclude);
}
