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

const CAT_API = "https://api.thecatapi.com/v1";
/**
 * Free-tier key from .env, built into the public bundle. Without a key the API ignores
 * `breed_ids` and returns random cats, so Practice and Review then use pinned photos only.
 * `import.meta.env` is undefined when scripts and tests load this file from Node.
 */
const catApiKey: string | undefined = import.meta.env?.VITE_CAT_API_KEY;

/** Cat API photo ids rejected in review (wrong-looking breed, AI-generated, cat hidden or blurry). */
export const rejectedPhotos = new Set([
  "_DFVS4T4I", "28JWnlpYH", "4_AdeyZUv", "4RzEwvyzz", "5EDC-TDcN", "6y4uxeRjW", "A_G4pf_T3", "A2Wrn8uNj",
  "aB3eTwbRQ", "aJAsEA8uU", "AJxcCRZeO", "Br8qCwbS9", "HDxfaNlLj", "hFgotLj0m", "hj7Oh-SRY", "iY76694gN",
  "JAx-08Y0n", "JVITS8pXF", "KBjPMWOsK", "kjKxmn3Ob", "Mdr6QqID0", "nS12H9od0", "Rhj-JsTLP", "TboUiIDUO",
  "udZiLDG_E", "uywhSIAHr", "wLFWzKgkf", "zFm4AbO-d", "ZfqxG7ZHH", "ZocD-pQxd", "zyW4wflo3",
]);

const config: SiteConfig = {
  name: "Cat School",
  slug: "catschool",
  emoji: "🐱",
  tagline: "Learn to recognize cat breeds",
  description:
    "Learn what to look for in a cat's coat, face, ears and body, then practice until you can name 24 popular breeds at a glance.",
  footer:
    "Photos from [The Cat API](https://thecatapi.com/). Breed facts cite the [Cat Fanciers' Association](https://cfa.org/) and [Wikipedia](https://en.wikipedia.org/). Progress is saved only in this browser.",
  catalog: {
    enabled: true,
    singular: "breed",
    plural: "breeds",
    categoryLabel: "Coat",
    categories: [
      { id: "shorthair", label: "Shorthair" },
      { id: "longhair", label: "Longhair" },
      { id: "unusual", label: "Hairless or curly" },
    ],
    attributes: [
      { id: "origin", label: "Origin" },
      { id: "size", label: "Size" },
      { id: "lifespan", label: "Lifespan" },
    ],
  },
  images: {
    provider: "live",
    fetchList: async (item) => {
      if (!catApiKey || !item.imageQuery) return [];
      const res = await fetch(`${CAT_API}/images/search?breed_ids=${item.imageQuery}&limit=100&include_breeds=1`, {
        headers: { "x-api-key": catApiKey },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const list = (await res.json()) as { id: string; url: string; breeds?: { id: string }[] }[];
      return list.filter((i) => i.breeds?.[0]?.id === item.imageQuery && !rejectedPhotos.has(i.id)).map((i) => i.url);
    },
  },
  imageCredit: (url) => {
    if (url.startsWith("images/")) return "This site";
    const host = new URL(url).hostname;
    return host.endsWith("thecatapi.com") ? "The Cat API" : host;
  },
};

export default config;
