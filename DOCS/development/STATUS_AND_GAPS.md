# Status And Gaps

Audit date: 29 May 2026.

**Current close-out register:** [19 September migration hardening](PUBLIC_SOURCE.md).
The dated sections below preserve earlier findings. Their implementation/deployment
claims are historical; do not treat them as the current open-task list. The current
register distinguishes shipped work, this branch and operator activation gates.

This is the discrepancy and decision register for Alpha Edge. It exists so the project does not quietly mix live behaviour, intended behaviour, historical docs, and UI experiments.

## Ideal Weight Policy Follow-Up (18 September 2026)

The held-stock Ideal wt column is implemented on `codex/positions-model-weight`.
Its [optional management policy](../system/IDEAL_WEIGHT_MANAGEMENT.md), backend
enforcement and persistent switch are [deployed to UAT v193/v1229](PUBLIC_SOURCE.md),
with production unchanged. Default Off leaves the column visible and removes both new and old individual weight ceilings,
without removing class capacity, statement-backed cash, signals or Q3/Q4 gates.
The old `stock_analysis.allocation` purchase ceiling is removed from this path.

On uses the same backend-owned research target as the display, with purchases
capped at 100%, stock reductions triggered at 150% down to 125%, and Core ETF
reductions at 125% down to 100%. Two fresh, distinct daily observations and a
minimum proposed sale of max(A$100, 0.25% of portfolio) are required. One proposal
per security must coexist safely with signal/risk actions and recorded execution.
No broker automation or frozen research approval is authorised.

Migration 0005 persists mode, daily evidence and reduction provenance. Existing
Alert Stack/detail/History surfaces are reused, with a shield control by Ideal wt
and a Portfolio class review marker. Paused Adds remain visible. Statement
corrections invalidate confirmation; execution requires the reviewed amount.
Tests cover opt-in, stale evidence, duplicate days, competing reductions,
recorded-trade preservation and quantity reconciliation. Run observation-only
validation of turnover and proposal frequency before production enablement.
This follow-up supersedes older claims below that the suggestion column is only
proposed. Live UAT verification left the policy Off; full execution paths were
tested in isolation, not by creating trades against the deployed account.

## Frontend Dependency Follow-Up (12 September 2026)

Implemented locally; not deployed. The seven npm findings are cleared, Next and
React are updated, normal peer validation is restored, and Docker/CI target
Node 24 LTS. Production builds now enforce TypeScript checks. Authentication,
data and financial rules are unchanged. See the [verification and remaining
release checks](DEPENDENCY_HARDENING_2026-09-12.md); this does not certify the Go
backend, operating-system packages or currently deployed frontend.

## Monitoring Coverage Follow-Up (11 September 2026)

Implemented locally; not yet deployed. Analysis no longer labels CDF plus TMS
as full coverage when a configured stock Outperform connection is missing.
Analysis, Positions and ETF sidebar indicators share the same profile-aware
coverage calculation. Commodity benchmark mappings and script/ticker aliases
are shared with Alerts. Missing requirements are named on hover; unavailable
configuration/profile/connection data stays neutral. Existing layout and
backend trade rules are unchanged. See [the contract](../system/ANALYSIS_AND_COUNCIL.md#monitoring-coverage-11-september-2026)
and [regression tests](TESTING.md#monitoring-coverage-2026-09-11).

## Executive Review Follow-Up (8 September 2026)

UAT frontend follow-up (deployed 10 September 2026 from `b943f84`):
`codex/context-panel-core-migration` implements optional ETFs / Security / Shape
tools, with Core policy controls and unfunded targets in the sidebar. The
10 September refinement restores the compact, read-only Positions ratio chips
and removes inline allocation bars and target rows. Double-clicking
a Positions security opens its details in the sidebar, with onward History access.
Numbers/Ring ETF layouts are retired; Line Fill, Capital Map and the independent
Sleeve Summary remain. The ETF cards/header reuse the previous styling; the extra
Asset class view and its backend projection were removed. Allocation policy and advisory research
authority are unchanged. Production and the backend are unchanged; see
[Portfolio Tools Migration](../decisions/CONTEXT_PANEL_MIGRATION.md) for scope and verification.

The newer [executive review](PUBLIC_SOURCE.md)
and [brainstorm assessment](PUBLIC_SOURCE.md) supplement the
older register below. Implementation `37c3f29` addresses the R2 evidence checks:

- Optional traded units in both Alert Stack dialogs and the Positions action
  drawer; omitted units use an execution-time estimate with +/-10% tolerance.
- Class reductions check each holding's quantity. Price falls alone, no
  movement, materially wrong sizes and unresolved identity matches do not
  count as verified execution. Reported units use a numerical tolerance only.
- Strong/Weak TMS trims retain the existing 20%/5% rules. Unclassified legacy
  trims retain an explicitly labelled direction-only check.
- External actions are manually recorded, not falsely verified by IG. The
  supported import assumption remains a complete single-broker IG statement.
- Execution clicks do not update displayed broker holdings or credit cash.
  Same-day, older and other-account statements cannot reconcile an action
  when an execution baseline statement exists.
- Research stays live and advisory. A Positions suggestion column is proposed,
  not implemented; a binding draft-portfolio approval workflow is deferred.

R1 is fixed. R3 now rejects older/different-account statements, validates required
fields and converted holdings-plus-cash totals, preserves external holdings,
and rolls back required import writes on error. Same-day corrections retain the
statement ID and do not trigger action reconciliation. This is a current-book
safety fix, not proof of extraction completeness: balanced OCR errors,
zero-value omissions, original-document retention and append-only correction
history remain limitations.

R6 now persists receipts before acknowledgement, resumes pending work and uses
the existing failed-signal UI for interrupted/failed processing. Seven-day
cleanup removes resolved transport records, not alerts or decisions. Exact-once
domain effects, arbitrary-delay legacy duplicate recognition and multi-process
worker leasing remain limitations; see [Webhook Contract](../api/WEBHOOK_CONTRACT.md).

R5 cash backing is now deployed to UAT (8 September 2026): one statement-cash
limit, pending-purchase commitments, exclusion of pending proceeds/deposits,
and shared atomic purchase recording from Positions and the Alert Stack.
Overallocated class proposals remain visible but cannot produce funded tickets.
See [Pooled Capital Policy](../system/POOLED_CAPITAL_DEPLOYMENT_POLICY_V1.md).

R7 caller validation and submission retry safety are deployed to UAT as of
8 September 2026; production unchanged. The proxy validates the existing user token with the backend before
using its Council credential. Both browser and proxy submit jobs once; ambiguous
outcomes show as uncertain rather than confirmed failures. No new key is needed.
Durable cross-device idempotency and automatic recovery of unknown job IDs still
require an Intelligence contract. See [Analysis and Council](../system/ANALYSIS_AND_COUNCIL.md).

R5 purchase permissions are deployed to UAT (9 September 2026), production
unchanged: approved-class/Q3 spending ceilings, Q4 purchase pauses, required-feed
registration and initial direction, Equity-relative gating, and explicit
already-executed purchase exceptions with statement unit reconciliation.
TMS re-entry under stock CDF Sell remains valid inside the other limits.
UAT currently lacks an initial Q4 state despite registered connections, so its
open affected purchase projection correctly reports `RISK_UNKNOWN`; the rollout
did not invent that baseline. Existing provider-freshness failures also remain.

R4 class-budget integration is deployed to UAT (9 September 2026), production
unchanged: Analysis
advice, the ETF ledger and purchases share the approved class budget less the
larger of effective ETF target or occupied ETF capital. Automatic momentum is
retained; unused capacity is not ring-fenced; unsold/pending ETFs still count.
The static stock ratio is removed from this path. Active holdings provide a common
valuation source, and pending stock/ETF purchases are counted separately without
double subtraction. Model failure pauses buys while keeping exits available.
Live research remains display-only. Existing stored per-stock weights still cap
individual stock tickets; binding stock approval and multiple funds per class are
not introduced. R4 is therefore narrowed, not declared completely solved.
Cash-source provenance matching is still absent; confirmed
cash can be explicitly reassigned, not inferred from an expected sale.
R2 still cannot prove individual fills from ambiguous net
movements or adjust corporate actions. Do not describe all P1 work as complete.
Deployment status is recorded in [Operations](PUBLIC_SOURCE.md).

## Severity Definitions

| Severity | Meaning |
| --- | --- |
| Critical | Can route signals incorrectly, corrupt workflow state, mislead financial action, or affect production data safety. |
| High | Can mislead users or engineers about business logic, API contracts, or persisted state. |
| Medium | Causes implementation drift, UI inconsistency, or missing test confidence. |
| Low | Terminology, polish, or cleanup issue with limited behavioural risk. |

## Current Critical And High Gaps

### 1. ATR/TMS Stop Severity Versus CDF State

Severity: Critical.

Live behaviour:

- plain CDF `sell` updates `security_positions.position_state = SELL`
- actionable visible partial sell path is `cdf_sell_zone`, normalised internally to `SELL_DOWN` and shown as `Sell Down 20%`
- TMS stop alerts can now resolve to `SELL_50` when the payload includes embedded CDF BUY state

Intended business logic:

- CDF state alone never creates a full liquidation
- ATR/TMS stop-loss severity should depend on the current CDF state
- proceeds belong to asset-class tactical cash unless the action is part of Q3/Q4 portfolio-risk reduction

Issue:

The backend now expresses `SELL_50` versus legacy full `SELL` when TMS sends `cdf_state`. Target UI copy is `Sell Down 50%` versus `Exit`. Live TradingView alerts must be updated to include that field.

Required decision/work:

- update live TradingView TMS alerts from the revised PineScript
- add UI regression coverage for the two labels

### 2. API Summary Endpoint Mutates Workflow State

Severity: High. **Resolved.**

`loadOverlaySignalStateReadOnly()` now returns defaults without writing when no row exists. `POST /api/portfolio-overlay/sync` is the explicit sync endpoint. Two regression tests confirm that polling `GET /api/portfolio-overlay-summary` cannot create workflow residue.

### 3. Versioned Migrations And Recovery

Severity: High. **Deployed to UAT v188 on 12 September; production rollout remains open.**

The new runner has a frozen effective-schema baseline, a distinct checksummed
ledger, consistent mandatory pre-upgrade backups, transactional rollback and
no-clobber isolated recovery tools. Production startup and feature schema helpers
no longer rerun legacy bootstrap backfills. Synthetic-record preservation,
older supported additions, repeat/concurrent startup and interruption recovery
are regression-tested. An isolated full UAT backup adopted without business DDL
and preserved every record across migration and restoration. Live baseline
adoption and authenticated reads are verified in the
[release record](PUBLIC_SOURCE.md), including the
initial SQLite integrity-check false positive and driver correction. This is a
new implementation, not a validation of the absent earlier runner.

Read-only inspection established UAT volume auto-snapshots with five-day retention.
Restoring a Fly snapshot, off-volume retention and production backup verification
remain open. See [database operations](../operations/DATABASE_UPGRADES_AND_RECOVERY.md)
for evidence, compatibility boundaries and release gates. Production was not
changed; a Fly snapshot was not restored.

### 4. Q3 Risk-On Needs Regression Protection

Severity: High.

Intended behaviour:

- visible lightweight Portfolio Risk action
- no forced buy
- no adjustment cells
- no statement wait
- no portfolio target
- no baseline approval

Risk:

This workflow has already drifted into confusing language and wrong actions before.

Required work:

- keep Playwright and backend tests covering it
- use approved button language: `Review Portfolio Shape`, `Mark Reviewed`

### 5. Portfolio Reserve Cash Versus Tactical Class Cash

Severity: High.

Issue:

The system has two different cash concepts:

- portfolio reserve cash from Q3/Q4/portfolio target reductions
- tactical class cash from CDF/TMS/class-level deployment gating

Risk:

If these are mixed in UI or backend calculations, the app can imply capital is available in the wrong scope.

Required work:

- make both concepts explicit in API response contracts
- improve UI labels once backend state is unambiguous
- test cash movement by workflow source

### 5A. Commodity Theme Evidence Does Not Yet Control Live Position Caps

Severity: High.

The live Markets slice persists scoped theme events and renders an advisory
aggregate capacity view. It does not calculate the full research target, live
permitted target, actual holding, and required deleverage for each security.
The aggregate view can also count CDF and `OUTPERFORM` conditions from different
securities, which is valid as market context but invalid as a personal sizing
authority.

The agreed policy is [Commodity Theme Live-Cap Policy v1.0](../decisions/COMMODITY_THEME_LIVE_CAP_POLICY_V1.md)
alongside [Pooled Capital Deployment Policy v1.0](../system/POOLED_CAPITAL_DEPLOYMENT_POLICY_V1.md):
with core fund / commodity and the existing CDF state confirmed, `OUTPERFORM`
may permit the final 25% concentration increment but never creates or enlarges
a purchase ticket. A valid `OUTPERFORM` loss emits an auditable
`REDUCE_TO_OUTPERFORM_LIMIT` signal when an actual holding exceeds that limit.
An equity-regime `BUY -> SELL` emits one class-scoped 20% Strong Trim for
producer-equity holdings and blocks entries, adds, breakouts, and re-entries.
Plain CDF `SELL` remains governed by the existing CDF/TMS contract.

Required work:

- create a versioned per-security live-cap projection;
- derive CDF from its existing canonical source instead of accepting a duplicate
  `SECURITY_TREND` theme webhook;
- generate idempotent chronological action signals from adverse state
  transitions, including class-scoped Equity Regime Strong Trims;
- reconcile trade progress and cash semantics through existing Action and
  statement workflows;
- test shared `$100 / 10%` tickets, class funding and target-shortfall caps,
  CDF SELL's blocked-increase path, any 75%/100% capacity hypothesis, an
  equity-regime Strong Trim, stale state, and `OUTPERFORM` loss before
  activation.

### 5B. ETF Rotation Still Competes With Portfolio Shape

Severity: High.

Live behaviour:

- the legacy TradingView script produces a 100% allocation across its ETF
  universe and posts it to `/api/webhook/etf-rebalance`;
- the legacy allocation records still receive external momentum weights;
- the supplied live script has 15 instruments, while old static and webhook
  documentation still describe 11.

Risk:

The result can make a momentum ranking decide strategic Core ETF selection,
obscure the source of ETF capital, and shift exposure independently of the
approved portfolio shape.

Agreed direction:

[ETF System v2.0](../decisions/ETF_SYSTEM_V2.md) makes portfolio shape authoritative,
defines a user-selected Core ETF base per asset class, and uses momentum as a
bounded adjustment to the ETF-versus-stock implementation mix. The 25% value
is a suggestion, not a minimum. ETF CDF/TMS remains the protection gate. Cash
released by ETF reductions remains class-locked until a separate
portfolio-shape decision moves it.

Required work:

- register and audit the full ETF universe and symbol mappings;
- create a shadow, versioned internal parity engine using persisted prices;
- finish stable-identity backfill for every configured Core ETF;
- calibrate and backtest the momentum influence bound;
- add recommendation-versus-actual ETF performance attribution to History;
- complete action and statement-reconciliation tests before targets become
  executable instructions.

## Medium Gaps

### 6. Business Logic Is Not Encapsulated

Severity: Medium.

Most backend business logic lives in [backend/main.go](../../backend/main.go#L29).

Required refactor direction:

1. portfolio-risk service
2. portfolio-target service
3. statement reconciliation service
4. webhook normalisation service
5. asset-class configuration service

### 7. Stock Sizing Formula Backend Contract

Severity: Low. **Resolved as a fail-closed backend service.**

The Analysis Target Weight formula is implemented in the backend as
`POST /api/sizing/allocations` and covered by backend sizing tests. Stocks are
normalised within their canonical asset class. The frontend submits each full
class target; the backend deducts the effective Core ETF implementation and
uses only the remaining class capacity for anchored stock dollars. When an
approved class budget exists, the frontend no longer falls back to an
unanchored whole-portfolio calculation if sizing or ETF projection fails.

### 8. Breakout Funding Is Not First-Class

Severity: Medium.

Intended rule:

- use class cash first
- if unfunded, show funding gap
- clustered breakouts may justify portfolio review

Required work:

- model unfunded breakout gap
- decide where it appears in UI
- add tests once implemented

### 9. Drift Review Is Passive But Not Formalised

Severity: Medium.

Intended rule:

- normal drift is information, not automatic rebalance
- extreme drift above 50% relative deviation should flag review

Required work:

- define storage or computed fields for drift review
- decide UI location
- add tests for drift flag thresholds

### 10. News Narrative Scheduling

Severity: Medium.

Implemented behaviour:

- `POST /api/news/run` can create a persisted macro news run
- `mode = BOOTSTRAP` builds the first 12-month foundation thesis map
- `mode = DAILY` updates the thesis map with current evidence
- the News tab can read and display the latest persisted brief
- the unified backend worker schedules at most one active/successful daily job
  per UTC date after the configured hour when an active foundation and API key
  exist

Remaining work:

- add stale-state UI treatment when the latest brief is old

### 11. Market-Data Refresh Ownership

Severity: Low residual operational risk.

Implemented behaviour:

- ETF momentum has a backend-owned daily evidence worker, persisted attempt and
  success state, conservative source freshness, and a separate 80-session
  publication clock;
- Analysis, ETF, commodity, and legacy regime evidence are coordinated by one
  backend worker with persisted leases and coverage records;
- routine Analysis prices run daily while listing identity verification runs
  weekly or manually and no longer follows statement import;
- `/api/regimes/returns` reads a persisted snapshot and performs no provider
  work;
- News daily jobs are idempotently scheduled when prerequisites exist;
- `GET /api/data-freshness` exposes attempts, success, source date, coverage,
  errors, cadence, and operational staleness;
- multiple frontend 30-second timers reread persisted state but do not refresh
  any external provider.

Residual risk:

Yahoo remains a single supplementary history provider. The first stale rules
use calendar days instead of exchange calendars, and no consolidated frontend
status surface consumes the read model yet.

Remaining work:

- consolidate duplicated frontend polling after backend ownership is clear;
- replace calendar-day stale tolerances with expected completed market sessions;
- assess a second historical-price provider before supplementary history becomes
  a hard trading dependency.

The canonical inventory and implemented scheduling contract are in
[Data Refresh And Freshness](../system/DATA_REFRESH_AND_FRESHNESS.md).

## Legacy Documentation Audit

The detailed consolidation register now lives in [Consolidation Audit](PUBLIC_SOURCE.md).
Legacy contract documents have been consolidated under `DOCS/`. The root
`README.md` is now the supported GitHub entry point, while runtime prompts and
tool-specific READMEs remain with their owners. Historical documentation is
preserved in `DOCS/archive/`; current references use the audience-based index.
Conflicts can still exist inside older dated sections. The current ownership
map and reconciliation report identify corrected discrepancies and the remaining
work of keeping documentation aligned with backend code, frontend behaviour,
tests and each deployed environment.

Issues:

- older Layer 3 regime model does not match current Portfolio Risk separation
- should not be used as current API contract

## Resolved Gaps

| Gap | Resolution | Branch / PR |
| --- | --- | --- |
| 2. API Summary Endpoint Creates/Supersedes Signal Events | `loadOverlaySignalStateReadOnly` removes signal-event creation from GET. Cash confirmation and pending-event class repair remain bounded writes; `POST /api/portfolio-overlay/sync` owns explicit signal sync. | audit-remediation |
| 3. No Versioned Migration System | Runner, frozen baseline and backup/restore tools deployed to UAT v188; full-data recovery and live adoption verified. Production pending. | 12 September release |
| Auth: no bearer token on routes | `backend/auth.go` middleware, `API_TOKEN` + `WEBHOOK_SECRET` fly secrets, frontend token gate. | audit-remediation |
| CORS wildcard | `CORS_ALLOWED_ORIGINS` env allowlist, `Vary: Origin`, no wildcard. | audit-remediation |
| Webhook dead-letter | `backend/webhook_dead_letters.go`, retry/dismiss API, header badge in UI. | audit-remediation |
| Analyst staleness: no timestamps | Earlier completion claim referenced a missing numbered migration. Re-verify actual per-analyst fields and UI before treating this as closed. | Unverified historical claim |
| No DB backup | UAT daily volume snapshots and automatic pre-upgrade SQLite backup verified; isolated full-data restoration passed. Fly snapshot restore, off-volume retention and production verification remain open. | 12 September evidence |

## Resolved Decisions

| Decision | Current answer |
| --- | --- |
| Q3/Q4 endpoint | `/api/webhook/regime` |
| Per-security endpoint | `/api/webhook/tradingview` |
| ETF rebalance endpoint | `/api/webhook/etf-rebalance` |
| Q3 signal type | `target_equity_pct`, not BUY/SELL |
| Q4 signal type | BUY/SELL only; backend maps to 10/100 |
| Q4 priority | Q4 outranks Q3 while active |
| Q3 while Q4 active | accepted and stored |
| Missing Q4 state | inactive/empty |
| SPX versus SPY | SPX preferred; SPY compatible |
| Q3 risk-off | proportional throttle against last applied Q3 state |
| Q3 risk-on | visible lightweight action, no forced trades |
| Portfolio targets | separate from Q3/Q4 detector state |
| Baseline approval | explicit user action |

## Documentation Work Remaining

1. OpenAPI route inventory is now source-checked. Full request/response schemas and typed-client generation remain incomplete; see the API guide.
2. Prepare separately authorised production adoption through the database release gates; UAT v188 now uses the versioned baseline and raw frozen schema SQL.
3. Rehearse recovery from an actual Fly snapshot, verify production backup scheduling and establish off-volume retention. UAT scheduling and isolated full-data SQLite recovery are verified. Never promote UAT fixtures into production.
4. Version the external Intelligence Service contract, including Analyst
   Council, Announcement Router, and Portfolio Analysis, or mirror its stable
   API contract in `DOCS/`.
5. Keep `DOCS/api/TRADINGVIEW_SCRIPTS.md` in step with the checked-in `DOCS/Pinescripts/` files and explicitly verify the separately configured TradingView revision.
