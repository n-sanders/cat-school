/**
 * Pins breed-labelled photos from The Cat API into item files.
 *
 *   npm run pin-images                     # top up every item to 6 images
 *   npm run pin-images -- bengal sphynx    # only these items
 *   npm run pin-images -- --count 8
 *   npm run pin-images -- --list-breeds    # print The Cat API breed ids
 *
 * Needs VITE_CAT_API_KEY in .env: without a key the API ignores `breed_ids`.
 * Only photos the API labels with the item's `imageQuery` breed id are pinned.
 * New images are added with `reviewed: false`. A human reviewer should look at
 * each one (the audit report links them) and set `reviewed: true`, or delete it
 * and add its id to `rejectedPhotos` in site.config.ts so it is never shown or pinned again.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { parseDocument, YAMLSeq } from "yaml";
import { rejectedPhotos } from "../site.config";
import { ITEMS_DIR, ROOT, listFiles, rel } from "./lib/content";

const API = "https://api.thecatapi.com/v1";

const envFile = join(ROOT, ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);
const key = process.env.VITE_CAT_API_KEY;
if (!key) {
  console.error("Set VITE_CAT_API_KEY in .env (get a free key at https://thecatapi.com/).");
  process.exit(1);
}

async function api<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: { "x-api-key": key! } });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

const args = process.argv.slice(2);

if (args.includes("--list-breeds")) {
  const breeds = await api<{ id: string; name: string }[]>("/breeds");
  for (const b of breeds) console.log(`${b.id}\t${b.name}`);
  process.exit(0);
}

const countFlag = args.indexOf("--count");
const target = countFlag >= 0 ? Number(args[countFlag + 1]) : 6;
const only = args.filter((a, i) => !a.startsWith("--") && (countFlag < 0 || i !== countFlag + 1));

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

for (const file of listFiles(ITEMS_DIR, ".yaml")) {
  const slug = basename(file, ".yaml");
  if (only.length && !only.includes(slug)) continue;

  const doc = parseDocument(readFileSync(file, "utf8"));
  const breedId = doc.get("imageQuery");
  if (typeof breedId !== "string") {
    console.error(`${rel(file)}: no imageQuery (Cat API breed id), skipped`);
    process.exitCode = 1;
    continue;
  }
  let images = doc.get("images") as YAMLSeq | undefined;
  if (!(images instanceof YAMLSeq)) {
    images = new YAMLSeq();
    doc.set("images", images);
  }
  const existing = new Set(images.items.map((i) => String((i as { get(k: string): unknown }).get("url"))));
  const needed = target - existing.size;
  if (needed <= 0) continue;

  const list = await api<{ id: string; url: string; breeds?: { id: string }[] }[]>(
    `/images/search?breed_ids=${breedId}&limit=100&include_breeds=1&has_breeds=1`,
  );
  const labelled = list
    .filter((i) => i.breeds?.[0]?.id === breedId && !rejectedPhotos.has(i.id))
    .map((i) => i.url);
  const picks = shuffle(labelled.filter((u) => !existing.has(u))).slice(0, needed);

  for (const url of picks) images.add(doc.createNode({ url, note: "", reviewed: false }));
  images.flow = false;
  writeFileSync(file, doc.toString({ lineWidth: 0 }));
  console.log(`${rel(file)}: pinned ${picks.length} image(s) from ${labelled.length} labelled ${breedId} photos`);
}
