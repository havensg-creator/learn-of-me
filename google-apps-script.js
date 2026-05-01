/**
 * Learn of Me — Google Apps Script
 *
 * This script lives inside your Google Sheet and does three things:
 * 1. Adds a "Learn of Me" menu with a "Rebuild Site" button
 * 2. Auto-triggers a rebuild when you change an episode status to "published"
 * 3. Logs every rebuild so you can see what happened
 *
 * SETUP: See the SETUP-GUIDE.md file for step-by-step instructions.
 */

// ============================================================
// CONFIGURATION — your Netlify build hook URL
// ============================================================
var NETLIFY_BUILD_HOOK = "https://api.netlify.com/build_hooks/69ea79acba187c2389761c2c";

// ============================================================
// MENU — adds "Learn of Me" to the Google Sheets menu bar
// ============================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Learn of Me")
    .addItem("Rebuild Site Now", "manualRebuild")
    .addItem("View Rebuild Log", "showLog")
    .addToUi();
}

// ============================================================
// MANUAL REBUILD — triggered from the menu button
// ============================================================
function manualRebuild() {
  var result = triggerNetlifyBuild("Manual rebuild from Google Sheets menu");

  if (result.success) {
    SpreadsheetApp.getUi().alert(
      "Site rebuild triggered! Your site will update in about 1-2 minutes."
    );
  } else {
    SpreadsheetApp.getUi().alert(
      "Rebuild failed: " + result.error + "\n\nTry again, or run this in Terminal:\n" +
      'curl -X POST ' + NETLIFY_BUILD_HOOK
    );
  }
}

// ============================================================
// AUTO-TRIGGER — fires when you edit the spreadsheet
// This is an INSTALLABLE trigger (not a simple onEdit)
// so it has permission to make external HTTP calls.
// ============================================================
function onSheetEdit(e) {
  try {
    var sheet = e.source.getActiveSheet();
    var sheetName = sheet.getName();

    // Only watch the "episodes" tab
    if (sheetName !== "episodes") return;

    var range = e.range;
    var row = range.getRow();
    var col = range.getColumn();

    // Skip header row
    if (row <= 1) return;

    // Find the "status" column
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var statusCol = headers.indexOf("status") + 1; // 1-indexed

    if (statusCol === 0) return; // No "status" column found

    // Only trigger if the status column was edited
    if (col !== statusCol) return;

    // Only trigger if the new value is "published"
    var newValue = e.value;
    if (newValue !== "published") return;

    // Get the episode question for the log
    var questionCol = headers.indexOf("question") + 1;
    var episodeName = questionCol > 0
      ? sheet.getRange(row, questionCol).getValue()
      : "Row " + row;

    triggerNetlifyBuild('Episode published: "' + episodeName + '"');

  } catch (err) {
    logRebuild("ERROR in auto-trigger: " + err.message, false);
  }
}

// ============================================================
// CORE — hits the Netlify build hook
// ============================================================
function triggerNetlifyBuild(reason) {
  try {
    var options = {
      method: "POST",
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(NETLIFY_BUILD_HOOK, options);
    var code = response.getResponseCode();

    if (code === 200 || code === 201) {
      logRebuild(reason, true);
      return { success: true };
    } else {
      var msg = "HTTP " + code + ": " + response.getContentText();
      logRebuild(reason + " — FAILED: " + msg, false);
      return { success: false, error: msg };
    }

  } catch (err) {
    logRebuild(reason + " — ERROR: " + err.message, false);
    return { success: false, error: err.message };
  }
}

// ============================================================
// LOGGING — keeps a record of every rebuild attempt
// ============================================================
function logRebuild(reason, success) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName("_rebuild_log");

  // Create the log sheet if it doesn't exist
  if (!logSheet) {
    logSheet = ss.insertSheet("_rebuild_log");
    logSheet.appendRow(["Timestamp", "Status", "Reason"]);
    logSheet.setColumnWidth(1, 180);
    logSheet.setColumnWidth(2, 80);
    logSheet.setColumnWidth(3, 400);
    // Move it to the end so it's out of the way
    ss.moveActiveSheet(ss.getNumSheets());
  }

  logSheet.appendRow([
    new Date().toLocaleString(),
    success ? "OK" : "FAILED",
    reason
  ]);
}

function showLog() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName("_rebuild_log");

  if (!logSheet) {
    SpreadsheetApp.getUi().alert("No rebuild log yet. Trigger a rebuild first!");
    return;
  }

  // Just switch to the log sheet
  ss.setActiveSheet(logSheet);
}
