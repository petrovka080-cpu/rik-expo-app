# Foreman Screen Blueprint (Read-Only)

## Purpose
This document captures the composition blueprint of the Foreman screen to speed up future role-screen work without changing behavior.

Scope of this step: documentation only. No code, no routing/state/flow changes.

## Source Files Reviewed
- `app/(tabs)/foreman.tsx`
- `src/screens/foreman/ForemanEditorSection.tsx`
- Related modals/hooks were reviewed only for boundaries.

## Blueprint Layers

### 1. Screen Shell Zone
- `KeyboardAvoidingView` root.
- Main container with background and glow.
- Collapsing header infrastructure (`useCollapsingHeader`) drives top spacing and header animation.

Classification: Logic-bound + visual.
- Visual shell is reusable in concept.
- Header height/shadow coupling with scroll is behavior-sensitive.

### 2. Header Zone
- Animated header title switches by main tab:
  - `Заявка` / `Материалы` / `Подряды`.
- Foreman identity label opens FIO modal.
- Close button returns from selected main tab to chooser.

Classification: Logic-bound.
- Title and controls depend on `foremanMainTab`, `foreman`, modal state.

### 3. Top Actions Zone (Main Tab Selector)
- When no main tab selected, two large entry actions are shown:
  - `[ Материалы ]`
  - `[ Подряды ]`
- Sets `foremanMainTab` and switches screen branch.

Classification: Logic-bound.
- This is mode-selection behavior, not pure visual block.

### 4. Work Context Zone (4-input context header)
Inside `ForemanEditorSection` (materials branch):
- Object / Block (required)
- Locator / Level (context-adapted)
- System
- Zone
- Context confidence hint for low-confidence mapping

Classification: Strong logic-bound.
- Connected to canonical dicts, context resolver, validation/sanitization, and request header meta sync.
- Must preserve object/level/system/zone semantics.

### 5. Filters / Work-Type Picker Zone
Inside `ForemanEditorSection`:
- `Каталог` action
- `Смета` action
- Guarded by draft/editability checks.

Classification: Logic-bound.
- Looks like visual tabs/buttons, but behavior is guarded by draft/read-only constraints.

### 6. Content List / Draft Entry Zone
Inside `ForemanEditorSection`:
- Draft card (`ЧЕРНОВИК`, display number, hint, positions count).
- Opens draft modal; card reflects state (`itemsCount`, current label).

Classification: Mixed.
- Card shell can be visually standardized later.
- Card content/affordance is state-driven and behavior-sensitive.

### 7. Bottom CTA Zone
Inside `ForemanEditorSection`:
- Sticky mini bar with `История` action.
- Opens history modal; disabled when busy.

Classification: Logic-bound.
- Placement is visual; action contract is behavior-sensitive.

### 8. Modal/Flow Zone (Attached to materials branch)
- `ForemanHistoryModal`
- `CatalogModal`
- `WorkTypePicker`
- `CalcModal`
- `ForemanDraftModal`
- `WarehouseFioModal`

Classification: Strong logic-bound.
- These represent request creation, history, draft/PDF, calculator/catalog flows.

## Visual vs Logic Boundary

### Safe Visual Layers (candidate-only)
- Container/background token alignment.
- Neutral spacing token normalization (if no hierarchy/flow drift).
- Typography token harmonization for labels/titles where text semantics stay unchanged.
- Non-interactive section wrappers around existing blocks (future, controlled).

### Logic-Bound Layers (do not touch in visual phase)
- Main tab branching (`materials` / `subcontracts`).
- 4-input context behavior and validation.
- Draft gating / read-only checks.
- History/catalog/calculator/draft/PDF modal wiring.
- FIO modal open/confirm flow.
- Busy/disabled semantics.

## Zone Map (Concise)
1. Header zone
2. Top actions zone (mode selector)
3. Work context zone (4 inputs)
4. Filter/work-type zone
5. Content list/draft entry zone
6. Bottom CTA zone
7. Modal flow zone

## Guardrails for Next Integration Steps
- Any first UI integration on Foreman must be single-point, visual-only, and outside logic-bound contracts.
- No changes to:
  - object/level/system/zone flow
  - request creation
  - draft logic
  - PDF/share flow
  - history flow
  - CTA semantics and disabled/loading behavior

## Non-Goals (this step)
- No refactor.
- No layout rewiring.
- No component migration.
- No behavior changes.
