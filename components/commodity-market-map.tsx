'use client';
import { subscribePoll } from '@/lib/polling';
import { DataFreshnessIndicator } from '@/components/data-freshness-indicator';
import detailStyles from './commodity-market-detail.module.css';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { ChevronDown, ChevronLeft, ExternalLink, LoaderCircle, Pencil, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import {
    api,
    type AssetClass,
    type CommodityTheme,
    type CommodityThemeConfigurationPayload,
    type CommodityThemeSecurity,
    type CommodityThemeSource,
    type CommodityThemeStage,
    type CommodityThemeStatus,
} from '@/lib/api';
import {
    currentTerminalRouteState,
    pushTerminalRoute,
    readTerminalRoute,
    replaceTerminalRoute,
} from '@/lib/terminal-route';
import { useStockTableContext } from '@/components/stock-table/stock-table-context';
import { assetClassColor } from '@/lib/asset-class-identity';
import { mountTradingViewEmbed } from '@/lib/tradingview-embed';

type ThemeDetails = Record<string, CommodityTheme>;

type ThemeSetupStep = {
    label: string;
    detail: string;
    tone: string;
    opensAlerts: boolean;
};

type MarketConfigurationDraft = {
    code: string;
    displayName: string;
    marketGroup: string;
    strategicFloorAssetClassCode: string;
    tacticalAssetClassCode: string;
    commodityLabel: string;
    commoditySymbol: string;
    equityLabel: string;
    equityNumerator: string;
    equityDenominator: string;
    directExpression: {
        available: boolean;
        instrumentLabel: string;
        instrumentTicker: string;
        instrumentKind: string;
    };
};

const directVehicleKinds = ['SPOT', 'CFD', 'FUTURE', 'ETF', 'OTHER'];

const marketTextStrong = 'text-[color:var(--analysis-text-strong)]';
const marketTextMuted = 'text-[color:var(--analysis-ticker-text)]';
const marketTextFaint = 'text-[color:var(--analysis-ticker-text)] opacity-75';
const marketFormLabel = `text-[10px] font-semibold uppercase tracking-[0.1em] ${marketTextStrong}`;
const marketFormInput = `mt-[7px] h-[34px] w-full border border-border/60 bg-background/75 px-[10px] text-[12px] font-medium ${marketTextStrong} outline-none transition-colors placeholder:text-[color:var(--analysis-ticker-text)] placeholder:font-normal placeholder:opacity-40 focus:border-[color:var(--analysis-text-strong)]/70 focus:bg-background`;
const marketFormStaticValue = `mt-[7px] flex h-[34px] items-center border border-border/35 bg-muted/[0.045] px-[10px] text-[11px] font-medium ${marketTextStrong}`;
const marketFormSelect = `mt-[7px] h-[34px] w-full border border-border/60 bg-background/75 px-[10px] text-[11px] font-medium ${marketTextStrong} outline-none transition-colors focus:border-[color:var(--analysis-text-strong)]/70 focus:bg-background`;

const themeGroups: Array<{ label: string; codes: string[] }> = [
    { label: 'Precious metals', codes: ['GOLD', 'SILVER', 'PLATINUM'] },
    { label: 'Industrial materials', codes: ['COPPER', 'LITHIUM', 'STEEL', 'URANIUM'] },
    { label: 'Energy', codes: ['OIL_PRODUCERS', 'OIL_SERVICES', 'NATURAL_GAS'] },
];

function defaultMarketGroupFor(code: string): string {
    return themeGroups.find((group) => group.codes.includes(code))?.label || 'Other';
}

const statusStyle: Record<string, { dot: string; text: string }> = {
    CONFIRMED: { dot: 'border-[color:var(--signal-buy)] bg-[var(--signal-buy)]', text: 'text-[color:var(--signal-buy)]' },
    PARTIAL: { dot: 'border-[color:var(--signal-buy)] bg-[var(--signal-buy)]', text: 'text-[color:var(--signal-buy)]' },
    BLOCKED: { dot: 'border-[color:var(--signal-sell)] bg-[var(--signal-sell)]', text: 'text-[color:var(--signal-sell)]' },
    WAITING: { dot: 'border-[color:var(--signal-warn)] bg-transparent', text: 'text-[color:var(--signal-warn)]' },
    DISCONNECTED: { dot: 'border-[color:var(--analysis-ticker-text)] bg-transparent', text: marketTextMuted },
};

function marketStatusBarColor(status: string): string {
    switch (status) {
        case 'CONFIRMED':
            return 'var(--signal-buy)';
        case 'PARTIAL':
        case 'WAITING':
            return 'var(--signal-warn)';
        case 'BLOCKED':
            return 'var(--signal-sell)';
        default:
            return 'var(--analysis-ticker-text)';
    }
}

function sourceSymbol(source: CommodityThemeSource, security?: CommodityThemeSecurity): string | null {
    const resolve = (value?: string) => value === 'SECURITY' ? security?.ticker ?? null : value || null;
    const numerator = resolve(source.numerator);
    const denominator = resolve(source.denominator);
    if (numerator && denominator) return `${numerator}/${denominator}`;
    return resolve(source.symbol);
}

function sourcePairLabel(source?: CommodityThemeSource): string {
    const symbol = source ? sourceSymbol(source) : null;
    return String(symbol || '')
        .replace(/(^|\/)(?:[A-Z0-9_]+):/gi, '$1')
        .replace(/\//g, ' / ') || 'Source pending';
}

function formatDollar(value: number): string {
    if (!Number.isFinite(value) || value === 0) return '$0';
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${Math.round(value)}`;
}

function format60DayReturn(value?: number | null): string {
    if (!Number.isFinite(value)) return '—';
    const numeric = Number(value);
    return `${numeric > 0 ? '+' : ''}${numeric.toFixed(1)}%`;
}

function return60DayTone(value?: number | null): string {
    if (!Number.isFinite(value) || Number(value) === 0) return marketTextMuted;
    return Number(value) > 0
        ? 'text-[color:var(--signal-buy)]'
        : 'text-[color:var(--signal-sell)]';
}

function formatPerformanceAsOf(value?: string | null): string {
    if (!value) return 'Direct commodity price history has not been refreshed.';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Direct commodity price history is unavailable.';
    return `Direct commodity return over 60 calendar days, as of ${date.toLocaleDateString('en-AU', {
        day: '2-digit', month: 'short', year: 'numeric',
    })}.`;
}

function latestEventAt(stage: CommodityThemeStage): string {
    const value = stage.last_confirmed_at || stage.last_event_at;
    if (!value) return 'No event';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'No event';
    return date.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function openChartUrl(symbol: string): string {
    return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`;
}

function stageSecurityTotal(stage: CommodityThemeStage, theme?: CommodityTheme): number {
    const responseTotal = Number(stage.eligible_security_total);
    const includedSecurityTotal = theme?.eligible_securities?.filter((security) => security.include_in_sizing).length ?? 0;
    return Number.isFinite(responseTotal) && responseTotal > 0 ? responseTotal : includedSecurityTotal;
}

function stageDirection(stage: CommodityThemeStage): 'BULL' | 'BEAR' | null {
    if (stage.status === 'CONFIRMED') return 'BULL';
    if (stage.status === 'BLOCKED') return 'BEAR';
    return null;
}

function stageReadoutSegments(stage: CommodityThemeStage, theme?: CommodityTheme): Array<{ label: string; tone: string }> {
    if (stage.scope !== 'SECURITY') {
        const direction = stageDirection(stage);
        return direction
            ? [{ label: direction, tone: direction === 'BULL' ? 'text-[color:var(--signal-buy)]' : 'text-[color:var(--signal-sell)]' }]
            : [{ label: '—', tone: marketTextMuted }];
    }

    const total = stageSecurityTotal(stage, theme);
    const confirmed = Math.min(total || Number.POSITIVE_INFINITY, Math.max(0, Number(stage.eligible_security_count) || 0));
    const blocked = Math.min(total || Number.POSITIVE_INFINITY, Math.max(0, Number(stage.blocked_security_count) || 0));
    const positiveLabel = stage.key === 'SECURITY_OUTPERFORM' ? 'OUTPERFORM' : 'BULL';
    const negativeLabel = stage.key === 'SECURITY_OUTPERFORM' ? 'UNDERPERFORM' : 'BEAR';
    const countSuffix = (count: number) => total > 0 ? ` ${count}/${total}` : '';
    const segments: Array<{ label: string; tone: string }> = [];

    if (confirmed > 0) {
        segments.push({ label: `${positiveLabel}${countSuffix(confirmed)}`, tone: 'text-[color:var(--signal-buy)]' });
    }
    if (blocked > 0) {
        segments.push({ label: `${negativeLabel}${countSuffix(blocked)}`, tone: 'text-[color:var(--signal-sell)]' });
    }
    if (segments.length > 0) return segments;

    const direction = stageDirection(stage);
    if (direction) {
        return [{
            label: stage.key === 'SECURITY_OUTPERFORM'
                ? (direction === 'BULL' ? 'OUTPERFORM' : 'UNDERPERFORM')
                : direction,
            tone: direction === 'BULL' ? 'text-[color:var(--signal-buy)]' : 'text-[color:var(--signal-sell)]',
        }];
    }
    return [{ label: '—', tone: marketTextMuted }];
}

function StageReadout({
    stage,
    theme,
    compact = false,
    blankWhenNoSignal = false,
}: {
    stage: CommodityThemeStage;
    theme?: CommodityTheme;
    compact?: boolean;
    blankWhenNoSignal?: boolean;
}) {
    const segments = stageReadoutSegments(stage, theme);
    const visibleSegments = blankWhenNoSignal && segments.length === 1 && segments[0]?.label === '—'
        ? []
        : segments;
    return (
        <span className={`flex min-w-0 flex-wrap items-center justify-center gap-x-1 ${compact ? 'gap-y-0' : 'gap-y-0.5'}`}>
            {visibleSegments.map((segment, index) => (
                <span key={`${segment.label}-${index}`} className={`${compact ? 'text-[10px]' : 'text-[10px]'} font-medium ${segment.tone}`}>
                    {index > 0 ? <span className={marketTextMuted}>· </span> : null}
                    {segment.label}
                </span>
            ))}
        </span>
    );
}

function stageConnectorStyle(status: string): CSSProperties {
    switch (status) {
        case 'CONFIRMED':
            return { height: 2, background: 'var(--signal-buy)' };
        case 'BLOCKED':
            return { borderTop: '1px dashed color-mix(in srgb, var(--signal-sell) 45%, transparent)' };
        case 'PARTIAL':
        case 'WAITING':
            return { borderTop: '1px dashed color-mix(in srgb, var(--signal-warn) 42%, transparent)' };
        default:
            return { borderTop: '1px dotted color-mix(in srgb, var(--analysis-ticker-text) 38%, transparent)' };
    }
}

function stageNodeVisual(status: string): { className: string; style?: CSSProperties } {
    switch (status) {
        case 'CONFIRMED':
            return {
                className: 'h-[11px] w-[11px] rounded-[2px] bg-[var(--signal-buy)]',
                style: { boxShadow: '0 0 0 3px color-mix(in srgb, var(--signal-buy) 10%, transparent)' },
            };
        case 'PARTIAL':
            return {
                className: 'h-[11px] w-[11px] rounded-[2px] border border-[color:var(--signal-warn)]',
                style: { background: 'linear-gradient(to top, var(--signal-warn) 50%, transparent 50%)' },
            };
        case 'WAITING':
            return { className: 'h-[11px] w-[11px] rounded-[2px] border border-[color:var(--signal-warn)]' };
        case 'BLOCKED':
            return {
                className: 'h-[3px] w-[11px] rounded-[1px] bg-[var(--signal-sell)]',
                style: { boxShadow: '0 0 0 3px color-mix(in srgb, var(--signal-sell) 8%, transparent)' },
            };
        default:
            return {
                className: 'h-[11px] w-[11px] rounded-[2px] border-[5px]',
                style: { borderColor: 'color-mix(in srgb, var(--analysis-ticker-text) 38%, transparent)' },
            };
    }
}

function StageProgressTrack({
    stage,
    previousStage,
    nextStage,
}: {
    stage: CommodityThemeStage;
    previousStage?: CommodityThemeStage;
    nextStage?: CommodityThemeStage;
}) {
    const nodeVisual = stageNodeVisual(stage.status);
    return (
        <span data-market-stage-track={stage.key} className="relative mt-2 block h-[13px] w-full" aria-hidden="true">
            {previousStage ? (
                <span
                    className="absolute left-0 right-1/2 top-1/2 -translate-y-1/2"
                    style={stageConnectorStyle(previousStage.status)}
                />
            ) : null}
            {nextStage ? (
                <span
                    className="absolute left-1/2 right-0 top-1/2 -translate-y-1/2"
                    style={stageConnectorStyle(stage.status)}
                />
            ) : null}
            <span
                data-market-stage-node={stage.key}
                className={`absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 ${nodeVisual.className}`}
                style={nodeVisual.style}
            />
        </span>
    );
}

function MarketChart({
    stage,
    security,
}: {
    stage: CommodityThemeStage;
    security?: CommodityThemeSecurity;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const symbol = sourceSymbol(stage.source, security);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const container = containerRef.current;
        if (!symbol || !container) return;
        if (!('IntersectionObserver' in window)) {
            setVisible(true);
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) return;
                setVisible(true);
                observer.disconnect();
            },
            { rootMargin: '160px 0px' },
        );
        observer.observe(container);
        return () => observer.disconnect();
    }, [symbol]);

    useEffect(() => {
        const container = containerRef.current;
        if (!symbol || !visible || !container) return;
        const chartBackground = window.getComputedStyle(document.documentElement)
            .getPropertyValue('--surface-1')
            .trim() || 'rgba(18, 21, 26, 1)';

        return mountTradingViewEmbed(container, {
            autosize: true,
            symbol,
            interval: 'D',
            range: '12M',
            timezone: 'Etc/UTC',
            theme: 'dark',
            backgroundColor: chartBackground,
            gridColor: 'rgba(255, 255, 255, 0.045)',
            style: '1',
            locale: 'en',
            hide_top_toolbar: true,
            hide_side_toolbar: true,
            hide_legend: true,
            hide_volume: true,
            save_image: false,
            allow_symbol_change: false,
            withdateranges: false,
            calendar: false,
            details: false,
            hotlist: false,
            studies: [],
            support_host: 'https://www.tradingview.com',
        }, { title: `${symbol} price chart by TradingView` });
    }, [symbol, visible]);

    return (
        <article data-testid={`market-chart-${stage.key}`} className="min-w-0 border border-border/55 bg-[color:var(--surface-1)]">
            <header className="flex items-center justify-between gap-3 border-b border-border/45 px-3 py-2">
                <div className="min-w-0">
                    <p className={`truncate text-[11px] font-semibold uppercase tracking-[0.07em] ${marketTextStrong}`}>{stage.label}</p>
                    <p className={`truncate font-mono text-[10px] ${marketTextFaint}`}>{symbol ?? 'No source'}</p>
                </div>
                {symbol ? (
                    <a
                        href={openChartUrl(symbol)}
                        target="_blank"
                        rel="noreferrer"
                        className={`shrink-0 ${marketTextFaint} transition-opacity hover:opacity-100`}
                        title="Open chart"
                        aria-label={`Open ${stage.label} in TradingView`}
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                ) : null}
            </header>
            {symbol ? (
                <div className="relative h-[250px] w-full">
                    <div ref={containerRef} className="h-full w-full" />
                    {!visible ? <div aria-label="Chart loading" className="pointer-events-none absolute inset-0 bg-muted/[0.025]" /> : null}
                </div>
            ) : (
                <div className={`flex h-[250px] items-center justify-center text-[11px] ${marketTextMuted}`}>No eligible company signal</div>
            )}
        </article>
    );
}

function themeSecurityForStage(theme: CommodityTheme, stageKey: string): CommodityThemeSecurity | undefined {
    const securities = theme.eligible_securities ?? [];
    return securities.find((security) => security.include_in_sizing && security.stage_states[stageKey] === 'CONFIRMED')
        ?? securities.find((security) => security.include_in_sizing && security.stage_states[stageKey] === 'BLOCKED')
        ?? securities.find((security) => security.include_in_sizing);
}

function StageDot({ status }: { status: string }) {
    const style = statusStyle[status] ?? statusStyle.DISCONNECTED;
    return <span className={`h-2.5 w-2.5 shrink-0 rounded-full border ${style.dot}`} aria-hidden="true" />;
}

function SummaryStage({ stage, theme }: { stage: CommodityThemeStage; theme?: CommodityTheme }) {
    return (
        <div className="min-w-0 border-l border-border/45 px-3 first:border-l-0">
            <div className="flex min-w-0 items-center gap-1.5">
                <StageDot status={stage.status} />
                <span className={`truncate text-[10px] font-medium ${marketTextStrong}`}>{stage.label}</span>
            </div>
            <div className="mt-1 min-h-[14px] pl-4 text-left">
                <StageReadout stage={stage} theme={theme} compact />
            </div>
        </div>
    );
}

function physicalCommodityStage(theme: CommodityTheme): CommodityThemeStage | undefined {
    return theme.stages.find((stage) => stage.key === 'COMMODITY');
}

function equityExpressionStages(theme: CommodityTheme): CommodityThemeStage[] {
    return theme.stages.filter((stage) => stage.key !== 'COMMODITY');
}

function shortTicker(value?: string | null): string {
    return String(value || 'Ticker pending')
        .trim()
        .replace(/^ASX_DLY:/i, 'ASX:')
        .replace(/^[A-Z0-9_]+:/i, '');
}

function stockEvidenceGlyphStyle(status: CommodityThemeStatus): CSSProperties {
    const size = 8;
    const base: CSSProperties = {
        width: size,
        height: size,
        flex: '0 0 auto',
        borderRadius: 2,
        boxSizing: 'border-box',
    };
    if (status === 'CONFIRMED') {
        return {
            ...base,
            background: 'var(--signal-buy)',
            boxShadow: '0 0 0 2px color-mix(in srgb, var(--signal-buy) 13%, transparent)',
        };
    }
    if (status === 'BLOCKED') {
        return {
            ...base,
            height: 3,
            alignSelf: 'center',
            borderRadius: 1,
            background: 'var(--signal-sell)',
            boxShadow: '0 0 0 2px color-mix(in srgb, var(--signal-sell) 10%, transparent)',
        };
    }
    if (status === 'PARTIAL') {
        return {
            ...base,
            border: '1px solid var(--signal-warn)',
            background: 'linear-gradient(to top, var(--signal-warn) 50%, transparent 50%)',
        };
    }
    if (status === 'WAITING') {
        return { ...base, border: '1px solid var(--signal-warn)' };
    }
    return {
        ...base,
        width: 5,
        height: 5,
        border: '1px solid color-mix(in srgb, var(--analysis-ticker-text) 42%, transparent)',
    };
}

function SecurityEvidence({ security }: { security: CommodityThemeSecurity }) {
    const trend = security.stage_states.SECURITY_TREND ?? 'DISCONNECTED';
    const outperformance = security.stage_states.SECURITY_OUTPERFORM ?? 'DISCONNECTED';
    return (
        <div
            data-testid={`market-stock-evidence-row-${security.security_id}`}
            className="grid min-w-0 grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-border/35 py-2.5 text-left last:border-b-0"
        >
            <span className={`font-mono text-[11.5px] ${marketTextStrong}`}>{shortTicker(security.ticker)}</span>
            <span className={`min-w-0 truncate text-[12px] ${marketTextFaint}`}>{security.name}{security.include_in_sizing ? '' : ' · Out of universe'}</span>
            <span
                className="flex shrink-0 items-center gap-2"
                title={`Stock CDF: ${trend}; Outperform: ${outperformance}`}
            >
                <span data-market-stock-evidence-node="trend" aria-hidden="true" style={stockEvidenceGlyphStyle(trend)} />
                <span aria-hidden="true" className="h-px w-3 bg-[color:var(--analysis-ticker-text)] opacity-20" />
                <span data-market-stock-evidence-node="outperform" aria-hidden="true" style={stockEvidenceGlyphStyle(outperformance)} />
            </span>
        </div>
    );
}

function MarketMapStockEvidence({ theme }: { theme: CommodityTheme }) {
    const securities = theme.eligible_securities ?? [];
    const evidenceId = `market-stock-evidence-${theme.code}`;
    return (
        <div
            id={evidenceId}
            data-testid={evidenceId}
            role="region"
            aria-label={`${theme.display_name} stock evidence`}
            className="col-span-full min-w-[820px] border-t border-border/25 bg-muted/[0.035]"
        >
            {securities.length > 0 ? (
                <div className="grid gap-x-5 px-4 py-1 md:grid-cols-2">
                    {securities.map((security) => <SecurityEvidence key={security.security_id} security={security} />)}
                </div>
            ) : (
                <p className={`px-4 py-3 text-[11px] ${marketTextMuted}`}>No eligible stocks are configured for this market.</p>
            )}
        </div>
    );
}

function MarketDetail({ theme, onBack }: { theme: CommodityTheme; onBack: () => void }) {
    const physicalStage = physicalCommodityStage(theme);
    const equityStages = equityExpressionStages(theme);
    const directEvidence = (theme.eligible_securities ?? []).filter((security) =>
        Object.values(security.stage_states).some((status) => status !== 'DISCONNECTED'),
    );
    const trendSecurity = themeSecurityForStage(theme, 'SECURITY_TREND');
    const outperformanceSecurity = themeSecurityForStage(theme, 'SECURITY_OUTPERFORM');
    const maximum = theme.tactical.budget_approved ? formatDollar(theme.tactical.maximum_value) : 'No mandate';
    const permitted = theme.tactical.budget_approved ? formatDollar(theme.tactical.permitted_value) : 'No mandate';
    const overPermitted = theme.tactical.budget_approved && theme.tactical.actual_value > theme.tactical.permitted_value + 1;
    const physicalLabel = theme.code === 'GOLD' ? 'Physical gold' : 'Direct commodity';
    const equityLabel = theme.code === 'GOLD' ? 'Gold equities' : 'Equity expression';

    return (
        <div className={`${detailStyles.detail} flex h-full min-h-0 flex-col overflow-hidden bg-[color:var(--panel-bg-alt)]`}>
            <header className="flex shrink-0 items-center gap-3 border-b border-border/45 px-5 py-2.5 md:px-7">
                <button
                    type="button"
                    onClick={onBack}
                    data-testid="market-detail-back"
                    className={`grid h-7 w-7 place-items-center border border-border/60 ${marketTextMuted} transition-colors hover:border-[color:var(--analysis-text-strong)] hover:opacity-100`}
                    title="Back to market map"
                    aria-label="Back to market map"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                    <h2 className={`text-[14px] font-semibold uppercase tracking-[0.075em] ${marketTextStrong}`}>{theme.display_name}</h2>
                    <p className={`mt-0.5 text-[10px] ${marketTextMuted}`}>{physicalLabel} gate and {equityLabel.toLowerCase()} path</p>
                </div>
                <div className={`ml-auto font-mono text-[12px] font-semibold ${statusStyle[theme.status]?.text ?? statusStyle.DISCONNECTED.text}`}>
                    {theme.confirmation_count} / {theme.confirmation_total}
                </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-7">
                <section className="grid border-y border-border/55 xl:grid-cols-[minmax(220px,0.8fr)_minmax(0,2.2fr)]">
                    <div className="border-b border-border/45 px-4 py-4 xl:border-b-0 xl:border-r">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <p className={`text-[9px] font-semibold uppercase tracking-[0.11em] ${marketTextMuted}`}>{physicalLabel}</p>
                            {physicalStage ? <StageReadout stage={physicalStage} theme={theme} compact /> : null}
                        </div>
                        {physicalStage ? <SummaryStage stage={physicalStage} theme={theme} /> : <p className={`text-[11px] ${marketTextMuted}`}>No direct commodity gate configured.</p>}
                        <p className={`mt-3 font-mono text-[12px] ${marketTextStrong}`}>{formatDollar(theme.strategic_floor.actual_value)} <span className={marketTextFaint}>/ {formatDollar(theme.strategic_floor.target_value)}</span></p>
                    </div>
                    <div className="px-4 py-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <p className={`text-[9px] font-semibold uppercase tracking-[0.11em] ${marketTextMuted}`}>{equityLabel}</p>
                            <span className={`font-mono text-[11px] font-semibold ${statusStyle[theme.status]?.text ?? statusStyle.DISCONNECTED.text}`}>{theme.confirmation_count} / {theme.confirmation_total}</span>
                        </div>
                        <div className="grid gap-y-3 sm:grid-cols-3">
                            {equityStages.map((stage) => <SummaryStage key={stage.key} stage={stage} theme={theme} />)}
                        </div>
                    </div>
                </section>

                <section className="grid border-b border-border/45 sm:grid-cols-3">
                    <div className="py-4 pr-4">
                        <p className={`text-[9px] uppercase tracking-[0.1em] ${marketTextFaint}`}>Approved equity maximum</p>
                        <p className={`mt-1 font-mono text-[13px] ${marketTextStrong}`}>{maximum}</p>
                    </div>
                    <div className="border-l border-border/45 px-4 py-4">
                        <p className={`text-[9px] uppercase tracking-[0.1em] ${marketTextFaint}`}>Permitted equity capacity</p>
                        <p className="mt-1 font-mono text-[13px] text-[color:var(--signal-buy)]">{permitted}</p>
                    </div>
                    <div className="border-l border-border/45 px-4 py-4">
                        <p className={`text-[9px] uppercase tracking-[0.1em] ${marketTextFaint}`}>Current equity exposure</p>
                        <p className={`mt-1 font-mono text-[13px] ${overPermitted ? 'text-[color:var(--signal-warn)]' : marketTextStrong}`}>{formatDollar(theme.tactical.actual_value)}</p>
                    </div>
                </section>

                <section className="mt-6 grid gap-8 xl:grid-cols-[minmax(280px,0.4fr)_minmax(0,1fr)]">
                    <div>
                        <div className="flex items-center justify-between border-b border-border/55 pb-2">
                            <h3 className={`text-[10px] font-semibold uppercase tracking-[0.11em] ${marketTextMuted}`}>Company evidence</h3>
                            <span className={`font-mono text-[10px] ${marketTextFaint}`}>{directEvidence.length} reported</span>
                        </div>
                        {directEvidence.length > 0 ? (
                            directEvidence.map((security) => <SecurityEvidence key={security.security_id} security={security} />)
                        ) : (
                            <p className={`py-5 text-[11px] ${marketTextMuted}`}>No company-level confirmation has been received.</p>
                        )}
                    </div>

                    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                        {theme.stages.map((stage) => (
                            <MarketChart
                                key={stage.key}
                                stage={stage}
                                security={
                                    stage.key === 'SECURITY_TREND'
                                        ? trendSecurity
                                        : stage.key === 'SECURITY_OUTPERFORM'
                                            ? outperformanceSecurity
                                            : undefined
                                }
                            />
                        ))}
                    </div>
                </section>

                <section className="mt-6 border-t border-border/45 pt-3">
                    <div className="grid gap-2 sm:grid-cols-4">
                        {theme.stages.map((stage) => (
                            <p key={stage.key} className={`font-mono text-[10px] ${marketTextFaint}`}>
                                {stage.label}: {latestEventAt(stage)}
                            </p>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}

function nextSetupStepForTheme(theme: CommodityTheme): ThemeSetupStep {
    const physical = theme.stages.find((stage) => stage.key === 'COMMODITY');
    const equity = theme.stages.find((stage) => stage.key === 'EQUITY_RELATIVE');
    const outperform = theme.stages.find((stage) => stage.key === 'SECURITY_OUTPERFORM');

    if (!physical) {
        return {
            label: 'Physical source pending',
            detail: 'This market does not have a configured direct commodity source yet.',
            tone: 'DISCONNECTED',
            opensAlerts: false,
        };
    }
    if (physical.status === 'DISCONNECTED') {
        return {
            label: 'Connect physical CDF',
            detail: 'Register and initialise the physical commodity CDF feed in Alerts.',
            tone: 'WAITING',
            opensAlerts: true,
        };
    }
    if (!equity) {
        return {
            label: 'Equity source pending',
            detail: 'This market does not have a configured equity-relative source yet.',
            tone: 'DISCONNECTED',
            opensAlerts: false,
        };
    }
    if (equity.status === 'DISCONNECTED') {
        return {
            label: 'Connect equity CDF',
            detail: 'Register and initialise the producer-equities versus commodity CDF feed in Alerts.',
            tone: 'WAITING',
            opensAlerts: true,
        };
    }

    const eligibleSecurities = (theme.eligible_securities ?? []).filter((security) => security.include_in_sizing);
    if (eligibleSecurities.length === 0 || !outperform) {
        return {
            label: 'No Outperform feed',
            detail: 'There is no eligible security in this market that requires an Outperform connection.',
            tone: 'DISCONNECTED',
            opensAlerts: false,
        };
    }
    const disconnectedOutperformCount = eligibleSecurities.filter(
        (security) => security.stage_states.SECURITY_OUTPERFORM === 'DISCONNECTED'
            || !security.stage_states.SECURITY_OUTPERFORM,
    ).length;
    if (disconnectedOutperformCount > 0 || outperform.status === 'DISCONNECTED') {
        const label = disconnectedOutperformCount > 1
            ? `Connect ${disconnectedOutperformCount} Outperform CDFs`
            : 'Connect Outperform CDF';
        return {
            label,
            detail: disconnectedOutperformCount > 0
                ? `Register and initialise the remaining ${disconnectedOutperformCount} eligible stock versus core-fund Outperform CDF feed${disconnectedOutperformCount === 1 ? '' : 's'} in Alerts.`
                : 'Register and initialise an eligible stock versus core-fund Outperform CDF feed in Alerts.',
            tone: 'WAITING',
            opensAlerts: true,
        };
    }
    return {
        label: 'Connections ready',
        detail: 'Physical, equity-relative, and available Outperform CDF feeds are initialized. Open Alerts to review them.',
        tone: 'CONFIRMED',
        opensAlerts: true,
    };
}

function stageForConfiguration(theme: CommodityTheme | null, key: string): CommodityThemeStage | undefined {
    return theme?.stages.find((stage) => stage.key === key);
}

function marketConfigurationDraftFor(theme: CommodityTheme | null): MarketConfigurationDraft {
    const commodity = stageForConfiguration(theme, 'COMMODITY')?.source;
    const equityRelative = stageForConfiguration(theme, 'EQUITY_RELATIVE')?.source;
    const directExpression = theme?.direct_expression;
    return {
        code: theme?.code || '',
        displayName: theme?.display_name || '',
        marketGroup: theme?.market_group || (theme ? defaultMarketGroupFor(theme.code) : ''),
        strategicFloorAssetClassCode: theme?.strategic_floor.asset_class_code || '',
        tacticalAssetClassCode: theme?.tactical.asset_class_code || '',
        commodityLabel: commodity?.label || '',
        commoditySymbol: commodity?.symbol || '',
        equityLabel: equityRelative?.label || '',
        equityNumerator: equityRelative?.numerator || '',
        equityDenominator: equityRelative?.denominator || '',
        directExpression: {
            available: directExpression?.status === 'APPROVED',
            instrumentLabel: directExpression?.instrument_label || '',
            instrumentTicker: directExpression?.instrument_ticker || '',
            instrumentKind: directExpression?.instrument_kind || 'OTHER',
        },
    };
}

function MarketConfigurationDialog({
    theme,
    assetClasses,
    onClose,
    onSaved,
    onRemoved,
}: {
    theme: CommodityTheme | null;
    assetClasses: AssetClass[];
    onClose: () => void;
    onSaved: (theme: CommodityTheme) => void;
    onRemoved: (code: string) => void;
}) {
    const isNew = theme === null;
    const [draft, setDraft] = useState<MarketConfigurationDraft>(() => marketConfigurationDraftFor(theme));
    const [saving, setSaving] = useState(false);
    const [removalArmed, setRemovalArmed] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const selectableAssetClasses = assetClasses.filter((assetClass) => assetClass.active && assetClass.allow_target_weight);

    const update = (patch: Partial<MarketConfigurationDraft>) => {
        setDraft((current) => ({ ...current, ...patch }));
        setError(null);
        setRemovalArmed(false);
    };

    const updateDirectExpression = (patch: Partial<MarketConfigurationDraft['directExpression']>) => {
        setDraft((current) => ({
            ...current,
            directExpression: { ...current.directExpression, ...patch },
        }));
        setError(null);
        setRemovalArmed(false);
    };

    const configurationPayload = (): CommodityThemeConfigurationPayload => ({
        display_name: draft.displayName.trim(),
        market_group: draft.marketGroup.trim(),
        commodity: {
            label: draft.commodityLabel.trim(),
            symbol: draft.commoditySymbol.trim().toUpperCase(),
        },
        equity_relative: {
            label: draft.equityLabel.trim(),
            numerator: draft.equityNumerator.trim().toUpperCase(),
            denominator: draft.equityDenominator.trim().toUpperCase(),
        },
    });

    const save = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const payload = configurationPayload();
        if (!payload.display_name || !payload.commodity.label || !payload.commodity.symbol ||
            !payload.equity_relative.label || !payload.equity_relative.numerator || !payload.equity_relative.denominator) {
            setError('Name, source labels, and all TradingView symbols are required.');
            return;
        }
        if (isNew && (!draft.code.trim() || !draft.strategicFloorAssetClassCode || !draft.tacticalAssetClassCode)) {
            setError('A market code and the direct and producer asset classes are required.');
            return;
        }
        const directInstrumentLabel = draft.directExpression.instrumentLabel.trim();
        const directInstrumentTicker = draft.directExpression.instrumentTicker.trim();
        if (draft.directExpression.available && !directInstrumentLabel && !directInstrumentTicker) {
            setError('Enter the IG product or market identifier.');
            return;
        }

        setSaving(true);
        setError(null);
        try {
            const configuredTheme = isNew
                ? await api.createCommodityTheme({
                    ...payload,
                    code: draft.code.trim().toUpperCase(),
                    strategic_floor_asset_class_code: draft.strategicFloorAssetClassCode,
                    tactical_asset_class_code: draft.tacticalAssetClassCode,
                })
                : await api.updateCommodityThemeConfiguration(theme.code, payload);
            const nextTheme = await api.updateCommodityThemeDirectExpression(configuredTheme.code, {
                status: draft.directExpression.available ? 'APPROVED' : 'SIGNAL_ONLY',
                instrument_label: directInstrumentLabel || undefined,
                instrument_ticker: directInstrumentTicker || undefined,
                instrument_kind: draft.directExpression.available ? draft.directExpression.instrumentKind : undefined,
            });
            onSaved(nextTheme);
            onClose();
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Could not save market configuration.');
        } finally {
            setSaving(false);
        }
    };

    const remove = async () => {
        if (!theme) return;
        if (!removalArmed) {
            setRemovalArmed(true);
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await api.deleteCommodityTheme(theme.code);
            onRemoved(theme.code);
            onClose();
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Could not remove market.');
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-[20px]" onMouseDown={onClose}>
            <form
                data-testid="market-configuration-dialog"
                onSubmit={save}
                onMouseDown={(event) => event.stopPropagation()}
                className="flex max-h-[calc(100vh-48px)] w-full max-w-[920px] flex-col overflow-hidden rounded-[4px] border border-border/70 bg-[color:var(--panel-bg-alt)] shadow-2xl"
            >
                <header className="flex shrink-0 items-center gap-[12px] border-b border-border/55 px-[24px] py-[18px]">
                    <div className="min-w-0">
                        <h2 className={`text-[15px] font-semibold uppercase tracking-[0.09em] ${marketTextStrong}`}>
                            {isNew ? 'Add market pair' : `Edit ${theme.display_name}`}
                        </h2>
                        <p className={`mt-[5px] text-[11px] leading-[1.45] ${marketTextMuted}`}>
                            Source symbols drive the Markets readout and the matching connection rows in Alerts.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        title="Close market configuration"
                        aria-label="Close market configuration"
                        className={`ml-auto grid h-[32px] w-[32px] shrink-0 place-items-center rounded-[3px] border border-border/55 ${marketTextMuted} transition-colors hover:border-border hover:bg-muted/[0.1] hover:text-[color:var(--analysis-text-strong)]`}
                    >
                        <X className="h-[16px] w-[16px]" />
                    </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto px-[24px] py-[22px]">
                    <div className="grid gap-x-[20px] gap-y-[16px] sm:grid-cols-2">
                        {isNew ? (
                            <label className={marketFormLabel}>
                                Market code
                                <input
                                    value={draft.code}
                                    onChange={(event) => update({ code: event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
                                    placeholder="NATURAL_GAS"
                                    className={`${marketFormInput} font-mono`}
                                />
                            </label>
                        ) : (
                            <div className={marketFormLabel}>
                                Market code
                                <p className={`${marketFormStaticValue} font-mono`}>{draft.code}</p>
                            </div>
                        )}
                        <label className={marketFormLabel}>
                            Market name
                            <input
                                value={draft.displayName}
                                onChange={(event) => update({ displayName: event.target.value })}
                                placeholder="Natural gas producers"
                                className={marketFormInput}
                            />
                        </label>
                        <label className={marketFormLabel}>
                            Market group
                            <input
                                value={draft.marketGroup}
                                onChange={(event) => update({ marketGroup: event.target.value })}
                                placeholder="Energy"
                                className={marketFormInput}
                            />
                        </label>
                        {isNew ? (
                            <label className={marketFormLabel}>
                                Producer asset class
                                <select
                                    value={draft.tacticalAssetClassCode}
                                    onChange={(event) => update({ tacticalAssetClassCode: event.target.value })}
                                    className={`${marketFormSelect} font-mono`}
                                >
                                    <option value="">Choose asset class</option>
                                    {selectableAssetClasses.map((assetClass) => <option key={assetClass.code} value={assetClass.code}>{assetClass.display_name}</option>)}
                                </select>
                            </label>
                        ) : (
                            <div className={marketFormLabel}>
                                Producer asset class
                                <p className={`${marketFormStaticValue} font-mono`}>{draft.tacticalAssetClassCode}</p>
                            </div>
                        )}
                        {isNew ? (
                            <label className={marketFormLabel}>
                                Direct asset class
                                <select
                                    value={draft.strategicFloorAssetClassCode}
                                    onChange={(event) => update({ strategicFloorAssetClassCode: event.target.value })}
                                    className={`${marketFormSelect} font-mono`}
                                >
                                    <option value="">Choose asset class</option>
                                    {selectableAssetClasses.map((assetClass) => <option key={assetClass.code} value={assetClass.code}>{assetClass.display_name}</option>)}
                                </select>
                            </label>
                        ) : (
                            <div className={marketFormLabel}>
                                Direct asset class
                                <p className={`${marketFormStaticValue} font-mono`}>{draft.strategicFloorAssetClassCode}</p>
                            </div>
                        )}
                    </div>

                    <section className="mt-[22px] border-t border-border/45 pt-[18px]">
                        <h3 className={`text-[12px] font-semibold uppercase tracking-[0.1em] ${marketTextStrong}`}>Direct commodity CDF</h3>
                        <div className="mt-[12px] grid gap-[16px] sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                            <label className={marketFormLabel}>
                                Display label
                                <input
                                    value={draft.commodityLabel}
                                    onChange={(event) => update({ commodityLabel: event.target.value })}
                                    placeholder="Natural gas"
                                    className={marketFormInput}
                                />
                            </label>
                            <label className={marketFormLabel}>
                                TradingView symbol
                                <input
                                    value={draft.commoditySymbol}
                                    onChange={(event) => update({ commoditySymbol: event.target.value.toUpperCase() })}
                                    placeholder="NYMEX:NG1!"
                                    className={`${marketFormInput} font-mono`}
                                />
                            </label>
                        </div>
                    </section>

                    <section className="mt-[22px] border-t border-border/45 pt-[18px]">
                        <h3 className={`text-[12px] font-semibold uppercase tracking-[0.1em] ${marketTextStrong}`}>Producer equities / commodity CDF</h3>
                        <div className="mt-[12px] grid gap-[16px] sm:grid-cols-3">
                            <label className={marketFormLabel}>
                                Display label
                                <input
                                    value={draft.equityLabel}
                                    onChange={(event) => update({ equityLabel: event.target.value })}
                                    placeholder="FCG / natural gas"
                                    className={marketFormInput}
                                />
                            </label>
                            <label className={marketFormLabel}>
                                Equity numerator
                                <input
                                    value={draft.equityNumerator}
                                    onChange={(event) => update({ equityNumerator: event.target.value.toUpperCase() })}
                                    placeholder="AMEX:FCG"
                                    className={`${marketFormInput} font-mono`}
                                />
                            </label>
                            <label className={marketFormLabel}>
                                Commodity denominator
                                <input
                                    value={draft.equityDenominator}
                                    onChange={(event) => update({ equityDenominator: event.target.value.toUpperCase() })}
                                    placeholder="NYMEX:NG1!"
                                    className={`${marketFormInput} font-mono`}
                                />
                            </label>
                        </div>
                    </section>

                    <section data-testid="market-direct-expression" className="mt-[22px] border-t border-border/45 pt-[18px]">
                        <h3 className={`text-[12px] font-semibold uppercase tracking-[0.1em] ${marketTextStrong}`}>Direct execution</h3>
                        <p className={`mt-[6px] max-w-[700px] text-[11px] leading-[1.5] ${marketTextMuted}`}>
                            Record the IG-accessible vehicle for the separate direct commodity sleeve. This does not change the chart source or producer-equity path.
                        </p>
                        <label className={`mt-[14px] inline-flex items-center gap-[8px] text-[10px] font-semibold uppercase tracking-[0.1em] ${marketTextStrong}`}>
                            <input
                                type="checkbox"
                                checked={draft.directExpression.available}
                                onChange={(event) => updateDirectExpression({ available: event.target.checked })}
                                className="h-[14px] w-[14px] accent-[var(--signal-buy)]"
                            />
                            Available through IG
                        </label>
                        {draft.directExpression.available ? (
                            <div className="mt-[12px] grid gap-[16px] sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_112px]">
                                <label className={marketFormLabel}>
                                    IG product
                                    <input
                                        value={draft.directExpression.instrumentLabel}
                                        onChange={(event) => updateDirectExpression({ instrumentLabel: event.target.value })}
                                        placeholder="Gold"
                                        className={marketFormInput}
                                    />
                                </label>
                                <label className={marketFormLabel}>
                                    IG market / epic
                                    <input
                                        value={draft.directExpression.instrumentTicker}
                                        onChange={(event) => updateDirectExpression({ instrumentTicker: event.target.value })}
                                        placeholder="CS.D.CFDGOLD.CE"
                                        className={`${marketFormInput} font-mono`}
                                    />
                                </label>
                                <label className={marketFormLabel}>
                                    Type
                                    <select
                                        value={draft.directExpression.instrumentKind}
                                        onChange={(event) => updateDirectExpression({ instrumentKind: event.target.value })}
                                        className={`${marketFormSelect} font-mono`}
                                    >
                                        {directVehicleKinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
                                    </select>
                                </label>
                            </div>
                        ) : (
                            <p className={`mt-[12px] font-mono text-[9px] uppercase tracking-[0.1em] ${marketTextFaint}`}>Signal only</p>
                        )}
                    </section>

                    <p className={`mt-[18px] border-l-2 border-[color:var(--signal-warn)] px-[12px] text-[11px] leading-[1.55] ${marketTextMuted}`}>
                        Replacing a symbol keeps prior events as audit evidence, but it disconnects the new source until its CDF alert and current direction are recorded in Alerts. The stock Outperform column follows the equity numerator automatically.
                    </p>
                    {error ? <p className="mt-[14px] border border-[color:var(--signal-sell)]/45 bg-[color:var(--signal-sell)]/10 px-[12px] py-[9px] text-[11px] text-[color:var(--signal-sell)]">{error}</p> : null}
                </div>

                <footer className="flex shrink-0 items-center gap-[8px] border-t border-border/55 px-[24px] py-[14px]">
                    {!isNew ? (
                        <button
                            type="button"
                            onClick={() => void remove()}
                            disabled={saving}
                            className={`inline-flex h-[34px] items-center gap-[6px] rounded-[3px] border px-[12px] text-[10px] font-semibold uppercase tracking-[0.09em] transition-colors disabled:cursor-wait disabled:opacity-55 ${
                                removalArmed
                                    ? 'border-[color:var(--signal-sell)] bg-[color:var(--signal-sell)]/10 text-[color:var(--signal-sell)]'
                                    : `border-border/55 ${marketTextMuted} hover:border-[color:var(--signal-sell)] hover:text-[color:var(--signal-sell)]`
                            }`}
                        >
                            <Trash2 className="h-[14px] w-[14px]" /> {removalArmed ? 'Confirm remove' : 'Remove market'}
                        </button>
                    ) : null}
                    <button type="button" onClick={onClose} disabled={saving} className={`ml-auto h-[34px] rounded-[3px] border border-border/55 px-[14px] text-[10px] font-semibold uppercase tracking-[0.09em] ${marketTextMuted} transition-colors hover:border-border hover:bg-muted/[0.1] hover:text-[color:var(--analysis-text-strong)] disabled:opacity-55`}>
                        Cancel
                    </button>
                    <button type="submit" disabled={saving} className={`inline-flex h-[34px] items-center gap-[6px] rounded-[3px] border border-[color:var(--analysis-text-strong)]/50 px-[14px] text-[10px] font-semibold uppercase tracking-[0.09em] ${marketTextStrong} transition-colors hover:bg-muted/[0.12] disabled:cursor-wait disabled:opacity-55`}>
                        <Save className="h-[14px] w-[14px]" /> {saving ? 'Saving' : isNew ? 'Add market' : 'Save'}
                    </button>
                </footer>
            </form>
        </div>
    );
}

function ThemeRow({
    theme,
    onOpen,
    onOpenAlerts,
    onEdit,
}: {
    theme: CommodityTheme;
    onOpen: (code: string) => void;
    onOpenAlerts: () => void;
    onEdit: (theme: CommodityTheme) => void;
}) {
    const [evidenceExpanded, setEvidenceExpanded] = useState(false);
    const [editRailOpen, setEditRailOpen] = useState(false);
    const [rowHovered, setRowHovered] = useState(false);
    const stages = [...theme.stages].sort((left, right) => left.order - right.order);
    const commodityStage = stages.find((stage) => stage.key === 'COMMODITY');
    const equityStages = stages.filter((stage) => stage.key !== 'COMMODITY');
    const equityRelativeStage = stages.find((stage) => stage.key === 'EQUITY_RELATIVE');
    const nextStep = nextSetupStepForTheme(theme);
    const nextStepStyle = statusStyle[nextStep.tone] ?? statusStyle.DISCONNECTED;
    return (
        <div
            data-testid={`market-row-${theme.code}`}
            onPointerEnter={() => setRowHovered(true)}
            onPointerLeave={() => setRowHovered(false)}
            className="market-map-row relative grid min-w-[900px] w-full grid-cols-[minmax(170px,1.25fr)_repeat(4,minmax(120px,1fr))_minmax(72px,0.42fr)_minmax(168px,0.8fr)] items-stretch border-b border-border/25"
            style={{
                transition: 'none',
                ...(rowHovered
                    ? { backgroundColor: 'var(--analysis-stock-row-hover-bg)' }
                    : {}),
            }}
        >
            <button
                type="button"
                onClick={() => onOpen(theme.code)}
                data-testid={`market-theme-${theme.code}`}
                className="market-map-open col-span-6 grid min-w-0 grid-cols-[minmax(170px,1.25fr)_repeat(4,minmax(120px,1fr))_minmax(72px,0.42fr)] items-center text-left"
            >
                <span className="flex min-w-0 items-center gap-[11px] px-4 py-3">
                    <span
                        data-market-identity-bar
                        aria-hidden="true"
                        className="h-[26px] w-[4px] shrink-0 rounded-[1px]"
                        style={{ background: assetClassColor(theme.equity_sleeve?.asset_class_code || theme.tactical.asset_class_code || theme.code) }}
                    />
                    <span
                        data-market-identity-content
                        className={`min-w-0 ${editRailOpen ? 'ml-[68px]' : 'ml-0'}`}
                        style={{
                            transition: 'margin-left 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                        }}
                    >
                        <span className={`block truncate text-[14px] font-medium ${marketTextStrong}`}>{theme.display_name}</span>
                        <span data-market-identity-pair className={`mt-1 block truncate font-mono text-[9px] uppercase tracking-[0.1em] ${marketTextFaint}`}>
                            {sourcePairLabel(equityRelativeStage?.source)}
                        </span>
                    </span>
                </span>
                {stages.map((stage) => {
                    const isDirectCommodity = stage.key === 'COMMODITY';
                    const equityIndex = equityStages.findIndex((equityStage) => equityStage.key === stage.key);
                    const previousStage = isDirectCommodity ? undefined : equityStages[equityIndex - 1];
                    const nextStage = isDirectCommodity ? undefined : equityStages[equityIndex + 1];
                    return (
                        <span data-market-stage-cell={stage.key} key={stage.key} className="flex min-w-0 flex-col items-center border-l border-border/25 py-2.5">
                            <span className="market-mobile-stage-title">{stage.key === 'COMMODITY' ? 'Commodity' : stage.key === 'EQUITY_RELATIVE' ? 'Equity' : stage.key === 'SECURITY_TREND' ? 'Company' : 'Outperform'}</span>
                            <span data-market-stage-label={stage.key} className="flex min-h-[15px] w-full items-center justify-center px-3 text-center"><StageReadout stage={stage} theme={theme} blankWhenNoSignal /></span>
                            <StageProgressTrack
                                stage={stage}
                                previousStage={previousStage}
                                nextStage={nextStage}
                            />
                        </span>
                    );
                })}
                <span
                    data-market-commodity-return
                    data-testid={`market-commodity-return-${theme.code}`}
                    title={formatPerformanceAsOf(commodityStage?.performance_as_of)}
                    className={`flex min-w-0 items-center justify-center border-l border-border/25 px-2 py-2.5 font-mono text-[10px] font-medium ${return60DayTone(commodityStage?.return_60d_pct)}`}
                >
                    {format60DayReturn(commodityStage?.return_60d_pct)}
                </span>
            </button>
            <div
                data-market-edit-hover-zone
                className="absolute left-0 top-0 z-10 h-full min-w-[2.35rem] w-[min(20%,4.85rem)]"
                onPointerEnter={() => setEditRailOpen(true)}
                onPointerLeave={() => setEditRailOpen(false)}
            >
                <button
                    type="button"
                    data-testid={`market-edit-${theme.code}`}
                    onClick={(event) => {
                        event.stopPropagation();
                        onEdit(theme);
                    }}
                    onFocus={() => setEditRailOpen(true)}
                    onBlur={() => setEditRailOpen(false)}
                    title={`Edit ${theme.display_name} market configuration`}
                    aria-label={`Edit ${theme.display_name} market configuration`}
                    className={`absolute left-[20px] top-1/2 flex h-[24px] -translate-y-1/2 items-center gap-[6px] overflow-hidden border-0 bg-transparent px-[8px] font-mono text-[9px] font-semibold uppercase tracking-[0.08em] transition-[width,opacity,transform,color] duration-[220ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                        editRailOpen
                            ? 'w-[68px] translate-x-0 opacity-100'
                            : 'pointer-events-none w-0 -translate-x-2 px-0 opacity-0'
                    } ${marketTextMuted} hover:text-[color:var(--analysis-text-strong)] focus:pointer-events-auto focus:w-[68px] focus:translate-x-0 focus:opacity-100`}
                >
                    <Pencil className="h-[14px] w-[14px] shrink-0" />
                    <span className="shrink-0">Edit</span>
                </button>
            </div>
            <div className="market-map-actions flex min-w-0 items-stretch border-l border-border/25">
                <button
                    type="button"
                    data-testid={`market-next-step-${theme.code}`}
                    onClick={nextStep.opensAlerts ? onOpenAlerts : () => onOpen(theme.code)}
                    title={nextStep.detail}
                    aria-label={`${theme.display_name}: ${nextStep.label}. ${nextStep.opensAlerts ? 'Open Alerts' : 'Open market details'}`}
                    className="group flex min-w-0 flex-1 items-center gap-2 px-3 text-left transition-colors duration-100 hover:bg-muted/[0.10]"
                >
                    <span aria-hidden="true" className="h-[17px] w-[2px] shrink-0" style={{ background: marketStatusBarColor(nextStep.tone) }} />
                    <span className={`line-clamp-2 text-[11px] leading-[1.25] ${nextStepStyle.text}`}>{nextStep.label}</span>
                </button>
                <button
                    type="button"
                    data-testid={`market-stock-evidence-toggle-${theme.code}`}
                    data-market-evidence-control
                    onClick={() => setEvidenceExpanded((current) => !current)}
                    aria-controls={`market-stock-evidence-${theme.code}`}
                    aria-expanded={evidenceExpanded}
                    aria-label={`${evidenceExpanded ? 'Hide' : 'Show'} ${theme.display_name} stock evidence`}
                    title={`${evidenceExpanded ? 'Hide' : 'Show'} stock evidence`}
                    className="group grid h-[36px] w-[44px] shrink-0 self-center place-items-center rounded-[4px] border border-border/55 bg-muted/[0.07] text-[color:var(--analysis-ticker-text)] transition-colors duration-100 hover:border-border/80 hover:bg-muted/[0.14] hover:text-[color:var(--analysis-text-strong)]"
                >
                    <ChevronDown
                        data-market-evidence-icon
                        strokeWidth={2.4}
                        className={`h-[24px] w-[24px] transition-transform ${evidenceExpanded ? 'rotate-180' : ''}`}
                    />
                </button>
            </div>
            {evidenceExpanded ? <MarketMapStockEvidence theme={theme} /> : null}
        </div>
    );
}

export function CommodityMarketMap() {
    const { navigateToTab } = useStockTableContext();
    const [themes, setThemes] = useState<CommodityTheme[]>([]);
    const [details, setDetails] = useState<ThemeDetails>({});
    const [selectedCode, setSelectedCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshingPriceHistory, setRefreshingPriceHistory] = useState(false);
    const [priceRefreshError, setPriceRefreshError] = useState<string | null>(null);
    const [assetClasses, setAssetClasses] = useState<AssetClass[]>([]);
    const [configurationTarget, setConfigurationTarget] = useState<CommodityTheme | 'NEW' | null>(null);

    const loadThemes = useCallback(async () => {
        try {
            const response = await api.getCommodityThemes({ includeSecurities: true });
            setThemes(response.themes);
            setError(null);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Market data unavailable');
        } finally {
            setLoading(false);
        }
    }, []);

    const refreshPriceHistory = useCallback(async () => {
        setRefreshingPriceHistory(true);
        setPriceRefreshError(null);
        try {
            const result = await api.refreshCommodityThemePriceHistory();
            if (result.errors.length > 0) {
                setPriceRefreshError(result.errors[0] || 'Some direct price sources could not be refreshed.');
            }
            await loadThemes();
        } catch (requestError) {
            setPriceRefreshError(requestError instanceof Error ? requestError.message : 'Failed to refresh direct prices.');
        } finally {
            setRefreshingPriceHistory(false);
        }
    }, [loadThemes]);

    useEffect(() => {
        return subscribePoll(loadThemes, 30_000);
    }, [loadThemes]);

    useEffect(() => {
        let cancelled = false;
        void api.getAssetClasses()
            .then((response) => {
                if (!cancelled) setAssetClasses(response);
            })
            .catch(() => {
                if (!cancelled) setAssetClasses([]);
            });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        const syncMarketRoute = () => {
            const route = readTerminalRoute();
            setSelectedCode(route?.tab === 'MARKETS' ? route.marketCode ?? null : null);
        };
        syncMarketRoute();
        window.addEventListener('popstate', syncMarketRoute);
        window.addEventListener('hashchange', syncMarketRoute);
        return () => {
            window.removeEventListener('popstate', syncMarketRoute);
            window.removeEventListener('hashchange', syncMarketRoute);
        };
    }, []);

    useEffect(() => {
        if (!selectedCode || details[selectedCode]) return;
        let cancelled = false;
        void api.getCommodityTheme(selectedCode)
            .then((theme) => {
                if (!cancelled) setDetails((current) => ({ ...current, [theme.code]: theme }));
            })
            .catch((requestError) => {
                if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Market detail unavailable');
            });
        return () => { cancelled = true; };
    }, [details, selectedCode]);

    const selectedTheme = selectedCode ? details[selectedCode] : null;
    const groupedThemes = useMemo(() => {
        const groups = new Map<string, { label: string; themes: CommodityTheme[] }>();
        themes.forEach((theme) => {
            const label = theme.market_group?.trim() || defaultMarketGroupFor(theme.code);
            const key = label.toLowerCase();
            const group = groups.get(key) || { label, themes: [] };
            group.themes.push(theme);
            groups.set(key, group);
        });
        const ordered = themeGroups
            .map((group) => groups.get(group.label.toLowerCase()))
            .filter((group): group is { label: string; themes: CommodityTheme[] } => Boolean(group));
        const knownLabels = new Set(ordered.map((group) => group.label.toLowerCase()));
        const remaining = [...groups.values()]
            .filter((group) => !knownLabels.has(group.label.toLowerCase()))
            .sort((left, right) => left.label.localeCompare(right.label));
        return [...ordered, ...remaining];
    }, [themes]);
    if (selectedCode && !selectedTheme) {
        return (
            <div className={`flex h-full items-center justify-center gap-2 text-[11px] ${marketTextMuted}`}>
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Loading market evidence
            </div>
        );
    }
    if (selectedTheme) {
        return (
            <MarketDetail
                theme={selectedTheme}
                onBack={() => {
                    const routeState = currentTerminalRouteState();
                    if (routeState?.tab === 'MARKETS' && routeState.marketCode === selectedTheme.code) {
                        window.history.back();
                        return;
                    }
                    replaceTerminalRoute({ tab: 'MARKETS' });
                    setSelectedCode(null);
                }}
            />
        );
    }
    if (loading) {
        return <div className={`flex h-full items-center justify-center gap-2 text-[11px] ${marketTextMuted}`}><LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Loading market map</div>;
    }
    if (error) {
        return <div className="flex h-full items-center justify-center text-[11px] text-[color:var(--signal-sell)]">Market map unavailable: {error}</div>;
    }

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[color:var(--panel-bg-alt)]">
            <header className="flex shrink-0 items-end justify-between border-b border-border/45 px-5 py-3.5 md:px-7">
                <div>
                    <h1 className={`text-[14px] font-semibold uppercase tracking-[0.075em] ${marketTextStrong}`}>Market Map</h1>
                    <p className={`mt-0.5 text-[10px] ${marketTextMuted}`}>Commodity price, producer basket, company trend, and leadership</p>
                </div>
                <div className="flex items-center gap-[8px]">
                    <DataFreshnessIndicator datasets={['COMMODITY_PRICE_HISTORY']} actions={{ COMMODITY_PRICE_HISTORY: { label: 'Refresh commodity history', run: refreshPriceHistory, disabled: refreshingPriceHistory } }} />
                    <button
                        type="button"
                        data-testid="market-add"
                        onClick={() => setConfigurationTarget('NEW')}
                        aria-label="Add market pair"
                        title="Add market pair"
                        className={`grid h-[36px] w-[36px] place-items-center rounded-[4px] border border-border/45 bg-muted/[0.06] ${marketTextMuted} transition-colors duration-100 hover:border-border/80 hover:bg-muted/[0.14] hover:text-[color:var(--analysis-text-strong)]`}
                    >
                        <Plus className="h-[16px] w-[16px]" strokeWidth={2.3} aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        data-testid="market-price-history-refresh"
                        onClick={() => void refreshPriceHistory()}
                        disabled={refreshingPriceHistory}
                        aria-label="Refresh direct commodity price history"
                        title={priceRefreshError || 'Refresh direct commodity price history'}
                        className={`grid h-[36px] w-[36px] place-items-center rounded-[4px] border border-border/45 bg-muted/[0.06] transition-colors duration-100 hover:border-border/80 hover:bg-muted/[0.14] disabled:cursor-wait disabled:opacity-60 ${
                            priceRefreshError ? 'text-[color:var(--signal-sell)]' : marketTextMuted
                        }`}
                    >
                        <RefreshCw className={`h-[16px] w-[16px] ${refreshingPriceHistory ? 'animate-spin' : ''}`} strokeWidth={2.2} aria-hidden="true" />
                    </button>
                    <p className={`font-mono text-[9px] uppercase tracking-[0.08em] ${marketTextFaint}`}>{themes.length} markets</p>
                </div>
            </header>

            <div className="min-h-0 flex-1 overflow-auto px-5 py-4 md:px-7">
                <div className="market-map-list min-w-[900px]">
                    <div className={`grid grid-cols-[minmax(170px,1.25fr)_repeat(4,minmax(120px,1fr))_minmax(72px,0.42fr)_minmax(168px,0.8fr)] border-y border-border/40 bg-muted/[0.035] text-[9px] font-semibold uppercase tracking-[0.08em] ${marketTextMuted}`}>
                        <span className="px-4 py-2.5">Market</span>
                        <span className="border-l border-border/25 px-3 py-2.5 text-center">Commodity</span>
                        <span className="border-l border-border/25 px-3 py-2.5 text-center">Equity</span>
                        <span className="border-l border-border/25 px-3 py-2.5 text-center">Company</span>
                        <span className="border-l border-border/25 px-3 py-2.5 text-center">Outperform</span>
                        <span className="border-l border-border/25 px-2 py-2.5 text-center">60D</span>
                        <span className="border-l border-border/25 px-3 py-2.5">Next step</span>
                    </div>
                    {groupedThemes.map((group) => (
                        <section key={group.label} className="mt-6 first:mt-0">
                            <h2 className={`flex items-center gap-3 pb-2 text-[13px] font-semibold uppercase tracking-[0.09em] ${marketTextMuted}`}>
                                <span>{group.label}</span>
                                <span aria-hidden="true" className="h-px flex-1 bg-border/40" />
                            </h2>
                            {group.themes.map((theme) => (
                                <ThemeRow
                                    key={theme.code}
                                    theme={theme}
                                    onOpen={(code) => {
                                        pushTerminalRoute({ tab: 'MARKETS', marketCode: code });
                                        setSelectedCode(code);
                                    }}
                                    onOpenAlerts={() => navigateToTab('ALERTS')}
                                    onEdit={(nextTheme) => setConfigurationTarget(nextTheme)}
                                />
                            ))}
                        </section>
                    ))}
                </div>
            </div>
            {configurationTarget ? (
                <MarketConfigurationDialog
                    theme={configurationTarget === 'NEW' ? null : configurationTarget}
                    assetClasses={assetClasses}
                    onClose={() => setConfigurationTarget(null)}
                    onSaved={(updatedTheme) => {
                        setThemes((current) => {
                            const exists = current.some((theme) => theme.code === updatedTheme.code);
                            return exists
                                ? current.map((theme) => theme.code === updatedTheme.code ? updatedTheme : theme)
                                : [...current, updatedTheme];
                        });
                        setDetails((current) => ({ ...current, [updatedTheme.code]: updatedTheme }));
                        window.dispatchEvent(new Event('alpha-edge:commodity-theme-configuration-changed'));
                    }}
                    onRemoved={(code) => {
                        setThemes((current) => current.filter((theme) => theme.code !== code));
                        setDetails((current) => {
                            const next = { ...current };
                            delete next[code];
                            return next;
                        });
                        window.dispatchEvent(new Event('alpha-edge:commodity-theme-configuration-changed'));
                    }}
                />
            ) : null}
        </div>
    );
}
