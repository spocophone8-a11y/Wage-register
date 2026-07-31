# Wage Register — offline local website

A small offline website to track laborers' wages and payments. No internet
and no server needed — just open the HTML file in a browser.

## Files
- `index.html` — main ledger page: every laborer, code, and balance
  (green/black = you owe them, red with a minus = they overpaid you / they owe you)
- `details.html` — opens when you click a laborer's name; shows the full
  history of what was earned and paid, with dates and descriptions
- `add-entry.html` — the entry form: enter a code, date, description, and
  amount. If the code already exists, the name fills in automatically.
  If it's new, type in the name and it registers the laborer.
- `style.css`, `app.js` — styling and logic (don't need to open these directly)

## How to use it
1. Unzip everything into one folder, keeping all files together.
2. Double-click `index.html` to open it in your browser (Chrome, Edge, Firefox — any works).
3. Click **+ New Entry** to record a day's wage or a payment made.
4. Go back to the ledger to see updated balances. Click any laborer's name
   to see their full history.

## Where the data lives
Entries are saved automatically in the browser's local storage on your
computer — nothing is sent anywhere, and it keeps working across sessions
as long as you open the site from the same folder in the same browser.

## Turning this into an Android app (home screen icon)

The site is now a PWA (installable web app) — it has a `manifest.json`,
icons, and a `sw.js` service worker that caches everything so it keeps
working with no internet once installed. To get the install prompt on
Android, Chrome needs to load it over `https://`, so host the folder
somewhere free first:

**Option A — Netlify Drop (no account needed for a quick link)**
1. On a computer, go to https://app.netlify.com/drop
2. Drag the whole `laborer-wages` folder (not the zip) onto the page.
3. It gives you a live `https://...netlify.app` link in seconds. Open that
   link on your Android phone in Chrome.

**Option B — GitHub Pages (free, more permanent, needs a free GitHub account)**
1. Create a new repository on github.com and upload all the files in this folder.
2. Go to the repo's Settings → Pages → set source to the main branch.
3. GitHub gives you a `https://yourname.github.io/reponame/` link. Open it on your phone.

**Then, on the Android phone:**
1. Open the hosted link in Chrome.
2. Tap the ⋮ menu → **Add to Home screen** (or **Install app** if Chrome offers it directly).
3. Confirm — it now has its own icon and opens full-screen, like a real app.
4. After the first open, it keeps working offline (the service worker has cached it).

Note: once you switch to using the hosted link, use that link going forward
(your entries are saved per-website, so keep using the same one) — export to
CSV occasionally as a backup regardless.

## Getting it into Excel
Use the **Export to Excel (CSV)** button on the ledger page any time you
want a backup or a copy in Excel. It downloads a `.csv` file (opens directly
in Excel) with every laborer and every transaction. Use **Import from Excel
(CSV)** to load that file back in later — handy for restoring a backup or
moving the register to another computer.
