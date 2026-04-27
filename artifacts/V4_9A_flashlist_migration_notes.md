# V4-9A FlashList Migration Notes

## Scope

V4-9A migrates only measured, high-value remaining production `FlatList` usages to the
existing app abstraction at `src/ui/FlashList.tsx`.

This is not a full V4-9 sweep. Small dropdowns, combo pickers, dummy/header-only lists,
type-only refs, and existing FlashList wrapper files were intentionally left alone.

## Selection

Selected files:

- `src/features/chat/ChatScreen.tsx`
- `src/components/WorkMaterialsEditor.tsx`
- `src/screens/buyer/components/BuyerReworkSheetBody.tsx`

Why selected:

- `ChatScreen` is the chat message thread and can grow with user conversation history.
- `WorkMaterialsEditor` renders repeated material rows in work/progress editing surfaces.
- `BuyerReworkSheetBody` renders repeated buyer rework items with header/footer form content.

Not selected:

- `src/components/AppCombo.tsx`: small combo/dropdown surface.
- `src/screens/foreman/ForemanDropdown.tsx`: dropdown/picker scope.
- `src/screens/buyer/components/BuyerItemRow.tsx`: supplier dropdowns inside a row.
- `src/screens/buyer/components/BuyerMobileItemEditorModal.tsx`: supplier picker plus a header-only scrolling list.
- Type-only or existing FlashList files such as `ResultsBottomSheet`, `MarketHomeScreen`,
  `BuyerInboxSheetBody`, and `DirectorDashboard`.

## Estimates

- `ChatScreen`: `estimatedItemSize={88}`
- `WorkMaterialsEditor`: `estimatedItemSize={148}`
- `BuyerReworkSheetBody`: `estimatedItemSize={164}`

## Behavior Guardrails

- Item rendering logic changed: NO
- Key extractor semantics changed: NO
- Sorting/filtering/pagination changed: NO
- Empty-state behavior changed: NO
- Refresh behavior changed: NO
- Business callbacks changed: NO
- Styles redesigned: NO
- SQL/RPC changed: NO
- Runtime config changed: NO
- Maestro YAML changed: NO
- OTA published: NO

## Count

- Real production JSX `FlatList` usages before: 9
- Real production JSX `FlatList` usages after: 6
- Production files containing `FlatList` text before: 13
- Production files containing `FlatList` text after: 11

The remaining real JSX `FlatList` usages are picker/dropdown oriented and are deferred to avoid
scope expansion.
