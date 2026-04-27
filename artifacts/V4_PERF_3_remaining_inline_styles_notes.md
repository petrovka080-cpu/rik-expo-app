# V4-PERF-3 Remaining Inline Styles Notes

## Scope

Wave: V4-PERF-3 REMAINING_HOTPATH_INLINE_STYLES

Selected production hotpath files:

- `src/components/foreman/WorkTypePicker.tsx`
- `src/screens/warehouse/components/ReqIssueModal.tsx`
- `src/screens/warehouse/components/WarehouseReportsTab.tsx`

## Selection Rationale

- `WorkTypePicker` is an interactive Foreman modal with search input and repeated work-type/family rows.
- `ReqIssueModal` is a Warehouse issue modal with FlashList rows, cart footer, and frequent quantity/input updates.
- `WarehouseReportsTab` is a Warehouse report navigation/list surface with repeated day rows and PDF action buttons.

Avoided intentionally:

- `src/screens/accountant/components/ReadOnlyReceipt.tsx` because it is a one-time receipt surface, not a preferred hotpath target for this focused wave.
- Broad dynamic/theme-heavy files where extracting state-dependent styles would risk visual or behavior drift.

## Change Summary

- Moved static `style={{}}` blocks into local `StyleSheet.create` objects.
- Kept dynamic styles as arrays or existing dynamic style callbacks where they depend on safe area, platform, pressed state, busy state, or accent state.
- Did not refactor component structure.
- Did not change callbacks, validation, business logic, SQL/RPC, runtime config, or Maestro YAML.

## Inline Style Counts

- `src/components/foreman/WorkTypePicker.tsx`: 24 -> 0
- `src/screens/warehouse/components/ReqIssueModal.tsx`: 24 -> 0
- `src/screens/warehouse/components/WarehouseReportsTab.tsx`: 20 -> 0
- Production TSX total: 963 -> 895

## Dynamic Styles Left

- Safe-area and platform-dependent sheet padding/max-width in `WorkTypePicker`.
- Pressed row/button states in `WorkTypePicker` and `WarehouseReportsTab`.
- Busy/disabled action opacity in `WarehouseReportsTab`.
- Header padding from `headerTopPad` and list `contentContainerStyle` in `WarehouseReportsTab`.
- Request accent border color and submit disabled opacity in `ReqIssueModal`.

These were left dynamic intentionally because extracting them blindly would violate the wave rule against changing state/props/theme-dependent style behavior.
