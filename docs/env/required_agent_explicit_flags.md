# Required Agent Explicit Flags

This document lists owner-approved agent flags by name only. Do not commit secret
values, credentials, fixture identifiers, tokens, or raw environment dumps.

## Owner DB Approval Flags

- S_PRODUCTION_MIGRATION_GAP_APPLY_OR_REPAIR_APPROVED
- S_PROVIDERS_PRODUCTION_DB_WRITE_APPROVED
- S_AI_ACTION_LEDGER_MIGRATION_APPLY_APPROVED
- S_AI_ACTION_LEDGER_MIGRATION_VERIFY_APPROVED
- S_AI_ACTION_LEDGER_MIGRATION_ROLLBACK_PLAN_APPROVED

These flags are approval gates, not credentials. They only permit bounded,
additive, audited migration work. They do not permit destructive DDL, unbounded
DML, service-role client exposure, DB seed, Auth Admin, listUsers, or fake green
runtime proof.

## Explicit E2E Role Users

- E2E_DIRECTOR_EMAIL
- E2E_DIRECTOR_PASSWORD
- E2E_FOREMAN_EMAIL
- E2E_FOREMAN_PASSWORD
- E2E_BUYER_EMAIL
- E2E_BUYER_PASSWORD
- E2E_ACCOUNTANT_EMAIL
- E2E_ACCOUNTANT_PASSWORD
- E2E_CONTRACTOR_EMAIL
- E2E_CONTRACTOR_PASSWORD

## Explicit Runtime Fixture Refs

- E2E_PROCUREMENT_REQUEST_REF
- E2E_PENDING_APPROVAL_ACTION_REF
- E2E_APPROVED_PROCUREMENT_ACTION_REF
- E2E_WAREHOUSE_ITEM_REF
- E2E_FINANCE_COMPANY_REF
- E2E_CONTRACTOR_OWN_SUBCONTRACT_REF
- E2E_ROLE_MODE

Missing fixture refs must return an exact blocker. They must not be replaced with
seed data, fake users, Auth Admin discovery, listUsers, service_role access, or
hardcoded cards/actions.
