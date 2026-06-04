# Rihla — Outreach Route Planner

A lightweight, fully static web app that builds optimized day-by-day outreach
itineraries (mosques, Islamic centers, Quran schools) and exports them as a
branded PDF. No backend — everything runs in the browser.

## Files
- `index.html` — entry point (loads everything below)
- `icons.jsx`, `api.jsx`, `pdf.jsx`, `planner.jsx`, `results.jsx`, `app.jsx`

All files must stay in the same folder. React, Babel and jsPDF load from public CDNs.

## Run locally
Open `index.html` in a browser, or serve the folder:
```
npx serve .
```

## Host it (free options)
- **Netlify Drop** — drag this folder onto app.netlify.com/drop
- **Vercel** — drag-drop or `vercel`
- **GitHub Pages** — push these files, enable Pages on the repo
- **Cloudflare Pages** — point at the repo

`index.html` loads automatically at the root URL.

## Google Maps API key
The app calls Google directly from the browser. Your key needs:
- **Places API (New)** enabled
- **Routes API** enabled

After hosting, restrict the key in Google Cloud Console → Credentials →
**Application restrictions → HTTP referrers**, and add your domain
(e.g. `https://yoursite.com/*`). That makes the browser calls work cleanly and
keeps the key from being abused.

## Notes
- "Preview a sample itinerary" shows the full output and PDF with zero API calls.
- No backend, no accounts. Nothing is sent to a server; nothing is stored beyond
  your browser session.
