'use client';
import { subscribePoll } from '@/lib/polling';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isCouncilSubmissionUncertain } from '@/lib/council-submission';
import { getPortfolioAssetClassColor, getPortfolioGroupColor } from '@/lib/portfolio-composition-colors';
import {
    api,
    type AssetClassConfig,
    type CouncilAnalysisJobResponse,
    type PortfolioOverlaySummaryResponse,
    type AssetClass,
} from '@/lib/api';
import {
    buildPortfolioMemoSummary,
    loadPortfolioMemoState,
    savePortfolioMemoState,
    type PortfolioMemoMode,
    type PortfolioMemoState,
} from '@/lib/portfolio-memo';
import {
    buildPortfolioMemoTargetUniverse,
    mapCurrentAssetClassToPortfolioTarget,
    mapOverlayAssetClassesForMemo,
} from '@/lib/portfolio-target-taxonomy';

type MemoMode = PortfolioMemoMode;

type CompositionSlice = {
    key: string;
    label: string;
    value: number;
    pct: number;
    color: string;
};

type TransitionRow = {
    key: string;
    label: string;
    note: string;
    total: number;
    displayTotal: number;
    segments: Array<{
        key: string;
        label: string;
        pct: number;
        color: string;
        outlined?: boolean;
    }>;
};

type SectorLookup = (assetClass: string, displayName?: string | null) => string;


function pct(value?: number | null, digits = 1): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    return `${value.toFixed(digits)}%`;
}

function money(value?: number | null): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '$0';
    return `$${Math.round(value).toLocaleString()}`;
}

function compactMoney(value?: number | null): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '$0';
    return `$${Math.round(value).toLocaleString()}`;
}

function formatDateTime(value?: string | null): string {
    if (!value) return 'Not set';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not set';
    return date.toLocaleString('en-AU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}


function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPieSlices(
    summary: PortfolioOverlaySummaryResponse | null,
    flatten: boolean,
    sectorForAssetClass: SectorLookup,
): CompositionSlice[] {
    if (!summary?.asset_classes?.length) return [];

    const totals = new Map<string, { value: number; color: string }>();

    summary.asset_classes.forEach((item, index) => {
        const key = flatten
            ? item.display_name
            : sectorForAssetClass(item.asset_class, item.display_name);
        const currentValue =
            item.total_class_capital_value ??
            item.total_capital ??
            item.invested_value ??
            item.actual_invested_value ??
            0;
        const color = flatten
            ? getPortfolioAssetClassColor(item.asset_class)
            : getPortfolioGroupColor(key);
        const existing = totals.get(key);
        totals.set(key, {
            value: (existing?.value || 0) + currentValue,
            color: existing?.color || color,
        });
    });

    const total = Array.from(totals.values()).reduce((sum, item) => sum + item.value, 0);
    if (total <= 0) return [];

    return Array.from(totals.entries())
        .map(([label, entry]) => ({
            key: label,
            label,
            value: entry.value,
            pct: (entry.value / total) * 100,
            color: entry.color,
        }))
        .sort((a, b) => b.value - a.value);
}

function getAssetClassCurrentValue(
    item: NonNullable<PortfolioOverlaySummaryResponse['asset_classes']>[number],
): number {
    return (
        item.total_class_capital_value ??
        item.total_capital ??
        item.invested_value ??
        item.actual_invested_value ??
        0
    );
}

function buildSectorChildSlices(
    summary: PortfolioOverlaySummaryResponse | null,
    sector: string,
    sectorForAssetClass: SectorLookup,
): CompositionSlice[] {
    if (!summary?.asset_classes?.length) return [];

    const children = summary.asset_classes
        .filter(
            (item) =>
                sectorForAssetClass(item.asset_class, item.display_name) ===
                sector,
        )
        .sort(
            (a, b) =>
                (a.display_order || 9999) - (b.display_order || 9999) ||
                a.display_name.localeCompare(b.display_name),
        );

    const total = children.reduce(
        (sum, item) => sum + getAssetClassCurrentValue(item),
        0,
    );
    if (total <= 0) return [];

    return children.map((item, index) => {
        const value = getAssetClassCurrentValue(item);
        return {
            key: item.asset_class,
            label: item.display_name,
            value,
            pct: (value / total) * 100,
            color: getPortfolioAssetClassColor(item.asset_class),
        };
    });
}

function buildDrillableSectors(
    summary: PortfolioOverlaySummaryResponse | null,
    sectorForAssetClass: SectorLookup,
): Set<string> {
    const counts = new Map<string, number>();
    for (const item of summary?.asset_classes || []) {
        const sector = sectorForAssetClass(item.asset_class, item.display_name);
        counts.set(sector, (counts.get(sector) || 0) + 1);
    }
    return new Set(
        Array.from(counts.entries())
            .filter(([, count]) => count > 1)
            .map(([sector]) => sector),
    );
}

function buildTransitionRows(summary: PortfolioOverlaySummaryResponse | null): TransitionRow[] {
    if (!summary?.asset_classes?.length) return [];

    const sorted = [...summary.asset_classes].sort(
        (a, b) => (a.display_order || 9999) - (b.display_order || 9999),
    );

    const exemptCurrentTotal = sorted
        .filter((item) => item.overlay_eligible === false)
        .reduce(
            (sum, item) =>
                sum +
                (item.total_class_capital_pct ??
                    item.portfolio_weight_pct ??
                    item.trigger_total_class_pct ??
                    0),
            0,
        );
    const eligibleCurrentTotal = summary.actual_eligible_invested_pct ?? 0;
    const portfolioCashTotal = summary.portfolio_cash_bucket_pct ?? 0;

    const rowDefs = [
        {
            key: 'baseline',
            label: 'Baseline',
            note: 'Last accepted holdings state',
            pick: (item: NonNullable<PortfolioOverlaySummaryResponse['asset_classes']>[number]) =>
                item.trigger_total_class_pct ??
                item.total_class_capital_pct ??
                item.portfolio_weight_pct ??
                0,
            displayTotal: 100,
        },
        {
            key: 'current',
            label: 'Current',
            note: 'Live holdings now',
            pick: (item: NonNullable<PortfolioOverlaySummaryResponse['asset_classes']>[number]) =>
                item.total_class_capital_pct ??
                item.portfolio_weight_pct ??
                item.trigger_total_class_pct ??
                0,
            displayTotal: eligibleCurrentTotal + exemptCurrentTotal + portfolioCashTotal,
        },
    ];

    return rowDefs.map((rowDef) => {
        let total = 0;
        const segments = sorted
            .map((item, index) => {
                const value = rowDef.pick(item);
                total += value;
                return {
                    key: item.asset_class,
                    label: item.display_name,
                    pct: value,
                    color: getPortfolioAssetClassColor(item.asset_class),
                    outlined: item.overlay_eligible === false,
                };
            })
            .filter((segment) => segment.pct > 0);

        return {
            key: rowDef.key,
            label: rowDef.label,
            note: rowDef.note,
            total,
            displayTotal: rowDef.displayTotal,
            segments,
        };
    });
}

export function ExposureTab() {
    const [summary, setSummary] = useState<PortfolioOverlaySummaryResponse | null>(null);
    const [assetClassConfig, setAssetClassConfig] = useState<AssetClassConfig[]>(
        [],
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [memoMode, setMemoMode] = useState<MemoMode>('FAST');
    const [flattenComposition, setFlattenComposition] = useState(false);
    const [drilledSector, setDrilledSector] = useState<string | null>(null);
    const [memoState, setMemoState] = useState<PortfolioMemoState | null>(null);
    const [memoError, setMemoError] = useState<string | null>(null);
    const mountedRef = useRef(true);
    const assetClassConfigByKey = useMemo(() => {
        return new Map(
            assetClassConfig.map(
                (item) => [item.key.toUpperCase(), item] as const,
            ),
        );
    }, [assetClassConfig]);
    const sectorForAssetClass = useCallback(
        (assetClass: string, displayName?: string | null) => {
            const key = String(assetClass || '').trim().toUpperCase();
            const setting = assetClassConfigByKey.get(key);
            return (
                String(setting?.sector || '').trim() ||
                String(setting?.display_name || displayName || assetClass || 'Misc')
                    .trim()
            );
        },
        [assetClassConfigByKey],
    );

    const persistMemoState = useCallback((next: PortfolioMemoState | null) => {
        if (mountedRef.current) {
            setMemoState(next);
        }
        savePortfolioMemoState(next);
    }, []);

    const buildPortfolioMemoPayload = useCallback(
        (
            overlaySummary: PortfolioOverlaySummaryResponse,
            sleeves: AssetClass[],
            mode: MemoMode,
        ) => {
            const availableAssetClasses =
                buildPortfolioMemoTargetUniverse(sleeves);

            const overlayStatusRaw = String(overlaySummary.overlay_status || '').toUpperCase();
            const overlayStatus =
                overlayStatusRaw === 'OK' || overlayStatusRaw === 'ALIGNED'
                    ? 'ONSIDE'
                    : overlayStatusRaw || ((overlaySummary.required_de_risk_pct || 0) > 0.05 ? 'REDUCE' : 'ONSIDE');

            const positions = Array.isArray(overlaySummary.positions)
                ? overlaySummary.positions.map((position) => ({
                      ticker: position.ticker || '',
                      name: position.name || '',
                      source_asset_class: position.asset_class || '',
                      asset_class: mapCurrentAssetClassToPortfolioTarget(
                          position.asset_class,
                      ),
                      value: position.value || 0,
                      cash: position.cash || 0,
                      portfolio_pct: position.portfolio_pct || 0,
                      q1_governed: Boolean(position.q1_governed),
                  }))
                : [];

            return {
                job_type: 'portfolio_positioning',
                query:
                    'Analyse the current macro environment first, including rates, major commodity prices, Q1/Q2/Q3/Q4 regime fit, and major broker themes. Build an ideal asset-class portfolio using ranges, then compare it with the current asset-class percentages only and provide directional commentary with conviction.',
                ticker: '',
                company_name: '',
                template_id: null,
                company_type: null,
                exchange: '',
                stage1_only: false,
                stage2_revision_pass: 'on' as const,
                secondary_chairman_model: undefined,
                run_label: 'portfolio_positioning',
                diagnostic_mode: false,
                reuse_recent_bundle: false,
                reuse_supplementary_from_job_id: null,
                supplementary_mode: null,
                portfolio_positioning_mode: mode.toLowerCase(),
                portfolio_context: {
                    as_of: new Date().toISOString(),
                    portfolio: {
                        total_value:
                            overlaySummary.total_portfolio_value ||
                            overlaySummary.portfolio_value ||
                            0,
                        cash_value: overlaySummary.portfolio_cash_bucket_value || 0,
                        cash_pct: overlaySummary.portfolio_cash_bucket_pct || 0,
                        holdings_count: positions.length,
                    },
                    overlay: {
                        q1_exposure_pct: overlaySummary.effective_equity_pct || 0,
                        last_applied_q1_exposure_pct:
                            overlaySummary.last_applied_q1_exposure_pct || 0,
                        status: overlayStatus,
                        required_de_risk_pct:
                            overlaySummary.required_de_risk_pct || 0,
                        required_de_risk_value:
                            overlaySummary.required_de_risk_value || 0,
                        available_headroom_pct:
                            overlaySummary.available_headroom_pct || 0,
                        available_headroom_value:
                            overlaySummary.available_headroom_value || 0,
                        regime_cash_pct:
                            overlaySummary.portfolio_cash_bucket_pct || 0,
                        regime_cash_value:
                            overlaySummary.portfolio_cash_bucket_value || 0,
                    },
                    available_asset_classes: availableAssetClasses,
                    asset_classes: mapOverlayAssetClassesForMemo(
                        overlaySummary.asset_classes || [],
                    ),
                    positions,
                },
                label: `Analysis (${new Date().toISOString().slice(0, 10)})`,
                analysis_date: '',
                is_synthetic: false,
            };
        },
        [],
    );

    const pollPortfolioMemoJob = useCallback(
        async (jobId: string, mode: MemoMode) => {
            let consecutiveErrors = 0;
            const maxConsecutiveErrors = 4;

            while (mountedRef.current) {
                try {
                    const job = await api.getCouncilAnalysisJob(jobId);
                    consecutiveErrors = 0;

                    const nextState: PortfolioMemoState = {
                        jobId: job.job_id,
                        mode,
                        status: job.status,
                        stage: job.stage,
                        stageMessage: job.stage_message,
                        progressPct: job.progress_pct,
                        createdAt: job.created_at,
                        startedAt: job.started_at,
                        finishedAt: job.finished_at,
                        runId: job.run_id,
                        error: job.error || '',
                        summary: memoState?.jobId === job.job_id ? memoState.summary : undefined,
                    };
                    persistMemoState(nextState);

                    if (job.status === 'succeeded') {
                        const result = await api.getCouncilAnalysisResult(job.job_id);
                        const memoSummary = buildPortfolioMemoSummary(result);
                        persistMemoState({
                            ...nextState,
                            status: result.job.status,
                            stage: result.job.stage,
                            stageMessage: result.job.stage_message,
                            progressPct: result.job.progress_pct,
                            runId:
                                (result.run?.id as string) ||
                                result.job.run_id ||
                                job.run_id,
                            summary: memoSummary,
                        });
                        setMemoError(null);
                        return;
                    }

                    if (job.status === 'failed') {
                        setMemoError(job.error || 'Portfolio memo failed');
                        return;
                    }

                    await sleep(5000);
                } catch (pollError) {
                    consecutiveErrors += 1;
                    const message =
                        pollError instanceof Error
                            ? pollError.message
                            : 'Failed to poll portfolio memo job';
                    setMemoError(message);
                    if (consecutiveErrors >= maxConsecutiveErrors) {
                        persistMemoState({
                            jobId,
                            mode,
                            status: 'failed',
                            stage: 'polling',
                            stageMessage: 'Polling failed',
                            progressPct: 0,
                            error: message,
                            summary:
                                memoState?.jobId === jobId ? memoState.summary : undefined,
                        });
                        return;
                    }
                    await sleep(3000);
                }
            }
        },
        [memoState?.jobId, memoState?.summary, persistMemoState],
    );

    const handleRunMemo = useCallback(async () => {
        if (!summary) return;
        setMemoError(null);
        try {
            const sleeves = await api.getAssetClasses();
            const payload = buildPortfolioMemoPayload(summary, sleeves, memoMode);
            const mandate = await api.getPortfolioInvestmentBrief();
            const job = await api.createCouncilAnalysisJob({ ...payload,
                portfolio_context: { ...payload.portfolio_context, mandate } });
            persistMemoState({
                jobId: job.job_id,
                mode: memoMode,
                status: job.status,
                stage: job.stage,
                stageMessage: job.stage_message,
                progressPct: job.progress_pct,
                createdAt: job.created_at,
                startedAt: job.started_at,
                finishedAt: job.finished_at,
                runId: job.run_id,
                error: job.error || '',
            });
            void pollPortfolioMemoJob(job.job_id, memoMode);
        } catch (runError) {
            const message =
                runError instanceof Error
                    ? runError.message
                    : 'Failed to start portfolio memo';
            setMemoError(message);
            persistMemoState({
                jobId: '',
                mode: memoMode,
                status: isCouncilSubmissionUncertain(runError) ? 'submission_uncertain' : 'failed',
                stage: 'submit',
                stageMessage: isCouncilSubmissionUncertain(runError) ? 'Submission uncertain' : 'Submit failed',
                progressPct: 0,
                error: message,
            });
        }
    }, [buildPortfolioMemoPayload, memoMode, persistMemoState, pollPortfolioMemoJob, summary]);

    useEffect(() => {
        mountedRef.current = true;
        let cancelled = false;

        const load = async () => {
            try {
                const [data, config] = await Promise.all([
                    api.getPortfolioOverlaySummary(),
                    api.getAssetClassConfig(),
                ]);
                if (!cancelled) {
                    setSummary(data);
                    setAssetClassConfig(Array.isArray(config) ? config : []);
                    setError(null);
                }
            } catch (loadError) {
                console.error('[PORTFOLIO] Failed to load overview summary:', loadError);
                if (!cancelled) {
                    setError(
                        loadError instanceof Error
                            ? loadError.message
                            : 'Failed to load exposure summary',
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        const stopPolling = subscribePoll(load, 30000);
        return () => {
            mountedRef.current = false;
            cancelled = true;
            stopPolling();
        };
    }, []);

    useEffect(() => {
        const saved = loadPortfolioMemoState();
        if (!saved) return;
        setMemoState(saved);
        if (saved.status === 'queued' || saved.status === 'running') {
            void pollPortfolioMemoJob(saved.jobId, saved.mode);
        }
    }, [pollPortfolioMemoJob]);

    const drillableSectors = useMemo(
        () => buildDrillableSectors(summary, sectorForAssetClass),
        [sectorForAssetClass, summary],
    );
    const pieSlices = useMemo(() => {
        if (drilledSector && !flattenComposition) {
            return buildSectorChildSlices(
                summary,
                drilledSector,
                sectorForAssetClass,
            );
        }
        return buildPieSlices(summary, flattenComposition, sectorForAssetClass);
    }, [drilledSector, flattenComposition, sectorForAssetClass, summary]);
    const transitionRows = useMemo(() => buildTransitionRows(summary), [summary]);
    const memoStatusLabel = useMemo(() => {
        if (!memoState) return 'Idle';
        if (memoState.status === 'queued') return 'Queued';
        if (memoState.status === 'running') return 'Running';
        if (memoState.status === 'succeeded') return 'Complete';
        if (memoState.status === 'failed') return 'Failed';
        if (memoState.status === 'submission_uncertain') return 'Submission uncertain';
        return memoState.status;
    }, [memoState]);
    const memoRunning =
        memoState?.status === 'queued' || memoState?.status === 'running';
    const portfolioRisk = summary?.portfolio_risk;
    const portfolioRiskMode = String(portfolioRisk?.mode || '').toUpperCase();
    const q4Crisis = summary?.q4_crisis;
    const q4CrisisActive =
        portfolioRiskMode === 'Q4_CRISIS' || Boolean(q4Crisis?.active);
    const q4CrisisTargetPct =
        portfolioRiskMode === 'Q4_CRISIS'
            ? portfolioRisk?.target_pct ?? q4Crisis?.target_equity_pct ?? 10
            : q4Crisis?.target_equity_pct ?? 10;

    const totalPie = pieSlices.reduce((sum, slice) => sum + slice.value, 0);
    let currentAngle = -90;

    useEffect(() => {
        if (flattenComposition && drilledSector) {
            setDrilledSector(null);
        }
    }, [flattenComposition, drilledSector]);

    if (loading) {
        return (
            <div className="p-6">
                <div className="panel-border p-6 text-sm text-muted-foreground">
                    Loading portfolio overview...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="panel-border border-red-500/30 p-6 text-sm text-red-300">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="overflow-auto p-6">
            <div className="mb-6 rounded-lg border border-border bg-card/40 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <div className="text-sm font-bold tracking-wide text-foreground">
                            PORTFOLIO POSITIONING MEMO
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                            Run a top-down research pass across macro, cross-asset, and sector conditions, then compare the ideal portfolio mix against what you hold now.
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex rounded border border-border/60 bg-background/40 p-0.5 text-[11px]">
                            <button
                                onClick={() => setMemoMode('FAST')}
                                className={`rounded px-2.5 py-1 font-mono uppercase tracking-wide transition-colors ${
                                    memoMode === 'FAST'
                                        ? 'bg-primary/15 text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                fast
                            </button>
                            <button
                                onClick={() => setMemoMode('DEEP')}
                                className={`rounded px-2.5 py-1 font-mono uppercase tracking-wide transition-colors ${
                                    memoMode === 'DEEP'
                                        ? 'bg-primary/15 text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                deep
                            </button>
                        </div>
                        <button
                            onClick={handleRunMemo}
                            disabled={!summary || memoRunning}
                            className="rounded border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-mono uppercase tracking-wide text-foreground transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {memoRunning ? 'RUNNING...' : 'RUN MEMO'}
                        </button>
                    </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
                    <div className="rounded border border-border/60 bg-background/35 p-3">
                        <div className="text-[10px] font-mono tracking-widest text-muted-foreground">
                            Status
                        </div>
                        <div className="mt-1 text-sm font-semibold text-foreground">
                            {memoStatusLabel}
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                            {memoState?.jobId
                                ? `${memoState.mode} · ${memoState.stage || 'queued'}${
                                      memoState.progressPct !== undefined
                                          ? ` · ${memoState.progressPct}%`
                                          : ''
                                  }`
                                : 'No portfolio memo run yet'}
                        </div>
                        {memoState?.summary?.analysisDate ? (
                            <div className="mt-2 text-[11px] text-muted-foreground">
                                {formatDateTime(memoState.summary.analysisDate)}
                            </div>
                        ) : null}
                        {memoError || memoState?.error ? (
                            <div className="mt-2 text-[11px] text-red-300">
                                {memoError || memoState?.error}
                            </div>
                        ) : null}
                    </div>
                    <div className="rounded border border-border/60 bg-background/35 p-3">
                        {memoState?.summary?.executiveSummary ? (
                            <div className="space-y-2">
                                <div className="flex flex-wrap gap-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                                    {memoState.summary.primaryTheme ? (
                                        <span>{memoState.summary.primaryTheme}</span>
                                    ) : null}
                                    {memoState.summary.overallConviction ? (
                                        <span className="text-foreground">
                                            {memoState.summary.overallConviction}
                                        </span>
                                    ) : null}
                                </div>
                                <div className="text-sm leading-6 text-muted-foreground">
                                    {memoState.summary.executiveSummary}
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground">
                                This memo is a Layer 1 asset-allocation view. It reads the current portfolio, gathers fresh macro research, and returns ideal asset-class target ranges plus a current-vs-ideal comparison.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {q4CrisisActive && (
                <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/[0.075] p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-red-200">
                                Portfolio Risk
                            </div>
                            <div className="mt-1 text-lg font-semibold text-foreground">
                                {portfolioRisk?.label || 'Q4 Crisis'} · reduce market exposure to {pct(q4CrisisTargetPct, 0)} or less
                            </div>
                            <div className="mt-2 text-xs leading-5 text-muted-foreground">
                                {portfolioRisk?.active_reason || q4Crisis?.reason
                                    ? `Reason: ${portfolioRisk?.active_reason || q4Crisis?.reason}`
                                    : 'Broad risk-off controller is active.'}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-3">
                            <div className="rounded border border-red-500/30 bg-background/30 px-3 py-2">
                                <div className="text-muted-foreground">Target</div>
                                <div className="mt-0.5 font-mono text-red-100">
                                    {pct(q4CrisisTargetPct, 0)}
                                </div>
                            </div>
                            <div className="rounded border border-red-500/30 bg-background/30 px-3 py-2">
                                <div className="text-muted-foreground">Effective</div>
                                <div className="mt-0.5 font-mono text-foreground">
                                    {pct(summary?.effective_equity_pct ?? null, 0)}
                                </div>
                            </div>
                            <div className="rounded border border-red-500/30 bg-background/30 px-3 py-2">
                                <div className="text-muted-foreground">Changed</div>
                                <div className="mt-0.5 font-mono text-muted-foreground">
                                    {formatDateTime(q4Crisis?.last_changed_at)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="mb-6 grid items-stretch gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
                <div className="rounded-lg border border-border p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="text-sm font-bold tracking-wide text-foreground">
                                PORTFOLIO COMPOSITION
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                                The pie is still the fastest way to read what the portfolio actually looks like right now.
                            </div>
                        </div>
                        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                            <input
                                className="w-3 h-3"
                                type="checkbox"
                                checked={flattenComposition}
                                onChange={(event) => setFlattenComposition(event.target.checked)}
                            />
                            Flatten
                        </label>
                    </div>

                    <div className="mb-6 flex flex-col items-center gap-2">
                        <div className="flex items-center gap-4"></div>
                    </div>

                    <div className="flex flex-col items-center gap-6">
                        <div className="flex w-full items-center justify-center">
                            <div className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
                                {drilledSector && !flattenComposition
                                    ? `${drilledSector} Components`
                                    : 'Sector View'}
                            </div>
                        </div>
                        <svg width="300" height="300" viewBox="0 0 300 300">
                            {pieSlices.map((slice) => {
                                const angle = totalPie > 0 ? (slice.value / totalPie) * 360 : 0;
                                const startAngle = currentAngle;
                                const endAngle = startAngle + angle;
                                currentAngle = endAngle;

                                const startRad = (startAngle * Math.PI) / 180;
                                const endRad = (endAngle * Math.PI) / 180;
                                const x1 = 150 + 110 * Math.cos(startRad);
                                const y1 = 150 + 110 * Math.sin(startRad);
                                const x2 = 150 + 110 * Math.cos(endRad);
                                const y2 = 150 + 110 * Math.sin(endRad);
                                const largeArc = angle > 180 ? 1 : 0;
                                const path = `M 150 150 L ${x1} ${y1} A 110 110 0 ${largeArc} 1 ${x2} ${y2} Z`;

                                const midAngle = startAngle + angle / 2;
                                const midRad = (midAngle * Math.PI) / 180;
                                const textRadius = 60;
                                const textX = 150 + textRadius * Math.cos(midRad);
                                const textY = 150 + textRadius * Math.sin(midRad);

                                return (
                                    <g key={slice.key}>
                                        <path
                                            d={path}
                                            fill={slice.color}
                                            stroke="var(--border)"
                                            strokeWidth="2"
                                            className={`hover:opacity-80 transition-opacity ${
                                                (!flattenComposition &&
                                                    ((drilledSector !== null) ||
                                                        drillableSectors.has(slice.label)))
                                                    ? 'cursor-pointer'
                                                    : 'cursor-default'
                                            }`}
                                            onClick={() => {
                                                if (flattenComposition) return;
                                                if (drilledSector) {
                                                    setDrilledSector(null);
                                                    return;
                                                }
                                                if (drillableSectors.has(slice.label)) {
                                                    setDrilledSector(slice.label);
                                                }
                                            }}
                                        />
                                        {slice.pct >= 8 && (
                                            <text
                                                x={textX}
                                                y={textY}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                                className="text-[8px] font-bold fill-foreground pointer-events-none"
                                                style={{ userSelect: 'none' }}
                                            >
                                                {slice.label.length > 10
                                                    ? `${slice.label.slice(0, 10)}`
                                                    : slice.label}
                                            </text>
                                        )}
                                    </g>
                                );
                            })}
                        </svg>

                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                            {pieSlices.map((slice) => (
                                <div
                                    key={slice.key}
                                    className={`flex items-center gap-2 ${
                                        !flattenComposition &&
                                        ((!drilledSector && drillableSectors.has(slice.label)) ||
                                            drilledSector)
                                            ? 'cursor-pointer hover:opacity-80'
                                            : ''
                                    }`}
                                    onClick={() => {
                                        if (flattenComposition) return;
                                        if (drilledSector) {
                                            setDrilledSector(null);
                                            return;
                                        }
                                        if (drillableSectors.has(slice.label)) {
                                            setDrilledSector(slice.label);
                                        }
                                    }}
                                >
                                    <div
                                        className="w-4 h-4 rounded"
                                        style={{ backgroundColor: slice.color }}
                                    />
                                    <div className="text-xs">
                                        <div className="text-foreground font-medium">
                                            {slice.label}
                                            {!flattenComposition &&
                                            !drilledSector &&
                                            drillableSectors.has(slice.label)
                                                ? ' →'
                                                : drilledSector
                                                ? ' ←'
                                                : ''}
                                        </div>
                                        <div className="text-muted-foreground">
                                            {slice.pct.toFixed(1)}% ({compactMoney(slice.value)})
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border border-border p-4 bg-card/40">
                    <div className="mb-4">
                    <div className="text-sm font-bold tracking-wide text-foreground">
                        ALLOCATION TRANSITION
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                        Approved baseline and the portfolio as it sits now.
                    </div>
                    </div>

                    <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        {summary?.asset_classes
                            ?.slice()
                            .sort((a, b) => (a.display_order || 9999) - (b.display_order || 9999))
                            .map((item, index) => (
                                <div
                                    key={item.asset_class}
                                    title={`${item.display_name} · ${
                                        item.overlay_eligible === false
                                            ? 'Q1-defensive'
                                            : 'Q1-governed'
                                    }`}
                                    className="inline-flex items-center gap-2 rounded border border-border/50 bg-background/30 px-2 py-1 text-[10px] font-mono uppercase tracking-wide text-muted-foreground"
                                >
                                    <span
                                        className="h-2 w-2 rounded-full"
                                        style={{
                                            backgroundColor: getPortfolioAssetClassColor(item.asset_class),
                                        }}
                                    />
                                    <span>{item.display_name}</span>
                                </div>
                            ))}
                    </div>

                    <div className="text-xs text-muted-foreground">
                        Outlined classes are configured separately for portfolio-risk treatment.
                    </div>

                    <div className="space-y-4">
                        {transitionRows.map((row) => (
                            <div
                                key={row.key}
                                className="grid grid-cols-[92px_minmax(0,1fr)_56px] items-center gap-3"
                            >
                                <div>
                                    <div className="text-xs font-semibold text-foreground">{row.label}</div>
                                    <div className="text-[10px] text-muted-foreground">
                                        {row.note}
                                    </div>
                                </div>
                                <div className="h-7 overflow-hidden rounded border border-border/50 bg-background/30">
                                    <div className="flex h-full w-full">
                                    {row.segments.map((segment) => (
                                        <div
                                            key={`${row.key}-${segment.key}`}
                                            title={`${segment.label} ${pct(segment.pct)}`}
                                            className={`h-full border-r border-background/40 ${
                                                segment.outlined ? 'ring-1 ring-inset ring-white/15' : ''
                                            }`}
                                            style={{
                                                width: `${
                                                    row.total > 0
                                                        ? Math.max(
                                                              (segment.pct / row.total) * 100,
                                                              0,
                                                          )
                                                        : 0
                                                }%`,
                                                backgroundColor: segment.color,
                                            }}
                                        />
                                    ))}
                                    </div>
                                </div>
                                <div className="text-right text-xs font-mono text-muted-foreground">
                                    {Math.round(row.displayTotal)}%
                                </div>
                            </div>
                        ))}
                    </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
