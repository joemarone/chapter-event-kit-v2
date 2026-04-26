# Audio tracks

Drop three MP3 files into this folder. The app uses them as background music under the trailer preview and mixes them into the downloadable `.mp4` trailers.

## Required files

| Filename | Mood | Use case | Sample workshops |
| --- | --- | --- | --- |
| `workshop.mp3` | Warm, curious, paced | Craft, writing, slow-build projects | Leaving in Stitches, Adventure Awaits |
| `build.mp3` | Bouncy, playful, kinetic | STEM, hands-on making, experimentation | Crazy Contraptions Club, Experimentation Station |
| `showtime.mp3` | Confident, stylish, bright | Pitch, perform, present | Alpha Entrepreneurs, Actions Speak Louder, Deck Dynasty |

## Specs

- **Format:** MP3, 128–192 kbps
- **Length:** ~60 seconds, loopable (the trailer is ~45 seconds, so the last 15 seconds of your track should loop cleanly into the first 15)
- **Loudness:** -14 LUFS (standard streaming target). If you're mastering elsewhere, get close.
- **Licensing:** royalty-free with chapter-use clearance. See "Licensing notes" below.

## How the app uses them

In `components/TrailerPlayer.tsx`, the currently-selected workshop's `audioMood` field (set in `workshop.md` frontmatter, optional — defaults to `workshop`) determines which file plays.

- `workshop` → `/audio/workshop.mp3`
- `build` → `/audio/build.mp3`
- `showtime` → `/audio/showtime.mp3`

## Licensing notes

Before committing any track here, log its source below so we have a paper trail for any chapter that asks:

```
workshop.mp3 — [Track name] by [Artist] — [License URL]
build.mp3    — [Track name] by [Artist] — [License URL]
showtime.mp3 — [Track name] by [Artist] — [License URL]
```

Good sources for free-use tracks:
- **YouTube Audio Library** (youtube.com/audiolibrary) — filter to "No attribution required."
- **Uppbeat** (uppbeat.io) — free tier with attribution, Premium tier license-clear.
- **Pixabay Music** (pixabay.com/music) — CC0 / no attribution.

Avoid: Epidemic Sound (per-user license, doesn't cover chapter redistribution), anything from popular streaming platforms (obviously).

## If a file is missing

The app falls back to silence — the trailer still plays, just quietly. A `console.warn` shows up in dev. Not a hard failure.
