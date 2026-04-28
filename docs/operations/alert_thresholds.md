# Alert Thresholds

S-DASH-1 uses conservative local thresholds for daily and incident reports. These are dashboard/report thresholds only; they do not change app behavior.

## Severity

- `OK`: no threshold exceeded.
- `WARN`: error volume, domain concentration, or specific signal counts need watch.
- `CRITICAL`: incident review should start before changing production.

## Defaults

- Total errors: warn at 10/hour, 75/day, 300/week.
- Total errors: critical at 25/hour, 200/day, 800/week.
- Domain concentration: warn at 5/hour, 40/day, 150/week.
- Domain concentration: critical at 15/hour, 120/day, 400/week.
- Signal counts for offline/realtime/PDF/RPC/JSON: warn at 3, critical at 10.

## Signal Families

- Offline queue/replay: `offline`, `queue`, `replay`, `circuit`.
- Realtime: `realtime`, `channel`, `duplicate`, `budget`, `leak`.
- PDF/WebView: `pdf`, `webview`, `document viewer`, `render process`.
- RPC validation: `RpcValidationError`, `rpc validation`, `rpc_validation`.
- JSON/storage corruption: `safe_json`, `safeJson`, `json`, `corrupt`, `parse failed`.
