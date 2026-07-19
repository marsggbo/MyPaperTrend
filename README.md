# 📈 MyPaperTrend

Track your **Google Scholar** citations over time and see the trend chart **right on your Scholar profile page** — zero config, local-first, no scraping API, no account.

<p align="center"><em>Install → open your Scholar profile → a citation-trend panel appears at the top of the page.</em></p>

---

## Why it works where scrapers get blocked

Server-side scraping of Google Scholar gets CAPTCHA'd fast. MyPaperTrend instead runs a
**content script that reads the page you already opened** in your own logged-in session —
it makes *no extra network request*, so there is nothing for Google's anti-bot to detect.

## Features

- 📊 **Trend overlay** on your Scholar profile: total-citations chart with a hover crosshair
  showing **date · total citations · daily new**, plus a **click-to-expand per-paper** list
  (each paper opens its own trend chart, one at a time).
- 🎯 **Pagination-proof total**: the overall number is read from Scholar's own metrics box
  (Citations / h-index / i10), so it's correct even when the paper list is paginated. Per-paper
  history updates for whatever papers are shown — click *Capture all pages* to include the rest.
- 👤 **Multi-profile safe**: your own profile is tracked automatically; visiting someone else's
  profile shows an opt-in prompt and stores nothing unless you choose to track it — different
  people's data never mix (each profile is a separate document).
- 🗂 **Full dashboard** (click *Full dashboard*): stat cards, all-time trend, recent
  milestones, per-paper trend charts, search & sort, **NEW** badges, profile switcher.
- 💡 **Auto metadata**: authors, venue, a one-line **TL;DR**, abstract and
  arXiv/DOI/PDF links (via the free Semantic Scholar API).
- 💾 **Local-first**: history lives in your browser (`chrome.storage.local`). Export/import
  JSON any time.
- ☁️ **Optional sync**: mirror to a **GitHub repo** (backup / public dashboard feed). Google
  Drive planned.
- 🔌 **Pluggable**: data source (DOM by default; ScraperAPI/SerpApi as fallback) and storage
  are swappable behind a fixed JSON contract — see [`docs/SCHEMA.md`](docs/SCHEMA.md).

## Install (unpacked)

1. Download / clone this repo.
2. Open `chrome://extensions` and enable **Developer mode** (top-right).
3. Click **Load unpacked** and select the `MyPaperTrend/` folder.
4. Open [your Google Scholar profile](https://scholar.google.com/citations) — the panel appears.

> A packaged `MyPaperTrend.zip` is attached to each [release](../../releases) for convenience
> (Chrome still requires Developer-mode “Load unpacked”, or you can drag the unzipped folder in).

## Usage

- Every visit to your Scholar profile records that day's numbers. Revisit over days/weeks to
  build the trend.
- The profile lists ~20 papers by default; click **Capture all pages** in the panel to load
  and record *every* paper (and detect newly added ones).
- Open the **popup** (toolbar icon) for a quick summary, export/import, and settings.

## Privacy

All data stays on your device by default. Nothing is sent anywhere unless you explicitly
connect a GitHub repo (your token is stored locally and never committed). Metadata lookups,
if enabled, send only the paper title to Semantic Scholar.

## Docs

- [Architecture](docs/DESIGN.md)
- [Data contract (schema)](docs/SCHEMA.md)

## Related

Companion public dashboard: <https://marsggbo.github.io/citation-tracker/> — MyPaperTrend
reuses its data format and chart logic.

## License

MIT © marsggbo
