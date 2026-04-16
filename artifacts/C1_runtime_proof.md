# C1 Runtime Proof

Status: GREEN for implementation gates and targeted runtime simulation. Production telemetry should be watched after OTA.

## Commands Run

```bash
npx jest src/lib/async/mapWithConcurrencyLimit.test.ts src/lib/observability/rpcLatencyMetrics.test.ts src/lib/observability/queueBacklogMetrics.test.ts src/lib/api/proposalAttachments.service.test.ts src/screens/buyer/buyer.attachments.mutation.test.ts src/lib/offline/mutationQueue.contract.test.ts --runInBand --no-coverage
```

Result:

- 6 suites passed
- 34 tests passed

Full gates:

```bash
npx tsc --noEmit --pretty false
npx expo lint
npx jest --no-coverage
```

Results:

- `tsc`: passed
- `expo lint`: passed with 0 errors and 7 pre-existing warnings
- full Jest: 286 suites passed, 1 skipped; 1652 tests passed, 1 skipped

## Scenarios Covered

1. 100+ item concurrency
   - Test: `mapWithConcurrencyLimit.test.ts`
   - Proof: 100 items with limit 5 never exceeded 5 active workers.

2. 500 item large batch
   - Test: `mapWithConcurrencyLimit.test.ts`
   - Proof: 500 items with limit 7 completed without raising active concurrency above 7.

3. 50 attachment uploads
   - Test: `buyer.attachments.mutation.test.ts`
   - Proof: 50 supplier uploads completed with max active uploads <= 3.

4. 50 signed URL generations
   - Test: `proposalAttachments.service.test.ts`
   - Proof: 50 rows were mapped with max active signed URL calls <= 5.

5. RPC latency metrics
   - Test: `rpcLatencyMetrics.test.ts`
   - Proof: success/error samples produced count, errorRate, p50, p95, max.

6. Queue backlog metrics
   - Test: `queueBacklogMetrics.test.ts`
   - Proof: queue size and oldestAgeMs are retained in snapshot and emitted via platform observability.

7. Offline replay burst observability
   - Test: `mutationQueue.contract.test.ts`
   - Proof: existing queue summary contract still passes with new oldest-age field.

## Static Proof

Modified critical files no longer contain the replaced uncontrolled dynamic fan-out patterns:

- `proposalAttachments.service.ts`
- `buyer.attachments.mutation.ts`
- `assistantActions.ts`
- `foreman.ai.ts`

## Limits

- Attachment signed URL: 5
- Supplier attachment upload: 3
- Assistant catalog match: 5
- Foreman AI catalog resolve: 5

## Notes

No live production load test was run in this local C1 proof. Production validation should watch the new `rpc_latency` and `queue_backlog_metric` events after OTA.
