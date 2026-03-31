# Local Role Screen Access Proof

## Result
- Status: `GREEN`
- Base URL: `http://localhost:8081`
- Authenticated role used for proof: `foreman`

## Local/dev route checks
- `/director` -> `/director` | redirected=false | opened=true
- `/buyer` -> `/buyer` | redirected=false | opened=true
- `/accountant` -> `/accountant` | redirected=false | opened=true
- `/warehouse` -> `/warehouse` | redirected=false | opened=true
- `/contractor` -> `/contractor` | redirected=false | opened=true

## Redirect policy
- devDisablesRoleRedirect = true
- productionPreservesRoleRedirect = true