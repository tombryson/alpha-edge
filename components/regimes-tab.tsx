"use client"
import { subscribePoll } from '@/lib/polling'

import { useState, useEffect, useRef, type CSSProperties, type ReactNode } from "react"
import { apiFetch } from "@/lib/api"

declare global {
  interface Window {
    TradingView: {
      widget: new (config: Record<string, unknown>) => TradingViewWidgetInstance
    }
  }
}

interface TradingViewWidgetInstance {
  remove: () => void
}

let tvScriptPromise: Promise<void> | null = null
function loadTradingViewScript(): Promise<void> {
  if (tvScriptPromise) return tvScriptPromise
  tvScriptPromise = new Promise((resolve, reject) => {
    if (window.TradingView) { resolve(); return }
    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/tv.js"
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load TradingView script"))
    document.head.appendChild(script)
  })
  return tvScriptPromise
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'

interface RegimeData {
  id: number
  ticker: string
  signal: string
  last_updated: string
  created_at: string
}

interface TickerReturns {
  ticker: string
  label: string
  returns: Record<string, number>
}

interface AssetClassReturns {
  asset_class: string
  tickers: TickerReturns[]
}

interface EquitySizingSource {
  target_equity_pct: number
  last_updated: string
}

interface RegimeStatus {
  status: "NORMAL" | "WARNING" | "CRISIS" | "DISCONNECTED"
  raw_regimes: Record<string, { signal: string; last_updated: string }>
  asset_classes: Record<string, string>
  equity_sizing?: {
    effective_pct: number
    sources: Record<string, EquitySizingSource>
  }
}

// BASEMETALS is skipped — it duplicates COPPER's chart
const SKIP_ASSET_CLASSES = new Set(['BASEMETALS'])

const REGIME_HIERARCHY = [
  { id: 'EQUITY',    label: 'EQUITY',    members: ['EQUITY'] },
  { id: 'ENERGY',    label: 'ENERGY',    members: ['ENERGY'] },
  { id: 'MATERIALS', label: 'MATERIALS', members: ['GOLD', 'SILVER', 'COPPER', 'IRON', 'ALUMINIUM', 'URANIUM', 'REE'] },
]

const regimeTickerMap: Record<string, string> = {
  EQUITY: "SPY",
  GOLD: "GOLD",
  SILVER: "SILVER",
  COPPER: "COPPER",
  ENERGY: "XLE",
  URANIUM: "URANIUM",
  MATERIALS: "XLB",
  FINANCIALS: "XLF",
  HEALTHCARE: "XLV",
  IRON: "IRON",
  ALUMINIUM: "ALUMINIUM",
  PHARMA: "XLV",
  REE: "REMX",
}

// Primary TradingView symbol per asset class
const tvSymbolMap: Record<string, string> = {
  EQUITY:     "AMEX:SPY",
  GOLD:       "TVC:GOLD",
  SILVER:     "TVC:SILVER",
  COPPER:     "IG:COPPER",
  ENERGY:     "AMEX:XLE",
  URANIUM:    "AMEX:URA",
  MATERIALS:  "AMEX:XLB",
  FINANCIALS: "AMEX:XLF",
  HEALTHCARE: "AMEX:XLV",
  IRON:       "IG:IRON",
  ALUMINIUM:  "IG:ALUMINIUM",
  PHARMA:     "AMEX:XLV",
  REE:        "AMEX:REMX",
}

// Extra symbol rows shown below the primary for a given asset class
const extraSymbolRows: Record<string, Array<{ label: string; symbol: string }>> = {
  EQUITY: [{ label: "XAO", symbol: "ASX:XAO" }],
  ENERGY: [{ label: "WTI OIL", symbol: "TVC:USOIL" }],
}

function sanitizeId(s: string) {
  return s.replace(/[^a-zA-Z0-9]/g, "_")
}

function TradingViewChart({
  symbol, id, interval, range,
}: {
  symbol: string; id: string; interval: string; range: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<TradingViewWidgetInstance | null>(null)

  useEffect(() => {
    let cancelled = false

    loadTradingViewScript().then(() => {
      if (cancelled || !containerRef.current) return

      if (widgetRef.current) {
        try { widgetRef.current.remove() } catch {}
        widgetRef.current = null
      }
      containerRef.current.innerHTML = ""

      const widgetDiv = document.createElement("div")
      widgetDiv.id = id
      containerRef.current.appendChild(widgetDiv)

      widgetRef.current = new window.TradingView.widget({
        symbol,
        interval,
        range,
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
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
        backgroundColor: "rgba(0, 0, 0, 0)",
        gridColor: "rgba(255, 255, 255, 0.04)",
        studies: ["MASimple@tv-basicstudies"],
        studies_overrides: { "moving average.length": 200 },
        disabled_features: [
          "header_widget", "left_toolbar", "timeframes_toolbar",
          "header_symbol_search", "header_settings", "header_compare",
          "header_undo_redo", "header_screenshot", "header_fullscreen_button",
          "header_chart_type", "header_indicators", "header_resolutions",
          "control_bar", "border_around_the_chart", "legend_widget",
          "display_market_status", "symbol_info", "property_pages",
          "context_menus", "edit_buttons_in_legend", "go_to_date", "countdown",
          "caption_buttons_text_if_possible", "source_selection_markers",
          "symbol_search_hot_key", "compare_symbol", "volume_force_overlay",
          "popup_hints", "main_series_scale_menu", "scales_date_format",
          "show_object_tree", "create_volume_indicator_by_default",
        ],
        enabled_features: ["hide_left_toolbar_by_default"],
        autosize: true,
        container_id: id,
      })
    }).catch((err) => {
      console.error("[TradingView] Failed to load script:", err)
    })

    return () => {
      cancelled = true
      if (widgetRef.current) {
        try { widgetRef.current.remove() } catch {}
        widgetRef.current = null
      }
    }
  }, [symbol, id, interval, range])

  return <div ref={containerRef} style={{ height: "160px", width: "100%" }} />
}

// Single chart strip: label bar + chart
function ChartStrip({
  label, symbol, idPrefix, accentBorder,
}: {
  label: string; symbol: string; idPrefix: string; accentBorder: string
}) {
  return (
    <div>
      <div className={`flex items-center gap-2 px-3 py-1 border-t ${accentBorder} bg-black/10`}>
        <span className="text-[10px] font-mono font-bold text-muted-foreground/60 tracking-widest uppercase">
          {label}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground/30">{symbol}</span>
      </div>
      <TradingViewChart
        symbol={symbol}
        id={sanitizeId(idPrefix)}
        interval="D"
        range="6M"
      />
    </div>
  )
}

// Discrete steps for the position sizing gauge (spec: 35, 49, 63, 77, 91, 100 + 0 for gate-off)
const SIZING_STEPS = [0, 35, 49, 63, 77, 91, 100]

function pctColor(pct: number): string {
  if (pct < 0) return "text-muted-foreground/40"
  if (pct < 40) return "text-[#ef4444]"
  if (pct < 75) return "text-[#f59e0b]"
  return "text-[#27cb2d]"
}

function pctBarColor(pct: number): string {
  if (pct < 40) return "bg-[#ef4444]"
  if (pct < 75) return "bg-[#f59e0b]"
  return "bg-[#27cb2d]"
}

function EquitySizingPanel({
  sizing,
  gateSignal,
  children,
}: {
  sizing: { effective_pct: number; sources: Record<string, { target_equity_pct: number; last_updated: string }> }
  gateSignal: string
  children?: ReactNode
}) {
  const effectivePct = sizing.effective_pct
  const hasData = effectivePct >= 0
  const gateOpen = gateSignal === "BUY"

  const displayPct = !gateOpen ? 0 : (hasData ? effectivePct : null)

  const spy = sizing.sources["SPY"]
  const xao = sizing.sources["XAO"]

  const spyPct = spy?.target_equity_pct ?? null
  const xaoPct = xao?.target_equity_pct ?? null
  const governing = (spyPct !== null && xaoPct !== null)
    ? (spyPct <= xaoPct ? "SPY" : "XAO")
    : null

  const barWidth = displayPct !== null ? displayPct : 0

  return (
    <div className="flex flex-col h-full px-3 py-2.5 gap-3">
      {/* Scope label */}
      <div className="text-[9px] font-mono tracking-widest text-muted-foreground/30 uppercase">
        All Equities ex-Energy
      </div>

      {/* Big number */}
      <div className="flex items-end gap-1.5">
        <span className={`text-3xl font-bold font-mono tabular-nums leading-none ${displayPct !== null ? pctColor(displayPct) : "text-muted-foreground/25"}`}>
          {displayPct !== null ? `${displayPct}%` : "—"}
        </span>
        {!gateOpen && (
          <span className="text-[9px] font-mono text-[#ef4444]/70 mb-0.5 tracking-wide">GATE CLOSED</span>
        )}
        {gateOpen && !hasData && (
          <span className="text-[9px] font-mono text-muted-foreground/30 mb-0.5">NO DATA</span>
        )}
      </div>

      {/* SPY / XAO breakdown */}
      {(spyPct !== null || xaoPct !== null) && (
        <div className="flex items-center gap-3 text-[10px] font-mono">
          {spyPct !== null && (
            <span>
              <span className="text-muted-foreground/30">SPY </span>
              <span className={governing === "SPY" ? "text-white font-bold" : "text-muted-foreground/50"}>{spyPct}%</span>
            </span>
          )}
          {xaoPct !== null && (
            <span>
              <span className="text-muted-foreground/30">XAO </span>
              <span className={governing === "XAO" ? "text-white font-bold" : "text-muted-foreground/50"}>{xaoPct}%</span>
            </span>
          )}
          {governing && (
            <span className="text-[9px] text-muted-foreground/25">min({governing})</span>
          )}
        </div>
      )}

      {/* Segmented progress bar */}
      <div className="relative h-1.5 bg-white/5 w-full">
        <div
          className={`absolute left-0 top-0 h-full transition-all duration-500 ${displayPct !== null ? pctBarColor(displayPct) : "bg-muted-foreground/20"}`}
          style={{ width: `${barWidth}%` }}
        />
        {SIZING_STEPS.slice(1).map((step) => (
          <div
            key={step}
            className="absolute top-0 h-full w-px bg-black/40"
            style={{ left: `${step}%` }}
          />
        ))}
      </div>

      {/* Step labels */}
      <div className="flex justify-between text-[8px] font-mono text-muted-foreground/25 -mt-1.5">
        {SIZING_STEPS.map((step) => (
          <span
            key={step}
            className={displayPct === step ? "text-white/70 font-bold" : ""}
            style={{ width: step === 0 ? "auto" : undefined }}
          >
            {step}
          </span>
        ))}
      </div>

      {children}
    </div>
  )
}

const RETURN_PERIODS = ['1M', '3M', '1Y', '3Y']

function returnTone(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return {
      tvClass: 'none-mmdAGdPV',
      container: 'border',
      containerStyle: {
        backgroundColor: 'var(--returns-empty-bg)',
        borderColor: 'var(--returns-empty-border)',
      } as CSSProperties,
      valueStyle: { color: 'var(--returns-empty-text)' } as CSSProperties,
    }
  }

  if (value >= 0) {
    const tier = value >= 10 ? 'high' : value >= 5 ? 'medium' : 'low'
    return {
      tvClass: tier === 'high' ? 'positiveHigh-mmdAGdPV'
        : tier === 'medium' ? 'positiveMedium-mmdAGdPV'
        : 'positiveLow-mmdAGdPV',
      container: 'border',
      containerStyle: tier === 'high'
        ? { backgroundColor: 'var(--returns-positive-bg-high)', borderColor: 'var(--returns-positive-border-high)' }
        : tier === 'medium'
          ? { backgroundColor: 'var(--returns-positive-bg-medium)', borderColor: 'var(--returns-positive-border-medium)' }
          : { backgroundColor: 'var(--returns-positive-bg-low)', borderColor: 'var(--returns-positive-border-low)' },
      valueStyle: { color: 'var(--returns-positive-color)' } as CSSProperties,
    }
  }

  const abs = Math.abs(value)
  const tier = abs >= 10 ? 'high' : abs >= 5 ? 'medium' : 'low'
  return {
    tvClass: tier === 'high' ? 'negativeHigh-mmdAGdPV'
      : tier === 'medium' ? 'negativeMedium-mmdAGdPV'
      : 'negativeLow-mmdAGdPV',
    container: 'border',
    containerStyle: tier === 'high'
      ? { backgroundColor: 'var(--returns-negative-bg-high)', borderColor: 'var(--returns-negative-border-high)' }
      : tier === 'medium'
        ? { backgroundColor: 'var(--returns-negative-bg-medium)', borderColor: 'var(--returns-negative-border-medium)' }
        : { backgroundColor: 'var(--returns-negative-bg-low)', borderColor: 'var(--returns-negative-border-low)' },
    valueStyle: { color: 'var(--returns-negative-color)' } as CSSProperties,
  }
}

function formatReturn(value: number | null) {
  if (value === null || !Number.isFinite(value)) return '−'
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
}

function ReturnCards({ tickers, embedded = false }: { tickers: TickerReturns[]; embedded?: boolean }) {
  if (!tickers || tickers.length === 0) return null
  return (
    <div className={embedded ? (tickers.length > 1 ? "space-y-2.5" : "space-y-1.5") : (tickers.length > 1 ? "px-3 py-2 border-t border-border/20 bg-black/10 space-y-2.5" : "px-3 py-2 border-t border-border/20 bg-black/10 space-y-1.5")}>
      {tickers.map((ticker) => (
        <div key={ticker.ticker} className="flex items-center gap-2">
          {tickers.length > 1 && (
            <span
              className="text-[9px] leading-none font-mono font-semibold tracking-normal w-11 min-w-[2.75rem] pr-1 text-right whitespace-nowrap flex-shrink-0"
              style={{ color: 'var(--returns-label-color)' }}
            >
              {ticker.label || ticker.ticker}
            </span>
          )}
          <div className="grid grid-cols-4 gap-1 w-max">
            {RETURN_PERIODS.map((period) => {
              const raw = ticker.returns?.[period]
              const val = Number.isFinite(Number(raw)) ? Number(raw) : null
              const tone = returnTone(val)
              return (
                <div
                  key={`${ticker.ticker}-${period}`}
                  className={`container-mmdAGdPV ${tone.tvClass} min-w-[60px] px-[2px] py-[2px] rounded border ${tone.container}`}
                  style={tone.containerStyle}
                >
                  <div
                    className="percentage-mmdAGdPV text-[8px] leading-none font-semibold font-mono tabular-nums text-center px-[0.2rem] pt-[0.2rem] pb-0"
                    style={tone.valueStyle}
                  >
                    {formatReturn(val)}
                  </div>
                  <div
                    className="period-mmdAGdPV text-[7px] leading-none font-mono text-center tracking-wide px-[3px] py-[2px]"
                    style={{ color: 'var(--returns-period-color)' }}
                  >
                    {period}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export function RegimesTab() {
  const [regimes, setRegimes] = useState<RegimeData[]>([])
  const [status, setStatus] = useState<RegimeStatus | null>(null)
  const [returns, setReturns] = useState<AssetClassReturns[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return subscribePoll(loadData, 30000)
  }, [])

  const loadData = async () => {
    try {
      const [regimesData, statusData] = await Promise.all([
        apiFetch(`${API_BASE_URL}/regimes`).then((r) => r.json()),
        apiFetch(`${API_BASE_URL}/regimes/status`).then((r) => r.json()),
      ])
      setRegimes(Array.isArray(regimesData) ? regimesData : [])
      setStatus(statusData)
      setLoading(false)
    } catch (error) {
      console.error("[REGIME] Failed to load data:", error)
      setLoading(false)
    }
  }

  // Load returns separately — slower, cached 6h on backend
  useEffect(() => {
    apiFetch(`${API_BASE_URL}/regimes/returns`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setReturns(data) })
      .catch(() => {})
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading regime data...</div>
      </div>
    )
  }

  // Build a lookup for each asset class
  const entryMap = new Map<string, {
    assetClass: string; signal: string; ticker?: string;
    equityRaw?: { spy?: { signal: string; last_updated: string }; xao?: { signal: string; last_updated: string } };
    isConnected: boolean; lastUpdated?: string
  }>()

  if (status) {
    Object.entries(status.asset_classes)
      .filter(([key]) => key !== "ETF" && !SKIP_ASSET_CLASSES.has(key))
      .forEach(([assetClass, signal]) => {
        const ticker = regimeTickerMap[assetClass]
        const rawData = ticker ? status.raw_regimes?.[ticker] : undefined
        const equityRaw = assetClass === "EQUITY"
          ? { spy: status.raw_regimes?.["SPY"] || status.raw_regimes?.["SPX"], xao: status.raw_regimes?.["XAO"] }
          : undefined
        const isConnected = assetClass === "EQUITY"
          ? !!(equityRaw?.spy?.signal || equityRaw?.xao?.signal)
          : !!(rawData?.signal)
        let lastUpdated: string | undefined
        if (assetClass === "EQUITY") {
          const times = [equityRaw?.spy?.last_updated, equityRaw?.xao?.last_updated].filter(Boolean) as string[]
          if (times.length > 0) lastUpdated = times.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
        } else {
          lastUpdated = rawData?.last_updated
        }
        entryMap.set(assetClass, { assetClass, signal, ticker, equityRaw, isConnected, lastUpdated })
      })
  }

  void regimes

  const returnsMap = new Map<string, TickerReturns[]>()
  returns.forEach(r => returnsMap.set(r.asset_class, r.tickers))

  const renderRegimeCard = (assetClass: string) => {
    const entry = entryMap.get(assetClass)
    const signal = entry?.signal ?? '—'
    const isBuy  = signal === "BUY"
    const isSell = signal === "SELL"
    const accentBorder = isBuy ? 'border-[#27cb2d]/30' : isSell ? 'border-[#ef4444]/30' : 'border-border/30'
    const accentLeft   = isBuy ? 'border-l-[#27cb2d]'  : isSell ? 'border-l-[#ef4444]'  : 'border-l-border'
    const signalColor  = isBuy ? 'text-[#27cb2d]'       : isSell ? 'text-[#ef4444]'       : 'text-muted-foreground/40'
    const signalBg     = isBuy ? 'bg-[#27cb2d]/8'       : isSell ? 'bg-[#ef4444]/8'       : ''
    const headerBg     = isBuy ? 'bg-[#27cb2d]/5'       : isSell ? 'bg-[#ef4444]/5'       : ''
    const tvSymbol     = tvSymbolMap[assetClass]
    const extras       = extraSymbolRows[assetClass] ?? []
    const returnTickers = returnsMap.get(assetClass) ?? []

    return (
      <div key={assetClass} className={`bg-card border ${accentBorder} border-l-2 ${accentLeft} overflow-hidden`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-3 py-2 ${headerBg}`}>
          <div className="flex items-center gap-2.5">
            <div
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${entry?.isConnected ? 'bg-green-500' : 'bg-muted-foreground/20'}`}
              title={entry?.isConnected ? 'Signal active' : 'No signal'}
            />
            <span className="text-sm font-bold text-white tracking-widest">{assetClass}</span>
            {entry?.ticker && <span className="text-[10px] text-muted-foreground/50 font-mono">{entry.ticker}</span>}
            {/* EQUITY sub-signals */}
            {assetClass === "EQUITY" && entry?.equityRaw && (entry.equityRaw.spy || entry.equityRaw.xao) && (
              <div className="flex items-center gap-3 ml-1">
                {entry.equityRaw.spy && (
                  <span className="text-[10px] font-mono">
                    <span className="text-muted-foreground/40">SPY </span>
                    <span className={`font-bold ${entry.equityRaw.spy.signal === "BUY" ? "text-[#27cb2d]" : "text-[#ef4444]"}`}>{entry.equityRaw.spy.signal}</span>
                  </span>
                )}
                {entry.equityRaw.xao && (
                  <span className="text-[10px] font-mono">
                    <span className="text-muted-foreground/40">XAO </span>
                    <span className={`font-bold ${entry.equityRaw.xao.signal === "BUY" ? "text-[#27cb2d]" : "text-[#ef4444]"}`}>{entry.equityRaw.xao.signal}</span>
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground/25 font-mono">min(SPY,XAO)</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {assetClass === "EQUITY" && status?.equity_sizing && (
              <div className="flex flex-col items-end">
                <span className="text-[9px] text-muted-foreground/40 font-mono tracking-widest">EQ SIZE</span>
                <span className={`text-lg font-bold font-mono tabular-nums leading-none ${signalColor}`}>
                  {isBuy ? `${status.equity_sizing.effective_pct}%` : '0%'}
                </span>
              </div>
            )}
            {entry?.lastUpdated && (
              <span className="text-[10px] text-muted-foreground/40 font-mono tabular-nums">{formatDate(entry.lastUpdated)}</span>
            )}
            <span className={`text-[11px] font-bold px-2 py-0.5 tracking-widest ${signalColor} ${signalBg}`}>
              {isBuy ? '▲ BUY' : isSell ? '▼ SELL' : '— N/A'}
            </span>
          </div>
        </div>

        {/* Charts */}
        {tvSymbol && (
          <div className="flex">
            <div className="w-1/2 border-r border-border/20">
              {assetClass === "EQUITY" && status?.equity_sizing && (
                <EquitySizingPanel
                  sizing={status.equity_sizing}
                  gateSignal={signal}
                >
                  <ReturnCards tickers={returnTickers} embedded />
                </EquitySizingPanel>
              )}
              {assetClass !== "EQUITY" && (
                <div className="flex flex-col h-full px-3 py-2.5 gap-3">
                  <ReturnCards tickers={returnTickers} embedded />
                </div>
              )}
            </div>
            <div className="w-1/2">
              <ChartStrip label={assetClass} symbol={tvSymbol} idPrefix={sanitizeId(assetClass)} accentBorder={accentBorder} />
              {extras.map((extra) => (
                <ChartStrip key={extra.symbol} label={extra.label} symbol={extra.symbol} idPrefix={sanitizeId(`${assetClass}_${extra.label}`)} accentBorder={accentBorder} />
              ))}
            </div>
          </div>
        )}
        {!tvSymbol && (
          <div className="flex flex-col h-full px-3 py-2.5 gap-3">
            <ReturnCards tickers={returnTickers} embedded />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {REGIME_HIERARCHY.map(({ id, label, members }) => (
        <div key={id} className="space-y-1.5">
          {/* Section header */}
          <div className="text-[9px] font-mono tracking-[0.2em] text-muted-foreground/40 uppercase px-0.5 pb-0.5 border-b border-border/20">
            ── {label}
          </div>

          <div className="space-y-1.5">
            {members.map(renderRegimeCard)}
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="panel-border p-4">
        <h3 className="text-[10px] font-bold tracking-widest text-muted-foreground/40 uppercase mb-3 border-b border-border pb-2">
          Legend
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5 text-muted-foreground">
            <div className="font-bold text-white/60 text-[11px] tracking-wide mb-1">Position Sizing</div>
            <div>• All BUY → 100% position</div>
            <div>• Some SELL → 50% position</div>
            <div>• All SELL → 0% (exit)</div>
          </div>
          <div className="space-y-1.5 text-muted-foreground">
            <div className="font-bold text-white/60 text-[11px] tracking-wide mb-1">Computation</div>
            <div>• EQUITY = min(SPY, XAO)</div>
            <div>• BASEMETALS = COPPER (deduplicated)</div>
            <div>• Multi-asset uses combined logic</div>
          </div>
        </div>
      </div>
    </div>
  )
}
