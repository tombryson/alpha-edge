# Stock Table State Restructure Plan

> Design record. Contains staged decisions and implementation history; not a deployment certificate. Use the [system ownership map](../system/README.md) for current rules.

## Status: Proposed — Not Started

**Branch convention:** `refactor/stock-table-decompose-3`  
**Prerequisite:** `refactor/stock-table-decompose-2` merged to main ✓

---

## Why the current approach hit a wall

The first decomposition pass extracted cohesive *state domains* as hooks:

| Hook | Lines removed | Pattern |
|---|---|---|
| `useStockGroups` | −724 | State + effects + CRUD with clear input boundary |
| `RegimePositionsView` | −404 | Dead-code render function, no call site |

The remaining large render functions (`renderGroupBranch`, `renderPortfolioRebalancePanel`, `renderPortfolioReviewPanel`, `renderAnalysisBook`) each close over **30–50 parent-component state variables**. Converting them to prop-threaded components would require interfaces like:

```ts
interface GroupBranchProps {
  groups: StockGroup[]; portfolio: Portfolio; activeTab: TabType;
  isPortfolioRebalanceMode: boolean; isPortfolioReviewMode: boolean;
  reviewSummaryRowsOnly: boolean; positionGroupStatsVisible: boolean;
  portfolioCollapsedGroupIds: Set<string>;
  getGroupDirectStocks: (id: string) => Stock[];
  calculateGroupStats: (id: string) => GroupStats;
  // ... 25 more
}
```

That is syntactically correct but architecturally wrong — all the closure dependencies are still there, just exposed as props. The root cause is that the component has **65 `useState` declarations** with no domain isolation.

The solution is **context-based state distribution** so extracted child components can consume state directly rather than receiving it through props.

---

## State inventory and domain grouping

Current stock-table.tsx has ~65 `useState` + ~15 `useRef` + 4 `useQuery`-style hooks. Grouped by domain:

### Domain A — UI navigation (5 states)
`activeTab`, `positionsMode`, `sortColumn`, `sortDirection`, `mounted`

### Domain B — Stock editing (13 states)
`tickerInput`, `prefixInput`, `showTickerEdit`, `showNameEdit`, `nameInputs`, `nameSaving`, `nameErrors`, `cashInput`, `editingCashAssetClass`, `showAddStockModal`, `newStockName`, `newStockTicker`, `addingStock`, `deleteConfirmStock`, `deletingStock`, `refreshingPrices`

### Domain C — Display config (15 states)
`showColumnMenu`, `columnMenuPosition`, `visibleColumns`, `positionColumnWidths`, `positionColumnOrder`, `showQ1Stats`, `showGroupStats`, `showStockStats`, `portfolioShowQ1Stats`, `portfolioShowGroupStats`, `portfolioShowStockStats`, `positionStatsPeekEnabled`, `positionStatsPeekLayer`, `showPositionBucketRows`, `showPortfolioBucketRows`, `portfolioPureSort`, `portfolioBarFlatten`, `portfolioBarEqualWidth`, `portfolioVisualMode`, `portfolioFocusMode`, `ratingsExpanded`

### Domain D — Asset class management (6 states)
`assetClasses`, `assetClassConfig`, `showAssetClassDropdown`, `assetClassSearch`, `assetClassClassifying`, `assetClassClassifyError`, `showRiskDropdown`, `dropdownPosition`, `effectiveEquityPct`, `showTemplateLibrary`

### Domain E — Overlay / signal data (5 states + heavy derived)
`overlaySummary`, `expandedRegimeSleeves`  
Derived inline: `overlayRowsByCode`, `immutableReviewSignalCutRatio`, `portfolioRisk`, `q4Crisis`, `isQ4DReviewSignal`, `reviewAlertKind`, `reviewBaseRequiredReduction`, `reviewRecoveryRequiredReduction`, `reviewSummaryRowsOnly`

### Domain F — Portfolio rebalance workflow (14 states + heavy derived)
`portfolioRebalanceRows`, `portfolioRebalancePlan`, `portfolioRebalanceTitle`, `portfolioRebalanceError`, `portfolioRebalanceSaving`, `portfolioCashMoveInputs`, `portfolioReductionInputs`, `portfolioTargetAlignment`, `portfolioMix`, `approvedPortfolioMix`  
Refs: `portfolioTargetBarDragRef`, `portfolioTargetDraftActiveRef`, `portfolioRebalancePlanIdRef`, `portfolioCashMoveInputsRef`, `portfolioReductionInputsRef`  
Derived inline: `portfolioTotalValue`, `portfolioRowsSorted`, `portfolioTargetTotal`, `portfolioGrossMove`, `portfolioNetMove`, `portfolioTransitionCompleted`, `portfolioBaselineApproved`, `portfolioLiveRowsSorted`, `portfolioImportValidation`, `portfolioCurrentStage`, `portfolioHasLockedTarget`, `portfolioHasDraftTarget`, `portfolioTargetActive`, `portfolioWorkflowActive`  
Mode flags: `isPortfolioRebalanceMode`, `isPortfolioTargetAdjustmentMode`

### Domain G — Portfolio memo / AI analysis (2 states)
`portfolioMemoState`, `portfolioMemoError`  
Ref: `portfolioMemoMountedRef`

### Domain H — Review mode (8 states + derived)
`reviewFocus`, `reviewCutInputs`, `reviewDraftSavedAt`, `reviewStage1CompletedAt`, `reviewStageSaving`, `reviewStageSaveError`, `reviewReopenConfirmOpen`, `reviewRecoveryContext`  
Derived: `reviewBaseRequiredReduction`, `reviewRecoveryRequiredReduction`, `reviewSummaryRowsOnly`  
Mode flags: `isPortfolioReviewMode`, `isSignalAdjustmentMode`

### Domain I — Position display (computed, no own state)
`positionStocks`, `bucketStocksMap`, `bucketStats`, `topLevelGroupsByBucket` — all derived from `sortedStocks` + `groups` + `overlaySummary`

### Already extracted
`useStockGroups` → groups, stockGroupAssignments, CRUD callbacks  
`useSizingAllocations`, `useCouncilRunner`, `useHistoryData`

---

## The enabling abstraction: StockTableContext

The key insight is that child components shouldn't receive state as props — they should **read it from context**. The restructure has two layers:

```
StockTableProvider (wraps everything)
  ├── PositionDisplayProvider (Domain C — display config)
  ├── PortfolioWorkflowProvider (Domains E + F + G + H — overlay → rebalance → memo → review)
  └── [Tab panels as proper components that useContext internally]
```

With context in place, `renderGroupBranch` becomes `<GroupBranch group={group} depth={depth} />` — only passing the two arguments that vary per call, reading everything else from context.

---

## Phased implementation plan

### Phase 1 — Extract `usePortfolioOverlay` (Domain E)

**Branch:** `refactor/stock-table-decompose-3a`  
**Estimated line removal from stock-table.tsx:** ~200  
**Complexity:** Medium  
**Risk:** Low (overlay data is read-only within the component — mutations happen via API calls)

**What moves:**
- `overlaySummary` state + fetch effect + refresh logic
- `expandedRegimeSleeves` state
- All derived values: `overlayRowsByCode`, `immutableReviewSignalCutRatio`, `portfolioRisk`, `q4Crisis`, `isQ4DReviewSignal`, `reviewAlertKind`, `reviewBaseRequiredReduction`, `reviewRecoveryRequiredReduction`

**Hook signature:**
```ts
// inputs
interface UsePortfolioOverlayParams {
  activeTab: TabType;
  positionsMode: PositionsMode;
  groups: StockGroup[];
  bucketStocksMap: BucketStocksMap;
}
// outputs
interface UsePortfolioOverlayResult {
  overlaySummary: PortfolioOverlaySummaryResponse | null;
  overlayRowsByCode: Map<string, OverlayAssetClassRow>;
  expandedRegimeSleeves: Record<string, boolean>;
  setExpandedRegimeSleeves: Dispatch<...>;
  isQ4DReviewSignal: boolean;
  reviewAlertKind: 'q4d' | 'q3d' | null;
  reviewBaseRequiredReduction: number;
  reviewRecoveryRequiredReduction: number;
  reviewSummaryRowsOnly: boolean;
  immutableReviewSignalCutRatio: number;
  portfolioRisk: string | null;
  q4Crisis: boolean;
  refreshOverlay: () => Promise<void>;
}
```

**Files:**
- Create `components/stock-table/hooks/use-portfolio-overlay.ts`
- Edit `components/stock-table.tsx`: replace ~200 lines with hook call

---

### Phase 2 — Extract `usePortfolioRebalance` (Domain F)

**Branch:** `refactor/stock-table-decompose-3b` (depends on 3a merged)  
**Estimated line removal:** ~600  
**Complexity:** High  
**Risk:** Medium (most complex domain; many callbacks with cross-references)

**What moves:**
- All 14 rebalance state variables + 5 refs
- All computed derived values (portfolioRowsSorted, portfolioTotalValue, etc.)
- `loadPortfolioRebalanceData`, `buildPortfolioRebalanceRowsFromCurrent`
- `updatePortfolioRebalanceTarget`, `updatePortfolioTargetBalanced`, `updatePortfolioTargetAdjacentPair`
- `applyPortfolioMemoTargets`, `getPortfolioTargetContextForAssetClass`
- All `getPortfolioPlannedCutFor*`, `getPortfolioRequiredCutFor*` helpers
- `summarizePortfolioRebalanceRows` (move to lib if currently inline)
- Mode flags: `isPortfolioRebalanceMode`, `isPortfolioTargetAdjustmentMode`

**Inputs:** `stocks`, `assetClasses`, `groups`, `overlaySummary`, `activeTab`, `positionsMode`, `portfolioMix`, `approvedPortfolioMix`

**Note:** `portfolioMix` and `approvedPortfolioMix` (from query hooks) need to be passed in or the query hooks moved inside `usePortfolioRebalance`.

---

### Phase 3 — Extract `usePortfolioMemo` (Domain G)

**Branch:** `refactor/stock-table-decompose-3c` (depends on 3b merged)  
**Estimated line removal:** ~300  
**Complexity:** Medium  
**Risk:** Low

**What moves:**
- `portfolioMemoState`, `portfolioMemoError`, `portfolioMemoMountedRef`
- `persistPortfolioMemoState`, `buildPortfolioMemoPayload`, `pollPortfolioMemoJob`
- The "run AI analysis" trigger and polling loop

**Inputs:** `activeTab`, `overlaySummary`, `assetClasses`, `effectiveEquityPct`, `portfolioRebalanceRows` (to apply targets back)  
**Output:** exposes `portfolioMemoState`, `portfolioMemoError`, `runPortfolioMemo`, `applyPortfolioMemoTargets`

---

### Phase 4 — Extract `usePortfolioReview` (Domain H)

**Branch:** `refactor/stock-table-decompose-3d` (depends on 3c merged)  
**Estimated line removal:** ~500  
**Complexity:** High  
**Risk:** Medium

**What moves:**
- All 8 review state variables
- `getReviewPlanForBucket`, `getReviewPlanForGroup`, `getReviewPlanForStock`, `getActiveReviewPlan`
- `getReviewPlannedCutForStock`, `getReviewPlannedCutForStocks`, `getReviewSuggestedCutForStock`
- `getReviewPlannedCutForAssetCodes`, `getReviewPortfolioPct`
- Stage save handlers, reopen handler, `buildStage1SourcePayload`
- `reviewRecoveryRequiredReduction` (currently derived in overlay domain — may need to split)

**Inputs:** `overlaySummary`, `groups`, `positionStocks`, `bucketStocksMap`, `bucketStats`, `overlayRowsByCode`, `stockGroupAssignments`, `isQ4DReviewSignal`

---

### Phase 5 — Introduce StockTableContext

**Branch:** `refactor/stock-table-decompose-4` (depends on all 3x merged)  
**Estimated line removal from stock-table.tsx:** ~100 (the context file itself adds ~150)  
**Complexity:** Very High  
**Risk:** High (architectural change touches all child components)

**Create `components/stock-table/stock-table-context.tsx`:**
```ts
interface StockTableContextValue {
  // Navigation
  activeTab: TabType;
  positionsMode: PositionsMode;
  // Overlay domain (from usePortfolioOverlay)
  overlaySummary: PortfolioOverlaySummaryResponse | null;
  overlayRowsByCode: Map<string, OverlayAssetClassRow>;
  isQ4DReviewSignal: boolean;
  reviewAlertKind: 'q4d' | 'q3d' | null;
  reviewSummaryRowsOnly: boolean;
  // Rebalance domain (from usePortfolioRebalance)
  portfolioRebalanceRows: PortfolioRebalancePlanRow[];
  portfolioTotalValue: number;
  portfolioRowsSorted: PortfolioRebalancePlanRow[];
  isPortfolioRebalanceMode: boolean;
  isPortfolioTargetAdjustmentMode: boolean;
  isPortfolioReviewMode: boolean;
  isSignalAdjustmentMode: boolean;
  portfolioHasLockedTarget: boolean;
  // Review domain (from usePortfolioReview)
  reviewFocus: ReviewFocus | null;
  setReviewFocus: Dispatch<SetStateAction<ReviewFocus | null>>;
  getActiveReviewPlan: () => ReviewSelectionPlan;
  getReviewPlanForGroup: (group: StockGroup) => ReviewSelectionPlan;
  getReviewPlannedCutForStocks: (stocks: Stock[]) => number;
  // Display config
  positionGroupStatsVisible: boolean;
  showStockStats: boolean;
  // Groups (from useStockGroups)
  groups: StockGroup[];
  toggleGroupCollapsed: (id: string, opts?: {...}) => void;
  togglePortfolioGroupCollapsed: (id: string) => void;
  portfolioCollapsedGroupIds: Set<string>;
  // ... other widely-shared values
}
```

**Wrap in `stock-table.tsx`:**
```tsx
return (
  <StockTableProvider value={contextValue}>
    <PositionTab />   {/* was inline JSX, now a component */}
    <PortfolioTab />
    <AnalysisTab />
  </StockTableProvider>
);
```

---

### Phase 6 — Convert render functions to context-consuming components

**Branch:** `refactor/stock-table-decompose-5` (depends on Phase 5 merged)  
**Estimated line removal:** ~6,000 (the bulk of the file)  
**Complexity:** Very High  
**Risk:** High  

**Extraction order** (dependencies first):

1. `GroupBranch` (calls `StockRow`, `renderPositionAggregateCells`)
2. `BucketRow` (calls `GroupBranch`)
3. `PortfolioRebalancePanel` + its nested `renderTargetAllocationRow` (calls `BucketRow`)
4. `PortfolioMemoControls` (nested inside PortfolioRebalancePanel, extract before panel)
5. `PortfolioReviewPanel` (calls most helpers — largest component, ~2400 lines)
6. `AnalysisBook` + `AnalysisHierarchyRow` + `AnalysisRow`

**Pattern for each:**
```tsx
// components/stock-table/group-branch.tsx
import { useStockTableContext } from './stock-table-context';

interface GroupBranchProps {
  group: StockGroup;  // only the per-call varying arg
  depth: number;
}

export function GroupBranch({ group, depth }: GroupBranchProps) {
  const {
    groups, portfolio, activeTab, isPortfolioRebalanceMode,
    reviewSummaryRowsOnly, portfolioCollapsedGroupIds,
    getGroupDirectStocks, calculateGroupStats,
    toggleGroupCollapsed, togglePortfolioGroupCollapsed,
    // ... consumed from context, not props
  } = useStockTableContext();

  // ... render logic verbatim from current renderGroupBranch
}
```

This is the payoff: the prop interfaces collapse from 40+ to 2 because context carries the rest.

---

## Risk register

| Risk | Severity | Mitigation |
|---|---|---|
| React re-render storms from over-broad context | High | Split context into 3-4 narrower providers by domain; use `useMemo` on provider values |
| Circular context dependency (e.g. Review needs Rebalance, Rebalance reads Review) | Medium | Map dependency graph before Phase 5; break cycles via callback injection |
| Stale closure bugs in event handlers reading old context values | Medium | Use refs for values read inside event handlers; match pattern from useStockGroups |
| Breaking change to any existing consumer of stock-table props | Low | stock-table.tsx exposes no props — it owns its own state |
| tsc errors from context typing during migration | Low | Migrate one domain at a time; keep tsc green at each phase boundary |

---

## Dependency graph (what needs what)

```
useStore (stocks, portfolio, alerts)
    │
    ├── useStockGroups (groups, stockGroupAssignments, CRUD)  ← done
    ├── useSizingAllocations                                  ← done
    ├── useCouncilRunner                                      ← done
    ├── useHistoryData                                        ← done
    │
    ├── usePortfolioOverlay (overlaySummary, derived signals) ← Phase 1
    │       │
    │       ├── usePortfolioRebalance (workflow, rows, moves) ← Phase 2
    │       │       │
    │       │       └── usePortfolioMemo (AI run, targets)    ← Phase 3
    │       │
    │       └── usePortfolioReview (focus, cuts, stage mgmt)  ← Phase 4
    │
    └── StockTableContext (assembles all hook outputs)        ← Phase 5
            │
            └── Components (GroupBranch, PortfolioRebalancePanel, etc.) ← Phase 6
```

---

## Estimated scope

| Phase | Branches | Est. lines removed from stock-table.tsx | Key risk |
|---|---|---|---|
| 1 — usePortfolioOverlay | 3a | ~200 | Low |
| 2 — usePortfolioRebalance | 3b | ~600 | Medium |
| 3 — usePortfolioMemo | 3c | ~300 | Low |
| 4 — usePortfolioReview | 3d | ~500 | Medium |
| 5 — StockTableContext | 4 | ~100 (net) | High |
| 6 — Component extraction | 5 | ~6,000 | High |
| **Total** | | **~7,700 lines** | |

Starting point after decompose-2: **15,992 lines**  
Projected endpoint: **~8,300 lines** (target: a file that fits comfortably in one screen of context)

---

## Decision: Is a full restructure needed?

Yes, if the goal is independently testable tab panels and proper component isolation. The current 16k-line file cannot be unit tested, is slow for tools to parse, and forces every change to load the entire component tree.

No restructure needed if the requirement is just "tsc clean + no regressions" — the current state satisfies that, and the hook extractions done so far (−1,128 lines) are low-risk wins.

**Recommendation:** Implement Phase 1 (`usePortfolioOverlay`) as the next step. It is self-contained, low risk, and directly enables Phase 4 (`usePortfolioReview`). Phase 5 (context) is the pivot point — do not start Phase 6 before Phase 5 is merged and proven stable.
