# Visual Audit Report

Phase: 0 (read-only)
Source spec: `docs/follow-up/role-visual-unification-spec.md`
Scope: role UI state description only, no refactor proposals.

## Role: Director
### Header
- Collapsing sticky header (`Animated.View`) with title "Контроль".
- Two tab levels in header area: top role sections and sub-tab (Прораб/Снабженец).
- Header includes KPI pills under tabs.

### Screen shell
- Full dark shell, high z-index sticky header, content padded under header.

### Cards
- Foreman request list uses dark bordered cards (`s.mobCard`) with explicit "Открыть" CTA block.
- Finance/report blocks use mixed card styles (`groupHeader`, `mobCard`).

### List rows
- Request rows: title + date/meta + separate right-side CTA button.
- Proposal rows rendered via `ProposalRow` component contract.

### Buttons
- Explicit CTA buttons are present in rows and finance/report cards.

### Tabs / segments
- Strong tabbed navigation pattern (top tabs + sub-tabs), horizontal scrollable top tabs.

### Search / filters
- No global inline search bar in dashboard body.
- Filtering is tab-driven and modal-driven for finance/reports.

### Badges / chips
- KPI pills in header; mixed status visuals across finance sections.

### Empty states
- Explicit empty text for request/proposal list sections.

### Loading states
- RefreshControl-based loading + KPI placeholders + toast overlay.

### Visual deviations
- Mixed CTA patterns between sections (button-style vs card-click style by subsection).
- Multiple card families inside one role screen.

---

## Role: Buyer / Снабженец
### Header
- Sticky/collapsing header via `BuyerStickyHeader` + `BuyerScreenHeader`.
- Header includes role tabs with counters.

### Screen shell
- Dark full-screen shell with absolute search strip under header.
- Bottom sheet shell used for all detailed flows.

### Cards
- Multiple card types: inbox group blocks, proposal cards, sheet-specific cards.
- Visual system is relatively cohesive but has many specialized variants.

### List rows
- Item rows include rich meta, inline editing fields, supplier suggestions.
- Proposal cards and inbox groups differ in density and CTA style.

### Buttons
- Mix of icon square button, primary send button, wide app button, sheet footer actions.

### Tabs / segments
- Main tabs + subcontract sub-mode; tab counters shown in header.

### Search / filters
- Dedicated top search input (absolute positioned) for main list filtering.

### Badges / chips
- Status colors, chips, counters appear across header/cards/sheets.

### Empty states
- Handled mainly by list-level components; present but style varies by section.

### Loading states
- Refreshing states + per-action busy + document busy states + toast overlay.

### Visual deviations
- High component diversity in one screen; repeated but non-identical button/card patterns.

---

## Role: Foreman / Прораб
### Header
- Collapsing header with dynamic title (Заявка/Материалы/Подряды).
- FIO shown in header with modal trigger.

### Screen shell
- Dark shell with glow layer and centered entry mode cards.

### Cards
- Entry mode cards (`[ Материалы ]`, `[ Подряды ]`) are large and visually distinct.
- Request item cards and history/draft cards use separate visual families.

### List rows
- Request item rows with qty/meta and cancel/edit actions (status-dependent).

### Buttons
- Strong modal/button ecosystem (catalog, calc, draft actions, send/delete/pdf).

### Tabs / segments
- Role-level mode switch implemented as two large pressable cards, not classic tabs.

### Search / filters
- Search occurs in catalog modal path, not as global on-screen search bar.

### Badges / chips
- Status styles and request-state chips appear in modals/history.

### Empty states
- Present through history/draft/list component fallbacks.

### Loading states
- Global busy keys + draft/action loading + pdf busy indicators.

### Visual deviations
- Distinct "big mode switch" visual pattern compared to other roles.
- Mixed inline styles and style module usage in same screen.

---

## Role: Warehouse / Склад
### Header
- Sticky/collapsing warehouse header with tab counters and FIO trigger.

### Screen shell
- Dark shell with sticky header (web-specific sticky style) and fixed content paddings.

### Cards
- Cardized tab content via warehouse components (incoming/stock/issue/reports).

### List rows
- Specialized row components for stock/incoming/issue/history.

### Buttons
- Operational buttons in modal/tab components; role entry guarded by FIO confirmation.

### Tabs / segments
- Header tab switch for incoming/stock/issue/reports behavior.

### Search / filters
- Search/filter logic exists in warehouse hooks/components; pattern differs from Buyer search strip.

### Badges / chips
- Counter-driven header tabs and status/meta badges in row components.

### Empty states
- Explicit loading gate and FIO-required gate with explanatory text.

### Loading states
- Central loading screen with activity indicator + text.

### Visual deviations
- More operational/admin style; less marketing-style card treatment.

---

## Role: Accountant / Бухгалтер
### Header
- Animated header (`AccountantHeader`) with tabs, unread bell, row count, FIO entry.

### Screen shell
- Safe-area aware shell with list block + card modal workflow.

### Cards
- List rows, history cards, modal card content, receipt card sections.

### List rows
- Separate row systems for inbox vs history.
- Supplier/invoice/payment metadata is dense and form-oriented.

### Buttons
- Card modal action buttons (pay/return/pdf/etc.), period controls, notification actions.

### Tabs / segments
- Multi-tab accounting states (pay/partial/paid/rework/history + subcontracts).

### Search / filters
- History search with debounce + date period picker.

### Badges / chips
- Payment/status chips and role badges across list/modal sections.

### Empty states
- Through list components and history section behavior.

### Loading states
- List loading/refresh, history loading, modal busy keys.

### Visual deviations
- Form-heavy modality and dense finance UI differs strongly from operational roles.

---

## Role: Contractor / Подрядчик
### Header
- Compact static role header ("Подрядчик") in active mode.
- Separate activation screen when user is not activated as contractor.

### Screen shell
- Dark shell with glow and heavy modal-driven execution workflow.

### Cards
- Subcontract cards list as primary entry point.
- Multiple modal card systems: work modal, act builder, estimate, contract details.

### List rows
- Unified subcontract list rows in home.
- Work/act rows inside modal subsystems.

### Buttons
- Activation CTA, work modal actions, act-builder submit/control actions.

### Tabs / segments
- No classic top tab system on home; mode changes are modal/state-based.

### Search / filters
- Work-material search is modal-local with dedicated controller.

### Badges / chips
- Status and progress text/chips through contractor components.

### Empty states
- Loading view and activation view are explicit alternative states.

### Loading states
- Dedicated loading screen + modal-level loading/busy hints.

### Visual deviations
- Activation/operations split gives this role a distinct two-mode visual identity.

---

## Role: Supplier Goods / Поставщик товаров
### Header
- No dedicated supplier-goods role screen found in `app/(tabs)`.

### Screen shell
- Marketplace representation exists via `supplierMap` (`MapScreen`) and buyer supplier flows.

### Cards
- In map flow, data is represented as markers, bottom sheets, and listing cards in map components.

### List rows
- No dedicated tab-screen row list for this role in current tabs architecture.

### Buttons
- Map/search/filter/fab style controls inside map module.

### Tabs / segments
- No dedicated supplier-goods tabs in role tab bar.

### Search / filters
- Present in marketplace map (`TopSearchBar`, `FiltersModal`, catalog search).

### Badges / chips
- Kind/side filtering exists in marketplace flow.

### Empty states
- Not role-screen-specific; handled by map/listing component states.

### Loading states
- Map data load states present in map module.

### Visual deviations
- Role represented as marketplace module, not dedicated internal role screen.

---

## Role: Supplier Services / Поставщик услуг
### Header
- No dedicated supplier-services role screen found in `app/(tabs)`.

### Screen shell
- Services side appears within shared marketplace map/filter model.

### Cards
- Services listings represented in map/listing format, not dedicated role dashboard.

### List rows
- No dedicated services role list screen in tabs.

### Buttons
- Shared marketplace controls (search/filter/offer-demand interactions).

### Tabs / segments
- No dedicated supplier-services tabs in role tab bar.

### Search / filters
- Service kind filtering handled in map filter model.

### Badges / chips
- Shared marketplace kind/side semantics.

### Empty states
- Component-level map/list empty handling.

### Loading states
- Component-level map load behavior.

### Visual deviations
- External services role currently modeled as marketplace participation, not standalone role UI.

---

## Global visual inconsistencies
- Header patterns differ substantially: collapsing sticky (Director/Buyer/Foreman/Warehouse/Accountant) vs static compact (Contractor active), plus activation screen mode.
- Card systems are not unified: explicit CTA cards, implicit card-tap cards, modal cards, finance/form cards coexist.
- Button systems vary by role (size, geometry, semantics, placement).
- Tab systems vary (multi-level tabs, chip tabs, mode cards, modal-state modes).
- Search/filter placement differs (inline absolute search strip, modal-local search, no global search in some roles).
- Badge/chip styles are role-specific with different visual weights.
- Empty/loading states vary from dedicated full-screen gates to list-level text placeholders.

## Repeated UI patterns observed (candidate shared primitives)
- Collapsing/sticky role header shell
- Section tab shell with count badges
- Standardized role card shell variants
- Standardized list row meta block
- Unified search input shell
- Unified status chip/badge primitives
- Unified empty/loading state shells
