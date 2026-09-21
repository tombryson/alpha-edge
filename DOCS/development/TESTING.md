# Testing

## Portfolio Cycles

`cd backend && go test ./...` covers the transactional four-calendar-month guard,
month-end clamping, restarts, historical bounds, opening baskets, sold securities,
missing/changed price evidence, corrections and the read-only cycle endpoint.
`node --test tests/portfolio-cycle.browser.test.cjs` uses the local demo on port
3312 (override `PORTFOLIO_CYCLE_BASE_URL`) to check the Return % column, per-approval
Timeline results, null/error states and desktop/mobile layouts without private data.

## First-Visit Guide

With the isolated demo running via `npm run dev:demo`:

```sh
node --test tests/welcome-guide.browser.test.cjs
CONTEXT_PANEL_BASE_URL=http://127.0.0.1:3312 node --test tests/help-docs.browser.test.cjs
```

The guide suite defaults to port 3312; `WELCOME_GUIDE_BASE_URL` can point to
another isolated **demo** preview. It verifies first-visit dismissal, Help replay,
all seven routes, backward/manual navigation, focus, unchanged rails, preference
isolation, unavailable preference storage and desktop/320px/390px containment in
dark/light themes. Unexpected API mutations are intercepted and fail the tests.
The shared context-panel fixture represents a returning user and suppresses the
welcome so existing workflow tests are not obscured.

## Missing Exchange Auto-Assignment

`cd backend && go test ./... -run TestExchange` covers local identity reuse,
watchlist/external records, held mappings, transaction rollback, duplicate
identities, concurrent edits and batches, provider outages, ambiguous listings,
symbol/name/exchange/currency validation, and optional Sonar discovery that still
requires independent verification. Provider transports are fixtures: no paid calls
or live identity mutations are made by these tests.

`node --test tests/analysis-missing-exchange.browser.test.cjs` covers the name
warning, shared issues filter, automatic assignments, partial results, errors,
retry, mobile bounds and removal of the final warning. Browser responses are
isolated fixtures. Deploy the matching backend before trying the new button
against UAT; the local preview's existing UAT proxy does not run local Go code.


Audit date: 29 May 2026.

Alpha Edge workflow tests must exercise real backend state. UI-only mocks are not enough because the critical behaviours depend on persisted detector state, active workflow rows, statement imports, and reconciliation.

## Empty Positions Classes (2026-09-16)

```sh
node --test --test-concurrency=1 tests/positions-empty-classes.browser.test.cjs tests/positions-actions-design.browser.test.cjs tests/positions-view-menu.browser.test.cjs tests/positions-capital-map.browser.test.cjs
```

Intercepted statement fixtures cover partial exits, last-holding exits, empty
parents, repurchase, zero units versus zero-valued held units, visible-group
collapse controls, retained research and unchanged Actions evidence. The tests
advance the holdings poll without submitting trades or deleting group settings.

## Analysis Column Resizing (2026-09-16)

```sh
node --test --test-concurrency=1 tests/analysis-column-resizing.browser.test.cjs tests/analysis-group-performance.browser.test.cjs tests/analysis-monitoring.browser.test.cjs tests/positions-column-resizing.browser.test.cjs
```

The shared grid is exercised through both real table components with intercepted
API fixtures. Analysis checks cover pixel tracking without sorting, saved widths
through reload and viewport changes, hide/show, optional notes and matching
header/body/colgroup counts, cancellation and resets, ticker pinning, isolation
from Positions preferences, touch input, pinned names and contained overflow in
mobile and narrow light-theme layouts. Existing group-performance and monitoring
checks guard Analysis evidence and hierarchy formatting. These tests do not
write portfolio or research data. Monitoring refresh tests advance the shared
30-second polling cadence; a tab switch alone is not a forced provider read.

## Positions Column Resizing (2026-09-16)

```sh
node --test tests/position-grid-sizing.test.cjs tests/mobile-responsive.test.cjs
node --test --test-concurrency=1 tests/positions-column-resizing.browser.test.cjs tests/positions-pinned-column.browser.test.cjs tests/positions-shape-footer.browser.test.cjs tests/positions-view-menu.browser.test.cjs tests/positions-actions-design.browser.test.cjs
npm run typecheck
npm run build
```

These UI tests intercept API requests; they never change account data. They cover
pixel tracking, independent neighbour widths, the last column at the horizontal
scroll boundary, cancellation, keyboard and touch input, reorder/hide/show,
legacy preference migration, reset, reload, desktop/phone isolation and name-cell
space. Shared Actions, pinned-cell opacity and comparison-footer checks guard the
surrounding layout. The browser suite defaults to port 3100; set
`CONTEXT_PANEL_BASE_URL` to check a production build on a different local port.

## Browser Lifecycle (2026-09-15)

```sh
node --test tests/runtime-lifecycle.browser.test.cjs tests/context-panel.browser.test.cjs
npm run typecheck
```

These presentation regressions intercept APIs and never change broker state.
They capture console hydration/key warnings as well as uncaught page errors:
saved themes survive initial rendering and reload, keyed stock rows retain DOM
identity when sorted, and delayed TradingView scripts cannot initialise after
navigation, symbol changes or theme changes. Security and Markets embed the
provider inside a disposable iframe document; removing it cancels pending loads
and destroys provider-owned listeners. Chart sizing, current configuration, failure
and retry, and the unchanged sleeve dock are covered separately. Only the root
HTML element accepts the intentional pre-paint theme attribute change; hydration
warnings are not suppressed across the application.

## Polling Consolidation (2026-09-15)

```sh
npm run test:polling
node --test --test-concurrency=1 tests/polling.browser.test.cjs tests/data-freshness.browser.test.cjs tests/context-panel.browser.test.cjs tests/alert-action-integration.browser.test.cjs
npm run typecheck
npm run build
```

Model tests exercise shared callbacks/cadences, hidden-tab suspension, focus
recovery, slow requests, unsubscribe cleanup, independently consumable response
bodies, request/query/credential isolation, failure retry on the next read and
write invalidation. There is no response cache and no write retry. Browser
fixtures verify shell/table connection request counts and visibility recovery,
alongside existing sidebar and execution workflows. All API data is intercepted;
these tests do not write to UAT or production. Active News/Council jobs retain
their separate polling lifecycle. CI runs the polling model suite.

## System Structure (2026-09-14)

Branch: `codex/system-layout-uplift`.

```sh
node --test tests/system-architecture.browser.test.cjs
node --test tests/terminal-style-standard.test.cjs tests/mobile-responsive.test.cjs
npm run build
npm run docs:audit
```

The browser suite uses intercepted API fixtures, not production writes. It checks
Q3/Q4 read states, independent commodity/equity evidence, held-only groups,
search and collapse behaviour, route navigation, partial refresh failures and
recovery. Responsive checks cover 360, 390, 768, 1366 and 1920px widths in dark
and light themes, including row height, readable type, cell alignment, and one
vertical content scroll owner. These are presentation checks, not a new financial
policy or end-to-end certification of TradingView delivery. The existing local
preview was also inspected with persisted UAT data; no backend changes or database
writes are part of this pass.

## Portfolio Timeline (2026-09-14)

```sh
npx tsc lib/portfolio-timeline.ts app/api/council/portfolio-memos/route.ts --target ES2022 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck --outDir /tmp/alpha-edge-timeline --rootDir .
NODE_PATH=./node_modules node --test tests/portfolio-timeline.test.cjs
node --test tests/portfolio-timeline.browser.test.cjs tests/mobile-responsive.test.cjs
cd backend
go test ./... -run 'Test.*Portfolio(History|ShapeHistory|Memo)' -count=1
```

Model/proxy tests cover real artifact fields, credential separation, GET-only
reads, partial failures, stable run deduplication, explicit provenance, removed
classes, and unchanged source weights in hypothetical examples. Backend tests
exercise SQLite memo-plan-approval linkage including the paginated shape route.
Browser fixtures cover memo reading/comparison, HTML escaping, draft-save failure,
and phone/laptop/desktop geometry in dark/light themes. No broker writes are used.

Read-only UAT investigation found 17 approval snapshots: v2-v17 have identical
allocations and all 17 lack a source plan. There were zero Terminal memo rows,
but 12 readable Intelligence portfolio memo artifacts. These observations do not
prove the manual approvals were test records; none were deleted or reassigned.

## Alert Stack Recovery (2026-09-14)

```sh
node --test --test-concurrency=1 tests/alert-stack-recovery.browser.test.cjs tests/alert-stack-mobile.browser.test.cjs tests/alert-action-integration.browser.test.cjs tests/sidebar-density.browser.test.cjs
node --test --test-name-pattern='two-row ETF' tests/context-panel.browser.test.cjs
node --test tests/sidebar-separators.browser.test.cjs
node --test tests/etf-summary.browser.test.cjs
node --test tests/etf-ring.browser.test.cjs
npm run build
```

These are presentation and handler regressions, using intercepted API fixtures,
not certification of real broker reconciliation. No UAT or production writes are
made. The existing action suite covers execution/ignore, pending removal, mismatch
review, Exit retention, purchase gates, class actions and external holdings.

The recovery suite checks theme-aware Q3/Q4 notices, class counts, production
card typography (12px names / 10px metadata), 1px full borders, 3px corners,
4.8px vertical padding and 1.6px line gaps, unclipped signals and movement, control sizes, immediate
theme changes, hover/pin persistence, keyboard opening and independent chart-link
activation. The mobile suite checks 18-row groups, long names, accessible bottom
rows and controls, and bounded density at 320/390/768/1023px. Narrow desktop rails
use a company identity line above the instruction, with separate edge controls,
instead of squeezing company names between ticker and age. Desktop coverage includes
1280/1440/1920px in both terminal themes. Collapsed children are hidden and inert.
The dev-only Next badge is hidden in the isolated recovery fixture, preventing it
from obstructing the History footer; page errors remain captured.

The density regression checks both populated rails at 1280x720, 1366x768,
1440x800 and 1470x800, without zoom or automatic sidebar collapse. It requires
50px ordinary production alert cards (up to 68px for wrapped instructions in
narrow rails) and 53px ETF line chips, visible ages/signals/movements,
untruncated dollar values, non-overlapping controls, and all five funds visible
above the sleeve dock. The wider desktop and touch layouts retain their separate
sizing. Large-amount and Core-menu behaviour remain covered by the ETF suite.
The ETF indicator alone is restored to production's 3.2px by 9.6px dimensions,
centred on the ticker with a 4.8px gap. Tests retain its current monitoring logic,
line-fill geometry and Core controls; Ring Fill has its own optional-view coverage below.
The revised ETF list uses adjacent rows and a shared background, not individually
outlined cards. Geometry checks align tickers with held/target amounts, secondary
class labels with trends and differences, and full-width funding lines below all
text. Exceptional amounts may wrap without colliding with tickers or trends.
Short ETF lists must have no reserved right-hand scrollbar gutter. Overflowing
lists retain a thin scrollbar and access to their last row without moving the dock.
Five alerts plus three class headers have a 400px budget at 1280x720 and a
half-viewport budget at larger laptop widths. The smallest rail must wrap a long
instruction rather than crop it to satisfy an obsolete 42px-row assertion.
An additional nine-fund fixture includes older alerts and longer names. It checks
that company names retain a useful text width. ETF asset-class labels share the
secondary row with trend and difference; held/target aligns with the ticker. It requires
six complete funds at 1280x720 and 1366x768, and seven at 1440/1470x800 above
the unchanged sleeve dock. Font sizes, full dollar amounts and theme behaviour
are tested independently of density. Exact padding and line-gap checks protect
the requested breathing room from another over-compression pass.

The ETF summary regression checks its 89px desktop band (97px
on touch layouts), visible held/target pair, heading-aligned view icons, inset
bar, fixed 80% target tick, capped excess segment and small signed difference.
The summary must join the tabs without an exterior gap, share their inner
alignment, use a distinct theme surface, and leave padding around the funding line.
Its 14px semibold heading and 16px held value lead the 14px target and 12px difference.
Large figures wrap instead of truncating. Labelled details must open on hover, keyboard focus and touch,
remain within the viewport and dismiss with Escape. Empty holdings, an aligned
target, a known zero target and an unavailable target have distinct coverage.
Large amounts stay untruncated and theme colours remain semantic. These controls
only inspect the ledger or change the visualisation; they cannot submit trades.

The optional Ring Fill regression covers switching and saved preferences, unchanged
Line Fill geometry and sleeve position, Core-menu keyboard access, ratio drafts
and explicit saves. It checks production-size circles, full amounts (including
seven-digit holdings), long tickers, both themes and 1280/1440/1920/2560/390px widths.
Circle arcs are asserted for empty, half/full funding, 125%/200% funding, known-zero
and unknown targets. Momentum weight is held constant to prove it is not the ring's
funding input. The right-hand difference uses the effective fund target and toggles
between percentage and dollars with pointer, Enter or Space, independently of Core
settings. Tests cover zero/unknown targets, signed neutral/above/below values, both
units fitting narrow rails, and the absence of nested buttons. `context-panel-model.test.cjs`
also checks difference math, invalid input, capped excess and saved-mode migration.
Browser writes are intercepted fixture writes, never broker submissions.

The separator regression measures both 12px handle hit areas against class
headers, alert rows, History, ETF cards, workspace tabs and the sleeve dock at
1920/1536/1440/1280/1152/1097/1024 CSS pixels. Reduced CSS viewports model the
layout effect of browser zoom; changing device pixel ratio alone does not.
Both terminal themes and two utility spacing values are checked, along with
unchanged outer widths, collapse/reopen, and mobile drawers at 960/720/390px.
The separator follow-up passed all 28 browser checks against a clean build,
all eight mobile layout checks, and the docs audit. A 40-frame probe at each of
1280/1920/1152px also measured zero separator overlap during resizing. It shipped
to UAT v1221, with all 11 deployed presentation checks passing; see the
[release note](PUBLIC_SOURCE.md).

The subsequent local production-card restoration passed the production build,
all 28 browser cases (one legacy 14px indicator assertion was updated to the
verified production dimensions and its case rerun), eight mobile layout checks,
the documentation audit and `git diff --check`. No deployment was performed.

The local typography/spacing follow-up passed all 27 browser checks against the
compiled build on 14 September 2026, plus the production build, documentation
audit and whitespace checks. It shipped to UAT v1220; deployed checks are recorded
in the [release note](PUBLIC_SOURCE.md).

To check production CSS ordering, run the same suites against a local `next start`
server using `CONTEXT_PANEL_BASE_URL` and `ALERT_STACK_TEST_BASE_URL`. This does not
deploy the build. The actual preview also uses populated UAT data for a read-only
layout check; changes to financial records are not part of this recovery trial.

## Positions Capital Map (2026-09-14)

```sh
node --test tests/positions-capital-map.test.cjs tests/positions-capital-map.browser.test.cjs
node --test tests/position-row-appearance.test.cjs tests/position-row-appearance.browser.test.cjs
npm run typecheck
```

The model tests verify exact positive held totals, source class-code identity,
ETF inclusion, unchanged inputs, portfolio-share denominators and search matching.
Zero, negative and nonfinite values are separated without inventing areas; tiny
positive holdings retain their actual weights.

Isolated browser fixtures check rendered tile-area proportions, class focus,
search without rescaling, keyboard activation into the existing Security sidebar,
Table/Simple switching, unchanged Actions-table access, route/reload persistence,
blocked preference storage and empty states. Responsive
checks cover 2560, 1366, 1024, 768, 390 and 320px, nonblank chart dimensions,
label-height fit, horizontal overflow and light/dark fills. Fixtures assert no
financial writes. Screenshots contain synthetic holdings; the development-only
Next badge is hidden in the fixture so it cannot intercept the bottom-left control.
This is presentation coverage, not a substitute for the existing real-backend
allocation and execution tests.

1D cases check full-width rows, value-proportional heights above the documented
32px/36px readability floor, unchanged dollar/percentage data, class focus across
layout switches, persisted 1D/2D selection, and blocked layout-storage writes.
Search brings an off-screen small holding into the chart without resizing rows
and Enter opens the existing Security sidebar. Actions restores the selected
layout on return to Normal. Desktop/mobile screenshots and geometry assertions
cover visible controls, unclipped amounts, row heights, light-mode colours and
absence of financial writes in the 1D interactions.

## Positions View Menu (2026-09-14)

```sh
node --test tests/positions-view-menu.browser.test.cjs
```

The menu uses scoped pixel dimensions rather than the terminal's compact global
`--spacing: 0.1rem`: 36px option rows, 18px checkboxes and aligned 32px toolbar
icons, with larger touch targets. Browser checks cover those computed sizes,
unchanged ordering/direction and Peek/Fixed handlers, row checkboxes, keyboard
entry and Escape return focus, group-manager opening, light mode and bounded
scrolling at 390px, 320px and short-landscape sizes. No global spacing tokens or
portfolio calculations change.

## Positions Row Appearance (2026-09-13)

```sh
node --test tests/position-row-appearance.test.cjs tests/position-row-appearance.browser.test.cjs
npm run test:position-shape
npx tsc --noEmit
```

Model and Playwright cases verify validated icon-only settings, original class-code
keys, retired Row appearance controls, keyboard dismissal and return focus,
blocked storage writes, reloads and desktop/mobile/landscape popover bounds.
Version-1/2 migration discards borders, global icons and backgrounds while
preserving per-class icons. Row palettes support separate selections, removal
and keyboard access without collapsing the row. Default-arrow tests check its
direction during name-click expansion, replacement by a custom icon and restoration.
Pointer-hover tests check the stable 28px slot, unchanged name position, row height
and picker anchor. Controlled-clock tests check that the selector is inactive at
799ms and active at 800ms, and that leaving, blur and unmount cancel the hover.
Disclosure buttons retain accessible labels without native expand/collapse tooltips.
Quick symbol clicks and Enter/Space toggle expansion exactly once; an armed click
or Arrow Down opens the picker without collapsing the row. Touch tests distinguish
a short tap from an 800ms hold, cancel a hold on scroll movement and suppress
the synthetic click after opening.
Both arrows and chosen icons remain visible after pointer exit and reload.
Actual/target text,
security values and row geometry during selection remain unchanged. Compare
and unchanged expansion during editing are exercised. Explicit name-click collapse
retains its existing group-save calls, intercepted by the fixture. Icon changes make no backend
writes. The nested per-row colour editor uses mocked settings writes to verify
shared chart updates, icons retaining theme-aware grey, independent classes, single-click draft versus Save or
double-click confirmation, Cancel/Reset, persistence, failed-save recovery, failed-load
retry, keyboard return focus and mobile/light-mode bounds. No financial or group
writes are made by these controls. Sidebar line-fill/theme and Core failure regressions
are covered separately. Screenshots use isolated holdings, not user portfolio data.

The per-row icon-colour previews are tested for grey defaults, class independence,
arrow-key input, failed-storage recovery, mode persistence and live palette updates.
Both previews render the selected symbol, including the default disclosure arrow.
The controls have accessible names/tooltips and no visible text or checkbox.
Coloured icons retain class colour in light mode; neutral icons follow the theme.
The previews fit the existing popup at 320px without altering table geometry.

Catalogue coverage checks every shared class identity, unique icon IDs, explicit
mapping ownership, alias resolution and persistence of new IDs. Browser cases
exercise all 74 choices, search/empty results, new and automatic selections,
light theme, keyboard focus, and reaching the last icon at desktop, 390px,
320px and short-landscape viewport sizes.

The existing development shell emits theme hydration/list-key warnings; the
shared fixture's generic JSON route also produces an EventSource MIME warning.
These are not introduced or repaired by this scoped presentation change.
No unhandled page errors occurred in the completed interaction tests.

## Database Upgrades And Recovery (2026-09-12)

Current backend verification, from `backend/`:

```sh
go test ./...
go test -race ./internal/database ./cmd/dbtool -count=1
```

The full suite passed with Go 1.21.13 and Go 1.27.1; focused race tests passed
with Go 1.27.1. These use isolated SQLite databases and no real broker/provider
writes. The database tests cover fresh creation, existing-record preservation,
bounded older layouts, deployed UAT constraint variants, concurrent startup,
read-only repeats, checksum/future-version rejection, failed backups, WAL contents,
no-overwrite restore, failed-step rollback and abrupt subprocess interruption.
A recovery drill compares every synthetic record across adoption and restoration,
including holdings/units, actions, settings, Core policies and approved shapes.
CLI tests also reject missing source files and in-place restore. An application
integration test asserts no DDL or data changes from repeat startup and all guarded
schema helpers after customisation. See [database operations](../operations/DATABASE_UPGRADES_AND_RECOVERY.md).

The UAT rollout exposed an SQLite false-positive integrity error for legacy
implicit REAL defaults. `TestLegacyRealDefaultIntegrityAndRecovery` reproduces
it with the old driver and passes with `go-sqlite3 v1.14.23`. The Docker build
now runs migration/CLI tests with Linux/CGO. A private full-data backup rehearsal
compared every record in 81 tables across migration and restoration. Live
verification and its one runtime timestamp difference are recorded in the
[v188 release](PUBLIC_SOURCE.md).

The existing Go-version/vet mismatch mentioned in older sections below is fixed:
the two synchronous ETF benchmark calls now use `context.Background()`, compatible
with the declared Go 1.21 module. The existing portfolio-target test now compares
floating-point totals within `1e-6` dollars, instead of exact binary equality.
This only fixes test precision; it changes no allocation formula or business
tolerance. Normal verification no longer needs `-vet=off` for either issue.

## Monitoring Coverage (2026-09-11)

```sh
npm run test:monitoring
node --test tests/analysis-monitoring.browser.test.cjs tests/context-panel.browser.test.cjs
npx tsc --noEmit
```

The pure tests cover every CDF/TMS/Outperform combination, ETF profile-specific
requirements, script/exchange aliases, ratio-leg collisions, custom/replaced
benchmarks, unavailable data and direction-independent connection coverage.
Isolated browser fixtures exercise the actual Analysis and Positions indicators,
live benchmark changes, ETF mode changes, failed profile/configuration/ledger
fetches and recovery. The shared sidebar suite retains its sizing, connection
bar and Core-management checks. These are presentation regressions; no backend
execution or allocation policy changes, and no live UAT writes are involved.

Verified locally: 15 coverage tests, five focused monitoring browser cases,
14 existing Analysis/sidebar browser cases, eight documentation tests,
TypeScript no-emit, production build, documentation audit and `git diff --check`.
No deployment was performed for this correction.

## Analysis Group Performance (2026-09-11)

```sh
npm run test:analysis-metrics
node --test tests/analysis-group-performance.browser.test.cjs
```

The group-performance checks cover equal weighting, ETF six-month returns
without mixing in 80-session momentum, watchlist inclusion, missing/non-finite
observations, genuine zero returns, uncapped returns, and oldest/unknown dates.
Isolated browser fixtures verify parent aggregation, search and collapse/focus
behaviour, neutral missing data, stale markers, theme colours and unchanged row
geometry at 1600/1280/390px. Narrow tables retain their existing horizontal
scrolling. No broker state or allocation rules are changed by these UI tests.
Verified: 11 metric/workbench tests, two browser cases, and TypeScript passed.

## Canonical Class Colours (2026-09-10)

Presentation-only contract: [Asset-Class Visual Identity](../system/ASSET_CLASS_VISUAL_IDENTITY.md).

```sh
npm run test:asset-class-colours
npm run test:portfolio-comparison
npm run test:portfolio-group-dial
npm run test:portfolio-history-markers
node --test tests/asset-class-colours.browser.test.cjs tests/history-shape-preview.browser.test.cjs tests/context-panel.browser.test.cjs
node --test tests/asset-class-colour-editor.browser.test.cjs
# From backend/ (see existing module-version vet limitation below):
go test -vet=off ./... -run TestClassColour -count=1
```

The nine identity/settings/preset tests cover every default target class, legacy aliases,
physical/producer distinctions, stable custom fallback colours, name/order
changes, historical comparison parity and local-palette regressions. Browser
checks compare exact swatch/segment colours across the pie, Shape sidebar,
Portfolio, History, Markets and Alert Stack in dark/light themes. They also
verify that the Markets trend nodes retain state colours and that legacy
alert-only colour settings cannot override class identity. Existing preview
and sidebar tests retain responsive, docking and interaction coverage.

The eight colour-editor cases use isolated mocked settings writes to check the
30-swatch modal, keyboard selection, Save, double-click confirmation, Cancel, Reset, retained colours outside
the presets, reload persistence, theme parity, failure recovery and narrow/short
mobile layouts. Portfolio cases also check direct swatch access, hover alignment,
independent row expansion and preservation of the original database class code.
Double-click checks cover unchanged-colour confirmation without a write, failed-save
recovery, and duplicate-submit prevention while a save is pending.
Go tests use isolated SQLite tables to check actual persistence,
unknown codes, malformed colours, custom classes, independent resets and database
failure. Tests do not change UAT data or replace financial-workflow tests.
Three store tests also cover stale refresh/save races, unavailable browser
storage, failed saves and duplicate-submit prevention.
That pass encountered an unrelated Go-version vet error in
`etf_universe_test.go`. It was corrected on 12 September; use the normal
verification commands above for current work.

## Alert Stack Consolidation (2026-09-10)

11 September attention-only refinement: seven presentation tests, nine focused
browser cases, 11 existing context-panel browser cases, TypeScript and the
backend reconciliation/funding test selection below passed locally. Pending and
blocked records remain in History; remembered managed IDs prevent stale raw
alerts from reviving after completed rows leave the pending API. These changes
are local, not a new UAT deployment.

The standalone Security Action Queue drawer is removed; the backend lifecycle
and its tests remain. Frontend regression commands:

```sh
node --test tests/action-presentation.test.cjs tests/alert-action-integration.browser.test.cjs tests/purchase-exception.browser.test.cjs
node --test tests/context-panel.browser.test.cjs
npx tsc --noEmit
```

The isolated browser cases cover Positions-to-Alert-Stack navigation, successful
recording closing the detail, pending chips staying hidden after reload despite
active raw alerts, Positions Pending linking to History, failed saves and unavailable status,
Exit retention without Ignore, blocked purchases, explicit purchase exceptions,
external/manual distinction, and joined Decision History with pending records,
blocked signals and system closures. A ten-record backlog fixture verifies one
review exception and subsequent backend promotion without any presentation writes.
Mobile checks cover dialog bounds, readable inputs and resize preservation.
The pure tests cover deduplication, source strength, and neutral closure labels.
Fixtures intercept writes and never record executions in the user's database.
These tests do not replace the SQLite-backed queue, funding and unit-matching
tests listed below, and do not claim a new reconciliation policy.

Verified locally: 11 focused model/browser cases, all 11 existing context-panel
browser cases, TypeScript no-emit and `git diff --check` pass. The existing
backend suite selected by `go test -vet=off -run
'TestSecurityAction|TestExit|TestRecordExecution|TestDeployment|TestCashBacking'
-count=1 .` also passes. No live execution records were modified during testing.

UAT release 1215: all 19 browser cases also passed against the deployed frontend
using `CONTEXT_PANEL_BASE_URL=https://alpha-edge-uat-frontend.fly.dev` and
`PURCHASE_TEST_BASE_URL=https://alpha-edge-uat-frontend.fly.dev`. API/provider
fixtures remain isolated; these are deployed-UI checks, not live trade writes.

## Testing Principles

1. Test from webhook/API input through persisted DB state and UI output.
2. Use deterministic seeds.
3. Assert both UI text and backend state.
4. Test refresh/reload persistence.
5. Test correct statement and incorrect statement paths.
6. Test old bugs directly so they do not return.

## Portfolio Tools Migration Checks (9 September 2026)

Local line-chip restoration (not deployed): the context-panel browser suite also
checks 1440/1920/2560px desktop and 390px mobile layouts at default 100% zoom.
Regression contracts cover readable untruncated monetary values, single-row
identity at wider rail widths, a deliberate second class line on narrow rails,
click-positioned menus within the viewport, keyboard opening, draft-only ratio
selection, and the restored Core / Non-Core controls. Mobile menu checks perform
real pointer clicks so a menu behind the drawer cannot pass on geometry alone.

10 September management-mode follow-up (deployed to UAT; backend 184, frontend 1214):
`go test -vet=off -run 'TestETFManagement|TestDeployment|TestSecurityAction|TestCDFSetup|TestCalculateCore|TestETF' -count=1 .`
in `backend` covers mode persistence, rollback, unchanged classification/Core/
momentum, connection invalidation, source isolation, pending-execution guards,
partial stops, full stops and re-entry. The eight context-panel browser tests
include draft-only mode/direction choices, explicit save, failure retention,
reload persistence and matching Alerts controls. API/provider fixtures remain
isolated from live account writes. TypeScript checking passes. All eight browser
tests also passed against the deployed UAT frontend using
`CONTEXT_PANEL_BASE_URL=https://alpha-edge-uat-frontend.fly.dev node --test tests/context-panel.browser.test.cjs`.
Authenticated live API reads, CORS preflight, invalid-settings rejection and
unauthenticated access rejection passed without changing real fund modes or
Core policies. Deployment and database preservation checks are in Operations.

The full backend run with `-vet=off` passes the root package, but the unchanged
`internal/portfoliotarget` test `TestBuildAdjustmentPlanDecreaseAndIncreaseRows`
fails its exact equality check (`4999.999999999999` versus `5000`). Default vet
also flags existing tests using `testing.Context` against the module's Go 1.21
declaration. Neither issue was changed by this migration.

This frontend revision uses existing contracts; the first-pass Asset class view
and its new endpoint were removed. UI tests use fully intercepted, isolated API
fixtures: they must never change a live Core policy. Existing SQLite cash-backing
and class-budget tests continue to own backend policy verification.

```sh
# Backend directory
go test -vet=off . -run 'TestClassBudget|TestCashBacking' -count=1

# Repository root; run the local frontend on port 3100 first
npx tsc lib/context-panel-model.ts --target ES2020 --module commonjs --moduleResolution node --skipLibCheck --outDir /tmp/alpha-edge-context-panel --rootDir .
node --test tests/context-panel-model.test.cjs
node --test tests/context-panel.browser.test.cjs
npx tsc --noEmit
```

Browser coverage includes sidebar ratio draft versus explicit save, Core removal
and save failure, read-only Positions ratio styling/row height, no inline
allocation or unfunded target rows, target-null versus zero, saved mode/reference,
historical memo access, Positions double-click details, onward History/research
navigation, explicit closed-rail reopening, ordinary-click persistence and mobile
editor/panel bounds at 768px and 390px. `CONTEXT_PANEL_BASE_URL` overrides the
default local URL. These fixtures complement rather than replace backend tests.

10 September UAT verification (`b943f84`): all six model checks, TypeScript
checking and all six browser tests passed locally. The same six browser tests
passed against `https://alpha-edge-uat-frontend.fly.dev` using the isolated
fixtures; no live Core policy was changed. The remote production build passed.
Release and public-asset checks are recorded in [Operations](PUBLIC_SOURCE.md).

## Cash-backing regression checks (8 September 2026)

`backend/deployment_funding_test.go` exercises the real SQLite action projection
and both HTTP purchase-recording paths: oversized/competing class proposals,
pending proceeds/deposits, explicit broker-cash reassignment, prior commitments,
orphaned and unknown-cost purchases, confirmed-purchase double-debit prevention,
reported unit costs, concurrent execution and transactional rollback. Existing
deployment tests retain the CDF-SELL / valid TMS-re-entry distinction.

```sh
cd backend
go test -vet=off . -count=1
go test -race -vet=off . -run 'TestCashBacking|TestDeployment|TestRecordExecution' -count=1
```

Both commands passed on 8 September 2026. The broader `go test -vet=off ./...`
still fails the pre-existing exact-float assertion in
`internal/portfoliotarget/adjustment_test.go:68` (`4999.999999999999` versus `5000`);
all other tested packages passed. Vet remains disabled for the already recorded
Go-version mismatch in legacy tests, not for a new funding error.

This does not establish full Q3/Q4 or commodity permission enforcement, broker
fill/fee accuracy, or multi-process reservation safety. No live broker holdings
are modified by these isolated fixtures.

## Purchase Permission Checks (9 September 2026)

`backend/deployment_permissions_test.go` adds real SQLite tests for Q3 class
budgets and partial sensitivity, pending purchases and ETF utilisation, Q4
pauses/clearing/exemptions, unknown/disconnected feeds, CDF Sell with TMS re-entry,
producer versus physical trend boundaries, Outperform evidence, symbol aliases,
source replacement, execution-time rechecks, exception validation, outstanding
Exits, and exception unit reconciliation. The cash and unit suites remain active.

```sh
cd backend
go test -vet=off . -run 'TestDeployment|TestCashBacking|TestSecurityAction|TestRecordExecution' -count=1
```

These tests do not claim full ETF target migration, individual broker fill
proof, or multi-process transaction coordination. Fixtures do not write to UAT.

`node --test tests/purchase-exception.browser.test.cjs` runs against the local
frontend on port 3100 with every API call intercepted. It checks that an older
backend cannot enable exceptions, a paused recommendation cannot use normal
recording, opening/editing does not submit, all evidence is required, the mobile
form fits, and successful recording preserves the exception in the ledger.

Local verification: 85 focused backend tests/subtests passed, including the
race-detector run; TypeScript checking passed. The broader suite retained only
the previously documented exact-float assertion failure noted above.

## Council Proxy Regression Checks (8 September 2026)

```sh
npm run test:council-proxy
npx tsc --noEmit --incremental false
cd backend
go test -vet=off . -run 'TestCouncilCaller|TestAuth' -count=1
```

The Node suite tests the proxy helper, real job route and browser submission
helper with mocked upstream responses: caller rejection before forwarding,
validator outage, valid JSON/multipart, malformed input, lost/invalid responses,
header/body timeout coverage, no POST retries, retained GET retries, separate
service credentials and the browser-to-proxy-to-Council single-attempt path.
A structural check ensures every Council handler calls the shared guard.
Go tests exercise the real router's auth-check endpoint, including disabled-auth
fail-closed behaviour. No paid jobs are created. These are not live provider
integration tests or proof of cross-device/external-service idempotency.

Verified locally on 8 September: all 16 Node tests, TypeScript no-emit checking,
the focused auth tests and the full backend root-package suite passed.

## Minimum Test Layers

### Shared Class Budget (9 September 2026)

`backend/class_allocation_budget_test.go` exercises the real SQLite-backed ETF
ledger, anchored research calculation and purchase capacities. Cases cover
automatic momentum, Sell with unsold ETFs, de-selection, sold-out funds, non-Core
holdings, no mandate, ignored legacy stock ratio, stale client dollar budgets,
pending ETF/stock buys, Q3 limits, transactional Core-policy reads and unavailable
models preserving exits. Live research must remain advisory and leave stored
security purchase targets unchanged. ETF universe fixtures populate both statement
rows and active holdings, matching the import workflow.

```sh
cd backend
go test -vet=off . -count=1
go test -race -vet=off . -run 'TestClassBudget|TestDeployment|TestCashBacking|TestSecurityAction|TestRecordExecution' -count=1
```

These use isolated databases, not UAT. They do not validate the financial merit
of the momentum multiplier, a multiple-fund-per-class model, or a new binding
stock-allocation approval workflow. This update was deployed to UAT on 9 September
2026; authenticated deployment checks are recorded in [Operations](PUBLIC_SOURCE.md).

Verification: backend root-package suite and the focused race run passed;
TypeScript no-emit checking, all 18 mobile/style regression checks, and
`git diff --check` passed. The broader `go test -vet=off ./...` run retains the
previously documented `internal/portfoliotarget/adjustment_test.go:68` exact-float
failure (`4999.999999999999` versus `5000`); all other packages passed.

### Terminal Style Standard (8 September 2026)

```sh
node --test tests/terminal-style-standard.test.cjs
npm run test:portfolio-overview
npm run test:portfolio-history-markers
npx tsc --noEmit --incremental false
```

All nine style checks, six overview model tests and three history-marker tests
passed locally. The style checks parse CSS and check scoped presentation
contracts; they are not screenshot, accessibility-contrast or interaction tests.
See [Terminal Style Standard](TERMINAL_STYLE_STANDARD.md) for adoption scope and
remaining browser acceptance coverage. No live portfolio mutations are required.

### Workflow Coverage

History approval preview (9 September 2026):

```sh
npm run test:portfolio-history-markers
# Requires the local frontend on port 3100; override HISTORY_PREVIEW_BASE_URL if needed.
node --test tests/history-shape-preview.browser.test.cjs
```

The eight marker tests cover snapshot-specific locked weights, superseded records,
partial and missing allocations, duplicate/invalid values, dates and source-data
immutability. The isolated Playwright browser test intercepts all API calls and
checks hover transfer, click pinning, keyboard dismissal/focus, theme changes,
mobile tapping, viewport containment and the absence of writes. It does not use
real tokens or mutate UAT.

The preview comparison extension adds model coverage for predecessors outside the
visible date range, deterministic ordering, real/demo isolation, added/removed
classes and incomplete previous snapshots. Browser coverage includes automatic comparison without a toggle,
one extra percentage column, vertically stacked bars with equal widths and aligned origins, saved segment widths,
shared colours, partial remainders, unavailable predecessors, and mobile containment.
Comparison changes are locally verified separately from the UAT releases below.

Verified locally on 9 September: all eight marker tests, the browser workflow,
15 shared comparison tests, 18 style/mobile contract checks and TypeScript
no-emit checking passed. Long mobile previews retain a visible header and total
while scrolling the allocation list inside the panel.

The same browser workflow also passed against the deployed UAT frontend on
9 September using `HISTORY_PREVIEW_BASE_URL=https://alpha-edge-uat-frontend.fly.dev`.
API responses remain isolated fixtures (including cross-origin preflight), so
this verifies the deployed UI rather than live account data or backend auth.

Local/UAT history demo:

```sh
npm run test:portfolio-history-demo
node --test tests/history-shape-preview.browser.test.cjs
```

Seven fixture/model checks cover the exact environment allowlist, eight complete
approvals, class and cash totals, non-instant target implementation, deterministic
data, distinct demo marker identities, and absence of persistence/API writes.
The browser workflow also checks the demo toggle, eight markers, simulated hover
content, independent date filtering, restoration of live data, mobile access,
and reset to real data on reload. All API calls in this test are intercepted.

Verified on 9 September: all seven demo checks, eight marker checks, 18 shared
style/mobile checks and TypeScript checking passed. The extended browser workflow
passed locally and against UAT frontend release 1209 with the same sample data.

Historical approved-shape comparison:

```sh
npm run test:portfolio-comparison
cd backend
go test -vet=off ./... -run 'TestPortfolioShapeHistory|TestLoadPortfolioHistoryLinksMemoTargetShapeAndActual' -count=1
```

The model tests cover approval-only selection, chronology, legacy identities,
physical versus producer classes, incomplete records, new/removed classes,
signed percentage-point changes, independent concentration ranking, fixed
radial scales/axes and read-only UI ownership. Backend tests cover stable
cursor pagination, approval filtering, request validation and unchanged record
counts. `-vet=off` is needed locally because existing ETF benchmark tests use
`testing.B.Context` while the module declares Go 1.21; it does not skip tests.
Browser checks use stored UAT approvals without creating targets or actions.

Verified locally on 8 September: 15 comparison-model/contract tests, 20 radial
tests, 10 style tests, 8 mobile-contract tests and 6 existing overview tests
passed, along with TypeScript no-emit checking and the three focused Go history
tests. Real UAT history supplied 17 approvals: v1 is a partial 94.7% shape and
is labelled incomplete. All four views, From/To stepping, cross-view selection
retention, default dark/light themes and 320px/391px mobile widths were checked.
Chart names and numeric cells remained present without horizontal document
overflow. The paginated backend itself was tested locally, not deployed; the
browser correctly identifies the existing UAT response as limited history.

| Layer | Purpose |
| --- | --- |
| Go backend tests | Calculation and persistence transitions. |
| API integration tests | Real HTTP request/response and DB side effects. |
| Playwright UAT | User workflows through browser UI. |
| Data fixture tests | Seed validity and accounting balance. |
| Docs traceability | Each business rule has at least one test or explicit gap. |

## Required Fixture State

The UAT seed must define:

- latest account statement
- holdings summing to statement total
- broker cash
- asset classes
- ticker/company mappings
- security position state
- active alert registrations where needed
- Q3/Q4 state reset
- no stale active overlay events unless scenario requires one
- no stale portfolio rebalance plan unless scenario requires one

Seed accounting invariant:

```text
sum(active holding values) + statement cash = statement total value
```

If this invariant fails, workflow tests are not trustworthy.

## Traceability Matrix

| Rule | Test required |
| --- | --- |
| Q3 risk-off creates forced Portfolio Risk action. | Send Q3 from 100 to 35 and assert action appears. |
| Q3 risk-off is not suppressed by total-portfolio exposure cap. | Seed low total Q1 share but non-zero Q1-sensitive book, send lower Q3, assert reduction action. |
| Q3 risk-on is visible but not forced. | Send Q3 from 35 to 80, assert allocation-available action, no adjustment cells, no statement wait. |
| Q4 SELL activates crisis. | Send Q4 SELL, assert `q4_crisis_state.active`, `Q4D=10`, Q4 UI. |
| Q4 BUY clears crisis. | Send Q4 BUY, assert `q4_crisis_state.active=false`, `Q4D=100`, Q3 state preserved. |
| Q4 outranks Q3. | Send Q3 then Q4 SELL, assert resolved action is Q4 and Q3 remains readable. |
| Portfolio target decreases action first. | Create target with decreases and increases, assert decreases actionable and increases pending. |
| Portfolio target approval requires completion. | Try approve before complete and assert blocked; complete then approve. |
| Correct statement completes workflow. | Record reductions, import matching statement, assert completion allowed. |
| Incorrect statement shows variance. | Record reductions, import non-matching statement, assert variance and reopen controls. |
| Draft values persist. | Enter adjustment values, save partial, reload, assert values remain. |
| Plain CDF SELL state sync. | Send plain CDF SELL and assert `security_positions.position_state = SELL` with no action alert. |
| TMS stop sizing. | Send TMS `sell` with `cdf_state=BUY` and assert `SELL_50` / target copy `Sell Down 50%`; send with `cdf_state=SELL` and assert legacy `SELL` / target copy `Exit`. |
| Pooled deploy ticket. | Seed a class with confirmed funding, class capacity, and qualified candidates. Assert `ticket = min(max($100, 10% of opening pool), target shortfall, remaining funding)`; no order below `$100`; no stock receives reserved future cash. |
| CDF SELL purchase block and TMS re-entry. | Send plain CDF SELL, then an ADD and BREAKOUT event. Assert the evidence remains auditable but no ordinary purchase ticket projects until CDF returns to BUY. Seed a stopped/waiting position and send valid TMS REENTRY; assert it remains eligible under TMS rules. Existing sell-down, stop, and Exit paths remain unchanged. |
| Add-strength sizing neutrality. | Send matching `strong_add` and `weak_add` events with identical class conditions. Assert both project the same ticket and retain their strength/timeframe metadata. |
| Commodity permitted target and ticket. | Seed `GDXJ / GLD` and stock CDF as BUY. Assert a commodity cap can restrict target shortfall but cannot alter the shared ticket calculation; `OUTPERFORM BUY` alone must not create a buy. |
| Equity-regime Strong Trim. | Send `EQUITY_RELATIVE BUY -> SELL` and assert exactly one class-scoped 20% signal includes direct miners and mapped producer ETFs, excludes physical gold, and blocks entry/add/breakout/re-entry. |
| Sequential action evidence. | Emit outperformance trim, sell-down, stop, and Q3/Q4 signals over separate closed bars. Assert the queue preserves order, never creates a combined target, and refreshes later suggestions only after recorded execution. |
| Direct commodity isolation. | Send raw commodity SELL and assert no producer-equity cap or Strong Trim is created. |
| Direct vehicle and class-cash accounting. | Assert every configured direct expression defaults to `SIGNAL_ONLY`; an approval without a broker label/ticker is rejected; direct/equity `invested_value`, `sleeve_cash_value`, and `capital_value` remain distinct; class-held cash creates a hold/review state but no cross-class funding instruction. |
| PineScript payloads match live TradingView scripts. | `webhook-contracts.spec.ts` should cover every payload listed in `TRADINGVIEW_SCRIPTS.md`. |
| Asset-class selectors use canonical table. | Assignment/dropdown tests should assert `GET /api/asset-classes`, not `asset_class_config` or hardcoded lists. |
| Analysis council routing uses canonical asset class. | Council launch tests should assert `GOLD_MINERS -> gold_miner` style routing and fail on silent `general_equity` fallback. |
| History chart events retain signal dimensions. | Stock-history tests should assert add/trim type, strength, timeframe, and expiry labels. |
| News bootstrap creates foundation thesis map. | Backend narrative tests should persist a `BOOTSTRAP` mock payload and assert `foundation_run`, thesis rows, and items. |
| News foundation job promotes active cohort. | Backend narrative tests should run a mocked memo-seeded foundation job and assert `news_foundation_jobs`, `news_foundation_cohorts`, `foundation_cohort_id`, and visible theses. |
| News daily run updates existing theses. | Backend narrative tests should mock `SUPPORTS`, `CHALLENGES`, `MODIFIES`, `CONFIRMS`, `RESOLVES`, and `NEW` relationships. |
| Resolved/rejected news theses leave active prompt ledger. | Backend narrative tests should assert completed theses remain stored but are not injected into daily prompts. |
| News asset-class references conform to canonical asset classes. | Backend narrative tests should reject fake model-returned classes when `asset_classes` exists. |
| Failed news model run does not replace latest completed brief. | Backend narrative tests should record a failed run and assert the UI response still uses the latest completed run. |
| Thin or failed news foundation job does not replace active cohort. | Backend narrative tests should fail the quality gate and assert the previous active cohort remains active. |

## UAT Scenario Map

The detailed acceptance narrative lives in `tests/uat/UAT_WORKFLOW_SPEC.md`. The authoritative regression map is:

| Scenario | Primary suite | Purpose |
| --- | --- | --- |
| Q3 reduction `100 -> 30/35` | `actions-ui-workflows.spec.ts`, `portfolio-risk-state.spec.ts` | Confirms Portfolio Risk action creation, adjustment entry, statement wait, and persisted detector state. |
| Q3 correct statement import | `actions-ui-workflows.spec.ts` | Confirms recorded reductions reconcile against broker/account import. |
| Q3 incorrect statement import | `actions-ui-workflows.spec.ts` | Confirms statement variance is visible and actions can be reopened. |
| Q3 source mismatch | `actions-ui-workflows.spec.ts` | Confirms cash match alone is insufficient when the wrong holdings were reduced. |
| Q3 risk-on `30/35 -> 80` | `actions-ui-workflows.spec.ts`, `portfolio-risk-state.spec.ts` | Confirms visible allocation-available action with no forced trades or statement wait. |
| Q4 crisis activation | `actions-ui-workflows.spec.ts`, `portfolio-risk-state.spec.ts`, `webhook-contracts.spec.ts` | Confirms Q4 state, 10% target, priority over Q3, and crisis action workflow. |
| Q4 clear | `portfolio-risk-state.spec.ts`, `webhook-contracts.spec.ts` | Confirms Q4 clears to 100 and stored Q3 state remains available. |
| Manual portfolio target | `actions-ui-workflows.spec.ts` | Confirms target rows, decreases first, pending increases, statement match, and baseline approval. |
| Portfolio target draft persistence | `actions-ui-workflows.spec.ts` | Confirms partial target edits survive reload and can clear back to zero. |
| ETF rebalance lifecycle | `etf-rebalance.spec.ts` | Confirms webhook, active targets, allocation update, supersession, and dismissal. |
| Per-security CDF/TMS split | `security-signal-workflows.spec.ts` | Confirms CDF state sync and TMS `SELL_DOWN` action path. |
| Security action queue | `security_actions_test.go` | Confirms Exit priority, blocked later actions, Exit ignore gate, execution report, statement confirmation, queue release, class-pool ticket competition, CDF add block, and TMS re-entry eligibility. |
| Execution quantity matching | `security_action_units_test.go`, `commodity_themes_test.go` | Covers optional units through both APIs, invalid/duplicate reports, current execution baselines, estimated 9/10/11-unit matches, undersized/oversized/wrong-direction movements, class price-only falls, per-member reductions, AUD-per-share estimates, Strong/Weak trim percentages, unresolved identities, older/same-day/other-account statements, and manually recorded external execution. |
| Event simulator | `tools/uat-event-simulator/` | Standalone local HTML runner that replays versioned CDF/TMS paths against UAT without becoming part of the application, including a funded `$100` class-pool Add ticket. |
| Pooled capital and commodity-linked position sequence | `commodity_themes_test.go`; planned `pooled-capital-deployment.spec.ts`, `commodity-theme-policy.spec.ts` | Confirms direct vehicle defaults/validation, class-specific capital attribution, no cross-class funding, no reserved tranche, strength sizing neutrality, commodity permitted target, class Strong Trim, sequential action order, and separation of physical and producer-equity sleeves. |
| One-week trading simulation | `week-trading-simulation.spec.ts` | Confirms the application can carry state across multiple trading days, signals, statements, portfolio target changes, and Q4 crisis. |
| Macro news narrative lifecycle | `news_narratives_test.go` | Confirms foundation/daily mode separation, thesis direction changes, completion handling, prompt injection, and model-output sanitisation. |

## Quantity-Matching Checks

Durable webhook inbox tests are in `backend/webhook_inbox_test.go`, with legacy
Retry/Dismiss tests in `backend/webhook_dead_letters_test.go`. Run
`go test -race -vet=off . -run 'TestWebhookInbox|Test.*DeadLetter|TestAsyncFailure' -count=1`
from `backend/`. Coverage includes persistence before ACK, SQLite reopen with
pending work, storage rejection, concurrent duplicates, intervening opposite
signals, interrupted processing, failed completion writes, panic/error review,
retry/dismiss, stale/out-of-order events and seven-day cleanup preserving
unresolved work and alert history. These tests use local disposable databases.

Statement import regressions are in `backend/statement_import_test.go`. Run
`go test -vet=off . -run '^TestStatementImport' -count=1` from `backend/`.
They check required fields, totals, dates, account mismatch, FX, duplicate
identities, external preservation/conflicts, missing ISINs, renames, all-cash
snapshots, zero-value rights, same-day correction IDs and next-day action
confirmation. Injected database read/write failures compare all affected tables
before and after to prove rollback. Tests use a disposable local database;
do not replay valid fixture snapshots into an account containing real UAT data.

Run from `backend/`:

```sh
go test -vet=off . -run 'TestSecurityAction|TestCommodityThemeClassAction' -count=1
go test -vet=off . -count=1
```

Run `npx tsc --noEmit` from the repository root for the optional-units UI and
API types. The deployment build provides the production compilation check;
these tests are not a claim of complete browser workflow coverage.

Known wider-suite limitations on 8 September 2026: default vet rejects existing
`t.Context()` tests under the declared Go 1.21 module version, and
`go test -vet=off ./...` retains the pre-existing exact-floating-point assertion
failure in `internal/portfoliotarget/adjustment_test.go` (`4999.999999999999`
versus `5000`). Keep these separate from the passing backend package tests.

## Macro News Narrative Tests

The News tab is tested with mocked model payloads, not live model calls.

Covered backend cases:

- `BOOTSTRAP` foundation run persists a long-horizon thesis map and is returned as `foundation_run`.
- `DAILY` run can update an existing thesis, create a new thesis, and resolve an old thesis without duplicating rows.
- Relationship directions are preserved as audit facts: `NEW`, `SUPPORTS`, `CHALLENGES`, `MODIFIES`, `CONFIRMS`, and `RESOLVES`.
- Resolved theses stay in history but are excluded from the active thesis ledger injected into the next daily prompt.
- Noisy model output is normalised: timeframes, statuses, relationships, conviction values, duplicate sources, duplicate tags, and asset classes.
- Asset-class references are filtered through the canonical `asset_classes` table when it exists.
- Memo-seeded foundation prompts extract structured thesis candidates from the latest saved portfolio memo before web validation.
- Candidate extraction dedupes repeated title/timeframe pairs and drops unknown asset-class codes when the canonical table is available.
- Persisted foundation theses keep memo provenance, source excerpt, supporting evidence, opposing evidence, and invalidation trigger fields.
- Failed model calls create a failed run record but do not replace the latest completed brief.
- Memo-seeded foundation runs persist research lanes before web validation.
- Backend canonical clustering collapses obvious duplicate thesis families, such as AI capex / AI earnings / AI infrastructure variants, before promotion.
- Async foundation jobs persist stage/progress state and promote successful runs into an active foundation cohort.
- Thin foundation jobs fail the quality gate and do not replace the previous active cohort.

Remaining useful coverage:

- API-level tests for `POST /api/news/foundation-jobs` handler behaviour around `202 Accepted` and job polling.
- UI tests for foundation job polling, failed-job display, stale state, memo-source reveal, full thesis-detail reveal, and completed-thesis display.

## Q3 Risk-Off Scenario

Setup:

1. reset overlay state to last applied `100`
2. clear Q4
3. seed Q1-sensitive holdings
4. ensure latest statement exists

Action:

```bash
curl -X POST "$API_BASE_URL/api/webhook/regime" \
  -H "Content-Type: application/json" \
  -d '{"ticker":"SPX","script":"q3d","target_equity_pct":35}'
```

Assertions:

- `equity_sizing.SPX = 35`
- `overlay_signal_state.current_q1_exposure_pct = 35`
- `overlay_signal_state.last_applied_q1_exposure_pct = 100`
- open `overlay_events` row exists
- UI Active Actions shows `Q3 Detector`
- Alert Type shows `Portfolio Risk`
- workflow step is Adjust Positions
- adjustment cells are editable
- required reduction is greater than zero

## Q3 Risk-On Scenario

Setup:

1. last applied Q3 state is lower than new signal, for example `35`
2. no Q4 active crisis

Action:

```bash
curl -X POST "$API_BASE_URL/api/webhook/regime" \
  -H "Content-Type: application/json" \
  -d '{"ticker":"SPX","script":"q3d","target_equity_pct":80}'
```

Assertions:

- detector state updates
- visible Portfolio Risk action exists
- no forced reduction cells
- no statement wait
- no portfolio rebalance plan is created
- UI offers review/mark-reviewed path

## Q4 Crisis Scenario

Action:

```bash
curl -X POST "$API_BASE_URL/api/webhook/regime" \
  -H "Content-Type: application/json" \
  -d '{"ticker":"Q4","signal":"SELL","script":"q4d"}'
```

Assertions:

- `q4_crisis_state.active = 1`
- `equity_sizing.Q4D = 10`
- `portfolio_risk.mode = Q4_CRISIS`
- UI shows event `Q4 Crisis`
- UI shows type `Portfolio Risk`
- Q4 uses market exposure target 10%
- Q4 action follows reduction plus statement workflow

Clear action:

```bash
curl -X POST "$API_BASE_URL/api/webhook/regime" \
  -H "Content-Type: application/json" \
  -d '{"ticker":"Q4","signal":"BUY","script":"q4d"}'
```

Assertions:

- Q4 state inactive
- Q3 detector state remains available

## Portfolio Target Scenario

Setup:

1. approved baseline exists or current mix is available
2. create target rows with both decreases and increases

Assertions:

- plan status `OPEN`
- rows persisted
- decreases appear in action workflow
- increases show pending until cash exists
- recorded values persist across reload
- complete sets `COMPLETED`
- approve creates approved `portfolio_mix_snapshots`
- old approved snapshot becomes `SUPERSEDED`

## Statement Match Scenario

For Q3/Q4:

1. trigger action
2. record reductions
3. confirm Stage 1
4. import statement where holdings/cash match expected after-values
5. assert workflow can complete

For portfolio target:

1. create target
2. record required decreases
3. complete position actions
4. import statement matching target movement
5. approve baseline

## Statement Variance Scenario

1. trigger action
2. record reductions
3. import statement where cash or holdings do not match
4. assert variance visible
5. assert reopen action works
6. correct values or import later statement
7. assert completion works after match

## Playwright Requirements

Playwright tests should:

- navigate to app
- open Positions and Actions
- send backend setup payloads directly where required
- commit adjustment cells with keyboard Enter
- check buttons and locked states
- reload page to verify persistence
- import or simulate statement results
- inspect both UI and backend state

Existing files:

- `tests/uat/actions-workflows.spec.ts`
- `tests/uat/actions-ui-workflows.spec.ts`
- `tests/uat/portfolio-risk-state.spec.ts`
- `tests/uat/webhook-contracts.spec.ts`
- `tests/uat/security-signal-workflows.spec.ts`
- `tests/uat/etf-rebalance.spec.ts`
- `tests/uat/UAT_WORKFLOW_SPEC.md`

## Webhook Contract Suite

Webhook tests must include both endpoint correctness and semantic correctness:

- Q3/Q4 detector payloads sent to `/api/webhook/tradingview` are invalid for
  portfolio risk and should not create ordinary ticker alerts.
- CDF/TMS payloads sent to `/api/webhook/regime` are invalid for per-security
  actions.
- Q3 is percentage-based; Q4 is BUY/SELL-based.
- TMS and ETF TMS retain `strength` and `timeframe` as dimensions separate from
  the action label.

The webhook contract suite lives at:

- `tests/uat/webhook-contracts.spec.ts`

It covers:

1. Q3 detector packets are rejected from `/api/webhook/tradingview`.
2. Q4 detector packets are rejected from `/api/webhook/tradingview`.
3. Q3 state accepts preferred `SPX`, legacy `SPY`, and `XAO`.
4. `SPX` takes precedence over legacy `SPY` for the S&P leg.
5. Q4 `SELL` persists active crisis state and writes `Q4D = 10`.
6. Q4 `BUY` clears crisis state and writes `Q4D = 100`.

Run:

```bash
UAT_WEBHOOK_CONTRACT_TEST=1 \
UAT_RESET_COMMAND="tests/uat/reset-fly-uat.sh" \
UAT_API_BASE_URL=https://alpha-edge-uat-backend.fly.dev/api \
npm run test:uat:webhooks
```

## Portfolio Risk State Suite

The portfolio risk state suite lives at:

- `tests/uat/portfolio-risk-state.spec.ts`

It covers:

1. Q3 before Q4.
2. Q3 changing while Q4 is active.
3. Q4 clearing back to the stored Q3 state.
4. Q3 risk-on being marked reviewed without trades, statement wait, or target creation.

Run:

```bash
UAT_PORTFOLIO_RISK_STATE_TEST=1 \
UAT_RESET_COMMAND="tests/uat/reset-fly-uat.sh" \
UAT_API_BASE_URL=https://alpha-edge-uat-backend.fly.dev/api \
npm run test:uat:risk-state
```

## Per-Security Signal Suite

The per-security signal suite lives at:

- `tests/uat/security-signal-workflows.spec.ts`

It covers:

1. Plain CDF `BUY` / `SELL` updates `security_positions` without creating action alerts.
2. TMS `cdf_sell_zone` creates an explicit `SELL_DOWN` (`Sell Down 20%`) action alert when the ticker has an active TMS setup.

This suite intentionally documents the split between CDF state sync and visible `SELL_DOWN` / `Sell Down 20%`.

Run:

```bash
UAT_SECURITY_SIGNAL_TEST=1 \
UAT_RESET_COMMAND="tests/uat/reset-fly-uat.sh" \
UAT_API_BASE_URL=https://alpha-edge-uat-backend.fly.dev/api \
npm run test:uat:security-signals
```

## UAT Event Simulator

The simulator is deliberately outside the Alpha Edge application. It is a
plain local module in `tools/uat-event-simulator/`, so production and UAT
application bundles, routes, schemas, and UI stay untouched. Its local server
is hard-coded to the UAT Fly app and a single fixture ticker; it does not create
an application endpoint.

Serve it locally from port 3000, which is already a permitted development
origin:

```bash
npm run serve:uat-event-simulator
```

Open `http://localhost:3000` beside the UAT application. Enter the UAT API
token into the runner; it remains in the browser session only. The local
machine also needs an authenticated Fly CLI session. **Start clean** uses that
local CLI to create or reset only the reserved `ASX:AEVT` fixture: a normal
100-unit `$500` UAT Gold Miner holding, stable security identity, and matching
statement snapshot. The fixture is not external, so it appears in the real UAT
Positions tab after refresh; the statement's UAT mock cash is reduced by `$500`.
The runner clears only its own fixture rows, simulator theme events, and active
fixture alerts; fixture alerts with recorded decisions are retired to preserve
their audit history. It then sends only fixed event payloads.

Use it in this order:

1. Open the local runner and select a scenario.
2. Choose **Start clean** to prepare the reserved UAT holding and statement fixture.
3. Choose **Next event** once per expected signal.
4. Compare the runner's expected and observed state with the genuine UAT
   Alert Stack in the separate Alpha Edge tab, then mark the step checked or
   flag the discrepancy.

The catalogue covers the full CDF/TMS security lifecycle, connection-routing
guardrails, and commodity-ratio transport. The commodity scenario verifies
`BATS:GDX / BATS:GLD` against the configured Gold equity regime and
`ASX_DLY:AEVT / BATS:GDX` against the Gold Outperform stage. It confirms the
persisted Market evidence, then transitions Gold equity regime `BUY -> SELL`
and confirms the one class-scoped Equity Regime Strong Trim action includes the
same fixture holding. Stock-level Outperform transitions also create visible
confirmation/loss alerts. The 75/100 live-cap and Outperform-reduction policy
remain unfinished.
The final lifecycle step intentionally records the current raw `SELL` full-stop
code so the forthcoming `Exit` gate migration can be tested rather than
obscured.

The runner is an operator aid, not a production API or a general webhook
injector. Formal automated coverage remains in the backend and Playwright UAT
suites for the underlying webhook and alert contracts.

## ETF Rebalance Suite

The ETF rebalance suite lives at:

- `tests/uat/etf-rebalance.spec.ts`

It covers:

1. `/api/webhook/etf-rebalance` creates active ETF rebalance targets.
2. The webhook updates `etf_allocations`.
3. A newer rebalance sequence supersedes the previous sequence in the active workflow.
4. Dismissal removes the active sequence from `/api/etf/rebalance`.

Run:

```bash
UAT_ETF_REBALANCE_TEST=1 \
UAT_RESET_COMMAND="tests/uat/reset-fly-uat.sh" \
UAT_API_BASE_URL=https://alpha-edge-uat-backend.fly.dev/api \
npm run test:uat:etf-rebalance
```

## One-Week Trading Simulation Suite

The week simulation suite lives at:

- `tests/uat/week-trading-simulation.spec.ts`

It is the orchestration test. The individual suites prove each contract; this suite proves the system can carry state across a realistic trading week without silently losing context.

It covers:

1. A clean baseline statement and approved starting portfolio mix.
2. Mock CDF/TMS alerts for SELL, SELL_DOWN, ADD, and BREAKOUT.
3. User decisions against those action alerts.
4. Daily statement imports showing share reductions, adds, price movement, and new cash.
5. Q3 risk-off from 100% to 35%.
6. Q3 position reductions, correct statement import, Stage 2 redistribution, and baseline close.
7. A new manual portfolio target with required decreases and pending increases.
8. New compensating positions added through the next statement.
9. Portfolio target statement validation and baseline approval.
10. Q4 SELL crisis liquidation to the 10% market-exposure target.

Run:

```bash
UAT_WEEK_SIMULATION_TEST=1 \
UAT_RESET_COMMAND="tests/uat/reset-fly-uat.sh" \
UAT_API_BASE_URL=https://alpha-edge-uat-backend.fly.dev/api \
npm run test:uat:week-simulation
```

The suite writes a Playwright attachment called `week-trading-simulation-timeline.json` showing the day-by-day cash, invested value, total value, and holding count.

Week simulation branch coverage still needed:

| Branch | Expected result |
| --- | --- |
| Stale statement after Q3 reductions | Workflow stays in variance/wait state until a later correct statement arrives. |
| Wrong holdings sold but cash matches | Cash confirmation alone is not enough; source-level discrepancy must be visible. |
| Q4 arrives while a portfolio target is open | Q4 becomes the resolved urgent action; the target must not be lost or silently approved. |
| Q3 risk-on arrives after Q4 clears | User sees allocation available, not forced buys or baseline approval. |
| New cash arrives with distorted baseline | App shows deployable gaps and portfolio-shape context; it does not auto-feed losers or winners. |
| Breakout appears with no sleeve cash | App shows an unfunded breakout gap rather than stealing from other sleeves silently. |

## Required Improvements

### Local Workflow Contracts And Freshness (September 2026)

Run without deployment or shared database writes:

```bash
node --test tests/workflow-api-contracts.test.mjs tests/data-freshness.test.cjs
node --test tests/data-freshness.browser.test.cjs
```

The first command runs a real-handler workflow against temporary file-backed
SQLite and validates captured response bodies against selected OpenAPI schemas.
It covers a funded TMS purchase, duplicates, a Q4-blocked execution, database
reopen, optional unit reporting, statement waiting, confirmation and corrections.
Existing reduction, external-holding and inbox uncertainty tests remain separate.
It is not full browser-to-broker or operating-system crash coverage. The browser
test requires the local dev server and intercepts API traffic with isolated data.
CI runs `test:contracts` in the Go-enabled documentation job and `test:freshness`
in the frontend job. The full backend suite includes the joined workflow test.

Freshness resource tests cover shared polling, in-flight deduplication, retained
last-known data on failures and authentication reset. Dates and cross-field
business constraints are tested in Go; the JSON validator checks structure and
values without an additional date-format plugin.

### Announcement Subscription Setup (September 2026)

```bash
cd backend
go test -p 1 ./... -run TestAnnouncement -count=1
```

From the repo root, against a local legacy/owner-mode frontend with no live
backend required (browser API calls are intercepted):

```bash
CONTEXT_PANEL_BASE_URL=http://127.0.0.1:3100 node --test tests/announcement-subscriptions.browser.test.cjs
npx tsc lib/announcement-subscriptions.ts --target ES2020 --module commonjs --moduleResolution node --skipLibCheck --outDir /tmp/alpha-edge-announcements --rootDir .
node --test tests/announcement-subscriptions.test.cjs
npm run test:access
```

Backend tests cover default-unconfirmed setup, identity deduplication, imports,
restart persistence, atomic batch conflicts, idempotence, reset, changed listings,
required fields and authentication. The migration suite preserves existing data;
nonempty setup rows are included in backup/recovery comparisons. Browser tests
cover the visible Alerts reminder and inline Announcements section,
individual/bulk confirmation, reload, reset, save errors, retained access
after completion, keyboard focus, and desktop/mobile layouts in both themes.
The access test checks read-only demo fixtures and mutation rejection. Provider
subscriptions and actual announcement delivery are not simulated as confirmed.
Provider default tests cover ASX, other global exchanges, missing exchange
identity, preserved confirmations and defaults recalculated after listing changes.

### Broader Test Backlog

1. Add DB seed verifier that checks accounting balance and required mappings.
2. Add direct DB assertions after each Playwright workflow.
3. Add UI assertions that alert cards and history charts render `Sell Down 50%` and `Exit` distinctly after the action-label migration.
4. Add stock-sizing tests for quality/value/upside allocation.
5. Add tactical class cash versus portfolio reserve cash tests.
6. Add breakout funding-gap tests once the workflow exists.
7. Add passive drift-review threshold tests once drift state is formalised.
8. Split the week simulation into additional branch tests for stale statements, Q4 arriving during an unfinished portfolio target, and Q3 risk-on arriving after a completed Q4 crisis.
