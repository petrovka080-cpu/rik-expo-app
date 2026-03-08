# Action Hierarchy Spec

## Purpose
Fix action semantics before large-scale UI unification.

## 1) Action Types

### Primary CTA
Main screen action.
- Only one per screen.
- Must use primary button style.
- Must not live inside list rows.

### Inline Actions
Section-level secondary actions.
- Exist inside a section context.
- Example: "Смотреть все" in section header.
- Never treated as primary CTA.

### Row Actions
Item-level actions for a list row.
- Examples: open, edit, delete, details.
- Must not look like primary CTA.

## 2) Core Rule
**Exactly one Primary CTA per screen.**

## 3) Layout Hierarchy
```text
Header
Section tabs
Filters
SectionBlock (optional inline action)
List (row actions)
Primary CTA
```

## 4) Forbidden Patterns
- Multiple primary CTAs on one screen.
- Primary CTA inside list rows.
- Row actions styled as primary CTA.
- Filters styled/used as action buttons.
- Counters styled/used as actions.

## 5) Role Mapping

### Director
- Primary CTA: usually none (control/approval screen).
- Focus: monitoring and decisions, not creation-heavy flows.

### Foreman
- Primary CTA: `Создать заявку`

### Buyer
- Primary CTA: `Создать подряд`

### Warehouse
- Primary CTA: `Добавить приход`

### Accountant
- Primary CTA: `Создать платёж`

### Contractor
- Primary CTA: `Сформировать акт`

### Supplier Goods
- Primary CTA: `Добавить товар`

### Supplier Services
- Primary CTA: `Добавить услугу`

## 6) Non-Goals
This spec does not:
- change code
- change logic
- change routing
- trigger refactor by itself

Documentation only.
