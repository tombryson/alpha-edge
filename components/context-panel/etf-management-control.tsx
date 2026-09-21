'use client';

import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ChevronDown } from 'lucide-react';
import { api, type ETFManagementMode } from '@/lib/api';
import { managementTicker, useETFManagement } from '@/lib/etf-management-store';
import { useStore } from '@/lib/store';
import { requestTerminalTab } from '@/lib/terminal-route';
import { usePanelData } from './panel-data';
import styles from './panel.module.css';
import controlStyles from './etf-management.module.css';

export function ETFManagementControl({ ticker }: { ticker: string }) {
    const { modes, ready, error: loadError, accept } = useETFManagement();
    const current = modes[managementTicker(ticker)] || 'etf_tms';
    const { refresh } = usePanelData();
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<ETFManagementMode>(current);
    const [direction, setDirection] = useState<'BUY' | 'SELL' | ''>('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);
    const save = async () => {
        if (!direction || !ready || saving || current === mode) return;
        setSaving(true); setError('');
        try {
            accept(await api.updateETFManagement(ticker, { mode, previous_mode: current, initial_state: direction }));
            await Promise.all([useStore.getState().fetchActiveAlerts(), useStore.getState().fetchAlerts(), refresh()]);
            setSaved(true);
        } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to change management'); }
        finally { setSaving(false); }
    };
    return <Popover.Root open={open} onOpenChange={next => {
        if (saving) return;
        if (next) { setMode(current); setDirection(''); setError(''); setSaved(false); }
        setOpen(next);
    }}>
        <Popover.Trigger asChild><button type="button" className={styles.coreTrigger} aria-label={`Management mode for ${ticker}`} title={ready ? 'Fund management mode' : loadError || 'Loading management mode'}>{ready ? current === 'tms' ? 'TMS' : 'ETF' : '...'}<ChevronDown aria-hidden="true" /></button></Popover.Trigger>
        <Popover.Portal><Popover.Content className={`${styles.editor} ${controlStyles.editor}`} sideOffset={6} collisionPadding={12} align="start" aria-label={`Management for ${ticker}`} onClick={event => event.stopPropagation()}>
            <fieldset disabled={saving || !ready || saved}>
                <legend>Management</legend>
                <div className={controlStyles.options}>{(['etf_tms', 'tms'] as const).map(value => <label key={value}><input type="radio" name={`mode-${ticker}`} checked={mode === value} onChange={() => { setMode(value); setDirection(''); }} />{value === 'tms' ? 'TMS' : 'ETF'}</label>)}</div>
            </fieldset>
            {mode !== current && <fieldset disabled={saving || !ready}>
                <legend>Current direction</legend>
                <div className={controlStyles.options}>{(['BUY', 'SELL'] as const).map(value => <label key={value}><input type="radio" name={`direction-${ticker}`} checked={direction === value} onChange={() => setDirection(value)} />{value === 'BUY' ? 'Buy' : 'Sell'}</label>)}</div>
                <p>Reconnect in Alerts after switching. Unexecuted old-script actions will be retired; recorded trades remain in history.</p>
            </fieldset>}
            {(error || loadError) && <p role="alert" className={styles.error}>{error || loadError}</p>}
            {saved ? <><p role="status">Mode saved. Confirm the new connections in Alerts.</p><button type="button" className={styles.command} onClick={() => { setOpen(false); requestTerminalTab('ALERTS'); }}>Open Alerts</button></> : <button type="button" className={styles.command} disabled={saving || !ready || !direction || mode === current} onClick={() => void save()}>{saving ? 'Saving...' : 'Save mode'}</button>}
        </Popover.Content></Popover.Portal>
    </Popover.Root>;
}
