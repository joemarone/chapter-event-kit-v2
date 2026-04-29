// Vercel serverless function: reviewer console backend.
//
// One POST endpoint with an `action` discriminator. Every action verifies
// the caller's email + passphrase against the Reviewers tab on every
// request — there is no session/token. This is intentional for the pilot:
// the surface area is small, all writes are auditable in the sheet, and
// the user can revoke access by deleting a row.
//
// Required env vars:
//   GOOGLE_SHEET_ID                — same spreadsheet as the catalog
//   GOOGLE_SUBMISSIONS_TAB         — defaults to 'Submissions'
//   GOOGLE_SHEET_TAB               — catalog tab, defaults to 'Workshop-details'
//   GOOGLE_REVIEWERS_TAB           — defaults to 'Reviewers'
//   GOOGLE_SERVICE_ACCOUNT_JSON    — service account JSON, must have Editor

const { google } = require('googleapis');

const SUBMISSIONS_COLUMNS = [
  'submittedAt', 'status', 'submitterName', 'submitterEmail', 'chapter',
  'name', 'oneLiner', 'category', 'ages', 'skills',
  'participation', 'skill',
  'hardCheckpoint', 'challengingCheckpoint', 'impossibleCheckpoint',
  'parentsBring', 'facilitatorProvides',
  'cost', 'costJustification',
  'reviewerNotes',
];

const CATALOG_COLUMNS = [
  'id', 'title', 'oneLiner', 'category', 'kind', 'ages', 'duration', 'cost', 'setup', 'popular',
  'skills', 'materials', 'parentsBring', 'facilitatorProvides', 'mastery',
  'youtubeLandscape', 'facilitatorGuideUrl', 'keepGoingUrl', 'designedBy',
];

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const credsRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const submissionsTab = process.env.GOOGLE_SUBMISSIONS_TAB || 'Submissions';
    const catalogTab = process.env.GOOGLE_SHEET_TAB || 'Workshop-details';
    const reviewersTab = process.env.GOOGLE_REVIEWERS_TAB || 'Reviewers';
    if (!sheetId || !credsRaw) return res.status(500).json({ error: 'Missing GOOGLE_SHEET_ID or GOOGLE_SERVICE_ACCOUNT_JSON' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { action, email, passphrase, submittedAt, reviewerNotes } = body;
    if (!action) return res.status(400).json({ error: 'Missing action' });

    const creds = JSON.parse(credsRaw);
    if (creds.private_key) creds.private_key = creds.private_key.replace(/\\n/g, '\n');
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    const ok = await verifyReviewer(sheets, sheetId, reviewersTab, email, passphrase);
    if (!ok) return res.status(401).json({ error: 'Bad email or passphrase' });

    if (action === 'auth') return res.status(200).json({ ok: true });

    if (action === 'list') {
      const subs = await readSubmissions(sheets, sheetId, submissionsTab);
      return res.status(200).json({ submissions: subs });
    }

    if (!submittedAt) return res.status(400).json({ error: 'Missing submittedAt' });

    if (action === 'approve' || action === 'request-changes' || action === 'reject') {
      const { rowIndex, row } = await findSubmissionRow(sheets, sheetId, submissionsTab, submittedAt);
      if (rowIndex < 0) return res.status(404).json({ error: 'Submission not found' });

      const newStatus = action === 'approve' ? 'approved'
        : action === 'reject' ? 'rejected'
        : 'changes-requested';

      await updateSubmissionRow(sheets, sheetId, submissionsTab, rowIndex, {
        status: newStatus,
        reviewerNotes: reviewerNotes || row.reviewerNotes || '',
      });

      let promoted = false;
      if (action === 'approve') {
        await appendToCatalog(sheets, sheetId, catalogTab, row);
        promoted = true;
      }

      return res.status(200).json({ ok: true, promoted, status: newStatus });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
};

async function verifyReviewer(sheets, sheetId, tabName, email, passphrase) {
  if (!email || !passphrase) return false;
  const range = `'${tabName.replace(/'/g, "''")}'!A:B`;
  const resp = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range }).catch(() => null);
  const rows = (resp && resp.data.values) || [];
  const target = String(email).trim().toLowerCase();
  return rows.some(([e, p]) =>
    String(e || '').trim().toLowerCase() === target &&
    String(p || '') === String(passphrase)
  );
}

async function readSubmissions(sheets, sheetId, tabName) {
  const lastCol = colLetter(SUBMISSIONS_COLUMNS.length);
  const range = `'${tabName.replace(/'/g, "''")}'!A:${lastCol}`;
  const resp = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range });
  const rows = resp.data.values || [];
  if (rows.length < 2) return [];
  // Treat row 1 as header but trust our SUBMISSIONS_COLUMNS order; we wrote it.
  return rows.slice(1)
    .filter((r) => r && r[0])
    .map((r) => {
      const obj = {};
      SUBMISSIONS_COLUMNS.forEach((col, i) => {
        let val = r[i] != null ? String(r[i]) : '';
        if (col === 'skills' || col === 'parentsBring' || col === 'facilitatorProvides') {
          obj[col] = val ? val.split(/\r?\n/).map((s) => s.trim()).filter(Boolean) : [];
        } else {
          obj[col] = val;
        }
      });
      return obj;
    });
}

async function findSubmissionRow(sheets, sheetId, tabName, submittedAt) {
  const lastCol = colLetter(SUBMISSIONS_COLUMNS.length);
  const range = `'${tabName.replace(/'/g, "''")}'!A:${lastCol}`;
  const resp = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range });
  const rows = resp.data.values || [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i] && String(rows[i][0]) === String(submittedAt)) {
      const obj = {};
      SUBMISSIONS_COLUMNS.forEach((col, j) => { obj[col] = rows[i][j] != null ? String(rows[i][j]) : ''; });
      return { rowIndex: i + 1, row: obj }; // 1-indexed for sheet ranges
    }
  }
  return { rowIndex: -1, row: null };
}

async function updateSubmissionRow(sheets, sheetId, tabName, rowIndex, patch) {
  // Update only the columns we touch (status, reviewerNotes) by their letters.
  const updates = [];
  if ('status' in patch) {
    const col = colLetter(SUBMISSIONS_COLUMNS.indexOf('status') + 1);
    updates.push({ range: `'${tabName.replace(/'/g, "''")}'!${col}${rowIndex}`, values: [[patch.status]] });
  }
  if ('reviewerNotes' in patch) {
    const col = colLetter(SUBMISSIONS_COLUMNS.indexOf('reviewerNotes') + 1);
    updates.push({ range: `'${tabName.replace(/'/g, "''")}'!${col}${rowIndex}`, values: [[patch.reviewerNotes]] });
  }
  if (!updates.length) return;
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: { valueInputOption: 'RAW', data: updates },
  });
}

async function appendToCatalog(sheets, sheetId, catalogTab, sub) {
  // Build the value-by-name map first, then read the actual header row
  // from the catalog tab and emit values in *that* order. This way the
  // append is resilient to column reordering or extra columns being
  // added by hand — the previous version assumed a fixed positional
  // order and shifted columns when the sheet's header order differed.
  const ladder = [
    sub.hardCheckpoint && `Hard — ${sub.hardCheckpoint}`,
    sub.challengingCheckpoint && `Challenging — ${sub.challengingCheckpoint}`,
    sub.impossibleCheckpoint && `Impossible — ${sub.impossibleCheckpoint}`,
  ].filter(Boolean).join('\n');

  const valueByCol = {
    id: slugify(sub.name),
    title: sub.name || '',
    oneLiner: sub.oneLiner || '',
    category: sub.category || '',
    kind: 'spark',
    ages: sub.ages || '',
    duration: '30',
    cost: sub.cost || '',
    setup: 'Easy',
    popular: 'FALSE',
    skills: sub.skills || '',
    materials: '', // legacy combined column, unused
    parentsBring: sub.parentsBring || '',
    facilitatorProvides: sub.facilitatorProvides || '',
    mastery: ladder,
    youtubeLandscape: '',
    facilitatorGuideUrl: '', // reviewer pastes after generating the guide
    keepGoingUrl: '',
    designedBy: sub.chapter || '',
  };

  // Read just the header row from the catalog tab.
  const headerResp = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `'${catalogTab.replace(/'/g, "''")}'!1:1`,
  });
  const headers = (headerResp.data.values && headerResp.data.values[0]) || [];
  if (!headers.length) {
    throw new Error('Catalog tab is missing a header row');
  }

  // Match headers leniently — case-insensitive, whitespace-trimmed,
  // mirroring the read side in api/workshops.js. Unknown headers get an
  // empty string.
  const norm = (s) => String(s || '').trim().toLowerCase();
  const lookup = {};
  Object.keys(valueByCol).forEach((k) => { lookup[norm(k)] = valueByCol[k]; });
  const row = headers.map((h) => lookup[norm(h)] != null ? lookup[norm(h)] : '');

  const lastCol = colLetter(headers.length);
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `'${catalogTab.replace(/'/g, "''")}'!A:${lastCol}`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
}

function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
}

// 1 -> A, 26 -> Z, 27 -> AA. Sufficient for our column counts.
function colLetter(n) {
  let s = '';
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
