# Role System Overview

## Purpose
This document describes the role architecture as a construction ERP with an external marketplace layer.
It defines role boundaries, interactions, and core flows for engineering and product alignment.

## System Model
The platform is not just a set of screens. It is a 3-layer operating model:

1. Construction ERP core (internal operations)
2. External marketplace layer (goods and services sourcing)
3. Subcontract execution layer (approved work delivery)

## Role Map

### Internal ERP Roles
- Director
- Buyer / Снабженец
- Foreman / Прораб
- Warehouse / Склад
- Accountant / Бухгалтер

### External Marketplace Roles
- Contractor / Подрядчик
- Supplier Goods / Поставщик товаров
- Supplier Services / Поставщик услуг

## Role Responsibilities

### Director (Control/Approval Layer)
- Owns executive control and approval gates.
- Sees cross-role status, risks, and bottlenecks.
- Approves/rejects key requests and proposals.
- Interacts with Buyer, Accountant, Foreman, and Warehouse as decision authority.
- Position in flow: control layer above operational execution.

### Buyer / Снабженец (Procurement + External Sourcing Orchestration)
- Converts demand into procurement actions.
- Runs supplier selection and proposal handling.
- Coordinates material and service sourcing externally.
- Interacts with marketplace suppliers and contractor channels.
- Position in flow: bridge between internal demand and external supply.

### Foreman / Прораб (Operational Demand Generation)
- Generates operational requests from site execution reality.
- Defines object/locator/system/zone context and item demand.
- Initiates demand for materials/services/subcontracts.
- Interacts with Buyer and Warehouse for fulfillment.
- Position in flow: origin of field demand.

### Warehouse / Склад (Stock / Receiving / Issue / Ledger)
- Manages inventory, receipts, issues, and stock ledger discipline.
- Confirms factual issuance and movement records.
- Interacts with Foreman demand and Buyer supply outcomes.
- Position in flow: inventory control and factual fulfillment.

### Accountant / Бухгалтер (Financial Control / Payments / Acts)
- Controls financial documents, payable states, and settlement steps.
- Validates invoices/acts/payment readiness.
- Interacts with Director approvals and procurement outcomes.
- Position in flow: financial governance and closure.

### Contractor / Подрядчик (Approved Subcontract Execution)
- Executes approved subcontract scopes.
- Works under approved commercial/operational constraints.
- Interacts with Buyer and Director-controlled approval chain.
- Position in flow: external execution of approved work packages.

### Supplier Goods / Поставщик товаров (Materials Marketplace)
- Provides material supply offers and delivery terms.
- Participates in external RFQ/proposal cycle for goods.
- Interacts mainly with Buyer orchestration.
- Position in flow: external source for material stream.

### Supplier Services / Поставщик услуг (Services Marketplace)
- Provides service offers for specialized work packages.
- Participates in external sourcing for service demand.
- Interacts mainly with Buyer and approved execution path.
- Position in flow: external source for service stream.

## Three Operating Contours

### 1) Internal ERP Contour
- Foreman demand creation
- Buyer orchestration
- Warehouse factual movement
- Accountant financial control
- Director approvals and supervision

### 2) Marketplace Contour
- Buyer publishes sourcing demand
- Supplier Goods and Supplier Services respond
- Buyer evaluates and routes to approval/next step

### 3) Subcontract Execution Contour
- Approved subcontract scope goes to Contractor
- Contractor executes
- Internal roles monitor, account, and close control loops

## Core Flows

### Materials Flow
1. Foreman creates material demand.
2. Buyer sources through suppliers and internal procurement pipeline.
3. Director approves where required.
4. Warehouse receives/issues and records factual movement.
5. Accountant processes financial closure.

### Services/Subcontract Flow
1. Foreman identifies service/execution need.
2. Buyer sources service market / subcontract options.
3. Director approval gate validates selection.
4. Contractor executes approved scope.
5. Accountant and control roles close financial/act cycle.

### Director Control Flow
1. Director observes status across requests, proposals, finance, stock, reports.
2. Director applies approval/reject/control decisions.
3. Decisions propagate to Buyer/Accountant/Warehouse/Foreman execution paths.

## ASCII Architecture Diagram

```text
                         [ Director ]
                      (Control / Approval)
                               |
        -------------------------------------------------
        |                    |                 |         |
     [ Foreman ]         [ Buyer ]        [ Warehouse ] [ Accountant ]
 (Demand generation)  (Procurement hub)  (Stock ledger) (Finance control)
        |                    |
        |                    +-------------------------------+
        |                                                    |
        |                                          [ Marketplace Layer ]
        |                                         /                       \
        |                              [ Supplier Goods ]        [ Supplier Services ]
        |                                                    
        +---------------------> [ Contractor ] <---------------------------+
                         (Approved subcontract execution)
```

## Why This Matters for Developers
- Prevents role-mixing bugs and hidden behavior drift.
- Clarifies ownership boundaries for screens, hooks, and APIs.
- Reduces accidental coupling between UI polish and business logic.
- Enables phased delivery: UI, interaction, data-layer changes separately.
- Improves test planning by role and by contour.

## Why This Matters for Investors
- Shows scalable operational architecture, not isolated features.
- Demonstrates control and auditability across procurement and execution.
- Supports marketplace expansion with clear internal governance.
- Lowers execution risk via explicit approval and financial control layers.
- Increases confidence in growth readiness for multi-role construction ops.

## Non-Goals of This Document
- No code changes
- No role-model rewiring
- No route/screen behavior changes
- No refactoring scope

This is architecture documentation only.
