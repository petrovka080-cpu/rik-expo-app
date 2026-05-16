import type { AiRoleMagicRoleId } from "./aiRoleMagicBlueprintTypes";

export type AiRoleMagicQaExpectation = {
  roleId: AiRoleMagicRoleId;
  question: string;
  expectedContext: string[];
  answerMustInclude: string[];
  forbiddenCopy: string[];
};

const COMMON_FORBIDDEN_COPY = [
  "module unavailable",
  "provider unavailable",
  "AI keys are not configured",
  "safe guide mode",
  "raw policy dump",
  "raw runtime transport",
  "raw BFF debug",
] as const;

function qa(
  roleId: AiRoleMagicRoleId,
  question: string,
  expectedContext: string[],
  answerMustInclude: string[],
): AiRoleMagicQaExpectation {
  return {
    roleId,
    question,
    expectedContext,
    answerMustInclude,
    forbiddenCopy: [...COMMON_FORBIDDEN_COPY],
  };
}

export const AI_ROLE_MAGIC_QA_EXPECTATIONS: readonly AiRoleMagicQaExpectation[] = Object.freeze([
  qa("buyer", "What should I open first?", ["buyer.requests", "approval status", "supplier options"], ["priority", "ready options", "next action"]),
  qa("buyer", "Which requests already have buy options?", ["buyer.requests", "procurement evidence"], ["request", "supplier", "missing data"]),
  qa("buyer", "Why is one supplier better than another?", ["supplier history", "coverage", "risk"], ["coverage", "risk", "evidence"]),
  qa("buyer", "What is missing before supplier choice?", ["missing prices", "delivery", "documents"], ["missing data", "approval"]),
  qa("buyer", "Draft a supplier request.", ["request items", "supplier context"], ["draft", "not final", "evidence"]),
  qa("accountant", "What is critical in payments today?", ["payment queue", "documents", "approval status"], ["critical", "amount", "documents"]),
  qa("accountant", "Prepare today's payment report.", ["finance summary", "payment history"], ["summary", "total", "approval"]),
  qa("accountant", "Which payments lack documents?", ["documents", "payment queue"], ["missing documents", "next action"]),
  qa("accountant", "Why is this payment risky?", ["supplier history", "amount", "document status"], ["risk", "history", "evidence"]),
  qa("accountant", "Make rationale for director.", ["payment", "request", "approval policy"], ["rationale", "director", "approval"]),
  qa("warehouse", "What is risky in warehouse today?", ["stock", "incoming", "issue requests"], ["deficit", "incoming", "risk"]),
  qa("warehouse", "What cannot be issued?", ["stock balance", "confirmed incoming"], ["cannot issue", "deficit", "approval"]),
  qa("warehouse", "Which incoming items are disputed?", ["incoming", "documents", "request"], ["discrepancy", "document"]),
  qa("warehouse", "Where are documents missing?", ["delivery documents", "incoming"], ["missing documents", "checklist"]),
  qa("warehouse", "Prepare incoming verification.", ["incoming items", "evidence"], ["draft", "verification", "not final"]),
  qa("foreman", "What can be closed today?", ["work status", "evidence", "materials"], ["closeout", "missing evidence", "next action"]),
  qa("foreman", "Which photos are missing?", ["photo evidence", "work zones"], ["photos", "missing evidence"]),
  qa("foreman", "Draft an act for this work.", ["work", "evidence", "approval"], ["draft act", "not signed"]),
  qa("foreman", "Which checks or norms apply?", ["knowledge base", "checklist"], ["source", "checklist", "not invented"]),
  qa("foreman", "What should I write to the contractor?", ["remarks", "missing documents"], ["draft message", "contractor"]),
  qa("contractor", "What should I submit today?", ["subcontract status", "remarks"], ["submit", "documents", "evidence"]),
  qa("contractor", "Why was the act not accepted?", ["act status", "remarks"], ["remarks", "acceptance blocker"]),
  qa("contractor", "Which documents should I attach?", ["document requirements"], ["documents", "missing"]),
  qa("contractor", "What blocks acceptance?", ["evidence", "remarks"], ["blocker", "next action"]),
  qa("contractor", "Draft a reply to foreman.", ["foreman message", "subcontract context"], ["draft reply", "not final"]),
  qa("director", "What needs my decision today?", ["approval inbox", "cross-domain risks"], ["decision", "risk", "approval"]),
  qa("director", "What blocks work?", ["procurement", "warehouse", "foreman"], ["blocker", "domain", "next action"]),
  qa("director", "Which approvals are critical?", ["ledger", "risk"], ["approval", "critical", "evidence"]),
  qa("director", "Why is this payment risky?", ["finance", "documents"], ["payment", "risk", "documents"]),
  qa("director", "Which supplier is better and why?", ["supplier comparison", "request"], ["supplier", "coverage", "risk"]),
  qa("office", "What is stuck today?", ["documents", "requests", "tasks"], ["stuck", "overdue", "next action"]),
  qa("office", "Which documents need processing?", ["document queue"], ["documents", "processing"]),
  qa("office", "Which requests are stale?", ["request age", "status"], ["stale", "request"]),
  qa("office", "Draft a reminder.", ["assignee", "missing data"], ["draft reminder", "not final"]),
  qa("office", "What should go to approval?", ["approval policy", "work queue"], ["approval", "evidence"]),
  qa("documents", "What is important in this document?", ["document summary", "linked objects"], ["summary", "important"]),
  qa("documents", "Which request is it linked to?", ["links", "metadata"], ["linked", "request"]),
  qa("documents", "What is missing?", ["evidence", "document metadata"], ["missing evidence"]),
  qa("documents", "What are the risks?", ["terms", "obligations"], ["risk", "evidence"]),
  qa("documents", "Draft a comment.", ["document summary"], ["draft comment", "not final"]),
  qa("chat", "What did we decide?", ["conversation", "decisions"], ["summary", "decision"]),
  qa("chat", "Who should do what?", ["messages", "roles"], ["Buyer", "Warehouse", "Director"]),
  qa("chat", "What are the risks?", ["discussion", "risks"], ["risk", "missing data"]),
  qa("chat", "What should go to approval?", ["decisions", "approval policy"], ["approval", "candidate"]),
  qa("chat", "Make a director summary.", ["conversation", "tasks"], ["director", "summary"]),
  qa("map", "Who is closer to the object?", ["supplier location", "object location"], ["closer", "evidence"]),
  qa("map", "How does delivery affect deadline?", ["route", "deadline"], ["delivery", "deadline", "risk"]),
  qa("map", "Which suppliers are nearby?", ["map", "supplier evidence"], ["nearby", "supplier"]),
  qa("map", "Where is logistics risk?", ["route", "request"], ["logistics risk"]),
  qa("map", "Draft a delivery request.", ["missing logistics data"], ["draft", "delivery", "not final"]),
  qa("security", "Where is permission risk?", ["role matrix", "policy"], ["role", "risk"]),
  qa("security", "Who attempted forbidden action?", ["audit", "action policy"], ["forbidden", "attempt"]),
  qa("security", "Is there a privileged green path?", ["transport", "policy"], ["privileged path", "not used"]),
  qa("security", "Which approvals are suspicious?", ["ledger", "history"], ["approval", "suspicious"]),
  qa("security", "Build a security report.", ["risk roles", "forbidden attempts"], ["draft report", "not final"]),
  qa("runtime_admin", "Why is matrix red?", ["runner", "artifact"], ["blocker", "artifact"]),
  qa("runtime_admin", "Which child runner failed?", ["runtime matrix"], ["runner", "failed"]),
  qa("runtime_admin", "Is this targetability or driver?", ["targetability", "driver status"], ["targetability", "driver"]),
  qa("runtime_admin", "Where is the artifact?", ["artifact path"], ["artifact"]),
  qa("runtime_admin", "What should I check first?", ["blocker", "route", "transport"], ["first check", "transport"]),
]);

export function listAiRoleMagicQaExpectations(roleId?: AiRoleMagicRoleId): AiRoleMagicQaExpectation[] {
  return AI_ROLE_MAGIC_QA_EXPECTATIONS.filter((entry) => !roleId || entry.roleId === roleId);
}
