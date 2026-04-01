# Wave 15.1 Subcontracts Rollout Proof

Status: GREEN

Checked:
- migration apply proof: artifacts/wave15_1_subcontracts_migration_apply.log
- migration history after apply: artifacts/wave15_1_subcontracts_migration_list_after.txt
- schema and RPC verification: GREEN
- primary client path: GREEN
- live approve/repeated approve/reject/conflict smoke: GREEN
- compat fallback secondary-only proof: GREEN

Runtime notes:
- create primary path used shared client -> subcontract_create_v1 only
- compat scenario injected a missing subcontract_create_v1 transport error, then exercised shared client fallback -> subcontract_create_draft
- direct table insert into subcontracts stayed at zero in both scenarios
- approve/reject used shared client atomic RPCs only
- pending status setup for approve/reject smoke was service-role test fixture setup only
