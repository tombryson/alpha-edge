# Terminal Style Standard

8 September 2026. First adoption pass, local branch only; not deployed.

## Thesis

Alpha Edge is a working trading terminal, not a collection of dashboard demos.
The user should recognise the same hierarchy, controls and state language when
moving between positions, research, allocation, market gates and history.
Information density comes from alignment and grouping, not tiny text. Colour
communicates identity or state, not decoration. The important item in a row is
its subject and current evidence; the surrounding interface stays quiet.

Positions and Analysis are the visual references. Preserve their existing
appearance in this pass. Reuse their principles without copying every historical
CSS exception or forcing every page into a stock table.

## Reference Evidence

Inspected current UAT surfaces and the corresponding source:

| Reference | Established pattern | Boundary |
| --- | --- | --- |
| `components/stock-table/position-grid-styles.tsx` | 13px / 400 body text, 500 parent labels, parent background `--panel-bg-alt`, restrained row hover, aligned numeric columns | Its broad descendant selectors and 10px table labels are not a new global standard. |
| `components/stock-table/analysis-panel.tsx` | Distinct hierarchy bands, 2.55rem hierarchy rows, compact 26px security rows, indented identities, contextual left-edge tools | 1.4rem / 200 lowercase hierarchy headings are an intentional Analysis variant, not an instruction to lowercase every application heading. |
| `components/stock-table/analysis-toolbar.tsx` | Compact icon commands, separate view controls, contextual search, colour attached to tool purpose | Keep native symbols/tickers and existing command semantics. |
| `app/globals.css` | Shared theme variables, system sans font, semantic colours and theme-switch suppression | Local page palettes must not override theme changes. |

## Rules

For narrow-screen exceptions and their verification boundaries, see
[Mobile Responsiveness](MOBILE_RESPONSIVENESS.md). Desktop remains the reference;
phone layout does not change financial semantics or saved desktop preferences.

### Typography

- System sans for interface labels, subjects and values. Use tabular numerals
  for amounts and percentages; a separate monospace brand is not needed per tab.
- Normal row data: 13px, weight 400, comfortable line height (about 1.5).
- Row/group subjects: 13-14px, weight 500. Page/section titles: 15px, weight 500.
- Secondary metadata and column labels: 11-12px. Primary state or actions must
  not be relegated to 8-10px captions. Chart micro-labels are a separate exception.
- Sentence/title case for prose and controls; preserve ETF, Q3, Q4, ticker codes,
  and approved signal names. No artificial tracking to make small text important.
- No viewport-scaled font sizes and no new forced `line-height: 1` on text rows.
- Muted means secondary, not unreadable. Important amounts must not be ellipsised.

### Surfaces And Hierarchy

- Reuse `--background`, `--card`, `--panel-bg-alt`, and Analysis row/hover tokens.
- The page is an unframed working surface. Use bands and fine continuous rules
  to separate sections; reserve shadows for menus and dialogs, not every panel.
- Keep row separators visible. Avoid strong alternating stripes or borders
  around every individual number. Use the group band to communicate ownership.
- Preserve existing asset-class colours, shape bars, wheels, market nodes and
  connections. These encode data; replacing them is not cosmetic normalisation.
- Do not add new summary panels, sidebars, legends or explanatory paragraphs
  merely to make a page appear designed. Help owns general explanation.

### Colour And State

- Class identity follows [Asset-Class Visual Identity](../system/ASSET_CLASS_VISUAL_IDENTITY.md):
  one code-keyed palette for shape bars, pies, History, System and class rails.
  This explicit palette migration supersedes preserving conflicting old class
  colours; it does not change the semantic state tokens below.
- Foreground for subjects/current values; secondary for labels; muted for dates
  and supporting context. Resolve neutrals against the selected theme.
- Preserve existing semantic tokens for bullish/bearish, caution, information
  and risk. Do not recolour entire rows or numeric columns as decoration.
- Positive/negative performance is not the same as above/below an allocation
  target. A target difference must retain its documented meaning and tolerance.
- Missing, zero, neutral, disconnected and blocked remain different states.
  No visual pass may convert missing evidence into a neutral or successful state.

### Positions Capital Map

14 September 2026, branch `codex/positions-capital-map`.
Simple is an optional normal-Positions presentation, not a replacement for the
table or Actions. Use the installed Recharts hierarchical treemap for 2D area layout,
with actual positive held values as weights and existing asset-class codes as
group identities. Never impose minimum weights to enlarge small holdings.
Tile and class percentages retain the portfolio-value denominator, including cash;
class focus rescales only the viewport. Search highlights rather than filters area.

The 1D toggle uses equal-width rows sized by held value divided by displayed
invested capital, multiplied by the chart viewport height. CSS size containment
and container-height units keep the scale responsive without resize-driven React
state. There is no minimum row height, vertical padding or inter-row gap: small
allocations must not be inflated. A 1D-only slider applies a shared 1x-2x scale
to the row stack and row heights, never to text size or financial values. Zoom
preserves the top-of-view capital position; search brings its result into view,
centring its label if the row exceeds the viewport. Zoom is session component
state, retained across layout switches, not a new backend or browser preference.
The text-icon toggle defaults to clipped labels. When disabled, a row-size
container hides labels at 27px or less. Both modes retain the accessible name
and strictly proportional height; text must never expand the row. Hover, focus
and search expose full details in the inspector, including subpixel holdings.
Do not add target weights or funded/over-target colours to this held-only
view. The selected-holding inspector stays outside the chart scroll area. Search
scrolls that area only and never resizes or filters rows. Layout changes retain
class focus and search; the 1D/2D preference is browser-local and independent of
the Table/Simple preference. Rows default to canonical class colours in both themes.
The 1D map reserves a 44px left gutter for a cumulative percentage axis. Tick
offsets are `(portfolio value * percentage / 100) / displayed held value` within
the scaled stack, so they scroll and zoom with the rows. Use approximately four
nice intervals, normally 25 percentage points; class focus changes the interval,
not the whole-portfolio denominator. Invalid totals produce no axis. The axis
must not rescale row heights, create cash holdings or change the 2D chart.
The holding inspector includes statement `gain_loss_pct` via `Stock.changePercent`
and the Positions table's existing `securityPositions[stock.symbol]` trend. Do
not use the store's default `stock.signal`, derive P/L from allocation weights,
or fetch another data source. Use theme-backed positive/negative text, neutral
missing/zero values, and wrapping metrics on narrow panels. The optional chart-icon
**Colour by P/L** toggle changes map fills only: `clamp(P/L / 50, -1, 1)` selects
a continuous neutral-to-red/green fill with fixed endpoints. Use fixed HSL hues
(red 0 degrees, green 135 degrees), increasing saturation and theme-specific
lightness as magnitude grows. Do not RGB-mix with a tinted neutral, which shifts
the hue through unwanted intermediate colours. Zero and missing
P/L use `--background` with `--foreground` text, following theme changes instantly;
missing values remain distinguishable in the inspector. Trend
does not drive these colours. Do not rebase the scale on class focus, recolour the
canonical class swatches, alter holding geometry/order, or fetch new data. Use
theme-aware heatmap palettes with readable contrasting labels. Hover/focus uses
outlines, not fill changes that would distort the encoded return. Persist this
display choice under `alpha-edge:positions-map-colour` and retain session use
when browser storage is blocked.

The chart is an unframed work surface with theme-aware class-colour fills, thin
rules and no animation. Tile text adapts to available tile dimensions, not viewport
font scaling. Small tiles retain accessible names and a full-value inspector.
Use the shared class-colour registry; do not create another palette or colour
preference. The table styling, row icons, sidebar styling and financial logic are
unchanged. The presentation preference alone is stored in browser local storage.
See [Positions Help](../user/positions.md#simple-view).

### Optional Positions Row Appearance

13 September 2026, local branch `codex/position-row-appearance`; not deployed.
The Row appearance view-menu item and its border editor have been removed.
Header backgrounds and borders retain their existing theme surface. An arrow/icon
button beside each class name provides access to its compact icon palette, with a class-colour
swatch beside the palette heading. The swatch opens the existing 30-colour editor;
there is no separate row-colour store. Every class uses a stable 28px symbol slot
on desktop and touch. With no custom icon, a 10px Lucide triangle shows expansion
(down) or collapse (right); a chosen 16px icon replaces it. Hover and replacement
do not shift the class name. Ordinary clicks on the name or symbol share the same
expansion handler, with accessible labels but no expand/collapse tooltip.
After 800ms hovering over the symbol alone, it becomes
a pencil: a click then opens the picker without changing expansion. Pointer exit,
blur, cancellation and popup closure reset this mode; unmount clears the timer.
Touch uses an 800ms hold (scroll movement cancels it); keyboard users can
open the picker with Arrow Down or F2, while Enter/Space retain expansion.
Default arrow restores the triangle, using the existing
persisted `none` identifier. There is no global icon setting. No stock-row
colours, state colours, column widths, fonts, sidebar behaviour or financial logic change.
Q1 bands, cash summaries, Actions and other tabs do not opt in.

The icon catalogue contains 72 symbols, plus automatic/default-arrow controls. Its
code-keyed mappings cover all 56 shared class identities (the backend bootstrap
catalogue contains 49 classes). This is presentation coverage, not a claim about
the number of user-created or active database classes. A grouped, searchable grid
scrolls within a bounded popover; keyboard opening focuses a control rather than
forcing the mobile search keyboard open. Existing icon IDs retain their symbols.

Icon selection saves immediately for the clicked class only, after browser storage
succeeds. Default arrow removes the custom icon. The colour editor follows
the shared Save/double-click/Cancel/Reset contract and persists through the existing
class-colour settings API. A colour change updates canonical class-colour consumers;
row icons default to the previous neutral theme foreground. Two icon-only previews
form an accessible radio group: Neutral and Class colour. Both show the selected
symbol (the disclosure arrow when none is assigned), with a subtle outline on the selected
mode. Hover tooltips name them; there is no visible instruction or checkbox.
Selection saves immediately in browser preferences without writing the palette.
Row backgrounds and semantic state colours remain unchanged. Palette
events do not trigger collapse, double-click navigation or row dragging. A
storage failure keeps the relevant editor open and its previous setting intact.

`lib/position-row-appearance.ts` owns the version-3 icon-only model and validation.
It also owns icon IDs, labels, groups and explicit canonical-class mappings.
`position-row-emblem.tsx` provides the statically imported Lucide components;
automatic selection normalises class aliases before looking up a symbol.
Icons use an independent map keyed by source class code. The Zustand store retains the existing storage key
`alpha-edge:position-row-appearance-v1`, scoped to the browser origin, and listens
for other tabs' storage changes. Codes retain their source underscores and are
not keyed by group names, financial-normalizer compact keys or row order.
Row icons use `var(--foreground)` unless opted into `var(--row-accent)` by the
optional `classColourIcons` true-only map in version 3. Missing entries are neutral;
icon replacement/removal preserves the mode. No independent hex values are stored.
The colour swatch always uses the canonical class colour. Version-1/2 reads discard
all borders, global icons and background settings while retaining explicit per-class
icons. No arbitrary CSS, uploaded files, remote image URLs, new backend endpoints
or database migrations are added. Colour changes write only the existing
`asset_class_colour:<CLASS_CODE>` setting.

Verification covers malformed/future preferences, version-1/2 migration, independent
class icons, retired menu/border settings, storage failures, reloads, unchanged
row geometry during selection, Compare, and dark/light popovers at desktop and mobile sizes.
Nested colour-editor checks cover draft/Cancel/Save/Reset/double-click, failed saves,
focus restoration, unchanged class expansion, and updates to the shared chart palette.
Preview checks cover per-class independence, persistence, arrow-key access, failed
storage writes, both themes and following a saved canonical colour change.
Screenshots were checked against isolated fixture data, never saved to UAT.
See [Positions Help](../user/positions.md#row-appearance).

### Alert Stack Recovery And Compact Rails

14 September 2026, branch `codex/alert-stack-recovery`. The first recovery shipped
to UAT v1218. The subsequent laptop-density correction described below shipped
to UAT v1219. The identity, typography and spacing refinement below shipped to
UAT v1220. Production remains unchanged.

The current local revision restores Alert Stack cards from production v613,
superseding the flat-row and typography experiments in UAT v1218-v1221. The
historical component at `c6af7e37c40e5e9af6a97aa469bdaf9b1a3da487` matches all 61
fixed JSX class lists in the running production bundle. Fly does not record a
source SHA, so this is a verified presentation reference, not a claim that the
entire deployment was a clean build of that commit.

Class headers use production's 5% class-colour wash, 28% top rule, continuous
2px left rail, elliptical corners, 10px class names and 9px counts/dates. The
newer pin icon and canonical class colours remain. Individual cards again have
a complete 1px border, 3px radius and 70% card surface. Their measured production
spacing is explicit: 4.8px vertical padding, 1.6px between text lines, 3.2px
between cards and 4.8px between groups. Security names are 12px, metadata and
instructions 10px. Ordinary cards are 50px tall; long instructions can wrap
instead of being clipped in the narrower current shell. No obsolete handlers,
allocation calculations, global spacing variables or production shell widths
are restored.

Wide rails retain names/dates above ticker, signal and price movement. Compact
rails keep chart/ignore icons in their existing separate edge column. Long
names and tickers retain full-value hover titles; instructions remain visible.
Compact ages omit the redundant "ago" suffix while keeping the full relative
age in the accessible label and hover title; group-header dates are unchanged.
Mobile names wrap, controls remain reachable and large expanded groups have no
fixed height ceiling. There is one content scroller and a separate History footer.

Q3/Q4 retain the existing target and exposure data, presented in a restrained
outlined notice. Semantic state colours resolve through theme tokens, independently
of class identity. Signals, their percentages and missing values are not recast.
Hover preview, pinning, expand-all, chart destinations and action handlers retain
their existing roles. Collapsed content is hidden and inert; nested chart/ignore
keyboard activation does not also open the parent alert. Theme colours update
immediately. The Alerts connection page, shell widths, backend and
execution/statement rules are outside this change.

The separator follow-up reserves a shared `--shell-handle-width` (0.75rem)
inside each desktop rail. This is independent of the global Tailwind `--spacing`
scale: cards, footer buttons and workspace tabs must not sit beneath the separator
or intercept its clicks. Outer rail widths stay 288/224/204px at the existing
breakpoints. The inner panel excludes the 1px rail border, and its width transition
matches the outer rail so breakpoint changes cannot expose content beneath the
handle. Compact container thresholds account for the reserved 13px without
changing wide-screen typography. The sleeve dock stays flush at the bottom/right;
its former handle padding is removed to avoid a double gutter. Mobile drawers
retain their own spacing. This separator correction shipped to UAT v1221; see the
[release record](PUBLIC_SOURCE.md).

A subsequent local density adjustment removed 1px of top and bottom padding
from desktop cards. Its 42px Alert Stack rows have now been superseded by the
production restoration. At that revision, ETF line cards remained 40px compact / 52px wide, with
their existing styling, figures and fill unchanged at the user's clarification.
Only the ETF connection marker is restored: 3.2px wide, 9.6px high, 30% radius,
centred on the ticker with a 4.8px gap, matching the rendered production marker.
These local follow-ups have not yet been deployed.

The deployed ETF compact mode used 42px line chips instead of 54px. Primary
tickers/amounts are 13px, class labels 11.5px, and differences remain 12px. Three
pixels of vertical padding, a 1px line gap and 3px chip spacing give the text
room without expanding the cards into large panels. Its target badge
uses two short lines when the rail is narrow; Held/Target amounts wrap if needed
rather than truncate. Ticker/signal and held value occupy the first line; asset
class and difference occupy the second. The allocation line sits below the class
text, inside the chip, without taking an additional text row. Capital-map sizing, Security/Shape views, the fixed sleeve
dock and mobile touch spacing are unchanged. Container width chooses compact
content layout; the desktop guard prevents it from compressing mobile drawers.
No CSS zoom or viewport-scaled fonts are used.

The 14 September ETF summary continued the tab bar as a full-width band: a 12px ETF allocation heading with inline view
icons, a 13px held/target dollar pair with a secondary 12px signed difference,
and a funding bar spanning the inner width. Standard height is 76px (84px for touch).
Its background uses `--panel-bg-alt`, matching the sidebar tab bar in every theme.
It starts directly below the tabs, with matching horizontal insets, 4px top and
6px bottom padding, and a subtle bottom divider. Do not paint an unpadded inset rectangle.
Large figures wrap the difference onto another line instead of truncating money.
There is no separate fund-count row, oversized headline or target percentage badge.
The target tick sits at 80% of the track, matching the line chips, with excess
in red. Labelled details appear on hover, focus or tap in a viewport-clamped
popover. The existing chips, capital map,
Core controls and allocation engine are unchanged. Deployed to UAT frontend v1222;
see the [release record](PUBLIC_SOURCE.md).

At 1440x800 with the same five-alert fixture, production rows measured about
50px and the initial UAT-style rows measured 85px. Density regression coverage
now uses 720-800px laptop heights and verifies five alert rows plus class headers
occupy less than half the viewport at 1366px and above. At 1280x720, a 400px
budget allows full instructions to wrap in the 204px rail, with five ETF chips fully visible above the
sleeve dock. Checking only row widths at a 900-1080px viewport height is inadequate.
The follow-up adds older alerts, real-length company/class names and nine funds.
It checks useful identity-column width as well as text size, and eight complete
fund chips above the dock at 1440x800. This deliberately trades the previous
nine-chip maximum for slightly more readable spacing. A five-item count alone cannot establish
that the sidebar is readable.

#### ETF Sidebar Refinement (15 September 2026)

This local revision supersedes the earlier line-chip layout above, without changing
the sleeve dock, capital map, shared sidebar controls or allocation policy.

- Use a continuous allocation list with thin row dividers, no individual rounded
  card outlines, and a single Fund / Held / target column heading row.
- Use two text rows: ticker and right-aligned held / target; then secondary class,
  trend and signed allocation difference. The target must remain visible.
- Put a full-width 3px funding line below the text, not alongside class labels.
  Retain the 80% target marker and existing excess calculation.
- Standard rows are 53px on desktop and 61px in touch drawers, without gaps.
  Primary/secondary line heights are 18px/17px, with 1px between text rows
  and 3px between the secondary row and funding bar.
  Tickers are 13px, class labels 11.5px and amounts 12px. Do not scale fonts with
  viewport width. Exceptional amounts may wrap, but must never truncate.
- Preserve the ticker-only production connection marker, borderless Core styling,
  shared theme-aware list background and click-positioned Core editor. Class labels may
  truncate with their complete name available on hover.
- The summary uses the deeper theme surface (`--surface-0`), a subtle bottom
  divider and inline view icons. Its heading is 14px semibold, held amount 16px
  semibold, target 14px regular and difference 12px medium. Normal height is
  89px desktop / 97px touch; large values may add text rows.
- The ETF scroll area reserves no empty scrollbar gutter. Show a thin scrollbar
  only when needed; row backgrounds span the available width, with padding inside.
- Density checks cover 720-800px laptop heights, both themes, seven complete
  rows above the sleeve at 1440x800, and complete amounts at narrow widths.

#### Optional Ring Cards (15 September 2026)

Ring Fill is a third saved ETF view alongside Line Fill and Capital Map. Production
was verified read-only as v613, image digest
`sha256:4a296f87ff8510b1c3dc7efb4ae369722603847b3aeb2b919a8b423824719a42`.
Its public bundle contains the card/ring signatures from `c6af7e37c40e5e9af6a97aa469bdaf9b1a3da487`.
An isolated browser rendered the production bundle with fixture API responses;
no production credentials or data writes were used. This verifies the presentation
reference, not a source SHA for the complete deployed image.

- Retain the 26px ring, 3px stroke, 30px leading column, 6px card corners,
  8px padding (12px right), restrained border and 3.2px card gap.
- Use current theme surfaces instead of production's fixed dark background.
- Ticker and fund name form the identity line; held/target and class form the
  secondary line. The right-hand number is `(held - effective target) / effective
  target x 100`, with an independent per-card click toggle to the dollar difference.
  Red positive means above target, blue negative below target; rounded zero is
  neutral. Never imply this is momentum or P/L. Missing targets have no difference;
  a zero target with holdings has a dollar difference but no percentage.
- Keep the full-card Core trigger and number toggle as sibling buttons, not nested
  controls. Switching units must not open Core settings or submit a policy change.
  Narrow cards extend the financial row beneath the number; unusually long differences
  move below the details. Long amounts wrap, never truncate.
- Use the current effective target, monitoring profiles and Core menu. Keep the
  current fund filter and ordering; do not restore the old twelve-fund cap,
  momentum-first target logic or independent polling.
- Funding uses a 100% circle. Above-target percentages overlay red, capped at
  a full red ring at 200% funding. Unknown targets are dashed and unfilled;
  known zero targets with holdings are entirely red. Amounts remain exact.
- The third view icon keeps its 24px desktop / 32px touch hit area. Tightening
  the icon group spacing and moving it 6px toward the edge keeps the heading on
  one line in narrow rails. The sleeve dock is unchanged.

### Controls And Layout

- Keep the global `--spacing: 0.1rem`. Its compact utility scale is intentional,
  not an error to fix with a site-wide spacing reset. Set local insets and control
  dimensions explicitly when a component needs a reliable reading or hit area.
- Lucide icons for familiar tools; visible accessible names/tooltips. Keep the
  existing action target size; typically 28-36px desktop, larger for touch.
- Use segmented controls for modes, checkboxes for connections and menus for
  configuration. Avoid converting everything into icon-only controls.
- Focus outlines must be visible. Hover should identify the row, not compete
  with its signals. Markets retains immediate hover with no fade.
- Theme colour changes remain instant. Preserve purposeful transform/geometry
  animations; do not introduce `transition: all`.
- Do not change sidebar state, column widths, node alignment, sticky positioning
  or navigation as a side effect of typography work.
- Preserve dense table scrolling where necessary. Do not add new nested scroll
  containers. Audit existing nested scrolling separately before restructuring it.

## Audit And Adoption

| Surface | Observed mismatch | Bounded first pass | Deferred |
| --- | --- | --- | --- |
| Portfolio overview | Local IBM Plex families, hard-coded dark-theme colours, very small low-contrast metadata, tracked labels | Theme-backed neutrals, system type, readable labels/numbers, existing class rows and controls | Timeline and memo reader now use a compact record strip, 13px controls/data, 14px document text, theme-backed surfaces and one main scroll region. Target-editing surfaces remain a separate pass. Keep overview geometry and the local rail. |
| System | Pyramid wastes width; nested holdings scrolling, weak row separation and small state labels | Aligned full-width sections, compact Q3/Q4 band, current-allocation bar, shared column-based signal tables and one content scroll region | Keep existing risk/market/position endpoints and navigation. The September 14 structural pass replaces the pyramid; it does not implement a new allocation policy. |
| Markets map | Reviewed, but the user prefers its existing styling | First-pass styling reverted in full; Markets does not opt into the new workspace classes | Preserve the established map, typography, colours, nodes, bars and edit rail. Any future change needs its own request. |
| History | Compressed utility-sized controls, stacked independent ledgers, conflicting chart height constraints, dark-only canvas colours | Scoped 12-13px controls/data, one selected ledger, bounded responsive chart frames, searchable securities and theme-backed charts | Preserve statement values, source evidence and approval comparisons. No new allocation or action policy. |
| News | 9-10px tracked capitals, weak heading hierarchy, boxed sections/context cells, pale dark-only status text, squeezed evidence on small workspaces | Shared page/group headings, 13px subjects/evidence, 11-12px metadata, Analysis row surfaces, theme-aware status text, flat section rules; wrapping controls and stacked flow below 1100px of available content width | Preserve foundation/daily jobs, filters, thesis editing and evidence history. This is not a redesign of narrative business logic or a new trading decision surface. |
| Alerts, ETF, Help | Mixed adoption of existing table standards; not all views audited in this pass | No changes in this pass | Apply the same role-by-role review separately. |

System's content is bounded at 960px with at least 40px side gutters on desktop
and 16px on narrow workspaces. Its current-allocation bar is 32px high inside a
40px button. The allocation list uses at most three columns so the narrower
reading area does not squeeze class names into four tracks. Section boundaries
remain full-width; there are no floating section cards or additional scroll areas.
Each numbered section has a chevron beside its title. Collapsing hides only the
body, preserves its search and group state, and removes the trailing content gap.
Sections start expanded; top navigation reopens its destination before scrolling.
Section titles use 16px semibold type with a 6px gap before their content;
class headings use 14px semibold and security names 13px medium. This separates
the three reading levels without reducing row contrast or adding decorative bands.
Within Position signals, class rows use a slightly lifted theme-neutral surface
and stronger separators. Security names are indented beneath their class title;
signal and value columns keep their existing alignment. Market pairs and stock
tickers live in the name button's hover title, not a second text line; ticker
search still works. Mobile retains held value beneath the name when its column
is hidden. Compact desktop sizing uses 42px section headings, 26px allocation
rows, 31px class headers and approximately 37px single-line signal rows, without
shrinking the 13px reading size. Long names can wrap, and coarse-pointer controls
retain their larger touch targets.

The shared CSS is opt-in in `styles/terminal-workspace.css`. It supplies role
styles and theme aliases, not descendant-wide font overrides or a new component
framework. Portfolio retains its scoped CSS module for its special geometry.

### History Workspace

History uses `components/stock-table/history-workspace.module.css` for geometry
that cannot inherit the terminal's compressed spacing scale. Controls have a
30px desktop minimum height and 36px minimum on narrow/touch surfaces; search
fields are 32px/36px high. Table data is 13px, metadata 12px and headings 15-16px,
with ordinary system type and no tracked capitals.

Under Activity, Signals and Decisions share one full-height ledger, with a fixed control band,
sticky column headings and one table scroll container. Subject columns reserve
space for class names; detailed records remain expandable. Both ledgers slice
filtered records before rendering, with a hard limit of 100 rows per page.
Pagination controls sit beside the count; search covers the loaded dataset and
resets to page one. Page changes reset vertical table scrolling, and a shrinking
dataset clamps the selected page. This is a DOM rendering limit, not a change to
backend retrieval limits or retention. Portfolio owns one
page scroller, with chart frames 340px high (240px compact, 300px on narrow
workspaces). Two columns require 960px of available History content width,
not viewport width, so retained sidebars count towards the layout decision.

Canvas chart colours are resolved from theme tokens and reapplied on theme
changes without recreating the chart or resetting its zoom. Value overlays use
their own visible axis. Asset-class colours and approved/previous shape previews
are preserved. Preference writes wait for the initial browser settings read,
including development Strict Mode's repeated effects.

`tests/history-workspace.browser.test.cjs` checks chart containment at 1920,
1366, 1020 and 390px, ledger overflow, control sizing, class labels, keyboard
security search, decision-history navigation and canvas theme changes. Run it
against the local server alongside `tests/history-shape-preview.browser.test.cjs`
and `tests/alert-action-integration.browser.test.cjs`. These tests intercept API
traffic with isolated fixtures; they do not write to UAT.

## Positions Actions

The Actions workflow uses a page-scoped CSS module, not changes to Normal
Positions, Analysis, shell sizing or global sidebar state. Its action selector,
three-stage strip and current-task summary precede supporting evidence. Sections
are separated by rules rather than cards inside cards. Body text is 13px;
metadata is at least 11px; the current-task heading is 16px. Theme tokens govern
surfaces and text, with warning reserved for evidence needing review.

The default reduction table has five columns: Name, Held, Required / guide,
Record reduction and Remaining. Percentage/reference columns are optional and
their visibility is independent of Normal. Statement mismatches use available
Expected/Statement/Difference evidence. A locked workflow without stock-level
evidence shows latest holdings, never invented zero-recorded reductions.

At workspace widths up to 1100px the workflow and action controls precede the
table; at larger widths the workflow is a 336px side panel. These are workspace
container breakpoints, so open global sidebars are accounted for. Table overflow
remains explicit. Small-screen controls do not shrink with root-font scaling.

Regression coverage: `tests/positions-actions-design.browser.test.cjs` uses
isolated fixtures for draft recording, totals review, locked execution, statement
variance, guarded reopening, baseline approval, themes and responsive ordering.
It does not send financial writes to UAT. The existing UAT workflow tests retain
their mutation/reconciliation checks with updated presentation locators.

## Acceptance

1. Preserve the established Positions rows, shell, sidebar cards and sleeve widget.
   Targeted Analysis identity-width repairs are documented below; they are not
   permission to restyle these references wholesale.
2. Existing text, amounts, state colours, row counts and navigation remain correct.
3. Check default dark and light themes at 100% zoom, with sidebars retained,
   as well as expanded workspace. No automatic sidebar collapse is introduced.
4. Check readable titles and values, toolbar wrapping, keyboard focus, long
   asset names, missing data and scroll access at laptop/desktop widths.
5. Market node centres, connectors and row height must not move independently.
6. Typecheck, scoped CSS regression checks and relevant existing model tests
   must pass. Record visual coverage honestly; documentation is not certification.

This standard governs presentation only. Allocation, research, trading signals,
connection baselines, actions and statement reconciliation remain owned by their
existing contracts. Style work must not silently repair or redefine those rules.

## Compact Layout Repairs

15 September 2026, branch `codex/terminal-style-finish`. Local, not deployed.
This implements the presentation findings in the
[application audit](PUBLIC_SOURCE.md), keeping the low global spacing.

- Analysis reserves at least 344px for desktop identity, plus a pinned ticker
  lane when enabled. Numeric columns keep their minimums and the table scrolls
  deliberately. Mobile retains its existing 200px identity column and wrapping.
  Class headings, performance and focus controls remain in the visible viewport
  during horizontal scrolling; the left-edge edit mechanism is preserved.
- Portfolio toolbar wrapping responds to its main container, not just the screen.
  Timeline combines its back/title and record filters in one wrapping header.
  It retains the internal summary rail, record strip, chart modes and memo reader.
- The compact sleeve pie and comparison dial retain their pre-pass side-by-side
  chart/legend layout, sizing, typography and hover styling. The proposed stacked
  legend was reverted after user review; do not reintroduce it as part of this pass.
  The bottom-right dock, visibility controls, backgrounds and class colours remain.
- History groups approval labels by rendered pixel distance. The group's popup
  lists its individual dates/versions and displays the selected saved shape with
  its immediate predecessor. It preserves the full date domain, exact percentages,
  incomplete evidence and explicit demo labels. Recompute groups on resize/range
  changes, not by dropping approvals. Activity is the outer ledger view;
  Signals/Decisions remain its inner choices and retain the 100-row render limit.
- ETF full-page subjects use 13px type with 11-12px supporting labels. Summary
  figures are compact, metadata is sentence case, and model provenance is
  disclosed separately. Sidebar line-fill chips and all allocation policy stay
  unchanged. News uses headline-first rows, one failed-state presentation per
  job, formatted dates and an explicit menu for maintenance commands.
- Markets detail controls and metadata are scoped to its detail root only;
  the parent map, stages and connectors are untouched. Alerts utility actions
  and Help prose contrast receive small local adjustments. System's phases and
  Positions Actions already conform and do not receive another redesign.

Theme changes resolve through existing semantic tokens; the fixed Analysis ETF
glow and Portfolio error banner no longer introduce independent dark colours.
Intentional class and row colours are retained. No backend, API, financial state,
research authority or automatic sidebar preference changes belong to this pass.

### Control Consistency Follow-Up

The remaining presentation consolidation uses an explicit
`terminal-workspace-controls` opt-in on Portfolio, Timeline, History, the full
ETF page and News. It does not change the global spacing unit, Positions,
Analysis, Markets, sidebar cards or restored sleeve composition.

- View modes use a theme-neutral selected fill with a bottom indicator. Filters
  use the indicator without a filled tile; News sentiment retains meaningful
  Bull/Bear colours. Hover must not erase a selected mode or change its dimensions.
- Shared tokens define 12px control text, a 30px desktop minimum, 36px touch
  minimum, 3px radius and neutral hover/selected surfaces. Existing larger mobile
  targets and Timeline's 32px desktop controls are retained.
- A visible 2px theme-aware inset focus outline works inside clipping containers,
  including native disclosure summaries. Disabled commands do not gain an active
  hover surface. ETF allocation filters expose their actual pressed state.
- ETF page row hover uses Analysis's existing hover token. Portfolio's internal
  rail button changes theme colours immediately; no new colour fades are added.

The route, table, chart, sidebar and financial state remain unchanged. This is
not approval to redesign the restored sleeve widget or introduce another global
button style. Browser checks cover active/hover/focus states, keyboard selection,
theme changes, constrained widths and the existing ledger render limit.

## First-Pass Verification

Branch: `codex/terminal-style-standard`. The prior Council safety work is
preserved in the working tree; it is not part of this presentation change.

- Existing UAT Analysis, Portfolio, System, Markets and History surfaces were
  inspected in the browser to ground the audit. Positions styling was inspected
  in its source alongside the Analysis source.
- Nine scoped style-contract checks passed, including CSS parsing, opt-in
  scope, type hierarchy, theme aliases and protected Portfolio geometry.
- Six Portfolio overview model tests and three history-marker tests passed.
- TypeScript no-emit checking and `git diff --check` passed.
- Local development compilation succeeded. The initial port-3100 preview failed
  because UAT does not allow that browser origin, not because its database was
  empty. A development-only same-origin API rewrite now forwards the existing
  bearer token to UAT without changing its CORS or authentication configuration.
- The populated local System page was verified in the browser: $58.9K portfolio,
  Q3 throttle, 10 configured markets and grouped holdings. Full dark/light and
  laptop-width visual acceptance across Portfolio, System and History remains pending.
- News was inspected with persisted UAT content in dark and light mode, at the
  existing 1553x1008 viewport and a temporary 1000x800 viewport. The latter has
  a single content scroll flow with no horizontal overflow. The original
  viewport was restored. Timeframe filtering and opening/closing a saved thesis
  were exercised without triggering AI jobs or saving thesis edits.
- News retains the existing brief, items, changes, market context and ledger.
  On short desktop windows the left content column scrolls naturally rather
  than squeezing narrative changes below a usable height. On narrow workspaces
  the ledger follows the primary content. Terminal sidebar preferences are not
  changed. The existing failed daily-job message remains visible as stored state.
- No deployment, backend change, API contract change or paid job was performed
  for this pass.

### Local Preview

```sh
NEXT_PUBLIC_API_URL=http://127.0.0.1:3100/api/trading \
ALPHA_EDGE_DEV_API_PROXY_URL=https://alpha-edge-uat-backend.fly.dev/api \
npm run dev -- --hostname 127.0.0.1 --port 3100
```

The existing token is still required. This connects to the existing UAT database;
it does not seed or copy a database. UI writes would affect UAT, so visual review
should use navigation/read-only controls. The rewrite is disabled in production
and when the explicit development proxy URL is absent. Local smoke checks
confirmed unauthenticated requests still return 401 and authenticated positions
and portfolio-mix reads return 200. No credential is embedded in the URL or bundle.
