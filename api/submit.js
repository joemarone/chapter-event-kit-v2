// Vercel serverless function: appends a Spark submission to the
// `Submissions` tab of the same Google Sheet that powers the catalog.
//
// Required env vars (reuses the catalog's service account, but with
// read-write scope — make sure the sheet is shared with the service
// account as Editor, not just Viewer):
//   GOOGLE_SHEET_ID                — the spreadsheet ID
//   GOOGLE_SUBMISSIONS_TAB         — tab name for submissions, defaults to `Submissions`
//   GOOGLE_SERVICE_ACCOUNT_JSON    — full JSON key, same one as workshops.js

const { google } = require('googleapis');

const COLUMNS = [
  'submittedAt', 'status', 'submitterName', 'submitterEmail', 'chapter',
  'name', 'oneLiner', 'category', 'ages', 'skills',
  'participation', 'skill',
  'hardCheckpoint', 'challengingCheckpoint', 'impossibleCheckpoint',
  'parentsBring', 'facilitatorProvides',
  'cost', 'costJustification',
  'reviewerNotes',
];

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const tabName = process.env.GOOGLE_SUBMISSIONS_TAB || 'Submissions';
    const credsRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!sheetId || !credsRaw) {
      return res.status(500).json({ error: 'Missing GOOGLE_SHEET_ID or GOOGLE_SERVICE_ACCOUNT_JSON' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    // Honeypot — `website` is a hidden field humans never see. If a bot
    // fills it, we silently 200 without writing or notifying. Real users
    // submit with `website === ''`.
    if (body.website && String(body.website).trim().length > 0) {
      return res.status(200).json({ ok: true });
    }

    const errors = validate(body);
    if (errors.length) {
      return res.status(400).json({ error: 'Validation failed', fields: errors });
    }

    let creds;
    try { creds = JSON.parse(credsRaw); }
    catch (e) { return res.status(500).json({ error: 'GOOGLE_SERVICE_ACCOUNT_JSON not valid JSON' }); }
    if (creds.private_key) creds.private_key = creds.private_key.replace(/\\n/g, '\n');

    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    const row = COLUMNS.map((col) => {
      switch (col) {
        case 'submittedAt': return new Date().toISOString();
        case 'status': return 'pending';
        case 'skills':
        case 'parentsBring':
        case 'facilitatorProvides':
          return Array.isArray(body[col]) ? body[col].filter(Boolean).join('\n') : '';
        case 'reviewerNotes': return '';
        default: return String(body[col] || '');
      }
    });

    const lastCol = String.fromCharCode('A'.charCodeAt(0) + COLUMNS.length - 1);
    const range = `'${tabName.replace(/'/g, "''")}'!A:${lastCol}`;
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    });

    // Fire-and-forget reviewer notification — failures here must not
    // break the user's submit. Skips silently if env vars are unset.
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = `${proto}://${req.headers.host}`;
    notifyReviewer({ ...body, host }).catch(() => {});

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
};

async function notifyReviewer(b) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL;
  if (!apiKey || !to) return;
  const from = process.env.NOTIFY_FROM || 'Alpha Anywhere <onboarding@resend.dev>';
  const subject = `New Spark submitted: ${b.name || 'Untitled'}`;
  const reviewUrl = `${b.host}/review.html`;
  const html = [
    `<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;line-height:1.5;color:#072256;max-width:560px">`,
    `<h2 style="margin:0 0 8px">${escapeHtml(b.name || 'Untitled')}</h2>`,
    `<p style="margin:0 0 16px;color:#8291AA">${escapeHtml(b.oneLiner || '')}</p>`,
    `<table style="width:100%;border-collapse:collapse;font-size:14px">`,
    row('Submitter', `${escapeHtml(b.submitterName || '')} &lt;${escapeHtml(b.submitterEmail || '')}&gt;`),
    row('Chapter',   escapeHtml(b.chapter || '')),
    row('Pillar',    escapeHtml(b.category || '')),
    row('Ages',      escapeHtml(b.ages || '')),
    `</table>`,
    `<p style="margin:24px 0 0"><a href="${reviewUrl}" style="background:#072256;color:white;padding:12px 22px;border-radius:999px;font-weight:700;text-decoration:none;display:inline-block">Review submission →</a></p>`,
    `</div>`,
  ].join('');
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html }),
  });
}

function row(k, v) {
  return `<tr><td style="padding:4px 12px 4px 0;color:#8291AA;font-weight:600">${k}</td><td style="padding:4px 0">${v}</td></tr>`;
}
function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const CANONICAL_CATEGORIES = [
  'Teamwork + Leadership',
  'Storytelling + Public Speaking',
  'Entrepreneurship + Financial Literacy',
  'Relationship Building + Socialization',
  'Grit + Hard Work',
];

function validate(b) {
  const errors = [];
  const required = ['name', 'oneLiner', 'category', 'ages', 'participation', 'skill',
    'hardCheckpoint', 'challengingCheckpoint', 'impossibleCheckpoint',
    'cost', 'submitterName', 'submitterEmail', 'chapter'];
  required.forEach((f) => {
    if (!b[f] || !String(b[f]).trim()) errors.push(f);
  });
  if (b.category && !CANONICAL_CATEGORIES.includes(b.category)) errors.push('category');
  if (b.submitterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.submitterEmail)) {
    errors.push('submitterEmail');
  }
  return errors;
}
