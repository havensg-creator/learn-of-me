# Learn of Me — Bulletproof Rebuild Setup

This replaces Zapier entirely. When you're done, your site will auto-rebuild
when you publish an episode, and you'll have a manual button as backup.

## Step 1: Add the Script to Your Google Sheet

1. Open your spreadsheet: https://docs.google.com/spreadsheets/d/1LUktgB_bJ010TWpC_6iVDf1hNijYr3aap6gEBkFY34U
2. Go to **Extensions → Apps Script**
3. Delete any code already in the editor (select all, delete)
4. Open the file `google-apps-script.js` from your Bible Storytelling folder
5. Copy the entire contents and paste it into the Apps Script editor
6. Click the **Save** icon (or Cmd+S)
7. Name the project "Learn of Me Rebuild" (click "Untitled project" at the top)

## Step 2: Set Up the Auto-Trigger

The script needs an "installable trigger" to watch for edits (the simple `onEdit`
can't make external HTTP calls). Here's how to set it up:

1. In the Apps Script editor, click the **clock icon** (Triggers) in the left sidebar
2. Click **+ Add Trigger** (bottom right)
3. Set it up exactly like this:
   - Choose which function to run: **onSheetEdit**
   - Choose which deployment should run: **Head**
   - Select event source: **From spreadsheet**
   - Select event type: **On edit**
4. Click **Save**
5. Google will ask you to authorize the script — click through the permissions:
   - "Review permissions" → choose your Google account
   - If you see "Google hasn't verified this app" click "Advanced" → "Go to Learn of Me Rebuild (unsafe)"
   - Click "Allow"

That's it. The auto-trigger is live.

## Step 3: Test It

1. Go back to your spreadsheet (close the Apps Script tab)
2. Refresh the page — you should see a new **"Learn of Me"** menu in the menu bar
3. Click **Learn of Me → Rebuild Site Now**
4. You should see "Site rebuild triggered!" — check your Netlify deploys to confirm
5. To test the auto-trigger: change any episode's status to something else (like "draft"),
   then change it back to "published" — check the `_rebuild_log` tab to see it logged

## Step 4: Disable Zapier

Once you've confirmed the script works:

1. Go to Zapier
2. Find your Google Sheets → Netlify zap
3. Turn it off (or delete it)

You don't need it anymore.

## How It Works

- **Auto-rebuild:** When you type "published" in the status column of the `episodes` tab,
  the script automatically hits the Netlify build hook. Your site rebuilds in ~1-2 minutes.
- **Manual rebuild:** Click "Learn of Me → Rebuild Site Now" anytime you want to force a rebuild.
- **Rebuild log:** Every rebuild (auto or manual) is logged in a `_rebuild_log` tab so you
  can see exactly when it fired and whether it worked.
- **Daily safety net:** A scheduled task runs once daily to rebuild the site, so even if
  everything else fails, the site stays current within 24 hours.

## Troubleshooting

**"Learn of Me" menu doesn't appear:**
- Refresh the spreadsheet page (Cmd+R)
- Make sure you saved the script in Apps Script

**Auto-trigger isn't firing:**
- Go to Extensions → Apps Script → Triggers (clock icon)
- Make sure the trigger for `onSheetEdit` exists and isn't showing an error
- Check the `_rebuild_log` tab — if there's a FAILED entry, the trigger fired but
  the Netlify call failed

**"Authorization required" popup:**
- Click through the authorization flow again (Step 2, item 5)
- This usually only happens once

**Nothing works and you just need the site rebuilt:**
- Open Terminal on your Mac
- Paste this and press Enter:
  ```
  curl -X POST https://api.netlify.com/build_hooks/69ea79acba187c2389761c2c
  ```
