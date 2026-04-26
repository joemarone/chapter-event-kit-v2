# Chapter Event Kit

The Alpha Anywhere Chapter Event Kit — a parent-organizer tool for running workshops in Alpha Anywhere Community Chapters. Pick a workshop, fill in a few details, and walk away with everything you need: a Circle event cover, a parent-facing description, a materials checklist, a day-of run-of-show, and two video trailers.

## What's in this folder

```
.
├── index.html              ← the entire app (HTML + inline React via Babel)
├── assets/
│   ├── fonts/              ← AF Sobremesa (display) + Be Vietnam Pro is loaded from Google
│   ├── logos/              ← Alpha Anywhere brand mark
│   └── sketches/           ← workshop trailer illustrations
├── content/
│   └── workshops/          ← per-workshop markdown (mastery, run-of-show, materials)
│       ├── crazy-contraptions-club/
│       ├── actions-speak-louder/
│       ├── alpha-entrepreneurs/
│       ├── asi-alpha-science-investigators/
│       └── leaving-in-stitches/
└── public/
    ├── audio/              ← trailer soundtrack MP3s (drop-in spec in audio/README.md)
    └── brand/              ← brand asset spec stub
```

## How to run locally

It's a static HTML file. No build step.

```
open index.html
```

Or, if you want a tiny local server (recommended — clipboard APIs and font loading work better):

```
npx serve .
```

Then open `http://localhost:3000`.

## How to deploy to Vercel

1. Push this folder to a GitHub repo.
2. In Vercel, **Add New → Project**, import the repo.
3. Framework preset: **Other** (or "No framework" — Vercel auto-detects static).
4. Click **Deploy**. Done.

No environment variables, no build command, no install step. Vercel serves `index.html` at the root.

## How to edit content

### Add a new workshop

Right now the workshop catalog is defined inside `index.html` (look for `window.WORKSHOPS = [...]` near the bottom of the file). To add a workshop:

1. Add a new entry to that array with `title`, `oneLiner`, `skills`, `ages`, `category`, `duration`, `cost`, `setup`, `popular`, `materials`, and `mastery`.
2. (Optional but recommended) Create a folder under `content/workshops/<slug>/` with three files:
   - `workshop.md` — frontmatter + mastery list
   - `run-of-show.md` — minute-by-minute facilitator script
   - `materials.md` — sourcing notes + checklist
3. Drop 4 trailer illustrations in `assets/sketches/<slug>-1-intro.png` etc. (matching the existing naming pattern).

The markdown files in `content/workshops/` are not yet wired into the live UI — they're the source of truth that will feed a future "printable kit" feature. For now, the live UI reads from `window.WORKSHOPS` only.

### Edit copy on existing screens

All UI copy is in `index.html`. Search for the string and edit it.

## Workshops included

- **Crazy Contraptions Club** (ages 7–9) — chain-reaction machine building
- **Actions Speak Louder** (ages 9–11) — public speaking + storytelling
- **Alpha Entrepreneurs** (ages 11–13) — pitch a business idea
- **ASI: Alpha Science Investigators** (ages 13–15) — solve a forensic case
- **Leaving in Stitches** (ages 5–9) — hand sewing fundamentals

## What's not in this version (yet)

- The 5 workshops live in the picker, but only **Crazy Contraptions Club** has finished trailer illustrations. The other four use placeholder layouts in the trailer scene.
- Audio tracks are referenced but the MP3 files in `public/audio/` are stubs — see `public/audio/README.md` for specs.
- The markdown content folders (`content/workshops/`) aren't yet read by the UI. Future work: a printable kit page per workshop.

## Tech notes

- **No build step.** Single HTML file, React + Babel loaded from CDN at page load. Babel transforms JSX in-browser. Acceptable for a chapter-internal tool; would precompile for high-traffic public production.
- **Fonts:** AF Sobremesa is served locally from `assets/fonts/`. Be Vietnam Pro comes from Google Fonts.
- **No backend.** Everything runs client-side. No data is stored or sent anywhere.
