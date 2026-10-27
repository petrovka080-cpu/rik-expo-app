import type {
  ConstructionDomainPlaybook,
  ConstructionExternalPreviewPolicy,
  ConstructionKnowhowRoleId,
  RiskRule,
} from "./constructionKnowhowTypes";

const ALL_ROLES: ConstructionKnowhowRoleId[] = [
  "director_control",
  "buyer",
  "warehouse",
  "accountant",
  "foreman",
  "contractor",
];

const CONTROL_AND_FIELD: ConstructionKnowhowRoleId[] = [
  "director_control",
  "foreman",
];

const CONTROL_PROCUREMENT: ConstructionKnowhowRoleId[] = [
  "director_control",
  "buyer",
  "warehouse",
  "foreman",
];

const CONTROL_FINANCE: ConstructionKnowhowRoleId[] = [
  "director_control",
  "accountant",
];

function riskRule(
  ruleId: string,
  signal: string,
  riskLevel: RiskRule["riskLevel"],
  urgency: RiskRule["urgency"],
  approvalRequired = riskLevel === "high",
): RiskRule {
  return {
    ruleId,
    signal,
    riskLevel,
    urgency,
    approvalRequired,
    evidenceRequired: true,
  };
}

function playbook(params: {
  domainId: ConstructionDomainPlaybook["domainId"];
  professionalGoal: string;
  roleScopes: ConstructionKnowhowRoleId[];
  safeReadUseCases: string[];
  draftUseCases: string[];
  approvalRequiredUseCases: string[];
  forbiddenUseCases: string[];
  internalDataSources: string[];
  externalPreviewPolicy?: ConstructionExternalPreviewPolicy;
  riskRules: RiskRule[];
}): ConstructionDomainPlaybook {
  return {
    domainId: params.domainId,
    professionalGoal: params.professionalGoal,
    roleScopes: params.roleScopes,
    evidenceRequired: true,
    safeReadUseCases: params.safeReadUseCases,
    draftUseCases: params.draftUseCases,
    approvalRequiredUseCases: params.approvalRequiredUseCases,
    forbiddenUseCases: params.forbiddenUseCases,
    internalDataSources: params.internalDataSources,
    externalPreviewPolicy: params.externalPreviewPolicy ?? "disabled",
    riskRules: params.riskRules,
  };
}

export const CONSTRUCTION_DOMAIN_PLAYBOOKS = [
  playbook({
    domainId: "project_planning",
    professionalGoal:
      "Connect schedule, constraints, blockers, and approval state before field work is committed.",
    roleScopes: CONTROL_AND_FIELD,
    safeReadUseCases: ["read project plan", "review blockers", "summarize daily constraints"],
    draftUseCases: ["draft lookahead plan", "draft foreman question list"],
    approvalRequiredUseCases: ["submit schedule change for approval"],
    forbiddenUseCases: ["change committed schedule without approval", "hide unresolved blocker"],
    internalDataSources: ["projects", "tasks", "reports", "approval_ledger"],
    riskRules: [
      riskRule("project_planning_blocker_due_now", "blocked task due now", "high", "now"),
      riskRule("project_planning_missing_owner", "task has no owner", "medium", "today", true),
    ],
  }),
  playbook({
    domainId: "bim_information_management",
    professionalGoal:
      "Keep construction information controlled, versioned, role-scoped, and document-backed.",
    roleScopes: ["director_control", "foreman", "contractor"],
    safeReadUseCases: ["read document version status", "check model information gap"],
    draftUseCases: ["draft information request", "draft document control note"],
    approvalRequiredUseCases: ["submit design information change for approval"],
    forbiddenUseCases: ["publish uncontrolled model data", "return raw document rows"],
    internalDataSources: ["documents", "projects", "reports", "approval_ledger"],
    externalPreviewPolicy: "citations_required_preview_only",
    riskRules: [
      riskRule("bim_missing_revision", "missing revision or checked-at evidence", "medium", "today", true),
      riskRule("bim_unapproved_information_change", "unapproved information change", "high", "now"),
    ],
  }),
  playbook({
    domainId: "procurement",
    professionalGoal:
      "Compare request need, catalog fit, supplier availability, warehouse impact, and approval path.",
    roleScopes: CONTROL_PROCUREMENT,
    safeReadUseCases: ["search internal catalog", "compare request to stock", "read supplier status"],
    draftUseCases: ["draft purchase request", "draft supplier question list"],
    approvalRequiredUseCases: ["submit procurement choice for approval"],
    forbiddenUseCases: ["confirm supplier directly", "create order directly", "invent supplier"],
    internalDataSources: ["requests", "catalog", "suppliers", "warehouse", "marketplace", "approval_ledger"],
    externalPreviewPolicy: "citations_required_preview_only",
    riskRules: [
      riskRule("procurement_need_uncovered", "requested material is not covered", "high", "now"),
      riskRule("procurement_supplier_term_risk", "supplier cheaper but late", "medium", "today", true),
    ],
  }),
  playbook({
    domainId: "supplier_selection",
    professionalGoal:
      "Score supplier options by price, delivery, reliability, document readiness, and approval risk.",
    roleScopes: ["director_control", "buyer"],
    safeReadUseCases: ["read supplier comparison", "review supplier risk score"],
    draftUseCases: ["draft comparison memo", "draft negotiation checklist"],
    approvalRequiredUseCases: ["submit supplier selection for approval"],
    forbiddenUseCases: ["finalize supplier without approval", "fabricate supplier evidence"],
    internalDataSources: ["suppliers", "requests", "marketplace", "documents", "approval_ledger"],
    externalPreviewPolicy: "citations_required_preview_only",
    riskRules: [
      riskRule("supplier_missing_documents", "supplier lacks required document", "medium", "today", true),
      riskRule("supplier_delivery_uncertain", "delivery date is uncertain", "high", "now"),
    ],
  }),
  playbook({
    domainId: "warehouse_material_flow",
    professionalGoal:
      "Control stock thresholds, movements, shortages, and confirmations before execution reaches the field.",
    roleScopes: ["director_control", "warehouse", "buyer", "foreman"],
    safeReadUseCases: ["read stock level", "review movement history", "check shortage risk"],
    draftUseCases: ["draft stock action", "draft transfer request"],
    approvalRequiredUseCases: ["submit stock adjustment for approval"],
    forbiddenUseCases: ["mutate stock directly", "confirm movement without evidence"],
    internalDataSources: ["warehouse", "materials", "movements", "requests", "approval_ledger"],
    riskRules: [
      riskRule("warehouse_below_safe_threshold", "stock below safe threshold", "high", "now"),
      riskRule("warehouse_unconfirmed_movement", "movement lacks confirmation", "medium", "today", true),
    ],
  }),
  playbook({
    domainId: "field_execution",
    professionalGoal:
      "Tie daily field work to materials, reports, acts, contractors, and approval status.",
    roleScopes: ["director_control", "foreman", "contractor"],
    safeReadUseCases: ["read field tasks", "review report readiness", "check material blocker"],
    draftUseCases: ["draft daily report", "draft contractor question"],
    approvalRequiredUseCases: ["submit execution change for approval"],
    forbiddenUseCases: ["close field work without act evidence", "expose other contractor records"],
    internalDataSources: ["projects", "reports", "acts", "warehouse", "contractors", "approval_ledger"],
    riskRules: [
      riskRule("field_missing_material", "field task depends on missing material", "high", "now"),
      riskRule("field_report_not_closed", "daily report not closed", "medium", "today", true),
    ],
  }),
  playbook({
    domainId: "quality_control",
    professionalGoal:
      "Surface quality blockers through evidence, documents, acts, and role-safe escalation.",
    roleScopes: ["director_control", "foreman", "contractor"],
    safeReadUseCases: ["read quality checklist", "review open defect"],
    draftUseCases: ["draft quality note", "draft corrective action preview"],
    approvalRequiredUseCases: ["submit corrective action for approval"],
    forbiddenUseCases: ["mark quality issue resolved without evidence"],
    internalDataSources: ["reports", "acts", "documents", "contractors", "approval_ledger"],
    riskRules: [
      riskRule("quality_open_defect", "open quality defect", "high", "today"),
      riskRule("quality_missing_photo_or_act", "missing supporting act or report", "medium", "today", true),
    ],
  }),
  playbook({
    domainId: "document_control",
    professionalGoal:
      "Control acts, reports, contracts, revisions, and missing closure evidence without returning raw rows.",
    roleScopes: ALL_ROLES,
    safeReadUseCases: ["read document status", "summarize missing closure", "check act readiness"],
    draftUseCases: ["draft act summary", "draft document request"],
    approvalRequiredUseCases: ["submit document package for approval"],
    forbiddenUseCases: ["send document directly", "return raw document payload"],
    internalDataSources: ["documents", "acts", "reports", "contracts", "approval_ledger"],
    externalPreviewPolicy: "citations_required_preview_only",
    riskRules: [
      riskRule("document_missing_closure", "document is missing closure", "medium", "today", true),
      riskRule("document_unapproved_change", "document change is unapproved", "high", "now"),
    ],
  }),
  playbook({
    domainId: "finance_cost_control",
    professionalGoal:
      "Connect cost, debts, acts, payments, and approval state before financial action is proposed.",
    roleScopes: CONTROL_FINANCE,
    safeReadUseCases: ["read finance summary", "review overdue debt", "check act-payment gap"],
    draftUseCases: ["draft finance memo", "draft director summary"],
    approvalRequiredUseCases: ["submit payment-related action for approval"],
    forbiddenUseCases: ["post payment directly", "change debt status directly"],
    internalDataSources: ["finance", "acts", "documents", "contractors", "approval_ledger"],
    riskRules: [
      riskRule("finance_overdue_debt", "overdue debt", "high", "today"),
      riskRule("finance_act_without_payment_link", "act lacks payment closure", "medium", "today", true),
    ],
  }),
  playbook({
    domainId: "accounting",
    professionalGoal:
      "Make accounting summaries evidence-backed and draft-only until ledger-approved execution exists.",
    roleScopes: CONTROL_FINANCE,
    safeReadUseCases: ["read accounting snapshot", "review act/payment mismatch"],
    draftUseCases: ["draft accounting summary", "draft payment question"],
    approvalRequiredUseCases: ["submit accounting correction for approval"],
    forbiddenUseCases: ["post accounting mutation", "change payment status from UI"],
    internalDataSources: ["finance", "documents", "acts", "reports", "approval_ledger"],
    riskRules: [
      riskRule("accounting_mismatch", "act and payment mismatch", "high", "today"),
      riskRule("accounting_missing_document", "supporting document missing", "medium", "week", true),
    ],
  }),
  playbook({
    domainId: "contractor_management",
    professionalGoal:
      "Keep contractor tasks, acts, documents, and payments role-scoped with no cross-company leakage.",
    roleScopes: ["director_control", "foreman", "accountant", "contractor"],
    safeReadUseCases: ["read contractor own records", "review contractor act status"],
    draftUseCases: ["draft contractor act", "draft clarification request"],
    approvalRequiredUseCases: ["submit contractor act for approval"],
    forbiddenUseCases: ["show another contractor records", "approve own act directly"],
    internalDataSources: ["contractors", "acts", "documents", "reports", "approval_ledger"],
    riskRules: [
      riskRule("contractor_act_unclosed", "contractor act is unclosed", "medium", "today", true),
      riskRule("contractor_scope_leakage", "cross-company data requested", "high", "now"),
    ],
  }),
  playbook({
    domainId: "real_estate_due_diligence",
    professionalGoal:
      "Preview construction and property risk with internal documents first and cited external references only.",
    roleScopes: ["director_control"],
    safeReadUseCases: ["read due diligence checklist", "review property document gap"],
    draftUseCases: ["draft due diligence memo", "draft risk question list"],
    approvalRequiredUseCases: ["submit acquisition-related action for approval"],
    forbiddenUseCases: ["make final acquisition decision", "fetch uncited external data from mobile"],
    internalDataSources: ["documents", "projects", "finance", "reports", "approval_ledger"],
    externalPreviewPolicy: "citations_required_preview_only",
    riskRules: [
      riskRule("real_estate_missing_title_doc", "title or permit evidence missing", "high", "today"),
      riskRule("real_estate_cost_uncertainty", "construction cost uncertainty", "medium", "week", true),
    ],
  }),
  playbook({
    domainId: "approval_workflow",
    professionalGoal:
      "Separate safe read, draft, approval, and execution so risky actions only move through the ledger.",
    roleScopes: ALL_ROLES,
    safeReadUseCases: ["read approval status", "review action boundary"],
    draftUseCases: ["draft approval package", "draft decision note"],
    approvalRequiredUseCases: ["submit high-risk action for approval"],
    forbiddenUseCases: ["bypass approval ledger", "execute unapproved action"],
    internalDataSources: ["approval_ledger", "actions", "documents", "reports"],
    riskRules: [
      riskRule("approval_high_risk_without_ledger", "high-risk action without ledger", "high", "now"),
      riskRule("approval_missing_evidence", "approval lacks evidence", "medium", "today", true),
    ],
  }),
] as const satisfies readonly ConstructionDomainPlaybook[];

export function listConstructionDomainPlaybooks(): ConstructionDomainPlaybook[] {
  return [...CONSTRUCTION_DOMAIN_PLAYBOOKS];
}

export function getConstructionDomainPlaybook(
  domainId: ConstructionDomainPlaybook["domainId"],
): ConstructionDomainPlaybook | null {
  return CONSTRUCTION_DOMAIN_PLAYBOOKS.find((playbook) => playbook.domainId === domainId) ?? null;
}
