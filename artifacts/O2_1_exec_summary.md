# O2.1 Exec Summary

Status: GREEN

The exact O2 slice is the foreman durable draft replay payload, not the queue intent envelope. `offline_mutation_queue_v2` already stores metadata only; `foreman_durable_draft_store_v2` is the remaining whole-array replay bottleneck.

O2.2 will add compact durable snapshot persistence with full/legacy fallback. Runtime worker inputs stay as full snapshots after hydration, so submit and replay semantics remain unchanged.
