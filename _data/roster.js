/**
 * Fetches the teacher roster from Google Sheets using a simple API key.
 * The sheet must be shared as "Anyone with the link can view."
 *
 * Environment variables:
 *   GOOGLE_SHEETS_API_KEY — your Google Cloud API key (restricted to Sheets API)
 *   GOOGLE_SHEET_ID       — the spreadsheet ID from the sheet URL
 */

const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

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
      // Fix column swap: in the sheet, "ministry" holds the calling
      // (e.g. "Expository Teacher") and "calling" holds the ministry
      // name (e.g. "Grace to You"). Swap them so the code makes sense.
      if (obj.ministry && obj.calling) {
        const actualCalling = obj.ministry;
        const actualMinistry = obj.calling;
        obj.calling = actualCalling;
        obj.ministry = actualMinistry;
      }
      return obj;
    });

    console.log(`[roster] Loaded ${voices.length} voices.`);
    return voices;
  } catch (err) {
    console.error("[roster] Error fetching from Google Sheets:", err.message);
    return [];
  }
};
