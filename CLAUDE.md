# Model Watch

Model Watch is a static, client-side website that tracks LLM release cadences — inspired by the MacRumors Buyer's Guide.
It predicts whether a new model version is imminent based on each model family's historical average release cycle.

## Tech stack

Pure vanilla stack. No build step, no dependencies, no bundler.

- `index.html` — page structure; two mount points: `#table-container` and `#timeline-container`
- `style.css` — dark-mode-first CSS; `<progress>` elements styled as the cycle meter bar
- `data.js` — defines the `MODELS` array (loaded before `app.js` via script order)
- `app.js` — all rendering and business logic; runs on `DOMContentLoaded`

## Data model (`data.js`)

Each entry in `MODELS` has:

```js
{
  id: string,          // unique key (e.g. "claude", "openai")
  name: string,        // display name
  lab: string,         // developer name shown in table
  labColor: string,    // hex; used for colored dots and lab column
  icon: string,        // Unicode glyph used as visual marker
  tier: "frontier" | "open" | "chinese",  // used for future filtering
  description: string,
  releases: [{ version, date, note }],    // chronological, oldest first
  notes: string,       // human summary of cadence patterns
}
```

**`data.js` must be kept current.** Add new releases as they ship. The verdict computed for each model is only as
accurate as the release history. When a release is announced, append it to the relevant `releases` array — oldest-first
order is required by `computeMetrics`.

## Core logic (`app.js`)

`computeMetrics(model)` — averages all inter-release gaps to produce `avgCycleDays`, then computes `pct = daysSinceLast
/ avgCycleDays`. Verdict thresholds:

- `pct < 0.5` → **CURRENT** (green)
- `0.5 ≤ pct < 0.8` → **MID-CYCLE** (amber)
- `pct ≥ 0.8` → **UPDATE DUE** (red)

Models with only one release get `verdict = "CURRENT"` with no cycle bar.

Special case: if the latest release version is `"Claude Fable 5"`, the verdict cell renders `?` (suspended model, not
available). This hardcoded check in `renderTable` should be generalized if more models need this treatment — add a
`suspended: true` flag to the release entry instead.

`renderTimeline()` — builds a reverse-chronological timeline grouped by month. Current-year months render inline; older
months collapse into `<details>` elements grouped by year.

`refresh()` — sorts all models by latest release date (descending) and re-renders the table. Called once on load; no
polling.

## Adding a new model family

1. Add an entry to the `MODELS` array in `data.js` following the schema above.
2. Choose a unique `id`, a distinct `icon` glyph, and assign `tier`.
3. Populate `releases` oldest-first with accurate ISO dates.

## Adding a release to an existing model

Append to the model's `releases` array in `data.js`. Keep chronological order (oldest → newest). The last element is
always treated as the latest release.
