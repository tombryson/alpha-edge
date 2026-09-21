"use client"
import { subscribePoll } from '@/lib/polling'

import { useState, useEffect, useRef } from "react"
import { useStore } from "@/lib/store"
import { apiFetch } from "@/lib/api"
import { applyInstantThemeChange } from "@/lib/theme-transition"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'

const COMMODITY_REGIMES = ['GOLD', 'SILVER', 'COPPER', 'IRON', 'URANIUM', 'ALUMINIUM', 'REE']

interface RegimeStatus {
  status: "NORMAL" | "WARNING" | "CRISIS" | "DISCONNECTED"
  raw_regimes: Record<string, { signal: string; last_updated: string }>
  asset_classes: Record<string, string>
  equity_sizing?: {
    effective_pct: number
    sources: Record<string, { target_equity_pct: number; last_updated: string }>
  }
}

type ThemeId = 'terminal-dark' | 'terminal-light-soft' | 'theme1-dark' | 'theme1-light' | 'amber-dark' | 'amber-light' | 'catppuccin-dark' | 'catppuccin-light' | 'vintage-dark' | 'vintage-light'
type ThemeFamily = 'alpha' | 'theme1' | 'amber' | 'catppuccin' | 'vintage'

const THEME_OPTIONS: Array<{ family: ThemeFamily; label: string }> = [
  { family: 'alpha', label: 'alpha' },
  { family: 'theme1', label: 'theme1' },
  { family: 'amber', label: 'amber minimal' },
  { family: 'catppuccin', label: 'catppuccin' },
  { family: 'vintage', label: 'vintage paper' },
]

const isLightTheme = (theme: ThemeId): boolean =>
  theme === 'terminal-light-soft' || theme === 'theme1-light' || theme === 'amber-light' || theme === 'catppuccin-light' || theme === 'vintage-light'

const isThemeId = (value: string | null): value is ThemeId =>
  value === 'terminal-dark' || value === 'terminal-light-soft' ||
  value === 'theme1-dark' || value === 'theme1-light' ||
  value === 'amber-dark' || value === 'amber-light' ||
  value === 'catppuccin-dark' || value === 'catppuccin-light' ||
  value === 'vintage-dark' || value === 'vintage-light'

const normalizeThemeValue = (value: string | null): ThemeId | null => {
  if (isThemeId(value)) return value
  if (value === 'light') return 'terminal-light-soft'
  if (value === 'dark') return 'terminal-dark'
  return null
}

const getThemeFamily = (theme: ThemeId): ThemeFamily =>
  theme === 'theme1-dark' || theme === 'theme1-light'
    ? 'theme1'
    : (theme === 'amber-dark' || theme === 'amber-light'
      ? 'amber'
      : (theme === 'catppuccin-dark' || theme === 'catppuccin-light'
        ? 'catppuccin'
        : (theme === 'vintage-dark' || theme === 'vintage-light' ? 'vintage' : 'alpha')))

const resolveThemeId = (family: ThemeFamily, lightMode: boolean): ThemeId => {
  if (family === 'vintage') return lightMode ? 'vintage-light' : 'vintage-dark'
  if (family === 'catppuccin') return lightMode ? 'catppuccin-light' : 'catppuccin-dark'
  if (family === 'amber') return lightMode ? 'amber-light' : 'amber-dark'
  if (family === 'theme1') return lightMode ? 'theme1-light' : 'theme1-dark'
  return lightMode ? 'terminal-light-soft' : 'terminal-dark'
}

export function RegimeStatusBar() {
  const [status, setStatus] = useState<RegimeStatus | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [currentTheme, setCurrentTheme] = useState<ThemeId>('terminal-dark')
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  const themeMenuRef = useRef<HTMLDivElement | null>(null)
  const portfolio = useStore(state => state.portfolio)

  const getAppliedTheme = (): ThemeId => {
    if (typeof window === 'undefined') return currentTheme
    const root = document.documentElement
    return (
      normalizeThemeValue(root.getAttribute('data-theme')) ||
      normalizeThemeValue(window.localStorage.getItem('alpha-edge-theme')) ||
      normalizeThemeValue(window.localStorage.getItem('theme')) ||
      currentTheme ||
      'terminal-dark'
    )
  }

  useEffect(() => {
    const initialTheme =
      normalizeThemeValue(document.documentElement.getAttribute('data-theme')) ||
      normalizeThemeValue(window.localStorage.getItem('alpha-edge-theme')) ||
      normalizeThemeValue(window.localStorage.getItem('theme')) ||
      'terminal-dark'
    applyInstantThemeChange(() => {
      const root = document.documentElement
      root.setAttribute('data-theme', initialTheme)
      if (isLightTheme(initialTheme)) {
        root.classList.add('light')
        window.localStorage.setItem('theme', 'light')
      } else {
        root.classList.remove('light')
        window.localStorage.setItem('theme', 'dark')
      }
      window.localStorage.setItem('alpha-edge-theme', initialTheme)
      setCurrentTheme(initialTheme)
    })

    try {
      const saved = window.localStorage.getItem('alpha-edge-regime-bar-ui')
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<{ expanded: boolean }>
        if (typeof parsed.expanded === 'boolean') setExpanded(parsed.expanded)
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem('alpha-edge-regime-bar-ui', JSON.stringify({ expanded }))
    } catch {}
  }, [expanded])

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!themeMenuRef.current) return
      if (!themeMenuRef.current.contains(event.target as Node)) {
        setShowThemeMenu(false)
      }
    }
    document.addEventListener('mousedown', onDocumentClick)
    return () => document.removeEventListener('mousedown', onDocumentClick)
  }, [])

  const applyTheme = (nextTheme: ThemeId) => {
    applyInstantThemeChange(() => {
      const root = document.documentElement
      root.setAttribute('data-theme', nextTheme)
      const isLight = nextTheme === 'terminal-light-soft' || nextTheme === 'theme1-light' || nextTheme === 'amber-light' || nextTheme === 'catppuccin-light' || nextTheme === 'vintage-light'
      if (isLight) {
        root.classList.add('light')
        localStorage.setItem('theme', 'light') // legacy key compatibility
      } else {
        root.classList.remove('light')
        localStorage.setItem('theme', 'dark') // legacy key compatibility
      }
      localStorage.setItem('alpha-edge-theme', nextTheme)
      setCurrentTheme(nextTheme)
      setShowThemeMenu(false)
    })
  }

  const toggleLightDark = () => {
    const appliedTheme = getAppliedTheme()
    const nextTheme: ThemeId = resolveThemeId(getThemeFamily(appliedTheme), !isLightTheme(appliedTheme))
    applyTheme(nextTheme)
  }

  const selectThemeFamily = (family: ThemeFamily) => {
    const nextTheme: ThemeId = resolveThemeId(family, isLightTheme(getAppliedTheme()))
    applyTheme(nextTheme)
  }

  useEffect(() => {
    return subscribePoll(loadStatus, 30000)
  }, [])

  const loadStatus = async () => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/regimes/status`).then(r => r.json())
      setStatus(data)
    } catch {}
  }

  const equityGate    = status?.asset_classes?.['EQUITY']
  const energySignal  = status?.asset_classes?.['ENERGY']
  const effectivePct  = status?.equity_sizing?.effective_pct
  const hasSizing     = effectivePct !== undefined && effectivePct >= 0
  const sources       = status?.equity_sizing?.sources || {}

  const cashPct = portfolio.totalValue > 0
    ? (portfolio.cashOnHand / portfolio.totalValue) * 100
    : null

  const isCrisis  = status?.status === 'CRISIS' || equityGate === 'SELL'
  const isWarning = status?.status === 'WARNING' && !isCrisis

  const dotColor    = !status ? 'bg-orange-500' : isCrisis ? 'bg-[#ef4444]' : isWarning ? 'bg-yellow-500' : 'bg-[#27cb2d]'
  const borderColor = !status ? 'border-orange-500/40' : isCrisis ? 'border-[#ef4444]/40' : isWarning ? 'border-yellow-500/40' : 'border-[#27cb2d]/20'

  const equityStatusLabel = !status ? 'CONNECTING' : equityGate === 'SELL' ? 'SELL' : status.status
  const equityPctDisplay  = equityGate === 'SELL' ? '0%' : hasSizing ? `${effectivePct}%` : '—'

  const equityStatusColor = !status ? 'text-orange-500' : isCrisis ? 'text-[#ef4444]' : isWarning ? 'text-yellow-500' : 'text-[#27cb2d]'
  const energyColor       = energySignal === 'BUY' ? 'text-[#27cb2d]' : energySignal === 'SELL' ? 'text-[#ef4444]' : 'text-zinc-500'
  const signalColor       = (s?: string) => s === 'BUY' ? 'text-[#27cb2d]' : s === 'SELL' ? 'text-[#ef4444]' : 'text-zinc-500'
  const selectedThemeFamily = getThemeFamily(currentTheme)
  const isLightMode = isLightTheme(currentTheme)

  const exposureColor = !hasSizing || equityGate === 'SELL' || effectivePct === 0
    ? 'text-[#ef4444]'
    : effectivePct! < 40 ? 'text-[#f97316]'
    : effectivePct! < 55 ? 'text-[#f59e0b]'
    : effectivePct! < 70 ? 'text-[#eab308]'
    : 'text-[#22c55e]'

  return (
    <div className={`bg-card border-y-2 ${borderColor}`}>

      {/* ── Collapsed bar ── */}
      <div
        className="px-4 py-2.5 cursor-pointer hover:bg-muted/10 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor} ${status && status.status !== 'NORMAL' ? 'animate-pulse' : ''}`} />

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-500 font-mono tracking-widest">EQUITY</span>
              <span className={`text-xs font-bold font-mono ${equityStatusColor}`}>{equityStatusLabel}</span>
            </div>

            <span className="text-zinc-700 text-xs">|</span>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-500 font-mono tracking-widest">EXPOSURE</span>
              <span className={`text-xs font-bold font-mono tabular-nums ${exposureColor}`}>{equityPctDisplay}</span>
            </div>

            <span className="text-zinc-700 text-xs">|</span>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-500 font-mono tracking-widest">ENERGY</span>
              <span className={`text-xs font-bold font-mono ${energyColor}`}>{energySignal || '—'}</span>
            </div>

            <span className="text-zinc-700 text-xs">|</span>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-500 font-mono tracking-widest">CASH</span>
              <span className="text-xs font-bold font-mono tabular-nums text-white">
                {cashPct !== null ? `${cashPct.toFixed(0)}%` : '—'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleLightDark()
              }}
              title={isLightMode ? 'Switch to dark mode' : 'Switch to light mode'}
              className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm leading-none"
            >
              {isLightMode ? '◐' : '◑'}
            </button>
            <div className="relative" ref={themeMenuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowThemeMenu(prev => !prev)
                }}
                title="Select theme"
                className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm leading-none"
              >
                🎨
              </button>
              {showThemeMenu && (
                <div
                  className="absolute right-0 top-6 min-w-[12rem] border border-border bg-card shadow-lg z-20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-2 py-1 text-[10px] text-zinc-500 font-mono tracking-wider border-b border-border">
                    THEME
                  </div>
                  {THEME_OPTIONS.map(option => (
                    <button
                      key={option.family}
                      onClick={() => selectThemeFamily(option.family)}
                      className={`w-full text-left px-2 py-1.5 text-xs font-mono hover:bg-muted/20 ${selectedThemeFamily === option.family ? 'text-white' : 'text-zinc-400'}`}
                    >
                      {selectedThemeFamily === option.family ? '● ' : '○ '}
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="text-zinc-500 text-xs">{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
      </div>

      {/* ── Expanded view ── */}
      {expanded && (
        <div className="px-4 py-3 border-t border-border/40 bg-muted/5 space-y-4">

          {/* Commodity Regimes */}
          <div>
            <div className="text-[10px] text-zinc-600 font-mono tracking-widest mb-2">── COMMODITY REGIMES ──</div>
            <div className="flex flex-wrap gap-x-8 gap-y-1.5 text-xs">
              {COMMODITY_REGIMES.map(cls => {
                const signal = status?.asset_classes?.[cls]
                return (
                  <div key={cls} className="flex items-center gap-2 min-w-[9rem]">
                    <span className="text-zinc-500 font-mono">
                      {cls.charAt(0) + cls.slice(1).toLowerCase()}
                    </span>
                    <span className={`font-bold ${signalColor(signal)}`}>
                      {signal || '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
