# C1 Metrics Definition

Status: GREEN local implementation artifact.

## RPC Latency Metrics

Helper:

- `src/lib/observability/rpcLatencyMetrics.ts`

API:

- `trackRpcLatency({ name, screen, surface, durationMs, status, rowCount, error, extra })`
- `getRpcLatencySnapshot()`
- `resetRpcLatencyMetrics()`

Metrics:

- count
- errorCount
- errorRate
- p50Ms
- p95Ms
- maxMs

Instrumented RPC paths:

- `director_report_transport_scope_v1`
- `director_finance_panel_scope_v4`
- `warehouse_stock_scope_v2`
- `warehouse_issue_queue_scope_v4`
- `accountant_inbox_scope_v1`
- `accountant_proposal_financial_state_v1`
- `accounting_pay_invoice_v1`

## Queue / Backlog Metrics

Helper:

- `src/lib/observability/queueBacklogMetrics.ts`

API:

- `trackQueueBacklogMetric({ queue, size, oldestAgeMs, processingCount, failedCount, retryScheduledCount, coalescedCount })`
- `getQueueBacklogSnapshot()`
- `resetQueueBacklogMetrics()`

Metrics:

- queue size
- oldestAgeMs
- processingCount
- failedCount
- retryScheduledCount
- coalescedCount

Instrumented queues:

- `foreman_mutation`
- `submit_jobs`

## Storage

Metrics are in-memory and also emitted through `recordPlatformObservability`, matching existing observability patterns. No external service or SQL schema change was introduced in C1.
