# S-RT-5 Realtime Fanout Reduction Proof

Status: local code wave. No production, staging, service-role, or realtime load used.

## Baseline And Result

- Baseline S-RT-4B estimate: 14 channels per active user.
- Post-wave estimate: 8 persistent mounted channels per active user.
- 10K projection: 140,000 -> 80,000 channels.
- 50K projection: 700,000 -> 400,000 channels.

## Consolidated

1. `src/lib/realtime/realtime.client.ts`: duplicate same-signature `subscribeChannel` attaches now share one Supabase channel and clean up by ref count.
2. `src/screens/buyer/buyer.subscriptions.ts`: legacy buyer notification/proposal direct channels now attach through `buyer:screen:realtime`.
3. `src/screens/warehouse/hooks/useWarehouseExpenseRealtime.ts`: legacy warehouse expense direct channel now attaches through `warehouse:screen:realtime`.
4. `src/screens/director/director.lifecycle.realtime.ts`: director request screen and foreman handoff broadcast now share `director:screen:realtime`.
5. `src/lib/realtime/realtime.channels.ts`: director handoff broadcast channel name aliases the director screen channel.

## Remaining Persistent Channels

- `buyer:screen:realtime`
- `accountant:screen:realtime`
- `warehouse:screen:realtime`
- `contractor:screen:realtime`
- `director:screen:realtime`
- `director:finance:realtime`
- `director:reports:realtime`
- `chat:listing:<redacted>`

## Skipped

- `src/lib/api/requestDraftSync.service.ts`: send-only ephemeral broadcast; removed in `finally`.
- `src/lib/api/request.repository.ts`: send-only submit broadcast/notification path; not a mounted subscription.

## Safety

- Production touched: NO
- Staging touched: NO
- Realtime load generated: NO
- SQL/RPC/RLS/storage changed: NO
- Package/native config changed: NO
- Business behavior changed: NO
- OTA/EAS/Play Market touched: NO
- Secrets printed/committed: NO

## Test Proof

Targeted tests added or updated:

- `tests/realtime/realtimeClientBudget.test.ts`
- `tests/realtime/chatRealtime.lifecycle.test.ts`
- `tests/realtime/realtimeFanoutReduction.contract.test.ts`
- `src/screens/director/director.lifecycle.realtime.test.tsx`
- `src/screens/buyer/buyer.subscriptions.test.ts`
- `src/screens/warehouse/warehouse.realtime.lifecycle.test.tsx`
