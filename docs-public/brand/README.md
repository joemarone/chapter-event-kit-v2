# Brand assets

Official Alpha Anywhere brand files. Imported from the AA Brand design system. Do not edit in place — if something changes centrally, re-import and overwrite.

## Required files

| File | Size | Used where |
| --- | --- | --- |
| `alpha-mark.svg` | vector | Header logo, trailer outro, PDF covers |
| `alpha-mark.png` | 512×512 @2x | Fallback for rasterized contexts (old PDF renderers) |
| `og-default.png` | 1200×630 | Default Open Graph card for the site root and any workshop page without a custom OG |
| `favicon.ico` | 32×32 | Browser tab icon |

## Do we need the wordmark too?

Only if you're generating materials that benefit from the full lockup (e.g. the printable kit cover page). For everything else, the mark alone is cleaner.

## Colors + type

Those live in `app/globals.css` as CSS custom properties. Source of truth for palette:

```
--aa-navy: #072256
--aa-white: #FFFFFF
--aa-accent: #D97757   /* Claude orange, used sparingly */
--aa-paper: #F5F1E8
```

Type stack is defined in `app/layout.tsx` via `next/font`:

- **AF Sobremesa** — display headings
- **Be Vietnam Pro** — body

Font files live in `public/fonts/`. Don't reference them directly in CSS — let `next/font` handle preloading.

## If a file is missing

Only `alpha-mark.svg` is hard-required (everything else falls back gracefully). If the mark is missing, headers render the text "Alpha Anywhere" instead and the trailer outro uses text-only. Not a crash — but fix it before shipping to chapters.
