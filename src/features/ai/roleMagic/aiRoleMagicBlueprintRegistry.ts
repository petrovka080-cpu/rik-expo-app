import {
  listAiScreenButtonRoleActionEntriesForScreen,
} from "../screenAudit/aiScreenButtonRoleActionRegistry";
import type { AiScreenButtonActionKind } from "../screenAudit/aiScreenButtonRoleActionTypes";
import type {
  AiRoleMagicBlueprint,
  AiRoleMagicOutputType,
  AiRoleMagicPreparedWork,
  AiRoleMagicRoleId,
  AiRoleMagicScreenCoverage,
} from "./aiRoleMagicBlueprintTypes";

const SAFE = Object.freeze({
  noFakeData: true,
  noDirectDangerousMutation: true,
  approvalRequiredForDangerousActions: true,
  evidenceRequired: true,
  debugHiddenFromUser: true,
});

function uniq(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function actionIds(screenId: string, kind: AiScreenButtonActionKind): string[] {
  return listAiScreenButtonRoleActionEntriesForScreen(screenId)
    .filter((entry) => entry.actionKind === kind)
    .map((entry) => entry.actionId)
    .sort();
}

function auditedButtons(screenId: string): string[] {
  return uniq(
    listAiScreenButtonRoleActionEntriesForScreen(screenId).flatMap((entry) => [
      ...entry.visibleButtons,
      entry.label,
    ]),
  ).sort();
}

function screen(
  screenId: string,
  screenUserGoal: string,
  params: {
    buttons: string[];
    outputs: string[];
    questions: string[];
  },
): AiRoleMagicScreenCoverage {
  return {
    screenId,
    screenUserGoal,
    auditedButtonsToUse: auditedButtons(screenId),
    buttonsThatMustWork: params.buttons,
    aiPreparedOutput: params.outputs,
    aiQuestionsMustAnswer: params.questions,
    safeReadActions: actionIds(screenId, "safe_read"),
    draftOnlyActions: actionIds(screenId, "draft_only"),
    approvalRequiredActions: actionIds(screenId, "approval_required"),
    forbiddenActions: actionIds(screenId, "forbidden"),
  };
}

function prep(
  id: string,
  title: string,
  outputType: AiRoleMagicOutputType,
  dataNeeded: string[],
  description: string,
  expectedUserValue: string,
): AiRoleMagicPreparedWork {
  return { id, title, outputType, dataNeeded, description, expectedUserValue };
}

function role(params: Omit<AiRoleMagicBlueprint, "safety">): AiRoleMagicBlueprint {
  return Object.freeze({ ...params, safety: SAFE });
}

export const AI_ROLE_MAGIC_REQUIRED_ROLE_IDS: readonly AiRoleMagicRoleId[] = [
  "buyer",
  "accountant",
  "warehouse",
  "foreman",
  "contractor",
  "director",
  "office",
  "documents",
  "chat",
  "map",
  "security",
  "runtime_admin",
] as const;

export const AI_ROLE_MAGIC_BLUEPRINT_REGISTRY: readonly AiRoleMagicBlueprint[] = [
  role({
    roleId: "buyer",
    roleLabel: "Buyer / procurement",
    userDaySummary: "Turns approved requests into evidence-backed purchase options, supplier comparisons, RFQs and approval candidates without creating orders directly.",
    userPainPoints: [
      { id: "buyer.inbox_noise", pain: "Approved requests arrive mixed with unfinished work.", whyItMatters: "Urgent jobs can wait while buyer reconstructs status by hand.", currentManualWork: "Open every request, inspect items, supplier hints, approvals and documents." },
      { id: "buyer.supplier_guessing", pain: "Supplier choice is often made before all prices, coverage and delivery risks are visible.", whyItMatters: "Wrong supplier choice blocks site work and creates finance rework.", currentManualWork: "Compare supplier history, request items and missing quotes manually." },
    ],
    aiMustPrepareBeforeUserAsks: [
      prep("buyer.priority_queue", "Prioritized procurement queue", "summary", ["request status", "director approval", "deadline", "items"], "Sort incoming requests by urgency, approval state and missing evidence.", "Buyer opens the first request that can move work today."),
      prep("buyer.ready_options", "Internal-first buy options", "ready_options", ["request items", "internal suppliers", "supplier history"], "Prepare supplier coverage, gaps, risk and evidence per request.", "Approved requests never arrive empty."),
      prep("buyer.supplier_request", "Supplier request draft", "draft", ["missing prices", "delivery window", "supplier contact evidence"], "Draft an RFQ that asks only for missing facts.", "Buyer sends a precise request instead of rewriting from scratch."),
      prep("buyer.approval_candidate", "Supplier choice approval candidate", "approval_candidate", ["comparison", "risks", "evidence refs"], "Prepare submit-for-approval rationale without confirming supplier.", "Director receives a decision packet, not a chat transcript."),
    ],
    screenCoverage: [
      screen("buyer.main", "Know what procurement work to open first.", { buttons: ["Open incoming", "Watch buy options", "Compare suppliers", "Request prices", "Submit choice for approval"], outputs: ["incoming queue", "approved request readiness", "supplier risk summary"], questions: ["What should I open first?", "Which approved requests already have options?", "Where is delivery risk?"] }),
      screen("buyer.requests", "Work a request list as a queue, not as flat rows.", { buttons: ["Watch options", "Compare", "Prepare request", "Check risks"], outputs: ["request priority", "ready buy options", "missing data checklist"], questions: ["Which request is urgent?", "Which requests have no supplier?", "Which are ready for approval?"] }),
      screen("buyer.request.detail", "Choose a supplier only from evidence.", { buttons: ["Request price", "Compare options", "Draft supplier request", "Submit choice for approval"], outputs: ["supplier comparison", "coverage per supplier", "approval candidate"], questions: ["Why is one supplier better?", "What is missing for supplier choice?", "What should go to director?"] }),
      screen("procurement.copilot", "Use the procurement workbench for comparison and drafts.", { buttons: ["Compare suppliers", "Prepare request", "Prepare approval candidate"], outputs: ["internal-first recommendation", "risk summary", "draft supplier request"], questions: ["What is the safest next action?", "Which option has the best coverage?", "What is not proven yet?"] }),
      screen("market.home", "Use market data only as cited preview when internal data is insufficient.", { buttons: ["Prepare external request", "Show cited options", "Compare with internal"], outputs: ["external search need", "citation requirement", "missing market data"], questions: ["Where do we need external sources?", "What cannot be treated as fact yet?", "What is citation-backed?"] }),
      screen("supplier.showcase", "Understand whether a supplier fits active requests.", { buttons: ["Compare supplier", "Draft request", "Add to shortlist", "Submit recommendation"], outputs: ["supplier fit summary", "linked requests", "supplier risk"], questions: ["Which requests can this supplier cover?", "What evidence is missing?", "Can this be shortlisted?"] }),
    ],
    realMagicExamples: [
      { scenario: "Director approves a material request.", aiOutput: "Three internal supplier options are ready, with item coverage, missing prices, delivery risks and an approval-safe recommendation.", userBenefit: "Buyer starts from a prepared decision surface instead of an empty request." },
      { scenario: "No internal supplier covers enough items.", aiOutput: "AI proposes a cited external request path and marks every unproven price or delivery field as missing data.", userBenefit: "No invented supplier facts enter procurement." },
    ],
  }),
  role({
    roleId: "accountant",
    roleLabel: "Accountant / finance",
    userDaySummary: "Keeps today's payments, documents, unusual amounts, supplier history and director-facing rationale ready without posting or paying directly.",
    userPainPoints: [
      { id: "accountant.docs", pain: "Payments without documents hide inside the queue.", whyItMatters: "Missing evidence creates rework and unsafe payments.", currentManualWork: "Open each payment, inspect attachments and payment history." },
      { id: "accountant.rationale", pain: "Director approvals need a clear payment rationale.", whyItMatters: "Vague finance requests slow approval and increase risk.", currentManualWork: "Manually connect supplier, request, amount and document status." },
    ],
    aiMustPrepareBeforeUserAsks: [
      prep("accountant.today", "Today finance report", "summary", ["payment inbox", "amounts", "currency"], "Summarize today's incoming payments and total amount.", "Accountant sees the financial workload immediately."),
      prep("accountant.critical", "Critical payment list", "risk_report", ["payment eligibility", "documents", "status", "amount"], "Flag missing docs, blocked payments and unusual balances.", "The first check is obvious."),
      prep("accountant.rationale", "Director rationale draft", "financial_rationale", ["request", "supplier", "evidence", "risk"], "Prepare a concise approval explanation.", "Director gets evidence and risk in one packet."),
      prep("accountant.approval", "Approval candidate", "approval_candidate", ["ledger status", "payment evidence"], "Prepare submit-for-approval only through the ledger.", "Finance remains safe and auditable."),
    ],
    screenCoverage: [
      screen("accountant.main", "See today's finance work before opening payment rows.", { buttons: ["Check critical", "Build today's report", "Prepare rationale", "Request documents", "Submit for approval"], outputs: ["today payments", "critical payments", "missing documents"], questions: ["What is critical today?", "Which payments lack documents?", "Which need director?"] }),
      screen("accountant.payment", "Understand why one payment can or cannot move.", { buttons: ["Check documents", "Prepare rationale", "Request confirmation", "Submit for approval"], outputs: ["payment basis", "document status", "supplier risk"], questions: ["Why is this payment risky?", "Which document is missing?", "What happens after approval?"] }),
      screen("accountant.history", "Find repeated finance risks.", { buttons: ["Show deviations", "Compare suppliers", "Build risk report"], outputs: ["supplier anomalies", "missing-document repeaters", "manual check history"], questions: ["Which suppliers often miss documents?", "Which amounts are unusual?", "What changed in payment history?"] }),
    ],
    realMagicExamples: [
      { scenario: "Accountant opens the main finance screen.", aiOutput: "Today payment count, total amount, critical items, missing documents and approval candidates are already listed.", userBenefit: "Finance triage takes seconds instead of row-by-row inspection." },
      { scenario: "A large payment lacks evidence.", aiOutput: "AI drafts director rationale and a document request, while payment execution remains unavailable.", userBenefit: "The user moves safely without a hidden posting path." },
    ],
  }),
  role({
    roleId: "warehouse",
    roleLabel: "Warehouse",
    userDaySummary: "Surfaces stock shortages, incoming discrepancies, issue readiness and disputed movement drafts without changing stock directly.",
    userPainPoints: [
      { id: "warehouse.shortage", pain: "Shortage risk appears only when someone tries to issue materials.", whyItMatters: "Site work can stop after the warehouse promise is made.", currentManualWork: "Compare requests, current stock, incoming docs and issue rows manually." },
      { id: "warehouse.discrepancy", pain: "Incoming discrepancies are scattered across rows and documents.", whyItMatters: "Wrong receiving corrupts stock and finance evidence.", currentManualWork: "Check quantities, request matches and supplier documents by hand." },
    ],
    aiMustPrepareBeforeUserAsks: [
      prep("warehouse.stock_risk", "Stock risk summary", "risk_report", ["stock levels", "requests", "reserved items"], "Show items that cannot safely cover requests.", "Warehouse knows what not to promise."),
      prep("warehouse.incoming_check", "Incoming discrepancy checklist", "missing_data_checklist", ["incoming rows", "request items", "documents"], "List mismatches and missing delivery documents.", "Receiving stays evidence-based."),
      prep("warehouse.issue_draft", "Issue readiness draft", "draft", ["requested items", "available stock", "approval policy"], "Prepare issue proposal without writing stock.", "The user gets a safe checklist before final issue."),
      prep("warehouse.approval", "Disputed movement approval candidate", "approval_candidate", ["discrepancy", "evidence", "risk"], "Submit disputed positions for human review.", "Dangerous movements stay behind approval."),
    ],
    screenCoverage: [
      screen("warehouse.main", "Know shortage, incoming and issue risk today.", { buttons: ["Show deficit", "Prepare incoming check", "Draft movement", "Submit disputed items"], outputs: ["shortage risks", "expected incoming", "warehouse blockers"], questions: ["What is risky today?", "Which requests cannot be closed?", "Where is missing document?"] }),
      screen("warehouse.incoming", "Receive only what matches evidence.", { buttons: ["Discrepancy list", "Request document", "Submit disputed positions"], outputs: ["mismatched positions", "missing documents", "manual check list"], questions: ["Which incoming rows are disputed?", "What cannot be received?", "Which docs are missing?"] }),
      screen("warehouse.issue", "Issue materials only when safe.", { buttons: ["Issue draft", "Show deficit", "Suggest alternative", "Submit for approval"], outputs: ["availability check", "shortage list", "approval-needed items"], questions: ["What cannot be issued?", "What alternative exists?", "Which issue needs approval?"] }),
    ],
    realMagicExamples: [
      { scenario: "Warehouse opens today's queue.", aiOutput: "AI shows shortages, disputed incoming rows and issue drafts grouped by risk.", userBenefit: "Warehouse work starts from material truth, not from UI hunting." },
      { scenario: "Requested quantity exceeds available stock.", aiOutput: "AI marks the issue as approval-required and prepares a shortage explanation.", userBenefit: "No stock mutation happens behind the user's back." },
    ],
  }),
  role({
    roleId: "foreman",
    roleLabel: "Foreman",
    userDaySummary: "Prepares closeout plans, evidence checklists, draft acts, reports, contractor messages and construction checks without signing or final submitting.",
    userPainPoints: [
      { id: "foreman.evidence", pain: "Missing evidence is discovered too late.", whyItMatters: "Acts and reports bounce back after work is done.", currentManualWork: "Check photos, documents, materials and contractor notes one by one." },
      { id: "foreman.material_blocker", pain: "Material blockers are disconnected from closeout work.", whyItMatters: "The site schedule slips while procurement and warehouse data are elsewhere.", currentManualWork: "Call warehouse, buyer and contractor to reconstruct the blocker." },
    ],
    aiMustPrepareBeforeUserAsks: [
      prep("foreman.closeout", "Today closeout plan", "summary", ["work status", "evidence", "acts"], "List what can be prepared today and what blocks closeout.", "Foreman sees the day plan immediately."),
      prep("foreman.evidence", "Missing evidence checklist", "missing_data_checklist", ["photos", "documents", "signatures"], "Identify missing proof before drafting final documents.", "Rejected acts are reduced."),
      prep("foreman.act", "Draft act/report/message", "draft", ["work item", "contractor", "evidence"], "Prepare human-review drafts only.", "Foreman saves writing time without losing control."),
      prep("foreman.checklist", "Construction and safety checklist", "construction_guidance", ["knowledge source", "work type", "site context"], "Use sourced norms when present; otherwise show generic checklist with missing-source note.", "Construction guidance does not invent norms."),
    ],
    screenCoverage: [
      screen("foreman.main", "Know what can close today and what blocks site work.", { buttons: ["Prepare act", "Prepare report", "Check missing evidence", "Write contractor", "Show checklist"], outputs: ["closeout plan", "material blockers", "evidence gaps"], questions: ["What can close today?", "Which evidence is missing?", "Which materials delay work?"] }),
      screen("foreman.ai.quick_modal", "Prepare the next safe work draft quickly.", { buttons: ["Act for current work", "Daily report", "Missing evidence list", "Contractor message", "Safety check"], outputs: ["draft choices", "missing data after choice", "final-submit warning"], questions: ["What can be prepared?", "What is forbidden before review?", "What evidence is missing?"] }),
      screen("foreman.subcontract", "Understand subcontract status before drafting acts.", { buttons: ["Prepare act", "Request documents", "Write contractor", "Show checklist"], outputs: ["done vs unconfirmed", "documents missing", "subcontract risk"], questions: ["What is not confirmed?", "Which documents are needed?", "What should I ask contractor?"] }),
    ],
    realMagicExamples: [
      { scenario: "Foreman wants to close work today.", aiOutput: "AI lists closeable work, missing photos, material blockers and drafts an act with review required.", userBenefit: "Closeout becomes a guided workflow, not a memory task." },
      { scenario: "A construction norm is not in the knowledge base.", aiOutput: "AI says the source is missing and provides only a generic quality checklist.", userBenefit: "The app remains useful without inventing regulations." },
    ],
  }),
  role({
    roleId: "contractor",
    roleLabel: "Contractor",
    userDaySummary: "Explains what must be submitted, what was not accepted, which evidence blocks acceptance and drafts safe replies to foreman.",
    userPainPoints: [
      { id: "contractor.acceptance", pain: "Acceptance blockers are unclear.", whyItMatters: "Contractor loses time asking why work was not accepted.", currentManualWork: "Read remarks, documents and chat context separately." },
      { id: "contractor.docs", pain: "Missing documents are not grouped by what to do next.", whyItMatters: "Payment or acceptance waits on avoidable omissions.", currentManualWork: "Manually map documents and photos to work zones." },
    ],
    aiMustPrepareBeforeUserAsks: [
      prep("contractor.todo", "What to submit today", "summary", ["own work", "remarks", "documents"], "Show the contractor-only submission checklist.", "Contractor sees clear next work."),
      prep("contractor.blockers", "Acceptance blocker list", "risk_report", ["remarks", "acceptance status"], "Explain why work is not accepted.", "Fewer back-and-forth messages."),
      prep("contractor.evidence", "Missing evidence list", "missing_data_checklist", ["photos", "documents", "act evidence"], "Group missing evidence by work item.", "Contractor submits the right files."),
      prep("contractor.reply", "Foreman reply draft", "draft", ["remarks", "work status"], "Draft a response without changing status.", "Communication is faster and safer."),
    ],
    screenCoverage: [
      screen("contractor.main", "Know what must be submitted for acceptance.", { buttons: ["Prepare reply", "Document list", "Acceptance blockers", "Check remarks"], outputs: ["submission checklist", "missing evidence", "draft response"], questions: ["What should I submit today?", "Why was the act not accepted?", "Which documents should I attach?"] }),
    ],
    realMagicExamples: [
      { scenario: "Contractor opens the app before site handoff.", aiOutput: "AI shows missing photos, missing document and a safe reply draft for the foreman.", userBenefit: "Contractor can fix acceptance blockers without guessing." },
      { scenario: "Work has remarks.", aiOutput: "AI explains remarks and keeps status mutation unavailable.", userBenefit: "The contractor understands the problem without bypassing review." },
    ],
  }),
  role({
    roleId: "director",
    roleLabel: "Director",
    userDaySummary: "Turns cross-domain activity into a decision queue: approvals, blockers, finance risk, procurement risk, warehouse risk and evidence gaps.",
    userPainPoints: [
      { id: "director.noise", pain: "Dashboards show numbers but not decisions.", whyItMatters: "Critical approvals can wait behind non-blocking charts.", currentManualWork: "Open finance, procurement, warehouse and reports separately." },
      { id: "director.evidence", pain: "Approvals are hard to trust without compact evidence.", whyItMatters: "Director either delays or approves blind.", currentManualWork: "Ask each role for rationale and supporting documents." },
    ],
    aiMustPrepareBeforeUserAsks: [
      prep("director.queue", "Today decision queue", "decision_queue", ["approvals", "risks", "blockers"], "Rank decisions by business impact.", "Director handles the right item first."),
      prep("director.cross_domain", "Cross-domain risk summary", "risk_report", ["procurement", "finance", "warehouse", "foreman"], "Connect blockers across domains.", "Director sees why work is blocked."),
      prep("director.approval", "Approval explanation", "approval_candidate", ["evidence", "risk", "after-approval action"], "Explain each approval with consequences.", "Approvals become auditable decisions."),
      prep("director.report", "Executive summary draft", "draft", ["period data", "documents", "risks"], "Draft an executive summary for review.", "Reporting starts from prepared truth."),
    ],
    screenCoverage: [
      screen("director.dashboard", "Decide what needs director attention today.", { buttons: ["Open approval inbox", "Show critical", "Show blockers", "Request missing data"], outputs: ["decision queue", "critical blockers", "approval count"], questions: ["What needs my decision?", "What blocks work?", "Which approval is critical?"] }),
      screen("director.finance", "Review high-risk finance decisions.", { buttons: ["Open risky payments", "Compare supplier history", "Request rationale", "Approve or reject through inbox"], outputs: ["finance risk list", "missing evidence", "payment rationale"], questions: ["Which payments are risky?", "Why is this payment risky?", "Where is missing evidence?"] }),
      screen("director.reports", "Get executive summary without hiding deviations.", { buttons: ["Build summary", "Open risks", "Draft report", "Show evidence"], outputs: ["period summary", "critical deviations", "top decision"], questions: ["What changed?", "What is the main decision?", "Which evidence supports this?"] }),
      screen("ai.command_center", "See all next actions by role.", { buttons: ["Create task draft", "Open approval status", "Show risk", "Prepare summary"], outputs: ["task queue", "risk queue", "approval queue"], questions: ["Who must act next?", "What requires approval?", "Which queue is blocked?"] }),
      screen("approval.inbox", "Approve or reject with evidence.", { buttons: ["Approve", "Reject", "Request data", "Open evidence"], outputs: ["proposal summary", "evidence", "after-approval consequence"], questions: ["Why is this on approval?", "What happens after approval?", "What is forbidden without approval?"] }),
    ],
    realMagicExamples: [
      { scenario: "Director opens the dashboard.", aiOutput: "AI shows the top decisions that block work, grouped by procurement, finance, warehouse and foreman evidence.", userBenefit: "The dashboard becomes an executive queue." },
      { scenario: "Supplier choice is waiting.", aiOutput: "AI explains coverage, missing price fields, evidence and safe approve/reject path through inbox.", userBenefit: "Director decides with context, not with raw rows." },
    ],
  }),
  role({
    roleId: "office",
    roleLabel: "Office / management",
    userDaySummary: "Turns office work into a daily queue of stuck documents, stale requests, reports, overdue tasks, reminders and approval-ready items.",
    userPainPoints: [
      { id: "office.stale", pain: "Stale requests and documents are not grouped into a daily queue.", whyItMatters: "Office work becomes reactive and people chase the wrong items.", currentManualWork: "Open role screens and compare timestamps manually." },
      { id: "office.reminders", pain: "Reminders need context and evidence.", whyItMatters: "Generic reminders do not move blocked work.", currentManualWork: "Rewrite messages from documents, requests and approvals." },
    ],
    aiMustPrepareBeforeUserAsks: [
      prep("office.queue", "Office daily queue", "summary", ["documents", "requests", "reports", "tasks"], "Show stuck work and next owner.", "Office starts with actionable work."),
      prep("office.documents", "Document collection plan", "missing_data_checklist", ["document metadata", "linked objects"], "List what must be collected or checked.", "Less context switching."),
      prep("office.reminder", "Reminder draft", "draft", ["owner", "blocker", "evidence"], "Draft precise reminders.", "Follow-up gets faster and clearer."),
      prep("office.approval", "Approval-ready items", "approval_candidate", ["approval policy", "evidence"], "Prepare safe submit-for-approval candidates.", "Office escalates without direct execution."),
    ],
    screenCoverage: [
      screen("office.hub", "Know what is stuck today.", { buttons: ["Open overdue", "Collect documents", "Prepare reminder", "Submit for approval"], outputs: ["stale documents", "stale requests", "overdue tasks"], questions: ["What is stuck today?", "Which documents need processing?", "What should go to approval?"] }),
      screen("reports.modal", "Create a report draft from evidence.", { buttons: ["Collect report", "Check evidence", "Add missing data", "Save draft"], outputs: ["report events", "risks", "missing evidence"], questions: ["What should be in the report?", "Where is evidence missing?", "What needs decision?"] }),
    ],
    realMagicExamples: [
      { scenario: "Office opens the hub.", aiOutput: "AI shows documents to process, stale requests, reports waiting for review and reminders to draft.", userBenefit: "Office work becomes an operational checklist." },
      { scenario: "A request is stale.", aiOutput: "AI drafts a reminder with blocker, owner and evidence reference.", userBenefit: "Follow-up is concrete, not generic." },
    ],
  }),
  role({
    roleId: "documents",
    roleLabel: "Documents user",
    userDaySummary: "Makes each document understandable in seconds: summary, links, key terms, missing evidence, risk and safe next action.",
    userPainPoints: [
      { id: "documents.meaning", pain: "Documents are hard to interpret quickly.", whyItMatters: "Users miss terms, sums, dates or obligations.", currentManualWork: "Open the document and search related screens manually." },
      { id: "documents.links", pain: "Links to requests, payments, acts and suppliers are not obvious.", whyItMatters: "Approvals and payments need exact evidence.", currentManualWork: "Trace IDs and attachments by hand." },
    ],
    aiMustPrepareBeforeUserAsks: [
      prep("documents.summary", "Document summary", "summary", ["document metadata", "visible text", "linked objects"], "Summarize content and important fields.", "Document is understandable in seconds."),
      prep("documents.links", "Linked object map", "ready_options", ["request", "payment", "act", "supplier"], "Show what this document belongs to.", "Users jump to the right record."),
      prep("documents.risk", "Risk and missing evidence", "risk_report", ["terms", "evidence", "approval policy"], "List missing proof and risky obligations.", "No hidden document gap goes to approval."),
      prep("documents.comment", "Comment draft", "draft", ["document summary", "risk"], "Prepare review comment only.", "Feedback is fast and non-final."),
    ],
    screenCoverage: [
      screen("documents.main", "Understand the document and its next safe action.", { buttons: ["Prepare summary", "Request missing evidence", "Prepare comment", "Open linked objects"], outputs: ["document summary", "linked objects", "missing evidence"], questions: ["What is important?", "Which request is linked?", "What evidence is missing?"] }),
      screen("reports.modal", "Use document evidence in reports without final send.", { buttons: ["Build report", "Check evidence", "Add missing data", "Save draft"], outputs: ["linked documents", "report risk", "draft narrative"], questions: ["Which documents support this report?", "What should be reviewed?", "What is missing?"] }),
    ],
    realMagicExamples: [
      { scenario: "User opens a delivery document.", aiOutput: "AI summarizes supplier, amount, date, linked request, missing delivery proof and safe comment draft.", userBenefit: "The document is actionable without guessing." },
      { scenario: "Document content is not available.", aiOutput: "AI marks content as missing data and refuses to infer terms.", userBenefit: "No invented document facts enter the workflow." },
    ],
  }),
  role({
    roleId: "chat",
    roleLabel: "Chat user",
    userDaySummary: "Extracts decisions, open questions, role-owned tasks, risks and approval candidates from team discussion without executing agreements.",
    userPainPoints: [
      { id: "chat.lost_actions", pain: "Action items disappear in long conversations.", whyItMatters: "Procurement, warehouse and director tasks get missed.", currentManualWork: "Scroll chat and rewrite decisions by hand." },
      { id: "chat.approval", pain: "It is unclear which chat decisions need approval.", whyItMatters: "Informal agreement can be mistaken for execution.", currentManualWork: "Ask who owns the decision and whether evidence exists." },
    ],
    aiMustPrepareBeforeUserAsks: [
      prep("chat.summary", "Conversation summary", "summary", ["thread messages", "linked records"], "Summarize decisions and open questions.", "Team sees what was actually decided."),
      prep("chat.tasks", "Action items by role", "decision_queue", ["messages", "roles", "screen links"], "Extract Buyer, Warehouse, Director, Foreman and Contractor tasks.", "Each owner sees next step."),
      prep("chat.risks", "Discussion risk list", "risk_report", ["promises", "missing evidence"], "Flag unconfirmed delivery, price, document or approval statements.", "Risk stays visible."),
      prep("chat.approval", "Approval candidates", "approval_candidate", ["decision", "evidence", "policy"], "Prepare approval candidate without sending final action.", "Chat stays an evidence source, not an executor."),
    ],
    screenCoverage: [
      screen("chat.main", "Turn discussion into tasks and approval candidates.", { buttons: ["Create task draft", "Prepare summary", "Submit for approval", "Request missing data"], outputs: ["discussion summary", "tasks by role", "risks"], questions: ["What did we decide?", "Who must do what?", "What should go to approval?"] }),
    ],
    realMagicExamples: [
      { scenario: "Team discusses supplier choice.", aiOutput: "AI extracts Buyer price request, Warehouse stock check, Director approval candidate and missing delivery confirmation.", userBenefit: "Chat becomes structured work." },
      { scenario: "Someone says to pay or order.", aiOutput: "AI drafts approval candidate and blocks direct execution.", userBenefit: "Conversation cannot bypass production controls." },
    ],
  }),
  role({
    roleId: "map",
    roleLabel: "Map / logistics user",
    userDaySummary: "Connects suppliers, objects, routes and delivery impact to procurement and warehouse risk without inventing distance or ETA.",
    userPainPoints: [
      { id: "map.distance", pain: "Distance and delivery impact are separate from supplier choice.", whyItMatters: "A cheap supplier can still block the site by delivery risk.", currentManualWork: "Compare map, supplier profile and request deadline manually." },
      { id: "map.evidence", pain: "Map insights can be treated as facts without source.", whyItMatters: "Logistics decisions need verifiable distance and availability.", currentManualWork: "Check maps, supplier data and route assumptions separately." },
    ],
    aiMustPrepareBeforeUserAsks: [
      prep("map.nearby", "Nearby supplier insight", "logistics_insight", ["supplier locations", "object location"], "Show nearby suppliers only from evidence.", "Buyer sees logistics context."),
      prep("map.route_risk", "Route risk summary", "risk_report", ["route", "deadline", "delivery notes"], "Flag delivery risk that affects requests.", "Logistics risk enters procurement decision."),
      prep("map.comparison", "Map-based supplier comparison", "ready_options", ["supplier evidence", "object proximity"], "Compare logistics only where source exists.", "No guessed ETA is presented as fact."),
      prep("map.delivery_request", "Delivery request draft", "draft", ["missing delivery facts"], "Draft a request for delivery details.", "Missing logistics data is collected."),
    ],
    screenCoverage: [
      screen("map.main", "Understand logistics impact on requests.", { buttons: ["Compare suppliers by logistics", "Show route risks", "Prepare delivery request", "Open linked requests"], outputs: ["nearby suppliers", "route risks", "delivery impact"], questions: ["Who is closer to the object?", "How does delivery affect deadline?", "Where is logistics risk?"] }),
    ],
    realMagicExamples: [
      { scenario: "Two suppliers can cover the request.", aiOutput: "AI shows one is closer but lacks price evidence; the other is farther but has delivery history.", userBenefit: "Location becomes part of evidence, not a separate guess." },
      { scenario: "Distance source is missing.", aiOutput: "AI marks distance and ETA as missing data and drafts a delivery question.", userBenefit: "No invented route or ETA appears." },
    ],
  }),
  role({
    roleId: "security",
    roleLabel: "Security / admin",
    userDaySummary: "Turns security into a risk command center: risky roles, forbidden attempts, suspicious approvals and privileged-path risks without changing permissions.",
    userPainPoints: [
      { id: "security.permissions", pain: "Permission risk is hard to see until something goes wrong.", whyItMatters: "A wrong role can bypass business boundaries.", currentManualWork: "Inspect roles, policies, approvals and audit logs separately." },
      { id: "security.forbidden", pain: "Forbidden-action attempts are not summarized for review.", whyItMatters: "Repeated attempts indicate policy or UX risk.", currentManualWork: "Search logs and compare to action policy by hand." },
    ],
    aiMustPrepareBeforeUserAsks: [
      prep("security.roles", "Risky roles", "risk_report", ["role matrix", "permissions", "policy"], "List elevated or suspicious role scope.", "Admin sees access risk quickly."),
      prep("security.forbidden", "Forbidden action attempts", "risk_report", ["action audit", "screen policy"], "Summarize forbidden attempts with screen and role.", "Security reviews real boundary pressure."),
      prep("security.approvals", "Suspicious approvals", "decision_queue", ["ledger", "approval history"], "Queue approvals that need review.", "Approval abuse is visible."),
      prep("security.report", "Security report draft", "draft", ["risk roles", "attempts", "policy gaps"], "Draft report without changing policy.", "Security gets a professional review artifact."),
    ],
    screenCoverage: [
      screen("security.screen", "Review security risk without mutating roles.", { buttons: ["Open risk roles", "Check forbidden attempts", "Build security report", "Show policy gaps"], outputs: ["risk roles", "forbidden attempts", "service role risk"], questions: ["Where is permission risk?", "Who attempted forbidden action?", "Is there a privileged green path?"] }),
    ],
    realMagicExamples: [
      { scenario: "Admin opens security screen.", aiOutput: "AI lists risky roles, forbidden attempts and suspicious approval patterns with draft report.", userBenefit: "Security review starts from prioritized risk." },
      { scenario: "A role change is requested.", aiOutput: "AI explains evidence and approval need, while direct permission mutation stays forbidden.", userBenefit: "Access changes cannot be silently executed." },
    ],
  }),
  role({
    roleId: "runtime_admin",
    roleLabel: "Runtime / dev admin",
    userDaySummary: "Explains runtime health, transport binding, fallback status, failed child runner, exact blocker and last artifact only for dev/admin context.",
    userPainPoints: [
      { id: "runtime.blocker", pain: "Runtime failures are noisy and hard to classify.", whyItMatters: "Teams waste time fixing symptoms instead of the exact blocker.", currentManualWork: "Open artifacts, logs, matrix and route registry manually." },
      { id: "runtime.user_debug", pain: "Debug internals can leak into normal user UI.", whyItMatters: "Users should see useful work, not transport or policy dumps.", currentManualWork: "Audit copy and route parameters manually." },
    ],
    aiMustPrepareBeforeUserAsks: [
      prep("runtime.health", "Runtime health summary", "summary", ["runtime registry", "route binding"], "Show green or blocked runtime status.", "Dev/admin sees the state first."),
      prep("runtime.blocker", "Exact blocker", "risk_report", ["child runner", "artifact", "status"], "Name the failing runner and blocker.", "Repair targets the cause."),
      prep("runtime.artifact", "Last proof artifact", "ready_options", ["artifact path", "matrix status"], "Link the last relevant proof.", "Debug starts with evidence."),
      prep("runtime.repair", "Recommended repair steps", "draft", ["blocker", "route", "transport"], "Suggest non-mutating repair checks.", "No symptom patching is encouraged."),
    ],
    screenCoverage: [
      screen("screen.runtime", "Diagnose runtime only as dev/admin.", { buttons: ["Open artifact", "Show exact blocker", "Show failed runner", "Show repair command"], outputs: ["runtime health", "transport binding", "exact blocker"], questions: ["Why is matrix red?", "Which child runner failed?", "Is this targetability or driver?"] }),
    ],
    realMagicExamples: [
      { scenario: "A matrix is red.", aiOutput: "AI names the child runner, exact blocker, last artifact and first repair check.", userBenefit: "Dev/admin fixes the cause, not symptoms." },
      { scenario: "Normal user opens AI.", aiOutput: "Runtime internals are not shown; user sees role-native work only.", userBenefit: "Debug data stays out of production UX." },
    ],
  }),
] as const;

export function listAiRoleMagicBlueprints(): AiRoleMagicBlueprint[] {
  return [...AI_ROLE_MAGIC_BLUEPRINT_REGISTRY];
}

export function getAiRoleMagicBlueprint(roleId: AiRoleMagicRoleId): AiRoleMagicBlueprint | null {
  return AI_ROLE_MAGIC_BLUEPRINT_REGISTRY.find((entry) => entry.roleId === roleId) ?? null;
}
