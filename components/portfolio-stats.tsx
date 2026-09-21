"use client"

import { useStore } from "@/lib/store"
import { useEffect, useRef } from "react"
import { isNonAllocatingSecurityType } from "@/lib/security-types"

export function PortfolioStats() {
  // Use individual selectors to ensure reactivity
  const totalValue = useStore((state) => state.portfolio.totalValue)
  const cashOnHand = useStore((state) => state.portfolio.cashOnHand)
  const exposure = useStore((state) => state.portfolio.exposure)
  const profitLoss = useStore((state) => state.portfolio.profitLoss)
  const profitLossPercent = useStore((state) => state.portfolio.profitLossPercent)
  const allStocks = useStore((state) => state.stocks)
  const stocks = allStocks.filter((stock) => !isNonAllocatingSecurityType(stock.securityType))
  
  // Reconstruct portfolio object for logging
  const portfolio = { totalValue, cashOnHand, exposure, profitLoss, profitLossPercent }
  
  const renderCount = useRef(0)
  renderCount.current += 1

  // Debug logging
  useEffect(() => {
    console.log(`[PORTFOLIO-STATS] Render #${renderCount.current}`)
    console.log('[PORTFOLIO-STATS] Portfolio state:', portfolio)
    console.log('[PORTFOLIO-STATS] Stocks count:', stocks.length)
    console.log('[PORTFOLIO-STATS] Raw values:', {
      totalValue,
      cashOnHand,
      exposure,
      profitLoss,
      profitLossPercent,
    })
  }, [totalValue, cashOnHand, exposure, profitLoss, profitLossPercent, stocks.length])

  // Calculate allocated vs unallocated cash
  const allocatedCash = Math.round(Array.isArray(stocks) ? stocks.reduce((sum, stock) => sum + (stock.cashReserve || 0), 0) : 0)
  const unallocatedCash = Math.round(cashOnHand - allocatedCash)
  const roundedTotalValue = Math.round(totalValue)
  const roundedCashOnHand = Math.round(cashOnHand)
  const roundedProfitLoss = Math.round(profitLoss)
  
  console.log('[PORTFOLIO-STATS] Calculated values:', {
    allocatedCash,
    unallocatedCash,
    roundedTotalValue,
    roundedCashOnHand,
    roundedProfitLoss,
  })

  const cashPercentage = roundedTotalValue > 0 ? ((roundedCashOnHand / roundedTotalValue) * 100).toFixed(1) : "0.0"

  // Log what will be rendered
  console.log('[PORTFOLIO-STATS] Rendering with values:', {
    roundedTotalValue,
    roundedCashOnHand,
    roundedProfitLoss,
    cashPercentage,
    unallocatedCash,
    allocatedCash,
  })

  return (
    <div className="html-border bg-card p-3 space-y-2">
      <div className="text-base text-primary font-bold border-b-2 border-primary pb-2 mb-2">[PORTFOLIO]</div>

      <div className="space-y-2 text-sm text-foreground">
        <div className="flex justify-between">
          <span>TOTAL VALUE:</span>
          <span className="text-primary font-bold">${roundedTotalValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
        </div>

        <div className="flex justify-between">
          <span>CASH TOTAL:</span>
          <span className={cashOnHand > 10000 ? "text-primary" : "text-yellow-500"}>
            ${roundedCashOnHand.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ({cashPercentage}%)
          </span>
        </div>

        <div className="flex justify-between pl-4 text-xs">
          <span>Unallocated:</span>
          <span className={unallocatedCash < 0 ? "text-red-400" : "text-green-500"}>
            {unallocatedCash < 0 ? "-" : ""}${Math.abs(unallocatedCash).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            {unallocatedCash < 0 && <span className="text-red-400/60 ml-1">(pending)</span>}
          </span>
        </div>

        <div className="flex justify-between pl-4 text-xs">
          <span>Allocated:</span>
          <span className="text-orange-500">
            ${allocatedCash.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>

        <div className="flex justify-between border-t-2 border-primary pt-2 mt-2">
          <span>P/L:</span>
          <span className={`font-bold ${profitLoss >= 0 ? "text-primary" : "text-red-500"}`}>
            {profitLoss >= 0 ? "+" : ""}${roundedProfitLoss.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} (
            {profitLossPercent > 0 ? "+" : ""}
            {Math.round(profitLossPercent * 100) / 100}%)
          </span>
        </div>
      </div>
    </div>
  )
}
