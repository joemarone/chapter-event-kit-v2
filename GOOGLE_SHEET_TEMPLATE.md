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
| `GOOGLE_SHEET_TAB` | The catalog tab name to read, e.g. `Workshop-details`. |
| `GOOGLE_SUBMISSIONS_TAB` | Optional. Tab name where Spark submissions append. Defaults to `Submissions`. |
| `GOOGLE_REVIEWERS_TAB` | Optional. Tab name with the reviewer allowlist. Defaults to `Reviewers`. |
| `RESEND_API_KEY` | Optional. If set, `/api/submit` fires a notification email to `NOTIFY_EMAIL` whenever a Spark is submitted. Without this, no email is sent (everything else still works). Get a key from resend.com. |
| `NOTIFY_EMAIL` | Optional. The reviewer email address that gets pinged on every new submission. |
| `NOTIFY_FROM` | Optional. The "from" address for notification emails. Defaults to `Alpha Anywhere <onboarding@resend.dev>` — Resend's test sender, which works without a verified domain. Switch to a verified custom domain (`Alpha Anywhere <hello@your-domain.com>`) for production. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | The full JSON contents of a Google Cloud service-account key. The sheet must be shared with this service account's email as **Editor** (write access is needed for the Submissions tab). |

Set all of these on Production, Preview, and Development environments in Vercel.

## Tab structure

Row 1 is the header row. Each subsequent row is one workshop. Headers are case-sensitive.

```
id | title | oneLiner | category | kind | ages | duration | cost | setup | popular | skills | materials | parentsBring | facilitatorProvides | mastery | youtubeLandscape | facilitatorGuideUrl | keepGoingUrl | designedBy
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
| `designedBy` | string or empty | The chapter that authored this entry (e.g. `Puerto Rico`). Populated automatically when a Spark is approved from a parent submission. Surfaces as the "Designed by" filter in the picker — discovery only, *not* a permission gate. Leave blank for entries built by Alpha; the filter hides chapters that have shipped nothing. |

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
2. Create a Sheet with the columns above. Share with the service account email as **Editor** (write access is needed for the Submissions tab below).
3. Set the Vercel env vars (`GOOGLE_SHEET_ID`, `GOOGLE_SHEET_TAB`, `GOOGLE_SERVICE_ACCOUNT_JSON`, optionally `GOOGLE_SUBMISSIONS_TAB`).
4. Redeploy. Visit `/api/workshops` directly to verify the function returns valid JSON.

---

# Submissions tab — parent-built Sparks

The Spark Builder at `/build.html` writes to a separate tab in the same sheet. Submitted Sparks land here as `pending`, and a reviewer flips `status` to `approved` once the Spark is ready to copy into the catalog.

## Where things live

- **Tab name:** `Submissions` by default. Override with `GOOGLE_SUBMISSIONS_TAB`.
- **API route:** `/api/submit` (POST) — appends one row per submission.
- **Builder UI:** `build.html` — eight-step React form linked from the kit's masthead.

## Tab structure

Paste this exact tab-separated string into row 1 of the `Submissions` tab:

```
submittedAt	status	submitterName	submitterEmail	chapter	name	oneLiner	category	ages	skills	participation	skill	hardCheckpoint	challengingCheckpoint	impossibleCheckpoint	parentsBring	facilitatorProvides	cost	costJustification	reviewerNotes
```

That's 20 columns, A through T.

### Column reference

| Column | Type | Filled by | Notes |
|---|---|---|---|
| `submittedAt` | ISO timestamp | `/api/submit` | Set when the row is appended. |
| `status` | string | `/api/submit`, then reviewer | Starts as `pending`. Reviewer flips to `approved`, `changes-requested`, or `rejected`. |
| `submitterName` | string | submitter | Step 7 of the builder. |
| `submitterEmail` | string | submitter | Validated as email. |
| `chapter` | string | submitter | Picked from the same `Chapter List` tab the kit reads. |
| `name` | string | submitter | The Spark's name. 1–4 words. |
| `oneLiner` | string | submitter | Verb-led, under 25 words. |
| `category` | string | submitter | One of the five canonical Alpha life-skill pillars (validated server-side). |
| `ages` | string | submitter | `min-max` format, e.g. `5-9`. |
| `skills` | multi-line | submitter | One canonical skill per line. The builder limits picks to a fixed list of 15. |
| `participation` | string | submitter | What happens in the room. Three to six sentences. |
| `skill` | string | submitter | One sentence: the skill being taught. |
| `hardCheckpoint` | string | submitter | First rung. Persistence required; not guaranteed. |
| `challengingCheckpoint` | string | submitter | Second rung. ~50% reach. |
| `impossibleCheckpoint` | string | submitter | Third rung. Fewer than half reach without serious effort. |
| `parentsBring` | multi-line | submitter | One item per line. Empty allowed. |
| `facilitatorProvides` | multi-line | submitter | One item per line. Aim for ≤5. |
| `cost` | string | submitter | `Free`, `$5 per attendee`, `$5–$15 per attendee`, etc. |
| `costJustification` | string | submitter | Required if numeric cost > $15. |
| `reviewerNotes` | string | reviewer | Free-form notes back to the submitter. Filled by the reviewer in the sheet (or via the future `/review` screen). |

## Status lifecycle

```
pending  →  changes-requested  →  pending  →  approved
              ↑                                    ↓
              └────────────────  rejected   ←──────┘
```

- `pending` — fresh submission, awaiting review.
- `changes-requested` — reviewer left notes; submitter resubmits via the builder (planned).
- `approved` — copy the row into the `Workshop-details` tab as a new Spark, then archive or delete from `Submissions`.
- `rejected` — kept for record; not promoted.

## Setup checklist

To turn submissions on for the first time:

1. Open the Sheet.
2. Add a new tab named `Submissions`.
3. Paste the tab-separated header row above into A1.
4. Confirm the service account is shared as **Editor** (Viewer will fail with a 403).
5. Optionally set `GOOGLE_SUBMISSIONS_TAB` if you used a different tab name.
6. Visit `/build.html`, fill out a test submission, click Submit. A new row should appear in `Submissions` with `status = pending`.

---

# Reviewers tab — approval gate

The Reviewer Console at `/review.html` lets approved reviewers grade pending submissions, leave notes, and approve them into the catalog. Authentication is a tiny lookup against this tab — every action POSTs the email and passphrase, the API checks them on every request. No session, no token, no signup flow. Revoke a reviewer by deleting their row.

## Where things live

- **Tab name:** `Reviewers` by default. Override with `GOOGLE_REVIEWERS_TAB`.
- **API route:** `/api/review` (POST, action-based) — auth, list, approve, request-changes, reject.
- **Console UI:** `review.html` — linked from the kit masthead as a small "Reviewer" link.

## Tab structure

Two columns. No header row needed (the API just scans rows).

| Column | Type | Notes |
|---|---|---|
| `A` | email | The reviewer's email. Case-insensitive match. |
| `B` | passphrase | Plain-text shared secret. Pick anything memorable. |

Add rows to grant access; delete rows to revoke. The pilot starts with a single row for `joe.marone@2hourlearning.com`.

## What "Approve" actually does

When a reviewer clicks Approve in the console:

1. The submission's row in `Submissions` flips `status` to `approved` and saves any `reviewerNotes` typed in the side panel.
2. The submission is mapped into a new row appended to `Workshop-details` (the catalog tab) — meaning the Spark is immediately bookable from the kit. Mapping uses the canonical catalog columns: `id` is a slug of the name; `kind` is `spark`; `duration` is `30`; `setup` is `Easy`; `popular` is `FALSE`; `mastery` becomes a multi-line cell with the three checkpoints (`Hard — …\nChallenging — …\nImpossible — …`); `facilitatorGuideUrl` starts empty.
3. The console then surfaces a copy-pasteable prompt for the `alpha-chapter-facilitator-guide` skill, so the reviewer can drop into Claude, generate the .docx, upload it to Drive, and paste the resulting URL back into the catalog row's `facilitatorGuideUrl` column.

Other actions:
- **Request changes** flips `status` to `changes-requested` and saves notes. (No automated email yet — the reviewer pings the submitter manually.)
- **Reject** flips `status` to `rejected`. Row stays for record.

## Setup checklist

1. Add a new tab named `Reviewers` to the sheet.
2. Add one row: `joe.marone@2hourlearning.com` in A, any passphrase in B.
3. Optionally set `GOOGLE_REVIEWERS_TAB` if you used a different tab name.
4. Click "Reviewer" in the kit masthead, sign in with that email and passphrase.
