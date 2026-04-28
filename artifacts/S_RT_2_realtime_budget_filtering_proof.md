# S-RT-2 realtime budget/filtering proof

Status: GREEN pending commit/push

## Scope

- Helper added inside existing module: `src/lib/realtime/realtime.channels.ts`
- Central realtime budget/debug signals added: `src/lib/realtime/realtime.client.ts`
- Direct/legacy channels budgeted:
  - `src/screens/buyer/buyer.subscriptions.ts`
  - `src/screens/director/director.lifecycle.realtime.ts`
  - `src/screens/warehouse/hooks/useWarehouseExpenseRealtime.ts`
- Tests added:
  - `tests/realtime/realtimeChannelBudget.test.ts`
  - `tests/realtime/realtimeClientBudget.test.ts`

## Before / after

Selected touched files:

| File | Channel calls before | Channel calls after | Subscribe calls before | Subscribe calls after | Postgres changes before | Postgres changes after | Budgeted after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `src/lib/realtime/realtime.client.ts` | 1 | 1 | 1 | 1 | 2 | 2 | YES |
| `src/screens/buyer/buyer.subscriptions.ts` | 2 | 2 | 2 | 2 | 2 | 2 | YES |
| `src/screens/director/director.lifecycle.realtime.ts` | 2 | 2 | 2 | 2 | 4 | 4 | YES |
| `src/screens/warehouse/hooks/useWarehouseExpenseRealtime.ts` | 1 | 1 | 1 | 1 | 6 | 6 | YES |

Current repo source estimate after changes:

- total `.channel(`: 8
- total `.subscribe(`: 10
- `postgres_changes` mentions: 25
- estimated filtered listener configs: 2
- estimated broad listener configs: 10

## Filtering decision

No new Supabase realtime filters were added in this slice. That is intentional:

- Buyer legacy subscriptions do not receive office/company scope at subscription time.
- Director lifecycle realtime does not have a direct safe office/company filter without changing lifecycle contracts or business visibility.
- Warehouse expense realtime listens to `requests` and `request_items`; a direct `request_items` office/company filter was not proven safe from this hook.

The wave therefore hardens fanout with budget/duplicate monitoring and duplicate prevention for direct channels, without changing what data users can see.

## Safety

- Business logic changed: NO
- Permissions changed: NO
- SQL/RPC changed: NO
- RLS changed: NO
- Offline replay changed: NO
- Package changed: NO
- App config changed: NO
- Native changed: NO
- Raw payload logged: NO
- PII logged: NO
- Token/signed URL logged: NO
- OTA published: NO
- EAS build triggered: NO
- EAS submit triggered: NO

## Gates

- targeted realtime tests: PASS
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `git diff --check`: PASS
- `npm test -- --runInBand`: PASS
- `npm test`: PASS
- `npm run release:verify -- --json`: PASS gates; pre-commit run blocked only because worktree was intentionally dirty before commit

## Release

- OTA published: NO
- EAS build triggered: NO
- EAS submit triggered: NO
