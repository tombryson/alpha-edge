const test = require('node:test');
const assert = require('node:assert/strict');
const { prepareInvestmentBrief, readInvestmentBrief, PORTFOLIO_BRIEF_KEY } = require('/tmp/alpha-edge-brief-tests/portfolio-investment-brief.js');

test('empty brief is genuinely unspecified, not an inferred balanced-fund mandate', () => {
    assert.deepEqual(prepareInvestmentBrief({}), {});
    assert.deepEqual(readInvestmentBrief({ unrelated: 'retained' }), {});
});

test('explicit mandate survives settings roundtrip with zero liquidity allowed', () => {
    const value = { portfolio_scope: 'thematic_sleeve', investment_objective: ' Scarcity opportunities ',
        base_currency: 'aud', horizon_months: 24, liquidity_min_pct: 0,
        tax_cost_policy: 'Consider unrealised gains', currency_hedge_policy: 'Unhedged' };
    const cleaned = prepareInvestmentBrief(value);
    assert.equal(cleaned.portfolio_scope, 'thematic_sleeve');
    assert.equal(cleaned.base_currency, 'AUD');
    assert.equal(cleaned.liquidity_min_pct, 0);
    assert.deepEqual(readInvestmentBrief({ [PORTFOLIO_BRIEF_KEY]: JSON.stringify(cleaned) }), cleaned);
    assert.equal(value.base_currency, 'aud');
});

test('invalid inputs cannot silently replace the saved brief', () => {
    for (const value of [{ horizon_months: 0 }, { max_drawdown_pct: 101 }, { liquidity_min_pct: -1 },
        { horizon_months: NaN }, { base_currency: 'Australian dollar' }, { portfolio_scope: 'guessed' }]) {
        assert.throws(() => prepareInvestmentBrief(value));
    }
    for (const raw of ['null', '[]', '{bad']) assert.throws(() => readInvestmentBrief({ [PORTFOLIO_BRIEF_KEY]: raw }));
});
