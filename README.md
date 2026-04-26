# Chapter Event Kit

A parent-organizer tool for Alpha Anywhere Community Chapters. Pick a workshop, fill in a few details, and walk away with everything you need to run it: a Circle event page cover, parent-facing description, materials checklist, day-of run-of-show, and two video trailers (landscape + portrait).

This repo is the production version deployed at **chapter-event-kit.vercel.app**.

---

## The short version

- **Edit workshop content?** → Open `content/workshops/<workshop>/workshop.md` in any text editor. Commit. Push.
- **Add a new workshop?** → Duplicate a folder in `content/workshops/`, rename, edit the three `.md` files, drop 4 visuals in `visuals/`.
- **Swap audio tracks?** → Drop new MP3s into `public/audio/` with the exact filenames listed there. Commit. Push.
- **Deploy?** → Git push to `main`. Vercel auto-deploys.

---

## Folder map

```
chapter-event-kit/
├── content/
│   └── workshops/                 ← One folder per workshop
│       ├── crazy-contraptions-club/
│       │   ├── workshop.md        ← Title, ages, category, skills, Mastery rules
│       │   ├── run-of-show.md     ← Minute-by-minute script for the organizer
│       │   ├── materials.md       ← Shopping list
│       │   └── visuals/           ← 4 illustrated frames
│       │       ├── 01-intro.png       (1600×1000, hero / brand intro)
│       │       ├── 02-step1.png       (1600×1000, "Build it")
│       │       ├── 03-step2.png       (1600×1000, "Sketch it")
│       │       └── 04-step3.png       (1600×1000, "Run it")
│       ├── actions-speak-louder/
│       ├── leaving-in-stitches/
│       ├── asi-alpha-science-investigators/
│       └── alpha-entrepreneurs/
│
├── public/
│   ├── audio/                     ← Drop your 3 MP3s here (see public/audio/README.md)
│   │   ├── workshop.mp3           (warm, curious — for craft & writing)
│   │   ├── build.mp3              (bouncy, playful — for STEM)
│   │   └── showtime.mp3           (confident, stylish — for pitches)
│   ├── brand/
│   │   ├── alpha-mark.svg
│   │   └── og-default.png
│   └── fonts/                     ← AF Sobremesa + Be Vietnam Pro
│
├── app/                           ← Next.js App Router pages
│   ├── layout.tsx
│   ├── page.tsx                   ← The builder home / picker
│   └── workshops/[slug]/page.tsx  ← Per-workshop detail + generated kit
│
├── components/                    ← React components (trailer, cover, picker, etc.)
├── lib/
│   ├── workshops.ts               ← Reads content/workshops at build time
│   └── pdf.ts                     ← jsPDF helpers for printable outputs
│
├── package.json
├── next.config.js
└── tsconfig.json
```

---

## Editing a workshop

Each workshop folder has **three markdown files**. Edit them in any text editor, VS Code, or directly on GitHub in the browser.

### `workshop.md` — the source of truth

```markdown
---
title: Crazy Contraptions Club
slug: crazy-contraptions-club
oneLiner: Engineer a chain-reaction machine from everyday materials.
category: Relationship Building + Socialization
ages: "7-9"
duration: 90
groupSize: "8-12"
skills:
  - Critical Thinking
  - Collaboration
popular: true
---

## Mastery — what every kid walks out able to do

Workshops are a blast — and every kid walks out having actually done something. Below is the bar.

1. Build a machine with at least four definable moving parts
2. Touch only one part to start the entire chain reaction
3. Predict out loud what will happen — and have it actually happen
4. Diagnose one failure and fix it without help
```

The frontmatter (between `---`) drives the app. The body becomes the Mastery section on the workshop page and in the generated kit.

### `run-of-show.md` — minute-by-minute for the day

Markdown headings become time blocks. Bullet points become checklist items. The app renders this as a printable PDF on demand.

### `materials.md` — the shopping list

Plain bullet list. Same deal — rendered as a printable PDF.

### `visuals/` — 4 illustrated frames

Follow the **Crazy Contraptions** aesthetic: pencil/ink-and-wash illustrations, same palette, same framing. Each workshop needs exactly 4 frames:

| File | Used as | Treatment |
| --- | --- | --- |
| `01-intro.png` | Trailer slide 1 — "A workshop by parents, for kids" | Full-bleed, soft dark-blue overlay |
| `02-step1.png` | Trailer slide 4 — the first thing kids do | Full-bleed, navy overlay at bottom |
| `03-step2.png` | Trailer slide 5 — the middle | Full-bleed, navy overlay |
| `04-step3.png` | Trailer slide 6 — the payoff | Full-bleed, navy overlay |

**Specs:** 1600×1000 px, PNG, ~600 KB or less. Landscape. Portrait trailer uses the same files, recropped.

---

## Audio tracks

Drop three MP3s into `public/audio/`:

- `workshop.mp3` — Warm, curious. For craft, writing, and slower-paced workshops. ~60 seconds, loopable.
- `build.mp3` — Bouncy, playful. For STEM and hands-on making. ~60 seconds, loopable.
- `showtime.mp3` — Confident, stylish. For entrepreneur and pitch workshops. ~60 seconds, loopable.

**Specs:** MP3, 128-192 kbps, -14 LUFS (standard streaming loudness), royalty-free with chapter-use clearance.

The app plays these under the trailer preview and mixes them into the downloaded `.mp4`.

See `public/audio/README.md` for licensing notes.

---

## Running locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploying

```bash
git push origin main
```

Vercel auto-deploys from `main`. Check the deployment dashboard at vercel.com.

Environment variables: none required for v1. All content is filesystem-based.

---

## Adding a new workshop

1. Duplicate an existing folder in `content/workshops/` and rename to your slug (`kebab-case`).
2. Edit `workshop.md`, `run-of-show.md`, `materials.md`.
3. Replace the 4 PNGs in `visuals/` with your own (same filenames).
4. Commit and push. The new workshop appears automatically in the picker.

The app reads the `content/workshops/` folder at build time — no hardcoded list anywhere.

---

## Removing a workshop

Delete its folder. Push. It's gone.

---

## License

Workshop content, illustrations, and brand assets: © 2Hour Learning. Internal use across Alpha Anywhere chapters only.

Audio: each track's licensing lives in `public/audio/README.md`.
# chapter-event-kit-v2
