// Vercel serverless function: reads the Workshop-details tab of a private
// Google Sheet using a service-account credential and returns it as JSON.
// The frontend fetches /api/workshops on boot and falls back to its bundled
// WORKSHOPS array if this returns an error or empty list.
//
// Required env vars (set in Vercel project settings):
//   GOOGLE_SHEET_ID                — the spreadsheet ID (from /d/<id>/edit)
//   GOOGLE_SHEET_TAB               — the tab name, e.g. Workshop-details
//   GOOGLE_SERVICE_ACCOUNT_JSON    — full JSON key for the service account
//                                    that has Viewer access to the sheet

const { google } = require('googleapis');

module.exports = async (req, res) => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const tabName = process.env.GOOGLE_SHEET_TAB || 'Workshop-details';
    const credsRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    if (!sheetId || !credsRaw) {
      return res.status(500).json({
        error: 'Missing GOOGLE_SHEET_ID or GOOGLE_SERVICE_ACCOUNT_JSON env vars',
      });
    }

    let creds;
    try {
      creds = JSON.parse(credsRaw);
    } catch (e) {
      return res.status(500).json({ error: 'GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON' });
    }
    // Vercel's env var UI sometimes stores newlines in the private_key as
    // literal "\n" sequences instead of real newlines. Normalize so the
    // RSA key parser can read it.
    if (creds.private_key) {
      creds.private_key = creds.private_key.replace(/\\n/g, '\n');
    }

    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    // Wrap tab name in single quotes to handle hyphens like "Workshop-details".
    const range = `'${tabName.replace(/'/g, "''")}'!A:P`;
    const chaptersRange = "'Chapter List'!A:A";
    const organizersRange = "'Organizer List'!A:B";

    // Fetch the workshops tab plus the two lookup tabs (chapters, organizers)
    // in parallel. The lookup fetches are best-effort: if a tab is missing
    // or fails, we return an empty list — the frontend falls back to free-
    // text inputs for that field.
    const [resp, chaptersResp, organizersResp] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range }),
      sheets.spreadsheets.values
        .get({ spreadsheetId: sheetId, range: chaptersRange })
        .catch(() => ({ data: { values: [] } })),
      sheets.spreadsheets.values
        .get({ spreadsheetId: sheetId, range: organizersRange })
        .catch(() => ({ data: { values: [] } })),
    ]);

    const chapters = (chaptersResp.data.values || [])
      .map((row) => String(row[0] || '').trim())
      .filter(Boolean);
    // Organizers: each row has name (col A) and email (col B). Skip rows
    // without a name; email is optional.
    const organizers = (organizersResp.data.values || [])
      .map((row) => ({
        name: String((row && row[0]) || '').trim(),
        email: String((row && row[1]) || '').trim(),
      }))
      .filter((o) => o.name);

    const rows = resp.data.values || [];
    if (rows.length < 2) {
      // Either empty sheet or only a header row.
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
      return res.status(200).json({ workshops: [], chapters, organizers });
    }

    const [header, ...dataRows] = rows;
    // Header matching is intentionally lenient: case-insensitive, whitespace-
    // trimmed, and falls back to substring match. This handles real-world
    // sheet headers like "Popular", " popular ", "Popular?", "is_popular",
    // "Popular Tag", etc. without anyone having to rename columns.
    const normHeader = header.map((h) => String(h || '').trim().toLowerCase());
    const idx = (name) => {
      const target = name.toLowerCase();
      const exact = normHeader.indexOf(target);
      if (exact >= 0) return exact;
      return normHeader.findIndex((h) => h.includes(target));
    };
    const cell = (row, name) => {
      const i = idx(name);
      return i >= 0 && row[i] != null ? String(row[i]) : '';
    };
    const splitMulti = (val) => (val || '')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    // Accept the values people actually type for booleans in spreadsheets,
    // not just literal "true". Anything affirmative -> true; empty / "false" /
    // "no" / unknown -> false.
    const parseBool = (val) => {
      const v = String(val || '').trim().toLowerCase();
      return v === 'true' || v === 'yes' || v === 'y' || v === '1' || v === 'x' || v === '✓' || v === '✔' || v === 'on';
    };

    const workshops = dataRows
      .filter((row) => row && cell(row, 'title'))
      .map((row) => ({
        id: cell(row, 'id'),
        title: cell(row, 'title'),
        oneLiner: cell(row, 'oneLiner'),
        category: cell(row, 'category'),
        ages: cell(row, 'ages'),
        duration: parseInt(cell(row, 'duration'), 10) || 90,
        cost: cell(row, 'cost'),
        setup: cell(row, 'setup'),
        popular: parseBool(cell(row, 'popular')),
        skills: splitMulti(cell(row, 'skills')),
        materials: splitMulti(cell(row, 'materials')),
        mastery: splitMulti(cell(row, 'mastery')),
        youtubePortrait: cell(row, 'youtubePortrait'),
        youtubeLandscape: cell(row, 'youtubeLandscape'),
        facilitatorGuideUrl: cell(row, 'facilitatorGuideUrl'),
      }));

    // CDN cache: 60s fresh, 5 min stale-while-revalidate. Sheet edits show
    // up within a minute on the next request; subsequent requests are instant.
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    // (chapters is included in both the success and debug responses below)
    // Debug mode: append ?debug=1 to the URL to see the raw header row,
    // first data row, and the matched column index for each known field.
    // Lets us diagnose mismatches like "Popular?" vs "popular" without
    // asking the user to dig in the sheet.
    if (req.query?.debug === '1' || (req.url || '').includes('debug=1')) {
      const knownFields = ['id','title','oneLiner','category','ages','duration','cost','setup','popular','skills','materials','mastery','youtubePortrait','youtubeLandscape','facilitatorGuideUrl'];
      const matched = {};
      knownFields.forEach((f) => {
        const i = idx(f);
        matched[f] = i >= 0 ? { matchedAt: i, matchedHeader: header[i] } : { matchedAt: -1, matchedHeader: null };
      });
      return res.status(200).json({
        debug: {
          rawHeaderRow: header,
          normalizedHeaderRow: normHeader,
          firstDataRow: dataRows[0] || null,
          fieldMatches: matched,
          chapterListCount: chapters.length,
          organizerListCount: organizers.length,
        },
        workshops,
        chapters,
        organizers,
      });
    }
    return res.status(200).json({ workshops, chapters, organizers });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
};
