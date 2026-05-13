# AI Role-Screen E2E Secrets

`S_AI_CORE_03B_EXPLICIT_ROLE_SECRETS_E2E_CLOSEOUT` only allows green from explicit role credentials supplied by the execution environment.

Required secret names:

```txt
E2E_DIRECTOR_EMAIL
E2E_DIRECTOR_PASSWORD
E2E_FOREMAN_EMAIL
E2E_FOREMAN_PASSWORD
E2E_BUYER_EMAIL
E2E_BUYER_PASSWORD
E2E_ACCOUNTANT_EMAIL
E2E_ACCOUNTANT_PASSWORD
E2E_CONTRACTOR_EMAIL
E2E_CONTRACTOR_PASSWORD
```

Do not provide these as Maestro CLI arguments. The runner passes them only through the child process environment and redacts stdout/stderr before surfacing failures.

## Explicit AI Fixture Refs

`S_AI_FIXTURE_01_EXPLICIT_E2E_FIXTURE_REGISTRY` only allows runtime fixture refs from explicit environment values. Do not seed data, discover users, call Auth Admin, or write fixture values to artifacts.

Required fixture ref names:

```txt
E2E_PROCUREMENT_REQUEST_REF
E2E_APPROVED_PROCUREMENT_ACTION_REF
E2E_PENDING_APPROVAL_ACTION_REF
E2E_COMMAND_CENTER_SCREEN_REF
E2E_WAREHOUSE_ITEM_REF
E2E_FINANCE_COMPANY_REF
E2E_CONTRACTOR_OWN_SUBCONTRACT_REF
E2E_ROLE_MODE
```

Allowed `E2E_ROLE_MODE` values:

```txt
developer_full_access_or_separate_roles
separate_roles
```

Missing fixture refs must block with `BLOCKED_REQUIRED_E2E_FIXTURE_REFS_MISSING`; green E2E is not allowed from fake requests, fake actions, DB seed, or discovery.
