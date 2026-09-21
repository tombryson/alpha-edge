# News Feature Uplift Plan

> Design record. Contains staged decisions and implementation history; not a deployment certificate. Use the [system ownership map](../system/README.md) for current rules.

Branch: `feature/news-uplift`

## Current state summary

The news tab implements a two-tier narrative system:
- **Foundation pass** — multi-step pipeline (candidate extraction from portfolio memo → research tasks → xAI web-search validation) that bootstraps a durable thesis ledger
- **Daily pass** — incremental maintenance run against the active ledger

The core design is sound. The thesis model (conviction float, supporting/opposing evidence, invalidation triggers, relationship vocabulary) is professionally structured. The problems are identity stability, prompt information gaps, missing UI surfaces, no manual override layer, and no portfolio-weight awareness.

---

## Phase 1 — Thesis identity and ledger hygiene (P0)

**Problem:** `newsThesisSlug` derives a stable key from `title + timeframe`. The model rephrases titles between runs, creating duplicate theses. Over time the ledger accumulates near-duplicates with diverging conviction. The 20-thesis cap on the daily prompt context means older theses fall off and are silently orphaned.

### 1.1 — Slug-anchored daily prompt

Instead of relying on the model to produce consistent titles, send the active slug list to the daily prompt and require the model to reuse slugs when updating existing theses.

**Backend changes:**
- `loadActiveNewsThesesForPrompt()`: return slug alongside title/status/conviction
- Raise the thesis context cap from 20 to 40, ordered by recency but with a floor that keeps all ACTIVE 1Y theses regardless of age
- Add a `slug` field to `newsNarrativeModelUpdate` in the model payload
- In `persistNewsNarrativePayloadWithCohort`: if the update carries a non-empty slug, use it directly as the upsert key rather than re-deriving from title

**Daily prompt change:**
```
Current active theses (use the slug verbatim when updating an existing thesis):
- [slug: us-recession-risk-1y | 1Y/ACTIVE 68%] US Recession Risk: ...
- [slug: fed-pivot-delay-6m | 6M/ACTIVE 55%] Fed Pivot Delay: ...
```

### 1.2 — Post-run deduplication job

Add a `POST /api/news/deduplicate` endpoint that:
1. Loads all ACTIVE/WATCH theses
2. Groups by `(timeframe, canonical_key)` where `canonical_key = newsFoundationCanonicalThemeKey(title)`  
3. For each group with >1 member: keeps the most recently updated row, copies its conviction/summary to the canonical record, marks duplicates as `SUPERSEDED`
4. Records which slugs were absorbed

Expose a "Deduplicate" button in the UI (admin area of the news tab header). Run automatically after each foundation pass.

### 1.3 — Manual thesis edit + dismiss

Add `PATCH /api/news/theses/{id}` to update title, status, conviction, summary, invalidation_trigger, asset_classes.  
Add `DELETE /api/news/theses/{id}` (soft-delete: sets status to `SUPERSEDED`).

Frontend: expand `LedgerRow` on click to show an inline edit form with fields for title, conviction slider, summary, invalidation trigger, status. Save on blur or explicit button.

---

## Phase 2 — Portfolio-weight-aware prompting (P0)

**Problem:** The model doesn't know what you actually hold. It produces generic macro coverage regardless of whether you are 25% energy or 0% energy.

### 2.1 — Position snapshot in prompt context

Create `buildNewsPortfolioContextForPrompt()` in `news_narratives.go`:
- Queries `portfolio_daily_snapshots` (latest) + `portfolio_overlay_summary` asset class breakdown  
- Produces a compact ordered list:

```
Portfolio exposure (current weights, descending):
- ENERGY_PRODUCERS: 22.4% current / 20% target
- GOLD: 18.1% current / 18% target
- URANIUM: 9.2% current / 10% target
...
```

Inject this block into both the daily prompt and the foundation validation prompt. The model can now weight its attention proportionally and flag thesis-position conflicts (e.g., high gold exposure when the gold thesis conviction drops).

**Backend:** add `loadNewsPortfolioWeightsForPrompt() string` — queries `getCurrentPortfolioMix` logic (already exists as `buildCurrentPortfolioMixRows`) and formats as lines.

### 2.2 — Sentiment field per item and per thesis update

Add `sentiment TEXT NOT NULL DEFAULT 'NEUTRAL'` to `news_items` and `news_thesis_updates` tables (migration 0003).  
Values: `BULLISH`, `BEARISH`, `NEUTRAL`.

Update model payload structs and prompts to request this field. Add normalise step in `normaliseNewsNarrativePayload`.

**UI:** colour-code news items by sentiment in the (currently absent — see Phase 3) news items list. Add sentiment filter buttons alongside the timeframe filters in the ledger sidebar.

### 2.3 — Sector-relevance scoring

After each run, compute `relevance_score` per thesis = sum of `position_weight` for each asset class in `thesis.asset_classes`. Store in a computed column or in-memory sort key. Use as secondary sort in the ledger (after timeframe), so theses that affect your largest positions surface first.

---

## Phase 3 — Missing UI surfaces (P1)

### 3.1 — News items list

The `news_items` are fetched from the backend but never rendered. Add a scrollable "Latest items" panel below the daily brief summary, replacing or augmenting the static market context grid.

Each row: headline (bold), timeframe badge, sentiment badge, impact score bar, asset class chips. Click to expand summary + sources.

Sort: impact_score DESC (already how the backend returns them).

### 3.2 — Conviction history sparkline

Add `news_thesis_conviction_history` table:
```sql
CREATE TABLE IF NOT EXISTS news_thesis_conviction_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thesis_id INTEGER NOT NULL,
    run_id INTEGER NOT NULL,
    conviction REAL NOT NULL,
    relationship TEXT NOT NULL DEFAULT '',
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (thesis_id) REFERENCES news_theses(id) ON DELETE CASCADE
);
```

On every thesis upsert in `persistNewsNarrativePayloadWithCohort`, insert one row into this table with the old conviction (before update) — this captures the trajectory.

**UI:** in the `LedgerRow` expanded state, render a 60px wide sparkline (SVG path, no library needed) showing conviction over the last 10 runs. Green/red based on trend direction.

### 3.3 — Thesis detail drawer

Replace the current hover-tooltip pattern in `LedgerRow` with a slide-in drawer (right panel, replaces the selected evidence panel when a ledger entry is clicked):

Contents:
- Title, timeframe badge, status badge, conviction % + sparkline
- Full summary
- Supporting evidence (collapsible)
- Opposing evidence (collapsible)  
- Invalidation trigger (highlighted box)
- Asset class chips (clickable to filter ledger)
- Update history timeline: list of thesis_updates ordered by created_at DESC, each showing relationship badge, conviction delta, evidence text, run date

### 3.4 — Market context persistence and trend

Currently `market_context` is regenerated from scratch each run with no comparison to prior runs. Change to:

- Store market context per run (already done — `market_context_json` in `news_runs`)
- Add endpoint `GET /api/news/market-context-history?limit=10` that returns the last N contexts
- In the `MarketContextGrid`, show ▲/▼ indicators next to items that appeared/disappeared vs the previous run's context

---

## Phase 4 — Prompt quality and reliability (P1)

### 4.1 — Output token budget

Raise daily run max_output_tokens from 2,200 → 4,000.  
Raise foundation validation from 7,200 → 10,000 (this already passes a large context).

Evidence fields are currently truncated in many runs. The extra tokens have a marginal cost vs the quality gain.

### 4.2 — Daily run prior-run context

Inject the previous run's news items into the daily prompt so the model knows what was already covered:

```
Yesterday's items (do not repeat as fresh news unless significantly developed):
- [1D/0.72] Copper futures fell 3% on Chinese PMI miss (COPPER, BASEMETALS)
- [1D/0.65] Fed minutes signal higher-for-longer (rates, macro)
```

This prevents the model recycling the same headline for multiple consecutive days.

**Backend:** in `buildNewsDailyPrompt`, add a `recentItems string` parameter loaded from the previous DAILY run's news_items (top 8 by impact_score).

### 4.3 — Async daily run

Mirror the foundation job's async pattern for the daily run. Currently the daily handler is synchronous with a 60s timeout — a slow xAI response will timeout the HTTP connection and show an error even if the request eventually succeeds on xAI's side.

Changes:
- Add `news_daily_jobs` table (or extend `news_foundation_jobs` with `mode = DAILY`)
- `POST /api/news/run` returns a job ID immediately, runs the xAI call in a goroutine
- Frontend polls `GET /api/news/jobs/{id}` (already exists for foundation) every 2s
- On success, reload the brief

### 4.4 — Asset class code fallback

`normaliseNewsAssetClasses` currently silently drops codes that don't match. Add a fallback: if `normalizePrimaryAssetClass(value)` returns empty, try fuzzy-matching against display names (case-insensitive prefix match). Log dropped codes at warn level so they're visible in Fly logs.

---

## Phase 5 — Multi-industry depth (P2)

### 5.1 — Per-industry research lanes

`buildNewsFoundationResearchTasks` currently hardcodes 9 generic research lanes (macro_cycle, commodities_energy, etc.). Make this dynamic:

- For each asset class where `position_weight > 5%`, generate a dedicated research lane with a targeted query
- Example: URANIUM at 9.2% → `"uranium spot price, enrichment capacity, reactor builds, US/EU utility contracting, Kazakh production, and Sprott physical demand over the last 12 months"`
- This ensures the model actually searches your high-conviction positions rather than coverage being diluted by generic market breadth

**Backend:** `buildNewsFoundationResearchTasks` takes current portfolio weights as input. Weights come from `buildCurrentPortfolioMixRows` (already implemented).

### 5.2 — Industry-specific invalidation checks

Add `invalidation_check_due_at` column to `news_theses`. When a thesis has an invalidation_trigger defined and hasn't been updated in >7 days, flag it in the UI (amber indicator on the LedgerRow).

The daily prompt includes a "stale thesis" block: theses where the last update was >7 days ago and their invalidation trigger — the model is explicitly asked to web-search each trigger and determine if it has fired.

### 5.3 — Cross-thesis correlation map

Add a `news_thesis_correlations` table linking thesis pairs with a `relationship_type` (AMPLIFIES / CONFLICTS / INDEPENDENT) and `correlation_strength` float.

Populated by a dedicated pass (run quarterly or after foundation): send the full active thesis list to Grok and ask it to identify which theses reinforce or conflict each other.

**UI:** in the thesis detail drawer, show "Related theses" section with amplifier/conflict labels.

---

## Implementation sequence

| Phase | Item  | Effort | Value |
|-------|-------|--------|-------|
| 1     | 1.1 Slug-anchored prompt       | S  | Critical — stops ledger rot |
| 1     | 1.2 Post-run deduplication     | M  | Critical — cleans existing DB |
| 1     | 1.3 Manual thesis edit/dismiss | M  | High — human override layer |
| 2     | 2.1 Portfolio weights in prompt| S  | High — personalises coverage |
| 2     | 2.2 Sentiment field            | S  | Medium — enables filtering |
| 3     | 3.1 News items list            | S  | High — items are hidden today |
| 3     | 3.3 Thesis detail drawer       | M  | High — replaces hover pattern |
| 3     | 3.2 Conviction sparkline       | M  | Medium |
| 4     | 4.1 Token budget               | XS | Quick win |
| 4     | 4.2 Prior-run context          | S  | Medium |
| 4     | 4.3 Async daily run            | M  | Medium |
| 4     | 4.4 Asset class fallback       | S  | Low — defensive |
| 3     | 3.4 Market context trends      | M  | Medium |
| 5     | 5.1 Dynamic research lanes     | M  | High — industry depth |
| 5     | 5.2 Invalidation checks        | M  | Medium |
| 5     | 5.3 Cross-thesis correlation   | L  | Future |

Effort: XS = <1h, S = 1-2h, M = half-day, L = full day+

---

## DB migrations required

- **0003**: `sentiment TEXT NOT NULL DEFAULT 'NEUTRAL'` on `news_items` and `news_thesis_updates`
- **0004**: `news_thesis_conviction_history` table
- **0005**: `invalidation_check_due_at DATETIME` on `news_theses`
- **0006**: `news_thesis_correlations` table (Phase 5)

---

## Non-goals

- Real-time streaming news ingestion (out of scope — model-generated briefs are the source of truth)
- Ticker-level news (this is macro/sector, not individual stock news)
- Automated trading signals from news sentiment (signals come from Q4/regime, not narrative)
