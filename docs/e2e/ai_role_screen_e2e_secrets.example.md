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
