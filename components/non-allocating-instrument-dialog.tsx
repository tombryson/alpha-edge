'use client';

import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { Archive, X } from 'lucide-react';

type NonAllocatingInstrumentDialogProps = {
    open: boolean;
    name: string;
    ticker?: string | null;
    positionValue: number;
    onCancel: () => void;
    onConfirm: () => void;
};

const formatBrokerValue = (value: number) =>
    `$${Math.round(Math.abs(value || 0)).toLocaleString()}`;

export function NonAllocatingInstrumentDialog({
    open,
    name,
    ticker,
    positionValue,
    onCancel,
    onConfirm,
}: NonAllocatingInstrumentDialogProps) {
    return (
        <AlertDialog.Root
            open={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) onCancel();
            }}
        >
            <AlertDialog.Portal>
                <AlertDialog.Overlay className="fixed inset-0 z-[250] bg-black/70" />
                <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[251] w-[430px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[6px] border border-border/80 bg-card shadow-2xl focus:outline-none">
                    <header className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4">
                        <div className="flex min-w-0 items-start gap-3">
                            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border border-caution/35 bg-caution/[0.07] text-caution">
                                <Archive size={14} aria-hidden="true" />
                            </span>
                            <div className="min-w-0">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                    Strategy universe
                                </div>
                                <AlertDialog.Title className="mt-1 text-sm font-semibold text-foreground">
                                    Exclude instrument
                                </AlertDialog.Title>
                            </div>
                        </div>
                        <AlertDialog.Cancel asChild>
                            <button
                                type="button"
                                className="flex h-7 w-7 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
                                aria-label="Cancel exclusion"
                                title="Close"
                            >
                                <X size={15} aria-hidden="true" />
                            </button>
                        </AlertDialog.Cancel>
                    </header>

                    <div className="px-5 py-4">
                        <div className="flex items-start justify-between gap-4 border-b border-border/55 pb-3">
                            <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-foreground">
                                    {name}
                                </div>
                                {ticker && (
                                    <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                                        {ticker}
                                    </div>
                                )}
                            </div>
                            <div className="shrink-0 text-right">
                                <div className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                                    Broker value
                                </div>
                                <div className="mt-1 font-mono text-sm font-semibold text-foreground">
                                    {formatBrokerValue(positionValue)}
                                </div>
                            </div>
                        </div>

                        <AlertDialog.Description className="mt-4 text-xs leading-5 text-muted-foreground">
                            This removes the instrument from allocations, rankings, and strategy views. Its broker position, account value, and statement history remain unchanged.
                        </AlertDialog.Description>
                    </div>

                    <footer className="flex items-center justify-end gap-2 border-t border-border/70 bg-background/25 px-5 py-3">
                        <AlertDialog.Cancel asChild>
                            <button
                                type="button"
                                className="border border-border/70 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/25 hover:text-foreground"
                            >
                                Cancel
                            </button>
                        </AlertDialog.Cancel>
                        <AlertDialog.Action asChild>
                            <button
                                type="button"
                                onClick={onConfirm}
                                className="border border-caution/50 bg-caution/[0.09] px-3 py-1.5 text-[11px] font-semibold text-caution transition-colors hover:bg-caution/[0.15]"
                            >
                                Exclude
                            </button>
                        </AlertDialog.Action>
                    </footer>
                </AlertDialog.Content>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    );
}
