# Role Screen Slot Mapping (Read-Only)

## Purpose
This document defines safe insertion slots for shared UI primitives across role screens.
Goal: enable controlled visual micro-patches without behavior drift.

Scope: documentation only.
- No code changes
- No refactor start
- No screen behavior changes

## Screen Zones
- Header
- Top actions
- Section tabs
- Filters
- Work context
- Summary / counters
- Content
- Bottom CTA
- Modals / overlays

## Primitive -> Zone Mapping

### StatusBadge
Allowed zones:
- Summary / counters (read-only metrics)
- Read-only status labels (payment/material/request state labels)
- Receipt/payment/material status display (passive)

Not allowed zones:
- Row controls
- CTA area
- Tab triggers
- Interactive cards

Conditions:
- Keep existing semantics unchanged
- No handler wiring
- No layout contract rewiring

### SectionBlock
Allowed zones:
- Static section wrappers
- Visual grouping blocks
- Read-only section framing

Not allowed zones:
- List containers
- Scroll containers
- Dynamic row rendering containers

Conditions:
- Wrapper must be non-structural
- No impact on list virtualization/scroll behavior

## Safe Slots
- Read-only badge slot
- Passive counter chip slot
- Static section title slot
- Non-structural visual wrapper slot

## Dangerous Slots (High Risk)
- `AppRoleCard`
- `ListRow`
- `ScreenHeader`
- `PrimaryButton`
- `Tabs` triggers
- `CTA` container
- Navigation cards
- Draft footer

Rationale:
These slots commonly carry interaction, routing, loading/disabled contracts, or flow semantics.

## Role Mapping

### Director
Safe slots:
- Summary counters badges
- Passive status labels in control cards
- Static section wrappers around read-only blocks

Blocked zones:
- Section-tab behavior
- Card interaction/CTA semantics
- Cross-role navigation model

### Foreman
Safe slots:
- Read-only status labels in history/modals
- Passive counter chips
- Static wrappers for non-dynamic informational sections

Blocked zones:
- Object/level/system/zone context flow
- Draft footer and request creation actions
- PDF/history/draft modal behavior

### Buyer
Safe slots:
- Read-only status badges in passive summary areas
- Static wrappers for non-interactive section groups

Blocked zones:
- List row interactions
- Contract/procurement CTA semantics
- Filter/tab wiring and approval-linked behavior

### Warehouse
Safe slots:
- Passive status/counter badges (read-only)
- Static wrappers for informational section headers

Blocked zones:
- Receiving/issue ledger behaviors
- List container/scroll contracts
- CTA and action routing behavior

### Accountant
Safe slots:
- Payment/status read-only badge slots
- Passive counters in summary area
- Static section wrappers around informational blocks

Blocked zones:
- Payment flow actions
- Period/filter semantics
- Form submission and disabled/loading contracts

### Contractor
Safe slots:
- Passive status labels
- Static non-interactive wrappers

Blocked zones:
- Approved subcontract execution flow
- QR/code access behavior
- Action/CTA semantics

### Supplier Goods
Safe slots:
- Passive catalog status badges
- Static wrapper sections for read-only groups

Blocked zones:
- Offer/price availability logic
- Marketplace action wiring
- Interactive listing controls

### Supplier Services
Safe slots:
- Passive service status badges
- Static wrapper sections for read-only groups

Blocked zones:
- Timeline/conditions behavior
- Marketplace action wiring
- Interactive listing controls

## Integration Priority (Safety Ladder)
1. Read-only badge replacement
2. Static section wrapper
3. Passive counters
4. Typography normalization
5. CTA-area work (later phase only)

## Guardrails
- Do not modify current screens in this phase
- Do not start refactor from this document
- Do not change code/routing/state/data-flow
- Use this mapping only to plan safe visual patches

## Usage Rule
Any candidate micro-patch must include:
- Target role
- Target zone
- Target slot type
- Primitive used
- Risk level
- Expected no-drift proof

If the patch touches dangerous slots, it must be moved to a separate task.
