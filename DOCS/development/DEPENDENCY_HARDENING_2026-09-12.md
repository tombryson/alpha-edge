# Frontend Dependency Hardening

Status: implemented locally, 12 September 2026. Not deployed to UAT or production.

## Scope

Remediate the seven npm findings carried forward from the documentation review,
restore normal peer-dependency validation and make the production build fail on
TypeScript errors. Authentication, credentials, database schema, investment
calculations and application styling are unchanged by this pass. Existing
uncommitted application changes remain in the working tree.

## Dependency Changes

| Package | Before | Verified lockfile version |
| --- | --- | --- |
| Next.js | 16.0.0 | 16.3.5 |
| React / React DOM | 19.2.0 | 19.2.8, both packages |
| Next bundle analyzer | 16.2.9 | 16.3.5, matching Next |
| PostCSS | Root 8.5.6; Next 8.4.31 | Root 8.5.28; Next 8.5.23 |
| Sharp | 0.34.5 | 0.35.4 |
| Browserslist | 4.27.0 | 4.28.9 |
| Baseline browser mapping | 2.8.25 | 2.11.22 |
| Lodash | 4.17.21 | 4.18.1 |
| Nano ID | 3.3.11 | 3.3.19 |
| OpenAPI types | Missing required peer | 12.1.3 |
| Vaul | Unused 0.9.9 with incompatible React peers | Removed |

Next/React and the analyzer are pinned. Remaining transitive fixes use their
parents' supported semver ranges and are recorded in `package-lock.json`.
Tailwind remains 4.1.17 and Recharts remains 2.15.4; this was not a design-system
or chart-library migration. No forced audit upgrades or blanket peer overrides
were used.

The seven initial findings were one critical, five high and one moderate, across
Next, Sharp, PostCSS, Lodash, Nano ID, Browserslist and browser mapping.
After installation, both `npm audit` and `npm audit --omit=dev` report **zero
known vulnerabilities**. That is a dated npm advisory result, not proof that
all application code, the Go backend or deployed container images are secure.

## Build And Install Contract

- npm is the release package manager; `package-lock.json` is authoritative.
  The historical `pnpm-lock.yaml` is retained but is not maintained or used by
  Docker/CI. Do not use it for a release install.
- `npm ci` succeeds without `--legacy-peer-deps`. `npm ls --all` exits zero
  with no invalid or missing peers. Vaul had no application imports; removing
  it does not remove the actual mobile sidebar dialogs.
- `.nvmrc`, the package engine constraint, Docker stages and frontend CI now
  agree on Node 24 LTS. Node 20 is end-of-life according to the
  [Node release schedule](https://nodejs.org/en/about/previous-releases).
- Removed the obsolete Next `eslint` configuration and the TypeScript build
  bypass. `npm run build` now includes TypeScript validation. `npm run typecheck`
  first generates route types, so it also works on a clean checkout.
  See the [Next 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16).
- Frontend CI checks clean installation, peer integrity, npm findings at
  moderate severity or above, type checking, proxy/monitoring/Analysis unit
  regressions and production build. The documentation job still audits
  contracts and generated Help. A registry outage is a failed audit, not a
  clean security result.
- The existing local-only backend rewrite remains intact. The local preview
  continues to use its same-origin backend connection; no new token is required.

## Verification

Completed on Node 24.20.0 / npm 11.19.0:

- Fresh `npm ci`, complete peer-tree validation, full and production-only npm audits.
- `npm run typecheck` and optimized standalone production build, including
  build-time TypeScript checks; the old ESLint/browser-mapping warnings are gone.
- 77 unit/contract tests: Council proxy 16, monitoring 15, Analysis metrics 11,
  class colours 12, portfolio comparison 15, documentation 8.
- All 46 production browser tests passed using the standalone server on a separate local
  port and isolated API/TradingView fixtures, never live trade mutations. It
  covers execution safeguards, Analysis, Core controls, ETF cards, portfolio
  charts, History previews, Help, mobile layouts and themes.
- The header geometry regression now measures each button and its icon in the
  same browser frame, retaining the original size and half-pixel alignment
  thresholds. Separate reads could capture different hydration layouts.
- Header tests also require the optimized logo to finish loading with nonzero
  image dimensions. Native AVIF/WebP encoding and decoding pass locally.

The documentation audit and `git diff --check` also pass. These are local
verification results, not a deployment record.

## Remaining Release Checks

- Docker is installed locally but its daemon is unavailable, so a Linux/Alpine
  image build was not run. The standalone Node build was tested locally; the
  next UAT deployment must validate the new container runtime and smoke-test it.
- The GitHub Actions definition is added locally; its remote run is not observed.
- Go dependencies, the older backend build image, LiteFS and operating-system
  packages need their own audit. No backend runtime or database upgrade is
  bundled into this frontend change.
- Repository-wide ESLint setup remains unfinished. The old `npm run lint`
  command is not a working release gate; type checking is not a substitute for
  a future lint baseline.
- npm 11 reports an unapproved optional macOS `fsevents` install script. The
  clean install and tests pass without granting blanket script permissions.
- Database migration/recovery work and full REST response-schema coverage
  remain separate priorities; this change does not close them.

## Release Discipline

Review the dependency and runtime diff with existing uncommitted work before
deployment. Build frontend UAT using its existing backend URL, run the usual
read-only smoke checks, and record the actual frontend release version in
Operations. Do not redeploy or rotate backend credentials merely because the
frontend framework changed. Promote to production only after the UAT result is
accepted.
