/**
 * Fetches episode data from Google Sheets using a simple API key.
 * The sheet must be shared as "Anyone with the link can view."
 *
 * Environment variables:
 *   GOOGLE_SHEETS_API_KEY — your Google Cloud API key (restricted to Sheets API)
 *   GOOGLE_SHEET_ID       — the spreadsheet ID from the sheet URL
 */

const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

async function fetchSheet(sheetId, apiKey, tabName) {
  const url = `${SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(tabName)}?key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Sheets API error for tab "${tabName}": ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  const rows = data.values || [];
  if (rows.length < 2) return [];

  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] || "";
    });
    return obj;
  });
}

module.exports = async function () {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!apiKey || !sheetId) {
    console.warn(
      "[episodes] Missing GOOGLE_SHEETS_API_KEY or GOOGLE_SHEET_ID — returning empty data."
    );
    return { all: [], published: [], sources: [] };
  }

  try {
    // Fetch episodes tab
    const allEpisodes = await fetchSheet(sheetId, apiKey, "episodes");
    const published = allEpisodes.filter((ep) => ep.status === "published");

    // Fetch episode_sources tab
    const sources = await fetchSheet(sheetId, apiKey, "episode_sources");

    console.log(
      `[episodes] Loaded ${allEpisodes.length} episodes (${published.length} published), ${sources.length} sources.`
    );

    // Safety check: if we expected data but got none, fail the build
    // so we don't deploy an empty site over a working one
    if (allEpisodes.length === 0) {
      throw new Error(
        "Google Sheets returned zero episodes. Refusing to build an empty site. " +
        "Check that the sheet is shared publicly and the API key is valid."
      );
    }

    return { all: allEpisodes, published, sources };
  } catch (err) {
    // Fail the build loudly instead of deploying empty content
    console.error("[episodes] FATAL: " + err.message);
    throw err;
  }
};
