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

    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    });

    const rows = resp.data.values || [];
    if (rows.length < 2) {
      // Either empty sheet or only a header row.
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
      return res.status(200).json({ workshops: [] });
    }

    const [header, ...dataRows] = rows;
    const idx = (name) => header.indexOf(name);
    const cell = (row, name) => {
      const i = idx(name);
      return i >= 0 && row[i] != null ? String(row[i]) : '';
    };
    const splitMulti = (val) => (val || '')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

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
        popular: String(cell(row, 'popular')).toLowerCase() === 'true',
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
    return res.status(200).json({ workshops });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
};
