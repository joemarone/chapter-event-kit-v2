# Workshop content — Google Sheet schema

The app reads its workshop catalog from a private Google Sheet via a service-account-authenticated Vercel serverless function. This file documents the schema so anyone inheriting this kit can re-create or maintain the sheet.

## Where things live

- **Sheet:** any Google Sheet you control. Default tab name is `Workshop-details` (configurable via env var).
- **API route:** `/api/workshops` — returns JSON, served from `api/workshops.js`.
- **Frontend boot:** `index.html` fetches `/api/workshops` on mount. If the fetch fails, falls back to the bundled `window.WORKSHOPS` array hardcoded near the bottom of `index.html`.

## Required Vercel environment variables

| Name | Value |
|---|---|
| `GOOGLE_SHEET_ID` | The long ID between `/d/` and `/edit` in the sheet's URL. |
| `GOOGLE_SHEET_TAB` | The tab name to read, e.g. `Workshop-details`. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | The full JSON contents of a Google Cloud service-account key. The sheet must be shared with this service account's email as Viewer. |

Set all three on Production, Preview, and Development environments in Vercel.

## Tab structure

Row 1 is the header row. Each subsequent row is one workshop. Headers are case-sensitive.

```
id | title | oneLiner | category | kind | ages | duration | cost | setup | popular | skills | materials | parentsBring | facilitatorProvides | mastery | youtubeLandscape | facilitatorGuideUrl | keepGoingUrl
```

### Column reference

| Column | Type | Example |
|---|---|---|
| `id` | string slug | `crazy-contraptions-club` |
| `title` | string | `Crazy Contraptions Club` |
| `oneLiner` | string | `Engineer a chain-reaction machine from everyday materials, combining physics, creativity, and teamwork.` |
| `category` | string | `Relationship Building + Socialization` |
| `kind` | string | `workshop` (default, 60-90 min sit-down session) or `spark` (compact, low-prep, "feels-impossible-but-isn't" demo). Anything other than the literal `spark` (case-insensitive) — including blank — is treated as a workshop. Sparks get a yellow chip on the picker, a SPARK eyebrow on the cover, and a softer Mastery framing in the description. |
| `ages` | string | `7-9` (format the column as Plain Text — Sheets will convert `7-9` to a date otherwise) |
| `duration` | number, minutes | `90` |
| `cost` | string | `None` for free events, or an estimated amount like `$30 per attendee`. Empty / `$` / `None` / `Free` / `0` all render as **Free** in the description and sidebar. |
| `setup` | string | `Easy` |
| `popular` | boolean | `TRUE` or `FALSE` (uppercase) |
| `skills` | multi-line cell | One skill per line. Press `Alt+Enter` (or `Option+Enter` on Mac) inside the cell to add a new line. |
| `materials` | multi-line cell | Legacy combined list — kept as a fallback. If `facilitatorProvides` is empty, this list powers the materials checklist. Once `facilitatorProvides` is filled in, this column is no longer used by the app. |
| `parentsBring` | multi-line cell | What each parent should bring with their kid (e.g. a notebook, a snack). Appears in the **What to bring** section of the event description so it makes it into the Circle post. **If empty, the description shows "Nothing to bring — your chapter has every material covered."** One item per line, `Alt/Option+Enter` for new lines. |
| `facilitatorProvides` | multi-line cell | What the facilitator/chapter supplies for the whole group (e.g. cardboard tubes, marbles, masking tape). Powers the **Facilitator Materials Checklist**. Falls back to `materials` if empty. One item per line. |
| `mastery` | multi-line cell | One mastery item per line, same convention. Use real em dashes (`—`, U+2014), not double hyphens. |
| `youtubeLandscape` | URL or empty | The unlisted YouTube URL of the landscape (16:9) trailer. Empty during development. This is the only trailer the app uses — it powers the Step 1 preview button and the Stack 1 trailer card on Step 5. (Portrait was dropped to halve trailer-production overhead. The `youtubePortrait` column is no longer read; you can leave or delete it.) |
| `keepGoingUrl` | URL or empty | Optional. For Sparks especially: a URL where the kid can keep practicing at home (YouTube channel, app, tutorial site). Renders as a "Keep going at home" callout in the event description. Workshops can populate this too. |
| `facilitatorGuideUrl` | URL or empty | A live document (Google Doc, Notion page, etc.) with detailed prep + run-of-show for the workshop. When set, a "Facilitator Guide" card appears in step 5 of the kit with an "Open Guide" button. When empty, the card doesn't render. |

The YouTube embed parser accepts these URL formats:

- `https://www.youtube.com/watch?v=ABCDEFGHIJK`
- `https://youtu.be/ABCDEFGHIJK`
- `https://www.youtube.com/shorts/ABCDEFGHIJK`
- `https://www.youtube.com/embed/ABCDEFGHIJK`

## Caching behavior

The serverless function sets `Cache-Control: s-maxage=60, stale-while-revalidate=300`, so:

- The first request after a sheet edit may be served stale for up to 60 seconds.
- After 60 seconds, the next request hits Google Sheets and refreshes the cache.
- Older cached values are served immediately for up to 5 minutes while a refresh runs in the background.

For pilot scale this is plenty fresh. If you need instantaneous edits, drop the `s-maxage` to `0`.

## Failure mode

If the function returns an error or the sheet is empty, the frontend silently falls back to the bundled `window.WORKSHOPS` array in `index.html`. That array lags the sheet between deploys, so keep it roughly in sync if you care about the fallback being correct.

## Re-creating from scratch

If the sheet or service account is ever lost, the steps to rebuild are:

1. Google Cloud Console → new project → enable Google Sheets API → Credentials → create Service Account → create JSON key.
2. Create a Sheet with the columns above. Share with the service account email as Viewer.
3. Set the three Vercel env vars (`GOOGLE_SHEET_ID`, `GOOGLE_SHEET_TAB`, `GOOGLE_SERVICE_ACCOUNT_JSON`).
4. Redeploy. Visit `/api/workshops` directly to verify the function returns valid JSON.
