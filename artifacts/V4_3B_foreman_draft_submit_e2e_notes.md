# V4-3B Foreman Draft Submit E2E Notes

## Scope

- Active task: `V4-3B FOREMAN_DRAFT_SUBMIT_E2E_STABILIZATION`
- Kept out of scope: Director flow, Foreman business logic, SQL/RPC, runtime/app config, harness changes

## Root Cause

- `foreman-catalog-open` was not the real blocker after the latest diagnostics.
- The catalog modal opened successfully and exposed `foreman-catalog-modal` and `foreman-catalog-search-input`.
- The actual failure moved to the next step: Maestro tried to tap `id: foreman-catalog-draft-open`.
- Android hierarchy for the cart button exposed only the accessibility label `"Открыть черновик из каталога"` and did not expose a matching resource id for `foreman-catalog-draft-open`.
- Result: the button was visible to users, but not discoverable by Maestro's `id` selector.

## Fix

- Keep the catalog-open stabilization on real modal selectors:
  - wait for `foreman-catalog-modal`
  - wait for `foreman-catalog-search-input`
- Replace the failing draft-open step from `id` selector to `text` selector:
  - `text: "Открыть черновик из каталога"`
- No app logic changed.

## Final Intended Change Set

- [maestro/flows/critical/foreman-draft-submit.yaml](</C:/dev/rik-expo-app/maestro/flows/critical/foreman-draft-submit.yaml>)

## Outcome

- Targeted Foreman run: PASS
- Full critical suite: `9/9 PASS`
- Director flow: still PASS
