# ACC_REPORT_FINAL Web Timing

Status: GREEN
Route: http://127.0.0.1:8082/office/accountant
Base URL: http://127.0.0.1:8082

## Runtime Proof

- Accountant surface reached: true
- Report path reachable: true
- Repeat cycle worked: true
- No page errors: true
- No 4xx/5xx responses: true
- No blocking console errors: true
- No stuck loading: true

## Timing Summary

- artifact_miss: count=3, median=551 ms, max=552 ms
- repeat: count=3, median=30 ms, max=32 ms
- artifact_hit: count=3, median=28 ms, max=29 ms
- warm: count=3, median=124 ms, max=125 ms

## Samples

- artifact_miss #1: paymentId=229, duration=551 ms, cacheLayer=rebuild, openDuration=160 ms
- repeat #1: paymentId=229, duration=30 ms, cacheLayer=storage, openDuration=120 ms
- artifact_miss #2: paymentId=230, duration=548 ms, cacheLayer=rebuild, openDuration=151 ms
- repeat #2: paymentId=230, duration=28 ms, cacheLayer=storage, openDuration=121 ms
- artifact_miss #3: paymentId=231, duration=552 ms, cacheLayer=rebuild, openDuration=132 ms
- repeat #3: paymentId=231, duration=32 ms, cacheLayer=storage, openDuration=118 ms
- artifact_hit #1: paymentId=229, duration=29 ms, cacheLayer=storage, openDuration=124 ms
- warm #1: paymentId=229, duration=124 ms, cacheLayer=storage, openDuration=124 ms
- artifact_hit #2: paymentId=230, duration=28 ms, cacheLayer=storage, openDuration=110 ms
- warm #2: paymentId=230, duration=110 ms, cacheLayer=storage, openDuration=110 ms
- artifact_hit #3: paymentId=231, duration=28 ms, cacheLayer=storage, openDuration=125 ms
- warm #3: paymentId=231, duration=125 ms, cacheLayer=storage, openDuration=125 ms

