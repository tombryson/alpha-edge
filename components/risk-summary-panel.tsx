"use client"

import { useMemo } from "react"
import { useStore } from "@/lib/store"
import { isNonAllocatingSecurityType } from "@/lib/security-types"

interface RiskSummary {
  risk_on_count: number
  risk_off_count: number
  unassigned_count: number
  risk_on_value: number
  risk_off_value: number
  unassigned_value: number
  total_value: number
  risk_on_percent: number
  risk_off_percent: number
  unassigned_percent: number
}

export function RiskSummaryPanel() {
  const stocks = useStore((state) => state.stocks)

  const summary = useMemo<RiskSummary>(() => {
    let riskOnCount = 0
    let riskOffCount = 0
    let unassignedCount = 0
    let riskOnValue = 0
    let riskOffValue = 0
    let unassignedValue = 0

    stocks.forEach((stock) => {
      if (isNonAllocatingSecurityType(stock.securityType)) return
      const value = (stock.price || 0) * (stock.position || 0)

      if (stock.riskProfile === 'RISK_ON') {
        riskOnCount++
        riskOnValue += value
      } else if (stock.riskProfile === 'RISK_OFF') {
        riskOffCount++
        riskOffValue += value
      } else {
        unassignedCount++
        unassignedValue += value
      }
    })

    const totalValue = riskOnValue + riskOffValue + unassignedValue

    return {
      risk_on_count: riskOnCount,
      risk_off_count: riskOffCount,
      unassigned_count: unassignedCount,
      risk_on_value: riskOnValue,
      risk_off_value: riskOffValue,
      unassigned_value: unassignedValue,
      total_value: totalValue,
      risk_on_percent: totalValue > 0 ? (riskOnValue / totalValue) * 100 : 0,
      risk_off_percent: totalValue > 0 ? (riskOffValue / totalValue) * 100 : 0,
      unassigned_percent: totalValue > 0 ? (unassignedValue / totalValue) * 100 : 0,
    }
  }, [stocks])

  if (!summary) {
    return null
  }

  return (
    <div className="border border-border rounded-lg p-4">
      <div className="mb-4">
        <h3 className="text-sm font-bold tracking-wide text-white">RISK PROFILE</h3>
      </div>

      <div className="space-y-3">
        {/* RISK ON */}
        <div className="bg-card border border-green-500/30 p-3 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-green-400">RISK ON</span>
            <span className="text-[10px] text-muted-foreground">({summary.risk_on_count} holdings)</span>
          </div>
          <div className="text-lg font-bold text-green-400">{summary.risk_on_percent.toFixed(1)}%</div>
          <div className="text-[10px] text-muted-foreground mt-1">
            ${Math.round(summary.risk_on_value).toLocaleString('en-US')}
          </div>
          <div className="text-[9px] text-muted-foreground mt-1 pt-1 border-t border-green-500/20">
            Aggressive • Growth-oriented
          </div>
        </div>

        {/* RISK OFF */}
        <div className="bg-card border border-yellow-500/30 p-3 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-yellow-400">RISK OFF</span>
            <span className="text-[10px] text-muted-foreground">({summary.risk_off_count} holdings)</span>
          </div>
          <div className="text-lg font-bold text-yellow-400">{summary.risk_off_percent.toFixed(1)}%</div>
          <div className="text-[10px] text-muted-foreground mt-1">
            ${Math.round(summary.risk_off_value).toLocaleString('en-US')}
          </div>
          <div className="text-[9px] text-muted-foreground mt-1 pt-1 border-t border-yellow-500/20">
            Defensive • Safe Haven
          </div>
        </div>

        {/* UNASSIGNED */}
        <div className="bg-card border border-border/50 p-3 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-muted-foreground">UNASSIGNED</span>
            <span className="text-[10px] text-muted-foreground">({summary.unassigned_count} holdings)</span>
          </div>
          <div className="text-lg font-bold text-muted-foreground">{summary.unassigned_percent.toFixed(1)}%</div>
          <div className="text-[10px] text-muted-foreground mt-1">
            ${Math.round(summary.unassigned_value).toLocaleString('en-US')}
          </div>
          <div className="text-[9px] text-muted-foreground mt-1 pt-1 border-t border-border/30">
            Not categorized
          </div>
        </div>
      </div>

      {/* Recommendation based on regime status */}
      {summary.risk_on_percent > 70 && (
        <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400">
          ⚠ High risk exposure ({summary.risk_on_percent.toFixed(0)}%). Consider rebalancing toward defensive assets during market uncertainty.
        </div>
      )}

      {summary.risk_off_percent > 50 && (
        <div className="mt-3 p-2 bg-green-500/10 border border-green-500/30 rounded text-xs text-green-400">
          ✓ Defensive positioning ({summary.risk_off_percent.toFixed(0)}%). Portfolio well-protected during volatility.
        </div>
      )}
    </div>
  )
}
