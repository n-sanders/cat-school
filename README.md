# StudyKit

A skeleton for small, standalone learning sites. Each site is a static web app with:

- a **curriculum** of units and Markdown lessons, unlocked one after another by prerequisites;
- **lesson quizzes** with a pass mark;
- an optional **catalog** of things to recognize (shapes, rockets, birds...) with
  pinned images, look-alikes and cited traits, which powers photo questions;
- **Practice** and **Review** (Leitner spaced repetition) over everything the learner
  has studied, including plain text questions;
- no accounts: progress lives in the browser's `localStorage`, with backup and restore
  on the **Progress** page.

The repo ships with a tiny example course about basic shapes so everything runs out of
the box.

## Running it

```sh
npm install
npm run dev          # http://localhost:5173
npm run build        # static site in dist/ (works from any folder or host)
npm test             # unit tests
npm run validate     # check all content (needs network for remote image/source checks)
npm run validate:offline
npm run audit        # write docs/audit/content-report.md for reviewers
npm run deploy       # build and deploy to Cloudflare (Workers static assets)
```

## Start a new topic

1. **Copy this folder** (without `node_modules/`, `dist/` and `.git/`) to a new folder,
   for example `RocketSchool`, and run `git init` and `npm install` there.
2. **Edit `site.config.ts`**: name, slug, emoji, tagline, footer, and the catalog
   settings:
   - `catalog.enabled: false` for a text-only course (no item files, only `question`
     quiz items). Photo practice modes and the catalog page are hidden.
   - `singular` / `plural` (e.g. `rocket` / `rockets`) are used throughout the UI.
   - `categories` replace the example's `curved` / `polygon`; items must use one of them.
     Wrong answers are picked from look-alikes first, then the same category.
   - `attributes` are extra facts shown as chips (e.g. `country`, `firstFlight`).
   - `images.provider`: `"pinned"` uses only the images listed in item files.
     `"live"` takes a `fetchList(item)` function that returns image URLs for Practice
     and Review (it can use the item's optional `imageQuery` field), with the pinned
     images as fallback.
   - `imageCredit(url)` is the short credit shown under each image.
3. **Rename the deploy target** in `package.json` (`name`) and `wrangler.jsonc` (`name`).
4. **Replace `content/`** and the example images in `public/images/` (see the layout
   below). Delete `content/items/` entirely for a text-only course.
5. Run `npm run validate:offline`, `npm test`, `npm run build`, then `npm run deploy`.

Progress is stored under `<slug>.progress.v2`, so sites on the same domain never share
progress.

## Content layout

```
content/
  curriculum.yaml               title, optional intro (Markdown), units and lesson order
  items/<slug>.yaml             optional catalog: one file per item
  lessons/<unit>-<nn>-<slug>.md one file per lesson: YAML frontmatter + Markdown text
public/images/                  self-hosted images, referenced as "images/..."
```

**Item file** (`content/items/<slug>.yaml`): `slug`, `name`, `category`, `attributes`,
optional `imageQuery`, `summary`, `traits` (each citing a `source` id), `lookAlikes`,
`sources`, `images` (each with `url`, `note`, `reviewed`), `reviewedBy`, `reviewedOn`.
Image URLs are either `https://...` or a path under `public/` such as
`images/rockets/falcon-9.jpg`.

**Lesson frontmatter**: `id`, `title`, `unit`, `summary`, `prerequisites`,
`objectives`, `items` (catalog items taught), `images` (optional `item`, `url`,
`caption`), `compare` (pairs of items), `sources`, `quiz` (at least five entries),
`passMark` (default 0.8). Quiz entries are one of:

```yaml
- { type: identify, item: circle }            # show an image, pick the name
- { type: find, item: circle }                # show a name, pick the image
- type: question                              # plain multiple choice
  prompt: How many sides does a hexagon have?
  choices: ["5", "6", "8"]
  answer: "6"
  explanation: Optional text shown after answering.
```

The schemas are in `src/content/schema.ts`. `npm run validate` checks that every file
matches its schema; IDs are unique and every lesson belongs to the unit that lists it;
prerequisites exist, come earlier and have no cycles; every referenced item exists;
traits cite existing sources; local images exist in `public/`; remote images load; and
source URLs respond. If the catalog is disabled, item files and photo quiz entries are
reported as errors.

## How Practice and Review work

Each thing the learner is tested on is a **card**: a catalog item (`item:<slug>`) or
one text question from a lesson quiz (`q:<lessonId>:<index>`). Every answer, in a
lesson quiz, Practice or Review, moves that card between five Leitner boxes. Review
asks the cards that are due; Practice picks cards from completed lessons (or the whole
course), favoring ones the learner gets wrong.

Reordering the quiz entries of a lesson changes its question card keys, so learners
would lose review history for those questions.

## Code layout

```
site.config.ts  everything topic-specific apart from content/
src/content/    schemas, parser, integrity checks and the build-time loader
src/lib/        quiz generation, cards, images, progress store, site config helpers
src/pages/      Home, Learn, Lesson, Practice, Review, catalog, Progress
src/components  shared UI pieces
scripts/        validate and audit tools
tests/          Vitest tests (they use their own fixtures, so they survive a content swap)
```
