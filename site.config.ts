/**
 * Everything that makes this site about one particular topic, apart from the
 * files in content/. Edit this file (and replace content/) to start a new topic.
 */
import type { Item } from "./src/content/schema.ts";

export interface Category {
  id: string;
  label: string;
}

export interface CatalogConfig {
  /** Turn off for courses with no items to recognize; lessons then use text questions only. */
  enabled: boolean;
  /** What one catalog entry is called, in lower case ("rocket", "breed"). */
  singular: string;
  plural: string;
  /** Label for the category field ("Group", "Family"). */
  categoryLabel: string;
  categories: Category[];
  /** Extra per-item fields shown as chips, in this order. Items may only use these keys. */
  attributes: Category[];
}

export type ImagesConfig =
  | { provider: "pinned" }
  | {
      /** Practice and Review fetch a fresh photo list per item, falling back to pinned photos. */
      provider: "live";
      fetchList: (item: Item) => Promise<string[]>;
    };

export interface SiteConfig {
  name: string;
  /** Lower-case, used for the progress storage key and backup file names. */
  slug: string;
  emoji: string;
  /** Home page heading and browser tab subtitle. */
  tagline: string;
  /** Home page intro paragraph. */
  description: string;
  /** Footer text, as Markdown. */
  footer: string;
  catalog: CatalogConfig;
  images: ImagesConfig;
  /** Short credit shown under each photo. */
  imageCredit: (url: string) => string;
}

const config: SiteConfig = {
  name: "StudyKit",
  slug: "studykit",
  emoji: "📚",
  tagline: "Learn to recognize basic shapes",
  description: "Work through short lessons, then practice until you can name every shape at a glance.",
  footer:
    "Example course for the StudyKit skeleton. Shape facts cite [Wikipedia](https://en.wikipedia.org/). Progress is saved only in this browser.",
  catalog: {
    enabled: true,
    singular: "shape",
    plural: "shapes",
    categoryLabel: "Kind",
    categories: [
      { id: "curved", label: "Curved" },
      { id: "polygon", label: "Polygon" },
    ],
    attributes: [{ id: "sides", label: "Sides" }],
  },
  images: { provider: "pinned" },
  imageCredit: (url) => (url.startsWith("images/") ? "This site" : new URL(url).hostname),
};

export default config;
