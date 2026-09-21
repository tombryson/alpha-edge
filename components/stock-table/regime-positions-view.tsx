import type { StockGroup, PortfolioOverlaySummaryResponse } from '@/lib/api';
import type { Stock, Portfolio } from '@/lib/store';
import type { PositionBucketKey } from '@/components/stock-table/types';

// ── Local helper types ────────────────────────────────────────────────────────

export type RegimeGroupStats = {
    marketValue: number;
    bookValue: number;
    cashReserve: number;
    plDollar: number;
};

type BucketStatsMap = Record<PositionBucketKey, RegimeGroupStats>;

type SleeveMoveResult = {
    title: string;
    subtitle: string;
    valueClass: string;
    subtitleClass: string;
};

type Stage1StatusResult = {
    badge: string;
    badgeClass: string;
    note: string;
    value: string;
};

type StageStatusResult = {
    badge: string;
    badgeClass: string;
};

// ── Props ─────────────────────────────────────────────────────────────────────

export interface RegimePositionsViewProps {
    portfolio: Portfolio;
    bucketStats: BucketStatsMap;
    overlaySummary: PortfolioOverlaySummaryResponse | null;
    effectiveEquityPct: number;
    topLevelGroupsByBucket: Record<PositionBucketKey, StockGroup[]>;
    expandedRegimeSleeves: Record<string, boolean>;
    setExpandedRegimeSleeves: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    // Domain functions threaded from parent
    getGroupStocksRecursive: (groupId: string) => Stock[];
    calculateStatsForStocks: (stocks: Stock[]) => RegimeGroupStats;
    getClassPercentForStock: (stock: Stock) => number | null;
    getGroupStatsForRegime: (group: StockGroup) => RegimeGroupStats;
    getGroupStage1InvestedValue: (group: StockGroup) => number;
    getGroupStage1Percent: (group: StockGroup) => number;
    getSleeveStage1Move: (group: StockGroup) => SleeveMoveResult;
    getGroupSummaryLabelForRegime: (group: StockGroup) => string;
    getLeafGroupsForRegime: (group: StockGroup) => StockGroup[];
    getRegimeStage1Status: () => Stage1StatusResult;
    getRegimeStage2Status: () => StageStatusResult;
    getRegimeStage3Status: () => StageStatusResult;
    formatRegimeDateTime: (value?: string | null) => string;
}

// ── Formatting helpers (pure — no closures needed) ────────────────────────────

const money = (value?: number | null): string =>
    `$${Math.round(value || 0).toLocaleString()}`;

const pct1 = (value?: number | null): string =>
    `${(value || 0).toFixed(1)}%`;

const pct0 = (value?: number | null): string =>
    `${Math.round(value || 0)}%`;

// ── Component ─────────────────────────────────────────────────────────────────

export function RegimePositionsView({
    portfolio,
    bucketStats,
    overlaySummary,
    effectiveEquityPct,
    topLevelGroupsByBucket,
    expandedRegimeSleeves,
    setExpandedRegimeSleeves,
    getGroupStocksRecursive,
    calculateStatsForStocks,
    getClassPercentForStock,
    getGroupStatsForRegime,
    getGroupStage1InvestedValue,
    getGroupStage1Percent,
    getSleeveStage1Move,
    getGroupSummaryLabelForRegime,
    getLeafGroupsForRegime,
    getRegimeStage1Status,
    getRegimeStage2Status,
    getRegimeStage3Status,
    formatRegimeDateTime,
}: RegimePositionsViewProps) {
    // ── renderRegimeLeafSection ───────────────────────────────────────────────

    const renderLeafSection = (leafGroup: StockGroup) => {
        const leafStocks = getGroupStocksRecursive(leafGroup.id).sort(
            (a, b) => (b.positionValue || 0) - (a.positionValue || 0),
        );
        const leafStats = calculateStatsForStocks(leafStocks);
        const totalCapital = leafStats.marketValue + leafStats.cashReserve;
        const portfolioPct =
            portfolio.totalValue > 0
                ? (leafStats.marketValue / portfolio.totalValue) * 100
                : 0;

        if (leafStocks.length === 0 && totalCapital <= 0) return null;

        return (
            <div key={leafGroup.id} className="border-t border-border/40 pt-3">
                <div className="flex items-baseline justify-between gap-4">
                    <div className="text-sm font-semibold tracking-wide text-foreground">
                        {leafGroup.name}
                    </div>
                    <div className="text-[11px] font-mono text-muted-foreground">
                        Portfolio {pct1(portfolioPct)}
                    </div>
                </div>
                <div className="mt-0.5 text-[11px] font-mono text-muted-foreground">
                    Invested {money(leafStats.marketValue)} · Class cash{' '}
                    {money(leafStats.cashReserve)} · Total {money(totalCapital)}
                </div>
                <div className="mt-2 text-[10px] font-mono uppercase tracking-[0.24em] text-muted-foreground/80">
                    Holdings
                </div>
                <div className="mt-1 divide-y divide-border/20 overflow-hidden rounded border border-border/20">
                    {leafStocks.map((stock) => (
                        <div
                            key={`regime-${leafGroup.id}-${stock.id}`}
                            className="grid grid-cols-[minmax(0,1fr)_96px_72px_72px] items-center gap-3 px-3 py-2 text-[12px]"
                        >
                            <div className="min-w-0">
                                <div className="truncate text-foreground">
                                    {stock.name}
                                </div>
                                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                    {stock.symbol}
                                </div>
                            </div>
                            <div className="text-right font-mono text-foreground">
                                {money(stock.positionValue || 0)}
                            </div>
                            <div className="text-right font-mono text-muted-foreground">
                                {pct1(
                                    portfolio.totalValue > 0
                                        ? ((stock.positionValue || 0) /
                                              portfolio.totalValue) *
                                              100
                                        : 0,
                                )}
                            </div>
                            <div className="text-right font-mono text-muted-foreground">
                                {pct1(getClassPercentForStock(stock) || 0)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // ── renderRegimeSleeveCard ────────────────────────────────────────────────

    const renderSleeveCard = (
        group: StockGroup,
        bucket: 'governed' | 'defensive',
    ) => {
        const stats = getGroupStatsForRegime(group);
        const sleeveCash = stats.cashReserve;
        const currentPct =
            portfolio.totalValue > 0
                ? (stats.marketValue / portfolio.totalValue) * 100
                : 0;
        const afterStage1Value = getGroupStage1InvestedValue(group);
        const afterStage1Pct = getGroupStage1Percent(group);
        const expanded = Boolean(expandedRegimeSleeves[group.id]);
        const move = getSleeveStage1Move(group);
        const label = bucket === 'governed' ? 'Q1 GOVERNED' : 'Q1 EXEMPT';
        const badgeClass =
            bucket === 'governed'
                ? 'border-sky-500/50 text-sky-100'
                : 'border-emerald-500/50 text-emerald-100';

        return (
            <div
                key={group.id}
                className={`overflow-hidden rounded-xl border bg-card/50 ${
                    bucket === 'governed'
                        ? 'border-sky-500/15'
                        : 'border-emerald-500/15'
                }`}
            >
                <div
                    className={`h-1 w-full ${
                        bucket === 'governed'
                            ? 'bg-sky-500/55'
                            : 'bg-emerald-500/55'
                    }`}
                />
                <div className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 space-y-2">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    setExpandedRegimeSleeves((prev) => ({
                                        ...prev,
                                        [group.id]: !prev[group.id],
                                    }))
                                }
                                className="rounded border border-border/60 bg-background/40 px-2 py-1 text-[11px] font-mono text-muted-foreground hover:text-foreground"
                                title={expanded ? 'Hide stocks' : 'Show stocks'}
                            >
                                {expanded ? 'HIDE' : 'SHOW'}
                            </button>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-semibold tracking-wide text-foreground">
                                        {group.name}
                                    </span>
                                    <span
                                        className={`rounded border px-1.5 py-0.5 text-[9px] font-mono ${badgeClass}`}
                                    >
                                        {label}
                                    </span>
                                </div>
                                <div className="mt-1 text-[11px] text-muted-foreground">
                                    {getGroupSummaryLabelForRegime(group)}
                                </div>
                            </div>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                            <div className="rounded-lg border border-border/50 bg-background/35 px-3 py-2">
                                <div className="text-[10px] font-mono tracking-widest text-muted-foreground">
                                    Now
                                </div>
                                <div className="mt-1 text-sm font-mono text-foreground">
                                    {money(stats.marketValue)}
                                </div>
                                <div className="mt-0.5 text-[10px] font-mono text-muted-foreground">
                                    {pct1(currentPct)}
                                </div>
                            </div>
                            <div className="rounded-lg border border-border/50 bg-background/35 px-3 py-2">
                                <div className="text-[10px] font-mono tracking-widest text-muted-foreground">
                                    Class cash
                                </div>
                                <div className="mt-1 text-sm font-mono text-muted-foreground">
                                    {money(sleeveCash)}
                                </div>
                                <div className="mt-0.5 text-[10px] font-mono text-muted-foreground">
                                    Sleeve cash
                                </div>
                            </div>
                            <div className="rounded-lg border border-border/50 bg-background/35 px-3 py-2">
                                <div className="text-[10px] font-mono tracking-widest text-muted-foreground">
                                    After Stage 1
                                </div>
                                <div className="mt-1 text-sm font-mono text-sky-300">
                                    {money(afterStage1Value)}
                                </div>
                                <div className="mt-0.5 text-[10px] font-mono text-muted-foreground">
                                    {pct1(afterStage1Pct)}
                                </div>
                            </div>
                            <div className="rounded-lg border border-border/50 bg-background/35 px-3 py-2">
                                <div className="text-[10px] font-mono tracking-widest text-muted-foreground">
                                    Stage 1 move
                                </div>
                                <div className={`mt-1 text-sm font-mono ${move.valueClass}`}>
                                    {move.title}
                                </div>
                                <div className={`mt-0.5 text-[10px] font-mono ${move.subtitleClass}`}>
                                    {move.subtitle}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {expanded && (
                    <div className="space-y-3 border-t border-border/20 px-4 pb-4 pt-3">
                        {getLeafGroupsForRegime(group)
                            .map((leaf) => renderLeafSection(leaf))
                            .filter(Boolean)}
                    </div>
                )}
            </div>
        );
    };

    // ── renderRegimePositionsView ─────────────────────────────────────────────

    const governedGroups = [
        ...topLevelGroupsByBucket.full_q1,
        ...topLevelGroupsByBucket.partial_q1,
    ];
    const exemptGroups = topLevelGroupsByBucket.q1_exempt;
    const governedNowPct =
        portfolio.totalValue > 0
            ? (bucketStats.q1.marketValue / portfolio.totalValue) * 100
            : 0;
    const governedAfterPct =
        overlaySummary?.allowed_eligible_invested_pct ?? governedNowPct;
    const exemptPct =
        portfolio.totalValue > 0
            ? (bucketStats.q1_exempt.marketValue / portfolio.totalValue) * 100
            : 0;
    const cashPct = overlaySummary?.portfolio_cash_bucket_pct
        ? overlaySummary.portfolio_cash_bucket_pct
        : portfolio.totalValue > 0
          ? ((portfolio.cashOnHand || 0) / portfolio.totalValue) * 100
          : 0;
    const stage1 = getRegimeStage1Status();
    const stage2 = getRegimeStage2Status();
    const stage3 = getRegimeStage3Status();
    const reserveRatio =
        (overlaySummary?.total_tactical_cash_value || 0) > 0
            ? Math.min(
                  100,
                  ((overlaySummary?.portfolio_cash_bucket_value || 0) /
                      (overlaySummary?.total_tactical_cash_value || 1)) *
                      100,
              )
            : 100;

    return (
        <div className="relative space-y-3">
            <div className="space-y-4">
                <div className="rounded-xl border border-border/60 bg-card/35">
                    <div className="flex flex-col gap-2 border-b border-border/50 px-4 py-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="text-[10px] font-mono tracking-widest text-muted-foreground">
                                REGIME VIEW
                            </div>
                            <div className="mt-1 text-sm font-semibold tracking-wide text-foreground">
                                Stage 1 view by existing position sleeve
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-right text-[11px] font-mono text-muted-foreground">
                            <div>
                                <div className="text-sky-200">
                                    {pct1(governedNowPct)}
                                </div>
                                <div>Governed</div>
                            </div>
                            <div>
                                <div className="text-emerald-200">
                                    {pct1(exemptPct)}
                                </div>
                                <div>Exempt</div>
                            </div>
                            <div>
                                <div className="text-foreground">
                                    {pct1(cashPct)}
                                </div>
                                <div>Cash / BSUB</div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4 px-4 py-4">
                        <div className="grid gap-3 lg:grid-cols-3">
                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-3 py-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="text-[10px] font-mono tracking-widest text-muted-foreground">
                                        STAGE 1
                                    </div>
                                    <span
                                        className={`rounded border px-1.5 py-0.5 text-[9px] font-mono ${stage1.badgeClass}`}
                                    >
                                        {stage1.badge}
                                    </span>
                                </div>
                                <div className="mt-2 text-sm font-semibold text-foreground">
                                    Apply the Q1 change
                                </div>
                                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-mono">
                                    <div>
                                        <div className="text-muted-foreground">
                                            Q1 exposure
                                        </div>
                                        <div className="text-foreground">
                                            {pct0(
                                                overlaySummary?.effective_equity_pct ??
                                                    effectiveEquityPct,
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">
                                            {stage1.note}
                                        </div>
                                        <div className="text-foreground">
                                            {stage1.value}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-3 py-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="text-[10px] font-mono tracking-widest text-muted-foreground">
                                        STAGE 2
                                    </div>
                                    <span
                                        className={`rounded border px-1.5 py-0.5 text-[9px] font-mono ${stage2.badgeClass}`}
                                    >
                                        {stage2.badge}
                                    </span>
                                </div>
                                <div className="mt-2 text-sm font-semibold text-foreground">
                                    Redistribute regime cash
                                </div>
                                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-mono">
                                    <div>
                                        <div className="text-muted-foreground">
                                            Regime cash
                                        </div>
                                        <div className="text-foreground">
                                            {money(
                                                overlaySummary?.total_tactical_cash_value ||
                                                    0,
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">
                                            BSUB / reserve
                                        </div>
                                        <div className="text-foreground">
                                            {pct0(reserveRatio)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-3 py-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="text-[10px] font-mono tracking-widest text-muted-foreground">
                                        STAGE 3
                                    </div>
                                    <span
                                        className={`rounded border px-1.5 py-0.5 text-[9px] font-mono ${stage3.badgeClass}`}
                                    >
                                        {stage3.badge}
                                    </span>
                                </div>
                                <div className="mt-2 text-sm font-semibold text-foreground">
                                    Accept the new baseline
                                </div>
                                <div className="mt-2 text-[11px] font-mono text-muted-foreground">
                                    Last accepted{' '}
                                    {formatRegimeDateTime(
                                        overlaySummary?.last_applied_at,
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.03] p-3">
                            <div className="mb-3 flex items-center justify-between">
                                <div className="text-[10px] font-mono tracking-widest text-sky-100/80">
                                    Q1-GOVERNED SLEEVES
                                </div>
                                <div className="text-[10px] font-mono text-muted-foreground">
                                    {pct1(governedNowPct)} →{' '}
                                    {pct1(governedAfterPct)}
                                </div>
                            </div>
                            <div className="space-y-3">
                                {governedGroups.map((group) =>
                                    renderSleeveCard(group, 'governed'),
                                )}
                            </div>
                        </div>

                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-3">
                            <div className="mb-3 flex items-center justify-between">
                                <div className="text-[10px] font-mono tracking-widest text-emerald-100/80">
                                    Q1-EXEMPT SLEEVES
                                </div>
                                <div className="text-[10px] font-mono text-muted-foreground">
                                    {pct1(exemptPct)}
                                </div>
                            </div>
                            <div className="space-y-3">
                                {exemptGroups.map((group) =>
                                    renderSleeveCard(group, 'defensive'),
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
