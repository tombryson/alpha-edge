// Real public security identities; every holding, price, return and signal is simulated.
// Frozen ASX market-cap selection (17 September 2026), excluding hybrid securities:
// https://marketcap.company/stock-exchanges/au-australian-securities-exchange-market-capitalization/
// https://www.vaneck.com.au/investments/equity/mvb-vaneck-australian-banks-etf/
// No production exports, provider requests or database.
import { DEMO_ASSET_CLASS_CATALOGUE } from './demo-asset-classes.generated';
import { calculateAnalysisTargetWeight, calculateBaseRatingTotal } from './analysis-metrics';

const date = '2026-09-17T09:00:00Z';
const classConfig = DEMO_ASSET_CLASS_CATALOGUE.config;
const configByCode = new Map(classConfig.map(config => [config.key, config]));
const classDefinitions = [
    ['BANKS', 'Banks', 26],
    ['DIVERSIFIED_MINERS', 'Diversified Miners', 13],
    ['GOLD_MINERS', 'Gold Miners', 9],
    ['PHARMA_BIOTECH', 'Pharma & Biotech', 6],
    ['CONSUMER_DISCRETIONARY', 'Consumer Discretionary', 5],
    ['ENERGY_PRODUCERS', 'Energy Producers', 6],
    ['TELECOMMUNICATIONS', 'Telecommunications', 3],
    ['REAL_ESTATE_REIT', 'Real Estate / REIT', 3],
    ['IRON_ORE_MINERS', 'Iron Ore Miners', 3],
    ['CONSUMER_STAPLES', 'Consumer Staples', 5],
    ['INFRASTRUCTURE', 'Infrastructure', 2],
    ['GAMING_GAMBLING', 'Gaming & Gambling', 2.5],
    ['INSURANCE', 'Insurance', 2],
    ['HEALTHCARE_SERVICES', 'Healthcare Services', 1.5],
    ['FORESTRY_PAPER_PACKAGING', 'Forestry, Paper & Packaging', 1.5],
    ['TRANSPORT_LOGISTICS', 'Transport & Logistics', 1.5],
] as const;
type AssetClass = typeof classDefinitions[number][0];
type Security = { ticker: string; name: string; assetClass: AssetClass; quantity: number; price: number; returnPct: number; isETF: boolean };
// Quantities, prices and returns below are fixture inputs, not market quotes.
const definitions: Security[] = ([
    ['BHP', 'BHP Group Limited', 'DIVERSIFIED_MINERS', 180, 45, 14],
    ['CBA', 'Commonwealth Bank of Australia', 'BANKS', 60, 120, 18],
    ['NEM', 'Newmont Corporation', 'GOLD_MINERS', 50, 90, 24],
    ['WBC', 'Westpac Banking Corporation', 'BANKS', 150, 30, 8],
    ['NAB', 'National Australia Bank Limited', 'BANKS', 150, 30, 10],
    ['ANZ', 'ANZ Group Holdings Limited', 'BANKS', 120, 30, -3],
    ['MQG', 'Macquarie Group Limited', 'BANKS', 20, 180, 12],
    ['CSL', 'CSL Limited', 'PHARMA_BIOTECH', 30, 150, -12],
    ['WES', 'Wesfarmers Limited', 'CONSUMER_DISCRETIONARY', 90, 50, 9],
    ['WDS', 'Woodside Energy Group Limited', 'ENERGY_PRODUCERS', 150, 24, -8],
    ['RIO', 'Rio Tinto Limited', 'DIVERSIFIED_MINERS', 50, 90, 11],
    ['TLS', 'Telstra Group Limited', 'TELECOMMUNICATIONS', 900, 3.5, 4],
    ['GMG', 'Goodman Group', 'REAL_ESTATE_REIT', 100, 27, 6],
    ['FMG', 'Fortescue Ltd', 'IRON_ORE_MINERS', 150, 18, -15],
    ['WOW', 'Woolworths Group Limited', 'CONSUMER_STAPLES', 100, 31.5, -4],
    ['TCL', 'Transurban Group', 'INFRASTRUCTURE', 150, 12, 3],
    ['ALL', 'Aristocrat Leisure Limited', 'GAMING_GAMBLING', 60, 45, 20],
    ['QBE', 'QBE Insurance Group Limited', 'INSURANCE', 100, 18, 16],
    ['COL', 'Coles Group Limited', 'CONSUMER_STAPLES', 100, 22.5, 7],
    ['NST', 'Northern Star Resources Limited', 'GOLD_MINERS', 150, 18, 28],
    ['SIG', 'Sigma Healthcare Limited', 'HEALTHCARE_SERVICES', 1000, 1.8, -6],
    ['STO', 'Santos Limited', 'ENERGY_PRODUCERS', 300, 6, -5],
    ['AMC', 'Amcor plc', 'FORESTRY_PAPER_PACKAGING', 50, 27, 2],
    ['EVN', 'Evolution Mining Limited', 'GOLD_MINERS', 200, 9, 22],
    ['BXB', 'Brambles Limited', 'TRANSPORT_LOGISTICS', 100, 18, 13],
    ['MVB', 'VanEck Australian Banks ETF', 'BANKS', 150, 36, 7],
] satisfies [string, string, AssetClass, number, number, number][]).map(([ticker, name, assetClass, quantity, price, returnPct]) => ({ ticker, name, assetClass, quantity, price, returnPct, isETF: ticker === 'MVB' }));
const valueOf = (security: Security) => security.quantity * security.price;
const weight = (code: string, name: string, pct: number, order: number) => ({ asset_class: code, display_name: name, weight_pct: pct, value: pct * 1000, display_order: order, governed_by_q1: configByCode.get(code)?.overlay_eligible ?? false, invested_weight_pct: code === 'CASH' ? 0 : pct, invested_value: code === 'CASH' ? 0 : pct * 1000, sleeve_cash_weight_pct: 0, sleeve_cash_value: 0 });
const approved = [...classDefinitions.map(([code, name, pct], i) => weight(code, name, pct, i)), weight('CASH', 'Cash / reserve', 10, classDefinitions.length)];
const current = approved.map(row => weight(row.asset_class, row.display_name, row.asset_class === 'CASH' ? 10 : definitions.filter(d => d.assetClass === row.asset_class).reduce((sum, d) => sum + valueOf(d), 0) / 1000, row.display_order));
const holdings = definitions.map((d, i) => ({ id: i + 1, statement_id: 1, ticker: d.ticker, exchange_prefix: 'ASX:', details: d.name, name: d.name, quantity: d.quantity, current_price: d.price, cost_aud: valueOf(d) / (1 + d.returnPct / 100), value_aud: valueOf(d), gain_loss_aud: valueOf(d) - valueOf(d) / (1 + d.returnPct / 100), gain_loss_pct: d.returnPct, market_value: valueOf(d), cash_reserve: 0, currency: 'AUD', created_at: date }));
const profitLoss = holdings.reduce((sum, holding) => sum + holding.gain_loss_aud, 0);
const analysis = definitions.map((d, i) => ({ id: i + 1, ticker: `ASX:${d.ticker}`, name: d.name, security_type: d.isETF ? 'ETF' : 'STOCK', primary_asset_class: d.assetClass, allocation: 100 / definitions.filter(peer => peer.assetClass === d.assetClass && peer.isETF === d.isETF).length, current_price: d.price, include_in_sizing: !d.isETF, gemini_quality: 65 + (i % 6) * 4, gemini_value: 76 - (i % 6) * 3, gemini_pt: d.price * 1.4, gpt_quality: 68 + (i % 6) * 3, gpt_value: 72 - (i % 6) * 2, gpt_pt: d.price * 1.3, performance_6m_pct: d.returnPct, performance_as_of: date, last_contributed_at: date, thesis: 'Simulated research for a real listed security. Prices, returns, scores and assessments are illustrative, not live research or investment advice.', is_watchlist: false }));
const classes = DEMO_ASSET_CLASS_CATALOGUE.assetClasses.map(assetClass => {
    const target = approved.find(row => row.asset_class === assetClass.code)?.weight_pct ?? 0;
    return { ...assetClass, in_mandate: target > 0, mandate_weight_pct: target };
});
const approvals = [1, 2, 3].map((version, index) => ({ id: `shape:${version}`, kind: 'shape', status: version === 3 ? 'APPROVED' : 'SUPERSEDED', snapshot_id: version, occurred_at: ['2025-10-15T09:00:00Z', '2026-02-15T09:00:00Z', '2026-06-15T09:00:00Z'][index], title: `Approved v${version}`, source: 'Synthetic example', memo_job_id: `demo-memo-${version}`, rows: approved.map(row => weight(row.asset_class, row.display_name, row.asset_class === 'GOLD_MINERS' ? [13, 11, 9][index] : row.asset_class === 'BANKS' ? [22, 24, 26][index] : row.weight_pct, row.display_order)) }));
const memos = approvals.map(entry => ({
    id: entry.snapshot_id, memo_job_id: entry.memo_job_id, job_id: entry.memo_job_id, run_id: entry.memo_job_id,
    mode: 'DEMO', status: 'SUCCEEDED', model: 'Synthetic example', primary_theme: 'Illustrative rotation', secondary_theme: '', overall_conviction: '',
    analysis_date: entry.occurred_at, created_at: entry.occurred_at, updated_at: entry.occurred_at, completed_at: entry.occurred_at,
    asset_class_targets: entry.rows.map(row => ({ asset_class: row.asset_class, display_name: row.display_name, target_pct: row.weight_pct })),
    executive_summary: `Synthetic scenario ${entry.snapshot_id}: a staged change from gold miners into banks, with reserve held at 10%.`,
    analyst_memo_markdown: '# Demonstration research\n\nThis is invented evidence for an illustrative portfolio of real listed securities. It is not live research or investment advice.',
    chairman_memo_markdown: `# Example conclusion\n\nScenario ${entry.snapshot_id} allocates ${entry.rows.find(row => row.asset_class === 'GOLD_MINERS')?.weight_pct}% to gold miners and ${entry.rows.find(row => row.asset_class === 'BANKS')?.weight_pct}% to banks.`,
    proposed_allocations: entry.rows, target_allocations: entry.rows,
}));

const bankETF = definitions.find(d => d.isETF)!;
const bankBudget = approved.find(row => row.asset_class === 'BANKS')!.value;
const etfTarget = bankBudget * 0.25;
const etfActual = valueOf(bankETF);
const etfDelta = etfTarget - etfActual;

function payload(path: string, sizingIDs?: Set<number>): unknown {
    // Opt-in local preview scenario; never change the public demo's default evidence.
    const research = process.env.NODE_ENV !== 'production' && process.env.DEMO_INCOMPLETE_RESEARCH === '1'
        ? analysis.map(row => row.ticker === 'ASX:WBC' ? { ...row, gemini_pt: 0, gpt_pt: 0 } : row)
        : analysis;
    if (path === '/weight-policy') {
        const sizing = payload('/sizing/allocations') as { results: Array<{ id: number; asset_class: string; base_rating: number; allocation_dollar: number }> };
        const missingByClass = new Map<string, number>();
        for (const row of sizing.results) {
            if (row.base_rating <= 0 || !(research.find(stock => stock.id === row.id)!.current_price > 0)) {
                missingByClass.set(row.asset_class, (missingByClass.get(row.asset_class) || 0) + 1);
            }
        }
        return { enabled: false, epoch: 0, version: 'ideal-weight-v1', read_only: true, targets: research.map(a => {
            const held = holdings.find(h => h.id === a.id)!.value_aud;
            const researchMissing = a.security_type === 'ETF' ? 0 : missingByClass.get(a.primary_asset_class) || 0;
            const ideal = researchMissing ? 0 : a.security_type === 'ETF' ? etfTarget : sizing.results.find(row => row.id === a.id)!.allocation_dollar;
            const budget = approved.find(row => row.asset_class === a.primary_asset_class)!.value;
            return { id: a.id, ticker: a.ticker, asset_class: a.primary_asset_class, role: a.security_type === 'ETF' ? 'CORE_ETF' : 'STOCK',
                held, ideal, percent: ideal / budget * 100, coverage: ideal > 0 ? held / ideal : 0, available: !researchMissing, fresh: true, research_missing: researchMissing,
                reason: researchMissing ? `Incomplete class research (${researchMissing}). Review Analysis data issues.` : undefined,
                observed_date: date.slice(0,10), statement_id: 1, portfolio_value: 100000, reduction: 0, remaining: researchMissing ? 0 : held };
        }) };
    }
    if (path === '/portfolio') return { total_value: 100000, cash_on_hand: 10000, exposure: 90, profit_loss: profitLoss, profit_loss_percent: profitLoss / (100000 - profitLoss) * 100 };
    if (path === '/statements/latest') return { statement: { id: 1, statement_date: date, total_value_aud: 100000, cash_aud: 10000 }, holdings };
    if (path === '/statements') return [{ id: 1, statement_date: date, total_value_aud: 100000, cash_aud: 10000 }];
    if (path === '/analysis') return research;
    if (path === '/announcement-subscriptions') return { items: definitions.map((d, i) => ({
        kind: 'holding', id: i + 1, security_id: i + 1, name: d.name, ticker: d.ticker,
        exchange_prefix: 'ASX:', provider: '', configured: false, needs_recheck: false,
    })) };
    if (path === '/groups') return { groups: classDefinitions.map(([code, name], i) => ({ id: code, name, asset_class_code: code, order: i, collapsed: false, parent_id: null })), assignments: definitions.map(d => ({ company_name: d.name, group_id: d.assetClass })) };
    if (path === '/asset-classes') return classes;
    if (path === '/asset-class-config') return classConfig;
    if (path === '/portfolio-mix/current') return { as_of: date, total_value: 100000, rows: current };
    if (path === '/portfolio-mix/approved') return { snapshot: { id: 3, status: 'APPROVED', approved_at: approvals[2].occurred_at }, rows: approved, approval_policy: { minimum_months: 4, can_approve: false, next_allowed_at: '2026-10-15T09:00:00Z' } };
    if (path === '/portfolio-history') return { entries: [...approvals].reverse() };
    if (path === '/council/portfolio-memos') return { memos, unavailable: [] };
    if (path === '/portfolio-memos/latest') return { memo: memos[2] };
    if (path.startsWith('/portfolio-memos/')) return { memo: memos.find(m => m.memo_job_id === path.split('/').pop()) ?? null };
    if (path === '/positions') return definitions.map(d => ({ ticker: `ASX:${d.ticker}`, position_state: d.returnPct < -10 ? 'SELL' : 'BUY' }));
    if (path === '/alerts') return [{ id: 1, ticker: 'ASX:CSL', alert_type: 'SELL', strength: 'Strong', script: 'cdf', created_at: date, exchange_prefix: 'ASX:', name: 'CSL Limited', asset_class: 'PHARMA_BIOTECH' }];
    if (path === '/alerts/active') return definitions.flatMap((d, i) => (d.isETF ? ['etf_tms'] : ['cdf', 'tms', 'outperform']).map((script, j) => ({ id: i * 3 + j + 1, ticker: `ASX:${d.ticker}`, script })));
    if (path === '/portfolio-overlay-summary') return { total_portfolio_value: 100000, portfolio_value: 100000, total_cash: 10000, portfolio_risk: { mode: 'NORMAL' }, asset_classes: approved.map((row, i) => ({ asset_class: row.asset_class, display_name: row.display_name, target_weight_pct: row.weight_pct, strategic_weight_pct: row.weight_pct, actual_invested_value: current[i].invested_value, actual_invested_pct: current[i].invested_weight_pct, allowed_invested_value: row.invested_value, allowed_invested_pct: row.invested_weight_pct })) };
    if (path === '/sizing/allocations') {
        const inputs = research.filter(a => a.security_type === 'STOCK' && (!sizingIDs || sizingIDs.has(a.id))).map(a => {
            const stock = { geminiQuality: a.gemini_quality, geminiValue: a.gemini_value, geminiPT: a.gemini_pt,
                gptQuality: a.gpt_quality, gptValue: a.gpt_value, gptPT: a.gpt_pt, price: a.current_price, performance6MPct: a.performance_6m_pct };
            return { ...a, weight: calculateAnalysisTargetWeight(stock), baseRating: calculateBaseRatingTotal(stock) };
        });
        return { results: inputs.map(a => {
        const budget = approved.find(row => row.asset_class === a.primary_asset_class)!.value;
        const stockBudget = budget - (a.primary_asset_class === 'BANKS' ? etfTarget : 0);
        const totalWeight = inputs.filter(peer => peer.primary_asset_class === a.primary_asset_class).reduce((sum, peer) => sum + peer.weight, 0);
        const pct = totalWeight > 0 ? a.weight / totalWeight * 100 : 0;
        return { id: a.id, ticker: a.ticker, asset_class: a.primary_asset_class, base_rating: a.baseRating,
            eligible_for_target_weight: a.baseRating > 0, raw_weight: a.weight, effective_weight: a.weight,
            allocation_pct: pct, allocation_dollar: stockBudget * pct / 100 };
        }), class_budgets_applied: true, advisory_only: true, router_scores_applied: false, class_budget_source: 'APPROVED_CLASS_MINUS_ETF_TARGET_OR_HELD', total_portfolio_value: 100000 };
    }
    if (path === '/etf/allocation-ledger') return {
        as_of: date,
        policy: { default_core_ratio_pct: 25, momentum_influence_pct: 50, suggested_exposure_pct: 25 },
        classes: classDefinitions.map(([code, name, pct]) => ({ asset_class: code, asset_class_name: name,
            class_target_value: pct * 1000, core_ticker: code === 'BANKS' ? `ASX:${bankETF.ticker}` : '',
            core_selection_source: code === 'BANKS' ? 'EXPLICIT' : 'NONE', core_ratio_pct: code === 'BANKS' ? 25 : 0,
            momentum_influence_pct: 50, core_base_value: code === 'BANKS' ? etfTarget : 0, momentum_adjustment_value: 0,
            recommended_target_value: code === 'BANKS' ? etfTarget : 0, effective_target_value: code === 'BANKS' ? etfTarget : 0,
            effective_target_ratio_pct: code === 'BANKS' ? 25 : 0, actual_etf_value: code === 'BANKS' ? etfActual : 0,
            target_delta_value: code === 'BANKS' ? etfDelta : 0, stock_capacity_value: pct * 1000 - (code === 'BANKS' ? Math.max(etfTarget, etfActual) : 0) })),
        rows: [{ ticker: `ASX:${bankETF.ticker}`, display_name: bankETF.name, asset_class: 'BANKS', asset_class_name: 'Banks', management_mode: 'etf_tms', is_core: true, core_selection_source: 'EXPLICIT', core_ratio_pct: 25, momentum_influence_pct: 50, class_target_value: bankBudget, actual_value: etfActual, core_actual_value: etfActual, core_target_value: etfTarget, recommended_target_value: etfTarget, effective_target_value: etfTarget, final_target_value: etfTarget, momentum_adjustment_value: 0, target_delta_value: etfDelta, book_target_pct: etfTarget / 1000, target_weight_pct: etfTarget / 1000, tactical_target_value: 0, tactical_actual_value: 0, excess_value: Math.max(0, -etfDelta), remaining_value: Math.max(0, etfDelta), momentum_weight_pct: 100, tactical_status: 'BUY', status: 'CORE' }],
        candidates: [],
        summary: { portfolio_value: 100000, actual_etf_value: etfActual, actual_exposure_pct: etfActual / 1000, has_approved_shape: true, effective_target_value: etfTarget, core_target_value: etfTarget, recommended_target_value: etfTarget, final_target_value: etfTarget, tactical_target_value: 0, momentum_adjustment_value: 0, suggested_exposure_pct: 25, suggested_etf_value: 25000, minimum_etf_value: 25000, remaining_to_suggestion_value: 25000 - etfActual, remaining_to_minimum_value: 25000 - etfActual, remaining_to_target_value: etfDelta },
    };
    if (path === '/etf/momentum') return { latest_run: { id: 1, data_fresh_through: date, rows: [{ ticker: `ASX:${bankETF.ticker}`, display_name: bankETF.name, return_80_pct: 6, score: 1.2, rank: 1, price_date: date }] }, automation: {} };
    if (path === '/settings' || path === '/announcement-router/signals' || path === '/council/announcement-router/signals') return {};
    if (path === '/data-freshness') return { entries: [], sources: [], as_of: date };
    if (path === '/commodity-themes') return { themes: [] };
    if (path === '/rebalance/status') return { active: false, targets: [] };
    if (path.includes('/adjustments/')) return { plan: null };
    if (path === '/source-research/templates') return { configured: false, templates: [], processor: 'demo', estimated_cost_usd: 0 };
    return [];
}

export async function demoResponse(path: string, request: Request): Promise<Response> {
    const headers = { 'Cache-Control': 'no-store', 'X-Alpha-Edge-Demo': 'synthetic-read-only' };
    if (!['GET', 'HEAD'].includes(request.method) && !(path === '/sizing/allocations' && request.method === 'POST')) {
        return Response.json({ error: 'This demonstration is read-only. No changes or paid jobs are submitted.', code: 'DEMO_READ_ONLY' }, { status: 403, headers });
    }
    if (path.startsWith('/auth/') || path.startsWith('/webhook') || path.startsWith('/migrate/')) return new Response(null, { status: 403, headers });
    if (path === '/alerts/stream') return new Response('data: {"type":"connected"}\n\n', { headers: { ...headers, 'Content-Type': 'text/event-stream' } });
    if (path === '/portfolio-mix/cycle-performance') {
        const raw = new URL(request.url).searchParams.get('snapshot_id');
        const id = raw === null ? 3 : Number(raw);
        if (!Number.isSafeInteger(id) || id <= 0) return Response.json({ error: 'snapshot_id must be a positive approval ID' }, { status: 400, headers });
        const index = approvals.findIndex(entry => entry.snapshot_id === id);
        if (index < 0) return Response.json({ error: 'Approved shape not found' }, { status: 404, headers });
        const start = approvals[index].occurred_at;
        const end = approvals[index + 1]?.occurred_at ?? date;
        const previousDay = (value: string) => new Date(Date.parse(value) - 86400000).toISOString().slice(0, 10);
        // Illustrative opening baskets and adjusted-price returns, never real account evidence.
        const securities = definitions.map(d => ({ ticker: d.ticker, exchange: 'ASX:', name: d.name, asset_class: d.assetClass,
            opening_value_aud: valueOf(d) / (1 + d.returnPct / 100), return_pct: d.returnPct * [0.5, 0.75, 1][index],
            start_price_date: previousDay(start), end_price_date: previousDay(end) }));
        const classes = approved.map(row => {
            const members = securities.filter(d => d.asset_class === row.asset_class);
            const capital = members.reduce((sum, d) => sum + d.opening_value_aud, 0);
            return { asset_class: row.asset_class, securities: members.length, covered: members.length, coverage_pct: capital ? 100 : 0,
                return_pct: capital ? members.reduce((sum, d) => sum + d.opening_value_aud * d.return_pct, 0) / capital : null,
                reason: capital ? undefined : 'Cash interest is not included in price returns.' };
        });
        return Response.json({ cycle: { snapshot_id: id, started_at: start, ended_at: end, closed: index < 2 },
            baseline_at: previousDay(start), method: 'opening_basket_adjusted_price_return', synthetic: true, classes, securities,
            covered: securities.length, best_performer: [...securities].sort((a, b) => b.return_pct - a.return_pct)[0] }, { headers });
    }
    if (path === '/sizing/allocations' && request.method === 'POST') {
        try {
            const body = await request.json();
            if (!Array.isArray(body.stocks)) return Response.json({ error: 'Stocks are required.' }, { status: 400, headers });
            // Only fixture identities are accepted; no private or submitted data is retained.
            return Response.json(payload(path, new Set(body.stocks.map((stock: { id: number }) => stock.id))), { headers });
        } catch { return Response.json({ error: 'Invalid sizing request.' }, { status: 400, headers }); }
    }
    return Response.json(payload(path), { headers });
}
