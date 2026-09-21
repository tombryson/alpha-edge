const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdirSync, readFileSync } = require('node:fs');
const { chromium, expect } = require('@playwright/test');
const ts = require('typescript');
const metrics = {};
new Function('exports', ts.transpileModule(readFileSync('lib/analysis-metrics.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(metrics);
const base = process.env.MODEL_WEIGHT_BASE_URL || 'http://127.0.0.1:3312';
const column = page => page.locator('.positions-grid th[data-column-key="modelWeight"]');
const weight = (page, name) => page.locator('.positions-stock-row').filter({ hasText: name }).locator('td[data-column-key="modelWeight"]');

async function setup(t, { incomplete = false, colourStates = false } = {}) {
    assert.ok(new URL(base).hostname === '127.0.0.1' || new URL(base).hostname === 'localhost', 'Local isolated demo only');
    const browser = await chromium.launch();
    t.after(() => browser.close());
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await require('./fixtures/browser-access.cjs').mockBrowserAccess(page);
    const errors = [], writes = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
        if (request.url().includes('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method()) && !request.url().endsWith('/sizing/allocations')) writes.push(request.url());
    });
    await page.addInitScript(() => {
        if (sessionStorage.getItem('model-weight-test')) return;
        sessionStorage.setItem('model-weight-test', '1');
        localStorage.setItem('terminal-position-column-order-v2', JSON.stringify(['name', 'plPercent', 'classPercent', 'portfolioPercent', 'mktValue']));
        localStorage.setItem('terminal-positions-visibility', JSON.stringify({ showStockStats: true, showGroupStats: true, showQ1Stats: true, positionStatsPeekEnabled: false }));
    });
    if (colourStates) {
        await page.route('**/api/terminal/weight-policy', async route => {
            const response = await route.fetch(); const policy = await response.json();
            const classHeld = new Map();
            for (const row of policy.targets) classHeld.set(row.asset_class, (classHeld.get(row.asset_class) || 0) + row.held);
            for (const row of policy.targets) {
                const coverage = { 'ASX:CBA': 1.5, 'ASX:WBC': 0.75, 'ASX:NAB': 1.1, 'ASX:ANZ': 2, 'ASX:MQG': 2, 'ASX:MVB': 1.25 }[row.ticker];
                if (coverage == null) continue;
                const classBudget = row.ideal / row.percent * 100;
                row.percent = row.held / classHeld.get(row.asset_class) * 100 / coverage;
                row.ideal = row.percent / 100 * classBudget;
                row.coverage = row.held / row.ideal;
                if (row.ticker === 'ASX:ANZ') row.fresh = false;
                if (row.ticker === 'ASX:MQG') row.research_missing = 1;
            }
            await route.fulfill({ response, json: { ...policy, enabled: false } });
        });
    }
    if (incomplete) {
        await page.route('**/api/terminal/weight-policy', async route => {
            const response = await route.fetch(); const policy = await response.json();
            policy.targets = policy.targets.filter(row => row.ticker !== 'ASX:MQG');
            // Include an older backend response that still marks researched peers available.
            for (const row of policy.targets) if (row.asset_class === 'BANKS' && row.role === 'STOCK') row.research_missing = 1;
            for (const row of policy.targets) if (row.ticker === 'ASX:WBC') { row.available = false; row.reason = 'Research incomplete'; }
            await route.fulfill({ response, json: policy });
        });
        await page.route('**/api/terminal/analysis', async route => {
            const response = await route.fetch(); const rows = await response.json();
            for (const row of rows) {
                if (row.ticker === 'ASX:CBA') row.include_in_sizing = false;
                if (row.ticker === 'ASX:WBC') { row.gemini_pt = 0; row.gpt_pt = 0; }
                if (row.ticker === 'ASX:MQG') row.is_watchlist = true;
            }
            await route.fulfill({ response, json: rows });
        });
        await page.route('**/api/terminal/statements/latest', async route => {
            const response = await route.fetch(); const book = await response.json();
            book.holdings = book.holdings.filter(row => row.ticker !== 'MQG');
            await route.fulfill({ response, json: book });
        });
    }
    await page.route('**/api/terminal/sizing/allocations', async route => {
        const request = route.request().postDataJSON(); requests.push(request);
        if (!incomplete) return route.continue();
        const inputs = request.stocks.map(row => {
            const stock = { geminiQuality: row.gemini_quality, geminiValue: row.gemini_value, geminiPT: row.gemini_pt,
                gptQuality: row.gpt_quality, gptValue: row.gpt_value, gptPT: row.gpt_pt, price: row.current_price, performance6MPct: row.performance_6m_pct };
            return { ...row, weight: metrics.calculateAnalysisTargetWeight(stock), eligible: metrics.hasAnalysisSizingEvidence(stock) };
        });
        const results = inputs.map(row => {
            const total = inputs.filter(peer => peer.asset_class === row.asset_class).reduce((sum, peer) => sum + peer.weight, 0);
            const pct = total ? row.weight / total * 100 : 0;
            const classBudget = request.class_budgets?.find(budget => budget.asset_class === row.asset_class)?.class_budget || 0;
            return { id: row.id, asset_class: row.asset_class, eligible_for_target_weight: row.eligible, allocation_pct: pct,
                allocation_dollar: pct / 100 * (classBudget - (row.asset_class === 'BANKS' ? 6500 : 0)) };
        });
        await route.fulfill({ json: { results, class_budgets_applied: true, router_scores_applied: false } });
    });
    await page.goto(`${base}/#/positions`);
    await expect(column(page)).toBeVisible({ timeout: 30000 });
    await expect(weight(page, 'Commonwealth Bank')).toHaveText(incomplete ? '-' : /\d+\.\d%/, { timeout: 30000 });
    t.after(() => { assert.deepEqual(errors, []); assert.deepEqual(writes, []); });
    return { page, requests };
}

test('Ideal wt fill matches displayed weights, including 100% single holdings, without changing geometry', { timeout: 90000 }, async t => {
    const { page } = await setup(t, { colourStates: true });
    const fill = name => weight(page, name).locator('.position-model-weight-bar > span');
    for (const [name, tone] of [['Commonwealth Bank', 'overstretch'], ['VanEck Australian Banks ETF', 'overstretch'],
        ['Westpac', 'under'], ['National Australia', 'neutral'], ['ANZ Group', 'neutral'],
        ['Fortescue', 'aligned'], ['Amcor', 'aligned'], ['Wesfarmers', 'aligned']]) {
        await expect(weight(page, name).locator('.position-model-weight')).toHaveAttribute('data-weight-tone', tone);
    }
    await expect(weight(page, 'Macquarie')).toHaveText('-');
    await expect(weight(page, 'Westpac').locator('.position-model-weight')).toHaveAttribute('title', /Class % is below Ideal wt/);
    await expect(weight(page, 'Fortescue')).toHaveText('100.0%');
    await expect(weight(page, 'Fortescue').locator('.position-model-weight')).toHaveAttribute('title', /Class % matches Ideal wt/);
    const rgb = async name => fill(name).evaluate(node => {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d'); ctx.fillStyle = getComputedStyle(node).backgroundColor;
        ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
    });
    const darkUnder = await rgb('Westpac'), darkNeutral = await rgb('National Australia'), darkOver = await rgb('Commonwealth Bank');
    assert.ok(darkUnder.every((channel, index) => channel > darkNeutral[index]), 'Underweight fill should be lighter in dark mode');
    assert.ok(darkOver[0] > darkOver[1] * 1.5 && darkOver[0] > darkOver[2] * 1.5, 'Overstretch should be red');
    const darkAligned = await rgb('Fortescue');
    assert.ok(darkAligned[1] > darkAligned[0] * 1.5 && darkAligned[1] > darkAligned[2] * 1.5, '100% / 100% should be green');
    const geometry = async () => weight(page, 'Westpac').evaluate(cell => {
        const fill = cell.querySelector('.position-model-weight-bar > span').getBoundingClientRect();
        return { fillHeight: fill.height, fillWidth: fill.width, rowHeight: cell.parentElement.getBoundingClientRect().height };
    });
    const before = await geometry();
    assert.equal(before.fillHeight, 3);
    assert.ok(Math.abs(before.rowHeight - 29) < 0.5);
    mkdirSync('/tmp/alpha-edge-model-weight', { recursive: true });
    await page.screenshot({ path: '/tmp/alpha-edge-model-weight/colour-dark.png' });
    await page.getByTitle('Switch to light mode', { exact: true }).click();
    await expect.poll(() => rgb('Westpac')).not.toEqual(darkUnder);
    const lightUnder = await rgb('Westpac'), lightNeutral = await rgb('National Australia'), lightOver = await rgb('Commonwealth Bank');
    assert.ok(lightUnder.every((channel, index) => channel < lightNeutral[index]), 'Underweight fill should stay visible in light mode');
    assert.ok(lightOver[0] > lightOver[1] * 1.5 && lightOver[0] > lightOver[2] * 1.5);
    const lightAligned = await rgb('Fortescue');
    assert.ok(lightAligned[1] > lightAligned[0] * 1.5 && lightAligned[1] > lightAligned[2] * 1.5);
    assert.deepEqual(await geometry(), before);
    await page.screenshot({ path: '/tmp/alpha-edge-model-weight/colour-light.png' });
});

test('Ideal wt sits beside Class %, respects ETF capacity, and supports resizing, sorting and saved visibility', { timeout: 90000 }, async t => {
    const { page } = await setup(t);
    const order = await page.locator('.positions-grid th[data-column-key]').evaluateAll(nodes => nodes.map(node => node.dataset.columnKey));
    assert.equal(order[order.indexOf('classPercent') + 1], 'modelWeight');
    await expect(weight(page, 'VanEck Australian Banks ETF')).toHaveText('25.0%');
    const etfWeight = weight(page, 'VanEck Australian Banks ETF');
    await expect(etfWeight.locator('.position-model-weight')).toHaveAttribute('title', /^\$6,500 - /);
    const barGeometry = await etfWeight.evaluate(cell => {
        const track = cell.querySelector('.position-model-weight-bar').getBoundingClientRect();
        const fill = cell.querySelector('.position-model-weight-bar > span').getBoundingClientRect();
        const number = cell.querySelector('.position-model-weight-number');
        return { trackHeight: track.height, fillRatio: fill.width / track.width,
            numberFits: number.scrollWidth <= number.clientWidth, rowHeight: cell.parentElement.getBoundingClientRect().height };
    });
    assert.equal(barGeometry.trackHeight, 3);
    assert.ok(Math.abs(barGeometry.fillRatio - 0.25) < 0.01);
    assert.ok(barGeometry.numberFits);
    assert.ok(Math.abs(barGeometry.rowHeight - 29) < 0.5, `Existing 29px row height changed: ${barGeometry.rowHeight}`);
    const bankNames = ['Commonwealth Bank', 'Westpac', 'National Australia', 'ANZ Group', 'Macquarie'];
    const sum = (await Promise.all(bankNames.map(async name => parseFloat(await weight(page, name).innerText())))).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 75) < 0.3, `Banks stock budget is 75%, got ${sum}`);
    await column(page).click();
    await expect(column(page)).toContainText('↓');
    const before = (await column(page).boundingBox()).width;
    const resize = column(page).getByRole('separator');
    await resize.focus(); await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await column(page).boundingBox()).width).toBeGreaterThan(before);
    await page.getByTitle('Choose visible columns', { exact: true }).click();
    await page.getByRole('checkbox', { name: 'Ideal wt', exact: true }).uncheck();
    await expect(column(page)).toHaveCount(0);
    await page.reload(); await expect(page.locator('.positions-grid')).toBeVisible();
    await expect(column(page)).toHaveCount(0);
    await page.getByTitle('Choose visible columns', { exact: true }).click();
    await page.getByRole('checkbox', { name: 'Ideal wt', exact: true }).check();
    await page.getByTitle('Choose visible columns', { exact: true }).click();
    await expect(weight(page, 'VanEck Australian Banks ETF')).toHaveText('25.0%');
    mkdirSync('/tmp/alpha-edge-model-weight', { recursive: true });
    await page.screenshot({ path: '/tmp/alpha-edge-model-weight/desktop.png' });
    const darkBar = await etfWeight.locator('.position-model-weight-bar').evaluate(node => getComputedStyle(node).backgroundColor);
    await page.getByTitle('Switch to light mode', { exact: true }).click();
    await expect.poll(() => etfWeight.locator('.position-model-weight-bar').evaluate(node => getComputedStyle(node).backgroundColor)).not.toBe(darkBar);
    await page.screenshot({ path: '/tmp/alpha-edge-model-weight/light.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    await column(page).scrollIntoViewIfNeeded();
    const alignment = await column(page).evaluate(header => {
        const index = [...header.parentElement.children].indexOf(header);
        const table = header.closest('table');
        const cell = table.querySelector('tr.positions-stock-row').children[index];
        return { header: header.getBoundingClientRect().width, cell: cell.getBoundingClientRect().width,
            cellCount: cell.parentElement.children.length, headerCount: header.parentElement.children.length };
    });
    assert.equal(alignment.cellCount, alignment.headerCount);
    assert.ok(Math.abs(alignment.header - alignment.cell) < 1);
    await page.screenshot({ path: '/tmp/alpha-edge-model-weight/mobile.png' });
});

test('incomplete held class shows dashes with a reason, leaves Core and other classes intact, and links to research review', { timeout: 90000 }, async t => {
    const { page, requests } = await setup(t, { incomplete: true });
    await expect(weight(page, 'Westpac')).toHaveText('-');
    await expect(weight(page, 'Westpac').locator('.position-model-weight-bar')).toHaveCount(0);
    await expect(weight(page, 'Commonwealth Bank')).toHaveText('-');
    await expect(weight(page, 'Commonwealth Bank').locator('[title]')).toHaveAttribute('title', /Incomplete class research/);
    await expect(weight(page, 'Commonwealth Bank').locator('.position-model-weight-bar')).toHaveCount(0);
    await expect(weight(page, 'VanEck Australian Banks ETF')).toHaveText('25.0%');
    await expect(weight(page, 'Fortescue')).toHaveText('100.0%');
    await expect.poll(() => requests.some(request => !request.stocks.some(row => row.ticker === 'ASX:CBA') && request.stocks.some(row => row.ticker === 'ASX:MQG'))).toBe(true);
    await page.goto(`${base}/#/analysis`);
    await page.getByRole('button', { name: /Open data issues/ }).click();
    await expect(page.getByRole('heading', { name: 'Incomplete sizing research' })).toBeVisible();
    await page.getByRole('button', { name: 'Review research', exact: true }).click();
    await expect(page.locator('.analysis-company-name')).toHaveCount(1);
    await expect(page.locator('.analysis-company-name')).toContainText('Westpac');
    await page.getByRole('button', { name: /Open data issues/ }).click();
    await page.getByRole('button', { name: 'Show all securities', exact: true }).click();
    await expect.poll(() => page.locator('.analysis-company-name').count()).toBeGreaterThan(20);
});
