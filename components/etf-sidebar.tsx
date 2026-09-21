"use client"

import { useStore } from "@/lib/store"

export function ETFSidebar() {
  const etfs = useStore((state) => state.etfs)

  return (
    <div className="panel-border p-4 w-full h-full flex flex-col overflow-hidden">
      <div className="text-base font-bold text-white border-b border-border pb-2 mb-3 flex-shrink-0">ETF MONITOR</div>

      <div className="space-y-2 overflow-y-auto flex-1">
        {Array.isArray(etfs) && etfs.map((etf) => (
          <div key={etf.symbol} className="border border-border/50 bg-card p-3 space-y-2 hover:border-border/80">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="text-sm font-bold text-white font-mono">{etf.name}</div>
                <div className="text-xs mt-1 flex items-center gap-1">
                  <span className={etf.position === "BUY" ? "text-primary" : "text-red-500"}>●</span>
                  <span className="text-muted-foreground">Position: </span>
                  <span className={`font-medium ${etf.position === "BUY" ? "text-primary" : "text-red-500"}`}>
                    {etf.position}
                  </span>
                </div>
              </div>
              <div className="text-sm font-semibold text-white">${etf.price.toFixed(2)}</div>
            </div>

            <div className="text-xs pt-2 border-t border-border/50 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Last Signal</span>
                <span
                  className={`font-mono font-semibold ${etf.lastSignal === "ADD" ? "text-primary" : "text-red-500"}`}
                >
                  {etf.lastSignal || "N/A"}
                </span>
              </div>
              {etf.lastSignalDate && (
                <div className="text-right text-muted-foreground text-[10px]">
                  {Math.floor((Date.now() - new Date(etf.lastSignalDate).getTime()) / (1000 * 60 * 60 * 24))}d ago
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
