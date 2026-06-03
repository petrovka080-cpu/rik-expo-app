# S_AI_DOMAIN_DATA_GATEWAY_CONTEXT_BUDGET_CLOSEOUT

Final status: GREEN_AI_DOMAIN_DATA_GATEWAY_CONTEXT_BUDGET_READY

## Roles
- director: domains=procurement, warehouse, finance, field, documents, media, marketplace, contractors, office, client, approvals facts=15/20 numeric=20/20 elapsed=5.84ms
- foreman: domains=field, procurement, warehouse, media, documents, contractors facts=9/20 numeric=20/20 elapsed=1.08ms
- buyer: domains=procurement, warehouse, marketplace, documents facts=7/20 numeric=16/20 elapsed=0.55ms
- accountant: domains=finance, documents, procurement facts=6/20 numeric=11/20 elapsed=0.63ms
- warehouse: domains=warehouse, procurement, field facts=5/20 numeric=14/20 elapsed=0.46ms
- contractor: domains=contractors, field, media, documents facts=5/20 numeric=13/20 elapsed=0.46ms
- marketplace: domains=marketplace, media, procurement facts=4/20 numeric=7/20 elapsed=0.53ms
- consumer: domains=consumer_repair, marketplace facts=3/20 numeric=5/20 elapsed=0.55ms

## Safety
- consumer_office_context_found: false
- accountant_foreman_context_mix_found: false
- raw_db_dump_found: false
- debug_provider_payload_visible: false
- p95_ms: 5.84