# UI Primitives Candidates

Source: `docs/follow-up/visual-audit-report.md`
Phase: Post style-pass, candidate definition only
Constraint: Documentation-only. No code, logic, routing, interaction-contract changes.

## Purpose
Define neutral shared UI primitives that can unify visuals across roles without behavior drift.

Roles covered:
- Director
- Foreman
- Buyer / Снабженец
- Contractor / Подрядчик
- Supplier Goods / Поставщик товаров
- Supplier Services / Поставщик услуг
- Warehouse / Склад
- Accountant / Бухгалтер

## Selection Rule
A candidate is acceptable only if it is presentation-only and does not embed:
- navigation behavior
- data fetching
- role logic
- implicit CTA behavior
- loading/disabled semantics beyond visual rendering
- press-scale/opinionated interaction defaults

---

## 1) ScreenHeader
### Why first
Headers are visually inconsistent across almost all roles.

### Proposed API
```ts
type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
};
```

### Safe boundary
- Visual layout only: title/subtitle alignment, spacing, shell.
- Accept externally provided left/right nodes.

### Forbidden in primitive
- router/navigation calls
- role switching logic
- fetching or state orchestration

---

## 2) SectionBlock
### Why first
Section title + content shells repeat in Director/Buyer/Accountant/Warehouse.

### Proposed API
```ts
type SectionBlockProps = {
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
};
```

### Safe boundary
- Section spacing, divider, title row structure.

### Forbidden in primitive
- conditional business visibility
- action ownership logic

---

## 3) ListRow
### Why first
Role list rows share common structure but differ in spacing/visual hierarchy.

### Proposed API
```ts
type ListRowProps = {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  meta?: React.ReactNode;
};
```

### Safe boundary
- Layout slots only; no built-in click behavior semantics.

### Forbidden in primitive
- implicit chevron navigation rules
- embedded press-scale defaults
- hidden CTA conversion

---

## 4) PrimaryButton
### Why first
Primary action buttons vary heavily by role in visual style.

### Proposed API
```ts
type PrimaryButtonProps = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
};
```

### Safe boundary
- Visual standardization: size, radius, typography, color states.

### Forbidden in primitive
- operation orchestration
- business-rule gating
- side effects

---

## 5) StatusBadge
### Why first
Status badges/chips are inconsistent in shape, tone, and text weight across roles.

### Proposed API
```ts
type StatusBadgeProps = {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger";
};
```

### Safe boundary
- Visual token mapping only (text/background/border).

### Forbidden in primitive
- status derivation from raw business state
- role-specific mapping logic in component body

---

## Not in current primitive phase
The following are explicitly excluded from this phase:
- `AppRoleCard` rollout
- `DirectorProposalRow` migration
- `DirectorDashboard` interaction rewrite
- `buyer.tsx` rewiring
- `foreman.tsx` refactor
- routing/flow/data-layer changes

---

## Candidate adoption order (recommended)
1. ScreenHeader
2. SectionBlock
3. StatusBadge
4. PrimaryButton
5. ListRow

Rationale: start with low-risk shells/tokens, then reusable controls, then row structure.

## Acceptance checklist for future implementation
A primitive implementation is acceptable only if:
- visual-only delta
- no interaction contract drift
- no CTA contract drift
- no loading/disabled semantic drift
- no navigation/data-flow changes
- no role-model changes
