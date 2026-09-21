# Documentation Reconciliation

Status: documentation implementation review, 11 September 2026.

Deployment follow-up: the generated Help is now verified on UAT frontend v1217;
see the [release record](PUBLIC_SOURCE.md).
The validation below describes the implementation pass before that deployment.

Dependency follow-up, 12 September: the seven npm findings and React peer
mismatch described below are now resolved locally. Build-time type checking is
enabled; lint setup and backend/container auditing remain open. See
[frontend hardening](DEPENDENCY_HARDENING_2026-09-12.md). This does not change the
recorded UAT release or the historical validation below.

Database follow-up, 12 September: versioned startup, a frozen generated baseline,
mandatory pre-upgrade backups and isolated restore tools are now deployed to
[UAT backend v188](PUBLIC_SOURCE.md).
UAT's two historical migration entries were observed and preserved;
the new runner uses its own ledger. UAT automatic volume snapshots were verified
and a full SQLite backup was restored in isolation, but production/off-volume recovery remains open. See
[database operations](../operations/DATABASE_UPGRADES_AND_RECOVERY.md). The earlier
missing-runner finding below remains the reason for this new implementation.

## Scope

The original flat directory contained 42 Markdown documents, about 17,000 lines
and 116,000 words. Current contracts, proposals, audits and rollout notes were
intermixed. This pass preserves those documents, groups them by audience and
adds a smaller current entry layer. It does not claim a line-by-line verification
of every historic paragraph.

## Corrected Against Source

| Finding | Resolution |
| --- | --- |
| API reference put awaiting execution back in Alert Stack | Updated to primary actionable/variance items; waits and blocked records remain in History |
| Overlay GET was documented as creating/superseding events | Corrected signal-state read versus explicit sync; retained its two bounded reconciliation writes |
| ETF documents described a separate 25% pool as current, while staged v2 said not live | Added a current ETF contract and marked old policy material historical/design context |
| Listing verification still claimed not deployed | Marked implemented in source/UAT, without asserting a production version |
| Actions scope said suggestion display, cash backing and import protection were future work | Reconciled the scope summary with current advisory display and funded-ticket contracts |
| Operations buried deploy steps under a long release history | Added a concise runbook and preserved the full original in the archive |
| Documentation check required README.md not to exist | Replaced that rule with portable links, index, generation and API coverage checks |
| API inventory omitted registered operations | Source-generated catalogue includes 153 Go plus eight Next proxy operations |
| Help repeated hardcoded prose and omitted News/History | Ten Markdown guides now generate Help; diagram data is shared too |
| Local absolute links failed outside one machine | Rebased repository links and retained a relocation map |
| ETF neutral weight and target authority were oversimplified | Documented available-model-row averaging and approved-shape ledger targets separately from executable funding/risk checks |
| Data model and status claimed completed numbered migrations that do not exist | Corrected schema ownership to Go bootstrap/feature helpers and reopened migration/schema-generation work |
| Backup and analyst-timestamp completion depended on absent files | Marked historical claims unverified pending source/deployment evidence instead of certifying them |

## Deliberately Not Claimed Complete

- OpenAPI has complete route inventory but only five selected request schemas. Response schemas, all query parameters and per-operation errors need a subsequent contract pass.
- The independent Intelligence Service's raw API and database are outside this repository. Its schema must be reconciled in its own project.
- Long current references still include dated sections. This pass fixes verified contradictions, not every possible disagreement across 116,000 words.
- Proposal documents may mix accepted and pending ideas. Their banners and current-owner links prevent them from silently becoming present-day rules.
- Production versions were not queried or changed during this documentation implementation.
- Dependency vulnerabilities, the existing React peer mismatch and repository-wide lint/type/build limitations must be tracked as release work, not hidden by documentation.

## Validation On This Branch

- Documentation audit: all 66 Markdown files and local links, folder indexes, status banners, generated outputs and OpenAPI validation.
- Eight documentation regression tests cover links, anchors, route extraction, missing annotations, stale Help and service origins.
- Two isolated browser tests cover all Help routes, back/forward navigation, diagrams and 390px mobile layout without backend writes.
- TypeScript checking and the production frontend build passed. The existing build still warns about obsolete Next ESLint configuration and stale browser-mapping data.
- `npm audit --omit=dev` reports seven dependency findings (one critical, five high, one moderate). These were not remediated by this documentation change; release readiness must include a separate dependency pass.
- No backend business behaviour, database records or deployment were changed by this pass. GitHub Actions configuration was added; its remote run has not been observed.

## Next Contract Work

Prioritise statement import, funded purchase tickets, webhook payload unions,
Core ledger responses and Q3/Q4 transitions for complete OpenAPI schemas and
fixture contract tests. Next obtain the Intelligence Service contract and agree
cross-service versioning. Then retire duplicated dated prose only after its
remaining unique rules and evidence have a named owner.

This is a usable documentation foundation, not a declaration that Alpha Edge is
finished or ready for public release.
