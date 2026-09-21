# TradingView Script Reference

Audit date: 5 June 2026.

This document records deployed PineScript inventory and legacy payload wiring.
It is not the business-logic authority for commodity-theme policy. The
commodity scripts and payload examples here may lag the agreed target contract;
for commodity themes, [Commodity Theme Live-Cap Policy v1.0](../decisions/COMMODITY_THEME_LIVE_CAP_POLICY_V1.md)
and [Commodity Theme Presentation And Signal Contract](../system/COMMODITY_THEME_PRESENTATION_AND_SIGNAL_CONTRACT.md)
take precedence.
Six PineScript source copies are now checked into the repository:

```text
DOCS/Pinescripts/
```

The legacy ETF rebalance script is not among those six copies. Repository copies
do not establish which script revision a user currently runs in TradingView.
Do not copy old TradingView snippets into root-level docs. If a PineScript
payload changes, update this document, the backend webhook contract, and the
UAT webhook tests together.

## Script Catalogue

| Script | Source file | Endpoint | Backend `script` |
| --- | --- | --- | --- |
| CDF | `CDF — Capital Deployment Filter.pine` | `/api/webhook/tradingview` | `cdf` |
| TMS | `TMS - Trade Management System.pine` | `/api/webhook/tradingview` | `tms` |
| ETF TMS | `ETF TMS — Trade Management System.pine` | `/api/webhook/tradingview` | `etf_tms` |
| ETF Rebalance (legacy) | `ETF Rebalancing - 12-Month Momentum + 24-Month Vol (15 ETFs).pine` | `/api/webhook/etf-rebalance` | n/a; direct payload |
| CTF | `CTF - Commodity Trend Filter.pine` | `/api/webhook/regime` | `ctf` |
| Q3 Detector | `Q3 Detector - Oil Shock & Stagflation.pine` | `/api/webhook/regime` | `q3d` |
| Q4 Detector | `Q4 Detector - Market Stress.pine` | `/api/webhook/regime` | `q4d` |

TradingView alert setup should use "Any alert() function call". The webhook URL
must be set to the endpoint shown above. Leave the TradingView message field
empty when the JSON is emitted by `alert()`.

The legacy ETF Rebalance script has a distinct 15-instrument JSON payload and
does not set a `script` field. Its exact source behaviour, known discrepancy
with the old 11-ETF contract, and planned replacement are owned by
[ETF System v2.0](../decisions/ETF_SYSTEM_V2.md).

## Ticker Format

The scripts emit:

```text
syminfo.prefix + ":" + syminfo.ticker
```

Example:

```json
{"ticker":"ASX:TLX"}
```

The backend normalises exchange prefixes internally. Portfolio detector tickers
such as `SPX`, legacy `SPY`, and `XAO` may arrive with or without a prefix.

### Commodity Ratio Alert Symbols

Commodity-theme CDF alerts may send TradingView's chart identifiers directly.
The theme webhook canonicalises the following equivalent forms before validating
the configured ratio, while retaining the original payload for audit:

| TradingView chart output | Canonical ledger/configuration identity |
| --- | --- |
| `ASX_DLY:TRE` | `ASX:TRE` |
| `BATS:GDX` | `AMEX:GDX` |
| `BATS:GLD` | `AMEX:GLD` |

This is deliberately a narrow mapping. `BATS:` is accepted as an alternate
TradingView route only for a configured `AMEX:` ETF with the same ticker; it is
not treated as a universal exchange alias. Ratio payloads should use
`syminfo.prefix + ":" + syminfo.ticker` rather than hard-coded display symbols.

### Commodity Connections

**Commodity Connections** in Alerts uses the same `active_alerts` setup ledger
as Stock Connections. Check a box only after creating its matching TradingView
alert, then select the current CDF `BUY` or `SELL` direction. That operation
records an initial baseline and connection together; it does not infer coverage
or direction from a received webhook event.

Current scoped commodity-theme feeds use the CDF payload contract and post to
`/api/webhook/theme-confirmation`:

1. direct commodity chart;
2. producer-equity / commodity ratio;
3. eligible non-ETF security / core-fund Outperform ratio in Stock Connections.

The CTF script remains legacy generic-regime wiring and can still appear as a
separate Portfolio Detectors connection; it does not satisfy any scoped
commodity-theme feed requirement.

## CDF

Source:

```text
DOCS/Pinescripts/CDF — Capital Deployment Filter.pine
```

Payloads:

```json
{"ticker":"ASX:TLX","signal":"buy","script":"cdf","price":14.26,"analystPriceTarget":18.5}
{"ticker":"ASX:TLX","signal":"sell","script":"cdf","price":14.26,"analystPriceTarget":18.5}
{"ticker":"ASX:TLX","signal":"price_target_update","script":"cdf","price":14.26,"analystPriceTarget":18.5}
```

Backend interpretation:

| Signal | Current backend behaviour | Business meaning |
| --- | --- | --- |
| `buy` | Sets or confirms `security_positions.position_state = BUY`. | Position may deploy up to the allowed base allocation, subject to sizing and TMS rules. |
| `sell` | Sets or confirms `security_positions.position_state = SELL`. | State sync only; CDF does not create full sell commands. |
| `price_target_update` | Updates analysis price-target context where matched. | Data refresh, not a trading action. |

CDF BUY/SELL is mostly state sync. It must not be confused with the actionable
TMS `ADD`, `TRIM`, or `SELL_DOWN` / `Sell 20%` workflow.

## TMS

Source:

```text
DOCS/Pinescripts/TMS - Trade Management System.pine
```

Payloads:

```json
{"ticker":"ASX:WWI","signal":"strong_add","timeframe":"3D","script":"tms","price":0.55}
{"ticker":"ASX:WWI","signal":"weak_add","timeframe":"1D","script":"tms","price":0.55}
{"ticker":"ASX:WWI","signal":"strong_trim","timeframe":"2D","script":"tms","price":0.55}
{"ticker":"ASX:WWI","signal":"weak_trim","timeframe":"1D","script":"tms","price":0.55}
{"ticker":"ASX:WWI","signal":"cdf_buy_zone","script":"tms","price":0.55}
{"ticker":"ASX:WWI","signal":"cdf_sell_zone","script":"tms","price":0.55}
{"ticker":"ASX:WWI","signal":"sell","script":"tms","price":0.55,"cdf_state":"BUY"}
{"ticker":"ASX:WWI","signal":"reentry","script":"tms","price":0.55}
```

Normalisation:

| TradingView signal | App alert/action | Metadata to retain |
| --- | --- | --- |
| `strong_add` | `ADD` | `strength = strong`, `timeframe` |
| `weak_add` | `ADD` | `strength = weak`, `timeframe` |
| `strong_trim` | `TRIM` | `strength = strong`, `timeframe` |
| `weak_trim` | `TRIM` | `strength = weak`, `timeframe` |
| `cdf_sell_zone` | `SELL_DOWN` | price |
| `cdf_buy_zone` | state/context | price |
| `sell` with `cdf_state=BUY` | `SELL_50` / `Sell Down 50%` stop path | price, `cdf_state` |
| `sell` with `cdf_state=SELL` | legacy `SELL`, target `EXIT` / `Exit` stop path | price, `cdf_state` |
| legacy `sell` without `cdf_state` | legacy `SELL` / stop path pending context | price |
| `reentry` | re-entry path | price |

Strength and timeframe are independent dimensions. The UI must not collapse
`strong_add` and `weak_add` into indistinguishable "ADD" records where the
detail matters, especially in charting and history.

## ETF TMS

Source:

```text
DOCS/Pinescripts/ETF TMS — Trade Management System.pine
```

Payloads follow the TMS shape, but use `script = "etf_tms"`:

```json
{"ticker":"ASX:SLVR","signal":"buy","script":"etf_tms","price":12.0}
{"ticker":"ASX:SLVR","signal":"sell","script":"etf_tms","price":12.0}
{"ticker":"ASX:SLVR","signal":"strong_add","timeframe":"3D","script":"etf_tms","price":12.0}
{"ticker":"ASX:SLVR","signal":"weak_trim","timeframe":"1D","script":"etf_tms","price":12.0}
```

Backend interpretation:

- `buy` / `sell` controls ETF tactical status.
- add/trim payloads are ETF-specific tactical events.
- ETF TMS blocks ordinary ETF top-ups but does not outrank Q3/Q4 portfolio-risk
  reductions.

## CTF (Legacy Generic-Regime Wiring)

Source:

```text
DOCS/Pinescripts/CTF - Commodity Trend Filter.pine
```

Payload:

```json
{"ticker":"ASX:GLD","signal":"BUY","script":"ctf"}
{"ticker":"ASX:GLD","signal":"SELL","script":"ctf"}
```

This is legacy generic-regime wiring. It is not the Q3 detector and must not be
used as current Q3/Q4 Portfolio Risk state. It also must not be used as the
target commodity-theme contract: commodity v1.0 uses scoped theme-confirmation
events for direct commodity, equity regime, and Outperform evidence.

## Q3 Detector

Source:

```text
DOCS/Pinescripts/Q3 Detector - Oil Shock & Stagflation.pine
```

Endpoint:

```text
POST /api/webhook/regime
```

Payloads:

```json
{"ticker":"SP:SPX","signal":"heartbeat","target_equity_pct":49.0,"script":"q3d"}
{"ticker":"SP:SPX","signal":"update","target_equity_pct":35.0,"script":"q3d"}
```

Rules:

1. Q3 is a percentage payload, not BUY/SELL.
2. `target_equity_pct` is persisted in `equity_sizing`.
3. `SPX` is preferred over legacy `SPY`.
4. `XAO` may also send Q3 detector percentages.
5. The effective Q3 state is the lower available value between the S&P leg and
   `XAO`.
6. Risk-off creates a Portfolio Risk action.
7. Risk-on creates a visible allocation-available action, but no forced trade.

## Q4 Detector

Source:

```text
DOCS/Pinescripts/Q4 Detector - Market Stress.pine
```

Endpoint:

```text
POST /api/webhook/regime
```

Payloads:

```json
{"ticker":"SP:SPX","signal":"heartbeat","current_zone":"BUY","script":"q4d"}
{"ticker":"SP:SPX","signal":"BUY","script":"q4d"}
{"ticker":"SP:SPX","signal":"SELL","script":"q4d"}
```

Rules:

1. Q4 sends BUY/SELL only.
2. Q4 does not send a percentage.
3. Backend maps `SELL` to the hard-coded 10% market exposure target.
4. Backend maps `BUY` to 100% and clears crisis state.
5. Q4 active state is persisted in `q4_crisis_state`.
6. Q4 outranks Q3 in the resolved Portfolio Risk action.
7. Q3 signals remain accepted and stored while Q4 is active.

## Regression Requirements

Every supported PineScript payload should have at least one webhook test.

Required coverage:

- CDF buy/sell/price target update
- TMS add/trim strength and timeframe retention
- TMS `cdf_sell_zone` normalising to `SELL_DOWN` / `Sell 20%`
- ETF TMS BUY/SELL gating
- Q3 `SPX`, legacy `SPY`, and `XAO`
- Q4 SELL activation and BUY clear
- Q3/Q4 sent to `/api/webhook/tradingview` must be rejected
