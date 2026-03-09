# UI Contract

All role screens must use:

- `RoleScreenLayout`
- `SectionBlock`
- `StatusBadge`

Root screen wrappers are forbidden for role screens:

- `View style={s.screen}`
- `View style={styles.screen}`
- `PageWrapper`
- `ScreenWrapper`
- `ContainerLayout`

Sections must use:

- `SectionBlock`

Status chips/pills must use:

- `StatusBadge`

Notes:

- This contract applies to role screens (`director`, `foreman`, `buyer`, `warehouse`, `accountant`, `contractor`).
- Non-role screens (for example `profile`) may use local layout wrappers if needed.
