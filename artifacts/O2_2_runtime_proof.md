# O2.2 Runtime Proof

Generated: 2026-04-16T15:10:09.504Z

Selected slice: foreman durable draft replay payload persistence.

## Large Draft Payload

- item_count: 150
- full_persisted_bytes: 33144
- compact_persisted_bytes: 16946
- size_reduction_percent: 48.87

## Runtime

- iterations: 500
- full_write_serialization_ms: 50.37
- compact_write_serialization_ms: 27.856
- write_speedup: 1.81
- full_hydrate_ms: 72.82
- compact_hydrate_ms: 89.176
- hydrate_ratio: 1.22

## Safety

- compact equivalence: true
- full fallback equivalence: true
- invalid compact fallback available: true
- replay proof test present: true

## OTA Proof

- branch: production
- runtime_version: 1.0.0
- update_group_id: 79362166-2551-4c1e-8f0b-34787daf9539
- android_update_id: 019d96d7-6969-77d7-9ed9-8a1e572414b0
- ios_update_id: 019d96d7-6969-7a39-b999-e337d60c7340
- dashboard: https://expo.dev/accounts/azisbek_dzhantaev/projects/rik-expo-app/updates/79362166-2551-4c1e-8f0b-34787daf9539

Status: GREEN
