/**
 * Fetches episode data from Google Sheets using a simple API key.
 * The sheet must be shared as "Anyone with the link can view."
 *
 * Environment variables:
 *   GOOGLE_SHEETS_API_KEY — your Google Cloud API key (restricted to Sheets API)
 *   GOOGLE_SHEET_ID       — the spreadsheet ID from the sheet URL
 */

const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

// Security: fields that get rendered into <a href="..."> must be real web
// links only. Anything that isn't http(s) — e.g. a javascript: or data: URL
// slipped into a sheet row — is dropped to "" so it can't become a clickable
// script link on the site.
function safeHref(value) {
  const v = String(value || "").trim();
  return /^https?:\/\//i.test(v) ? v : "";
}

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
    // Sanitize link fields (become href attributes). audio_url is a numeric
    // Buzzsprout id, NOT a URL, so it is intentionally left untouched.
    ["video_url", "notebook_url"].forEach((f) => {
      if (f in obj) obj[f] = safeHref(obj[f]);
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

    if (allEpisodes.length === 0) {
      console.warn("[episodes] Google Sheets returned zero episodes. Check sheet sharing and API key.");
    }

    return { all: allEpisodes, published, sources };
  } catch (err) {
    // Log the error but don't crash the build — let the site deploy
    // so that static assets (like teacher portraits) still go live.
    console.error("[episodes] WARNING: " + err.message);
    console.error("[episodes] Deploying with empty episode data. Check your GOOGLE_SHEETS_API_KEY and GOOGLE_SHEET_ID.");
    return { all: [], published: [], sources: [] };
  }
};
