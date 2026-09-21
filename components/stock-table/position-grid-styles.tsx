export function PositionGridStyles() {
    return (
        <style>{`
            .review-dock-label {
                font-size: 10px;
                letter-spacing: 0.12em;
                text-transform: uppercase;
                color: var(--muted-foreground);
            }
            .review-dock-left strong {
                font-weight: 600;
                color: var(--foreground);
            }
            .review-dock {
                position: fixed;
                right: var(--review-dock-right-inset, 0px);
                bottom: 0;
                left: var(--review-dock-left-inset, 0px);
                z-index: 80;
                display: grid;
                grid-template-columns: minmax(0, max-content) minmax(48px, 1fr) max-content;
                gap: 12px;
                align-items: center;
                border-top: 1px solid color-mix(in oklab, var(--border) 78%, transparent);
                background: color-mix(in oklab, var(--card) 94%, transparent);
                padding: 6px 18px;
                box-shadow: 0 -14px 34px color-mix(in oklab, var(--background) 72%, transparent);
                backdrop-filter: blur(14px);
            }
            .review-dock-main {
                min-width: 0;
            }
            .review-dock-left {
                display: flex;
                min-width: 0;
                align-items: center;
                gap: 14px;
                overflow: hidden;
            }
            .review-dock-left > span {
                white-space: nowrap;
                color: color-mix(in oklab, var(--muted-foreground) 88%, transparent);
                font-size: 11px;
            }
            .review-dock-label-strong {
                font-weight: 600;
                color: var(--foreground);
            }
            .review-dock-left > .review-dock-error {
                color: var(--destructive);
            }
            .review-dock-progress {
                position: relative;
                min-width: 0;
                height: 3px;
                overflow: hidden;
                border-right: 1px solid color-mix(in oklab, var(--sky-400, #38bdf8) 45%, transparent);
                border-left: 1px solid color-mix(in oklab, var(--sky-400, #38bdf8) 45%, transparent);
                background: color-mix(in oklab, var(--sky-400, #38bdf8) 10%, var(--muted));
            }
            .review-dock-progress::before,
            .review-dock-progress::after {
                content: "";
                position: absolute;
                top: -2px;
                bottom: -2px;
                width: 1px;
                background: color-mix(in oklab, var(--sky-400, #38bdf8) 62%, transparent);
            }
            .review-dock-progress::before {
                left: 0;
            }
            .review-dock-progress::after {
                right: 0;
            }
            .review-dock-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #38bdf8, #7dd3fc);
                transition: width 0.35s ease;
            }
            .review-dock-progress-ready .review-dock-progress-fill {
                background: linear-gradient(90deg, #10b981, #86efac);
            }
            .review-dock-progress-over .review-dock-progress-fill {
                background: linear-gradient(90deg, #ef4444, #fca5a5);
            }
            .review-dock-actions {
                display: flex;
                min-width: 0;
                gap: 8px;
            }
            .review-dock-button {
                border: 1px solid color-mix(in oklab, var(--border) 80%, var(--foreground) 12%);
                border-radius: 2px;
                background: color-mix(in oklab, var(--card) 88%, #000);
                color: var(--foreground);
                padding: 7px 12px;
                font-size: 11px;
                font-weight: 600;
                letter-spacing: 0.08em;
                text-transform: uppercase;
            }
            .review-dock-button:hover:not(:disabled) {
                border-color: color-mix(in oklab, var(--muted-foreground) 78%, transparent);
                background: color-mix(in oklab, var(--muted) 35%, var(--card));
            }
            .review-dock-button:disabled {
                cursor: not-allowed;
                opacity: 0.45;
            }
            .review-dock-button-primary {
                border-color: color-mix(in oklab, var(--sky-400, #38bdf8) 62%, transparent);
                background: color-mix(in oklab, var(--sky-400, #38bdf8) 14%, var(--card));
                color: #bae6fd;
            }
            .review-dock-button-primary:hover:not(:disabled) {
                background: color-mix(in oklab, var(--sky-400, #38bdf8) 22%, var(--card));
            }
            .review-dock-button-ghost {
                border-color: transparent;
                background: transparent;
                color: var(--muted-foreground);
            }
            .review-dock-button-danger:hover:not(:disabled) {
                border-color: color-mix(in oklab, var(--destructive) 55%, transparent);
                color: #fca5a5;
            }
            @media (max-width: 1100px) {
                .review-dock {
                    grid-template-columns: 1fr;
                }
                .review-dock-left {
                    flex-wrap: wrap;
                    gap: 8px 14px;
                }
            }
            .positions-review-grid thead,
            .positions-review-grid thead tr,
            .positions-review-grid thead th,
            .positions-grid:not(.positions-review-grid) thead,
            .positions-grid:not(.positions-review-grid) thead tr,
            .positions-grid:not(.positions-review-grid) thead th {
                background: color-mix(in oklab, var(--card) 94%, var(--background));
            }
            .positions-grid:not(.positions-review-grid) thead th {
                height: 32px;
                padding: 0 4px;
                vertical-align: middle;
                text-align: center;
                font-size: 10px;
                font-weight: 500;
                line-height: 1;
                letter-spacing: 0.025em;
                color: color-mix(in oklab, var(--foreground) 88%, var(--muted-foreground));
                border-color: color-mix(in oklab, var(--border) 70%, transparent);
                white-space: nowrap;
                overflow: hidden;
            }
            .positions-grid:not(.positions-review-grid) thead th > *:not(.fixed),
            .positions-grid:not(.positions-review-grid) thead th > *:not(.fixed) *,
            .positions-grid:not(.positions-review-grid) thead th button:not(.fixed) {
                font-size: inherit !important;
                font-weight: inherit !important;
                line-height: inherit !important;
                letter-spacing: inherit !important;
                color: inherit !important;
            }
            .positions-grid .position-column-reset {
                display: flex;
                align-items: center;
                gap: 8px;
                width: 100%;
                min-height: 32px;
                margin-top: 6px;
                padding: 6px 8px;
                border-top: 1px solid var(--border);
                color: var(--muted-foreground);
                cursor: pointer;
            }
            .positions-grid .position-column-reset:hover {
                background: var(--muted);
            }
            .positions-review-grid thead th {
                height: 32px;
                padding: 0 4px;
                vertical-align: middle;
                text-align: center;
                font-size: 10px;
                font-weight: 500;
                line-height: 1;
                letter-spacing: 0.025em;
                color: color-mix(in oklab, var(--foreground) 88%, var(--muted-foreground));
                border-color: color-mix(in oklab, var(--border) 70%, transparent);
                white-space: nowrap;
                overflow: hidden;
            }
            @keyframes reviewReduceArrow {
                0%, 100% { transform: translate(-50%, -1px); opacity: 0.72; }
                50% { transform: translate(-50%, 3px); opacity: 1; }
            }
            .positions-review-grid.positions-review-reducing thead th.review-reduce-header::before {
                content: "↓";
                position: absolute;
                left: 50%;
                top: -6px;
                z-index: 3;
                display: inline-block;
                animation: reviewReduceArrow 0.9s ease-in-out infinite;
                color: var(--warning);
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                font-size: 13px;
                line-height: 1;
                filter: drop-shadow(0 0 4px color-mix(in oklab, var(--warning) 70%, transparent));
            }
            .positions-review-grid thead th span {
                font-size: inherit;
                line-height: inherit;
            }
            .percent-fill-toggle {
                appearance: none;
                display: inline-grid;
                place-content: center;
                width: 17px;
                height: 17px;
                margin: 0;
                flex: 0 0 17px;
                cursor: pointer;
                border: 1px solid color-mix(in oklab, var(--border) 82%, var(--foreground) 18%);
                border-radius: 2px;
                background: color-mix(in oklab, var(--background) 88%, #000 12%);
                box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--foreground) 6%, transparent);
            }
            .percent-fill-toggle:checked {
                background: color-mix(in oklab, var(--background) 88%, #000 12%);
                border-color: color-mix(in oklab, var(--foreground) 58%, var(--border));
            }
            .percent-fill-toggle:checked::before {
                content: "";
                width: 9px;
                height: 9px;
                background: var(--foreground);
                clip-path: polygon(14% 45%, 0 60%, 38% 100%, 100% 18%, 84% 4%, 36% 70%);
            }
            .percent-fill-toggle:focus-visible {
                outline: 1px solid color-mix(in oklab, var(--foreground) 65%, transparent);
                outline-offset: 2px;
            }
            .portfolio-workflow-grid thead th {
                font-size: 10px;
                font-weight: 550;
                letter-spacing: 0.035em;
                color: color-mix(in oklab, var(--foreground) 72%, var(--muted-foreground));
            }
            .review-rail-section {
                border-color: color-mix(in oklab, var(--foreground) 16%, transparent) !important;
            }
            .positions-review-grid.positions-review-reducing thead th.review-reduce-header {
                position: relative;
                overflow: visible;
                color: var(--warning);
                background: color-mix(in oklab, var(--warning) 5%, color-mix(in oklab, var(--card) 94%, var(--background)));
                border-radius: 2px;
                border-color: color-mix(in oklab, var(--border) 70%, transparent) !important;
                box-shadow:
                    inset 1px 0 0 color-mix(in oklab, var(--warning) 72%, transparent),
                    inset -1px 0 0 color-mix(in oklab, var(--warning) 72%, transparent),
                    inset 0 1px 0 color-mix(in oklab, var(--warning) 56%, transparent),
                    inset 0 -1px 0 color-mix(in oklab, var(--warning) 56%, transparent);
            }
            .positions-review-grid.positions-review-reducing tbody td.review-reduce-cell {
                position: relative;
                border-color: color-mix(in oklab, var(--border) 70%, transparent) !important;
                box-shadow:
                    inset 1px 0 0 color-mix(in oklab, var(--warning) 66%, transparent),
                    inset -1px 0 0 color-mix(in oklab, var(--warning) 66%, transparent);
            }
            .positions-grid:not(.positions-actions-grid) tbody tr.positions-stock-row:hover > td {
                background-color: color-mix(in oklab, var(--primary) 8%, transparent);
                box-shadow:
                    inset 0 1px 0 color-mix(in oklab, var(--primary) 18%, transparent),
                    inset 0 -1px 0 color-mix(in oklab, var(--primary) 14%, transparent);
            }
            .positions-grid tbody td,
            .positions-grid tbody td * {
                font-size: 13px;
                font-weight: 400;
                line-height: 1.6;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
                font-feature-settings: none;
                font-variant-ligatures: none;
                text-rendering: optimizelegibility;
            }
            .positions-grid tbody td.position-shape-comparison-cell .position-shape-label {
                font-size: 8px;
                line-height: 1;
            }
            .positions-grid tbody td .position-model-weight {
                display: flex;
                width: 100%;
                height: 21px;
                flex-direction: column;
                align-items: flex-end;
                gap: 2px;
            }
            .positions-grid tbody td .position-model-weight-number {
                font-family: var(--font-mono);
                font-size: 11px;
                font-weight: 600;
                font-variant-numeric: tabular-nums;
                line-height: 16px;
                letter-spacing: 0;
                color: var(--foreground);
            }
            .positions-grid tbody td .position-model-weight-bar {
                display: block;
                flex-shrink: 0;
                width: 100%;
                height: 3px;
                overflow: hidden;
                border-radius: 1px;
                background: color-mix(in srgb, var(--secondary) 76%, transparent);
            }
            .positions-grid tbody td .position-model-weight-bar > span {
                display: block;
                height: 100%;
                border-radius: inherit;
                background: color-mix(in srgb, var(--primary) 32%, var(--muted-foreground) 68%);
            }
            .positions-grid tbody td .position-model-weight[data-weight-tone="under"] .position-model-weight-bar > span {
                background: color-mix(in srgb, var(--foreground) 88%, var(--muted-foreground) 12%);
            }
            .positions-grid tbody td .position-model-weight[data-weight-tone="aligned"] .position-model-weight-bar > span {
                background: var(--primary);
            }
            .positions-grid tbody td .position-model-weight[data-weight-tone="overstretch"] .position-model-weight-bar > span {
                background: var(--destructive);
            }
            .positions-grid tbody td.position-shape-comparison-cell .position-shape-target-value {
                font-size: 11.5px;
                line-height: 1;
            }
            .positions-grid tbody td.position-shape-comparison-cell .position-shape-current-value {
                font-size: 13px;
                line-height: 1;
            }
            .positions-grid tbody td.position-shape-comparison-cell .position-shape-drift {
                font-size: 11px;
                line-height: 1;
            }
            .positions-grid tbody tr.positions-parent-row > td {
                background-color: var(--panel-bg-alt);
            }
            .positions-grid tbody tr.positions-parent-row > td:first-child > div > span:first-child {
                font-weight: 500;
            }
            .positions-grid tbody td {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .positions-grid tbody td > * {
                min-width: 0;
                max-width: 100%;
            }
            .positions-grid tbody td :where(div, span, button, a, label) {
                min-width: 0;
                max-width: 100%;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .positions-grid {
                --positions-core-accent: #7dd3fc;
                --positions-core-chip-bg: color-mix(in srgb, #38bdf8 38%, transparent);
                --positions-core-chip-text: #fff;
            }
            html[data-theme$='light'] .positions-grid,
            html[data-theme='terminal-light-soft'] .positions-grid {
                --positions-core-accent: #0369a1;
                --positions-core-chip-bg: color-mix(in srgb, #0369a1 12%, transparent);
                --positions-core-chip-text: #075985;
            }
            .positions-grid tbody td .positions-core-etf-chip {
                display: inline-flex;
                flex: 0 0 auto;
                align-items: center;
                justify-content: center;
                width: auto;
                height: 13px;
                min-width: auto;
                max-width: none;
                overflow: visible;
                padding: 0 6px;
                margin: 2px;
                border: 1px solid color-mix(in srgb, var(--positions-core-accent) 72%, transparent);
                border-radius: 3px;
                background: var(--positions-core-chip-bg);
                color: var(--positions-core-chip-text);
                font-size: 8px;
                font-weight: 700;
                line-height: 13px;
                letter-spacing: 0;
                text-overflow: clip;
                text-transform: uppercase;
                white-space: nowrap;
            }
            .positions-grid tbody tr.positions-stock-row.is-core-etf {
                background-color: color-mix(in srgb, var(--positions-core-accent) 4%, transparent);
                box-shadow: inset 0 0 5px 1px
                    color-mix(in srgb, var(--positions-core-accent) 8%, transparent);
                border-radius: 12px;
            }
        `}</style>
    );
}
