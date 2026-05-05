/**
 * Fetches the teacher roster from Google Sheets using a simple API key.
 * The sheet must be shared as "Anyone with the link can view."
 *
 * Environment variables:
 *   GOOGLE_SHEETS_API_KEY — your Google Cloud API key (restricted to Sheets API)
 *   GOOGLE_SHEET_ID       — the spreadsheet ID from the sheet URL
 */

const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

// Known role labels that belong in the `calling` field. If a row has the
// calling and ministry columns reversed (or someone adds a new role), this
// list is the source of truth for what counts as a "calling."
// Add new role labels here as you add them to the sheet.
const KNOWN_CALLINGS = [
  "Expository Teacher",
  "Evangelist",
  "Pastor",
  "Apologist",
  "Theologian",
  "Bible Teacher",
  "Prophecy Teacher",
];

// Heuristic for when KNOWN_CALLINGS doesn't match. Ministry names are usually
// organization-y (contain words like Ministries, Church, Chapel, Foundation,
// Inc, etc.); callings are short role labels.
const MINISTRY_WORDS = /\b(ministry|ministries|church|chapel|foundation|inc|institute|fellowship|crusade)\b/i;

function looksLikeCalling(value) {
  if (!value) return false;
  if (KNOWN_CALLINGS.includes(value)) return true;
  // Fallback: short (≤3 words) and not ministry-shaped
  const wordCount = value.trim().split(/\s+/).length;
  return wordCount <= 3 && !MINISTRY_WORDS.test(value);
}

function looksLikeMinistry(value) {
  if (!value) return false;
  if (KNOWN_CALLINGS.includes(value)) return false;
  return MINISTRY_WORDS.test(value) || value.trim().split(/\s+/).length >= 2;
}

module.exports = async function () {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!apiKey || !sheetId) {
    console.warn(
      "[roster] Missing GOOGLE_SHEETS_API_KEY or GOOGLE_SHEET_ID — returning empty data."
    );
    return [];
  }

  try {
    const url = `${SHEETS_BASE}/${sheetId}/values/${encodeURIComponent("roster")}?key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Sheets API error: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    const rows = data.values || [];
    if (rows.length < 2) return [];

    const headers = rows[0];
    const voices = rows.slice(1).map((row) => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] || "";
      });
      // Auto-correct column swaps. We don't trust the column order — we look
      // at the values themselves and decide which is the calling and which is
      // the ministry. This works whether the sheet has them in the "right"
      // order, the "wrong" order, or even if someone renames the columns later.
      const a = obj.calling;
      const b = obj.ministry;
      const aKnown = KNOWN_CALLINGS.includes(a);
      const bKnown = KNOWN_CALLINGS.includes(b);

      if (bKnown && !aKnown) {
        // Definitive: ministry field has a known calling label — swap.
        obj.calling = b;
        obj.ministry = a;
      } else if (aKnown && !bKnown) {
        // Already correct, leave alone.
      } else if (!aKnown && !bKnown) {
        // Neither is a known calling — fall back to heuristic.
        const aIsCalling = looksLikeCalling(a);
        const bIsCalling = looksLikeCalling(b);
        if (!aIsCalling && bIsCalling) {
          obj.calling = b;
          obj.ministry = a;
        } else if (looksLikeMinistry(a) && !looksLikeMinistry(b) && b) {
          obj.calling = b;
          obj.ministry = a;
        }
        // else: leave as-is.
      }
      // else: both are known callings (shouldn't happen) — leave alone.

      return obj;
    });

    console.log(`[roster] Loaded ${voices.length} voices.`);
    return voices;
  } catch (err) {
    console.error("[roster] Error fetching from Google Sheets:", err.message);
    return [];
  }
};
