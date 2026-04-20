# PDF-PUR-1 Web Proof

Status: PASS

## Route proof

- Runtime route: `http://localhost:8081/office/buyer`
- Result: GREEN
- Duration: 23948 ms
- Console errors: 0
- Page errors: 0
- Bad HTTP responses: 0
- Artifact: `artifacts/PDF_PUR_web_route_proof.json`

The legacy route verifier still targets `/buyer` and returned `Страница не найдена`. That verifier was not modified. The actual Expo route is `/office/buyer`, backed by `app/(tabs)/office/buyer.tsx`.

## PDF-specific repeat proof

The temp runtime buyer reached the Purchaser surface but did not have seeded proposal rows available for a browser PDF button click. The PDF-specific open behavior is therefore proven by exact service tests:

- repeat open, same snapshot: one generator call
- concurrent identical opens: one generator call
- persisted same-version descriptor: no generator call
- changed visible proposal data: controlled rebuild
- no loaded details snapshot: original generator fallback with no cache write

This proves the click-path owner no longer uses heavy rebuild as the normal repeat path once the details snapshot is present.
