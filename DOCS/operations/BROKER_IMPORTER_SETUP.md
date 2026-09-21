# Broker Importer Setup

The Google Apps Script source in `backend/google_apps_script/ig_statement_sync.gs`
is a template. The deployed Apps Script and its triggers are managed separately;
updating this repository does not update or interrupt a live importer.

Before deploying this template, configure these private Script Properties:

| Property | Value |
| --- | --- |
| `IG_SPREADSHEET_ID` | The staging spreadsheet owned by the operator |
| `IG_STATEMENT_GMAIL_QUERY` | A Gmail query matching the operator's broker-statement messages |
| `IG_TERMINAL_API_ENDPOINT` | The installation's HTTPS `/api/statements/import` endpoint, without query credentials |

Retain the existing API/provider key properties used by the importer. Never paste
keys, spreadsheet identifiers or personal email filters into source files, issues,
screenshots or public test fixtures. Missing required configuration fails before
the operation runs; there is no fallback to the maintainer's account.

For an existing deployment, transfer the previously hard-coded values privately
into Script Properties before replacing the script. Keep its bearer-token
integration intact during the owner-session migration. Do not change Google
triggers or replay real broker statements merely to test a source-only release.
