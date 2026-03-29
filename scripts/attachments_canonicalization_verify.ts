import fs from "node:fs";
import path from "node:path";

import { config as loadDotenv } from "dotenv";

import { normalizeAccountantInboxRpcTab } from "../src/lib/api/accountant";
import { listCanonicalProposalAttachments } from "../src/lib/api/proposalAttachments.service";
import { adaptAccountantHistoryScopeEnvelope } from "../src/screens/accountant/accountant.history.service";
import { adaptAccountantInboxScopeEnvelope } from "../src/screens/accountant/accountant.inbox.service";
import { createVerifierAdmin } from "./_shared/testUserDiscipline";

const projectRoot = process.cwd();
for (const file of [".env.local", ".env"]) {
  const full = path.join(projectRoot, file);
  if (fs.existsSync(full)) loadDotenv({ path: full, override: false });
}

const admin = createVerifierAdmin("attachments-canonicalization-verify");

const writeJson = (relativePath: string, payload: unknown) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const readText = (relativePath: string) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
const trim = (value: unknown) => String(value ?? "").trim();

type DirectAttachmentRow = {
  proposal_id?: string | null;
  id?: string | number | null;
  group_key?: string | null;
};

async function loadAccountantInboxProposalIds(tab: string) {
  const rpcTab = normalizeAccountantInboxRpcTab(tab);
  const result = await admin.rpc("accountant_inbox_scope_v1", {
    p_tab: rpcTab,
    p_offset: 0,
    p_limit: 25,
  });
  if (result.error) throw result.error;
  const envelope = adaptAccountantInboxScopeEnvelope(result.data);
  return Array.from(new Set(envelope.rows.map((row) => trim(row.proposal_id)).filter(Boolean)));
}

async function loadAccountantHistoryProposalIds() {
  const result = await admin.rpc("accountant_history_scope_v1", {
    p_date_from: null,
    p_date_to: null,
    p_search: null,
    p_offset: 0,
    p_limit: 25,
  });
  if (result.error) throw result.error;
  const envelope = adaptAccountantHistoryScopeEnvelope(result.data);
  return Array.from(new Set(envelope.rows.map((row) => trim(row.proposal_id)).filter(Boolean)));
}

async function loadDirectCounts(proposalIds: string[]) {
  if (!proposalIds.length) return new Map<string, { total: number; groups: Record<string, number> }>();
  const result = await admin
    .from("proposal_attachments")
    .select("proposal_id,id,group_key")
    .in("proposal_id", proposalIds);
  if (result.error) throw result.error;

  const map = new Map<string, { total: number; groups: Record<string, number> }>();
  for (const row of (result.data ?? []) as DirectAttachmentRow[]) {
    const proposalId = trim(row.proposal_id);
    if (!proposalId) continue;
    const entry = map.get(proposalId) ?? { total: 0, groups: {} };
    entry.total += 1;
    const groupKey = trim(row.group_key) || "ungrouped";
    entry.groups[groupKey] = (entry.groups[groupKey] ?? 0) + 1;
    map.set(proposalId, entry);
  }
  return map;
}

async function main() {
  const servicePath = "src/lib/api/proposalAttachments.service.ts";
  const accountantPath = "src/screens/accountant/accountant.attachments.ts";
  const accountantCardPath = "src/screens/accountant/components/AccountantCardContent.tsx";
  const accountantReceiptPath = "src/screens/accountant/components/ReadOnlyReceipt.tsx";
  const buyerPath = "src/screens/buyer/useBuyerProposalAttachments.ts";
  const directorPath = "src/screens/director/director.proposal.detail.ts";
  const filesPath = "src/lib/files.ts";

  const serviceText = readText(servicePath);
  const accountantText = readText(accountantPath);
  const accountantCardText = readText(accountantCardPath);
  const accountantReceiptText = readText(accountantReceiptPath);
  const buyerText = readText(buyerPath);
  const directorText = readText(directorPath);
  const filesText = readText(filesPath);

  const sourceMap = {
    generatedAt: new Date().toISOString(),
    canonicalSource: {
      primary: "rpc:proposal_attachments_list",
      compatibility: "table:proposal_attachments",
      writeOwner: "proposal_attachments",
    },
    activeConsumers: {
      accountant: [accountantPath, accountantCardPath, accountantReceiptPath, "src/screens/accountant/useAccountantDocuments.ts"],
      buyer: [buyerPath, "src/screens/buyer/hooks/useBuyerAccountingModal.ts"],
      director: [directorPath],
      shared: [filesPath],
    },
    sourceDiscipline: {
      statusSpecificTruthAllowed: false,
      rawPayloadPatchingAllowed: false,
      uiMergeAllowed: false,
    },
  };

  const canonicalModel = {
    generatedAt: new Date().toISOString(),
    contractFields: [
      "attachmentId",
      "proposalId",
      "ownerType",
      "ownerId",
      "fileName",
      "mimeType",
      "fileUrl",
      "storagePath",
      "bucketId",
      "groupKey",
      "createdAt",
      "sourceKind",
    ],
    sourceKinds: ["canonical", "compatibility"],
    viewStates: ["ready", "empty", "error", "degraded"],
    ownerTypeRules: {
      proposal_pdf: "proposal",
      invoice: "invoice",
      payment: "payment",
    },
    structural: {
      serviceExportsCanonicalLoader: serviceText.includes("export async function listCanonicalProposalAttachments("),
      serviceUsesPrimaryRpc: serviceText.includes('client.rpc("proposal_attachments_list"'),
      serviceUsesCompatibilityFallback: serviceText.includes('.from("proposal_attachments")'),
      accountantUsesCanonicalService: accountantText.includes("listCanonicalProposalAttachments"),
      buyerUsesCanonicalService: buyerText.includes("listCanonicalProposalAttachments"),
      directorUsesCanonicalService: directorText.includes("listCanonicalProposalAttachments"),
      filesUsesCanonicalService:
        filesText.includes("listCanonicalProposalAttachments") &&
        filesText.includes("getLatestCanonicalProposalAttachment"),
      accountantStateContract:
        accountantCardText.includes('attState === "error"') &&
        accountantCardText.includes('attState === "degraded"') &&
        accountantCardText.includes('attState === "empty"') &&
        accountantReceiptText.includes('attState === "error"') &&
        accountantReceiptText.includes('attState === "degraded"') &&
        accountantReceiptText.includes('attState === "empty"'),
    },
  };

  const inboxTabs = ["К оплате", "Частично", "Оплачено"];
  const inboxByTab = await Promise.all(
    inboxTabs.map(async (tab) => ({
      tab,
      proposalIds: await loadAccountantInboxProposalIds(tab),
    })),
  );
  const historyProposalIds = await loadAccountantHistoryProposalIds();
  const candidateProposalIds = Array.from(
    new Set([
      ...inboxByTab.flatMap((entry) => entry.proposalIds),
      ...historyProposalIds,
    ]),
  ).filter(Boolean);

  const directCounts = await loadDirectCounts(candidateProposalIds);
  const proposalIdsWithAttachments = candidateProposalIds
    .filter((proposalId) => (directCounts.get(proposalId)?.total ?? 0) > 0)
    .slice(0, 8);

  const accountantSamples = await Promise.all(
    proposalIdsWithAttachments.map(async (proposalId) => {
      const canonical = await listCanonicalProposalAttachments(admin, proposalId, { screen: "accountant" });
      const direct = directCounts.get(proposalId) ?? { total: 0, groups: {} };
      const inboxTabsForProposal = inboxByTab
        .filter((entry) => entry.proposalIds.includes(proposalId))
        .map((entry) => entry.tab);

      return {
        proposalId,
        directCount: direct.total,
        directGroups: direct.groups,
        canonicalCount: canonical.rows.length,
        canonicalState: canonical.state,
        canonicalSourceKind: canonical.sourceKind,
        fallbackUsed: canonical.fallbackUsed,
        accountantScopes: {
          inboxTabs: inboxTabsForProposal,
          historyVisible: historyProposalIds.includes(proposalId),
        },
        countMatches: canonical.rows.length === direct.total,
        visibleAndReady:
          direct.total === 0
            ? canonical.state === "empty"
            : canonical.rows.length === direct.total &&
              (canonical.state === "ready" || canonical.state === "degraded"),
      };
    }),
  );

  const readySample = accountantSamples.find((sample) => sample.directCount > 0) ?? null;
  const emptyProposal = candidateProposalIds.find((proposalId) => !directCounts.has(proposalId)) ?? null;
  const emptySample = emptyProposal
    ? await listCanonicalProposalAttachments(admin, emptyProposal, { screen: "accountant" })
    : null;

  const smoke = {
    generatedAt: new Date().toISOString(),
    readySample:
      readySample == null
        ? null
        : {
            proposalId: readySample.proposalId,
            directCount: readySample.directCount,
            canonicalCount: readySample.canonicalCount,
            canonicalState: readySample.canonicalState,
            sourceKind: readySample.canonicalSourceKind,
            fallbackUsed: readySample.fallbackUsed,
          },
    emptySample:
      emptySample == null || emptyProposal == null
        ? null
        : {
            proposalId: emptyProposal,
            canonicalCount: emptySample.rows.length,
            canonicalState: emptySample.state,
            sourceKind: emptySample.sourceKind,
          },
    status:
      readySample != null &&
      readySample.visibleAndReady &&
      (emptySample == null || emptySample.state === "empty")
        ? "GREEN"
        : "NOT GREEN",
  };

  const accountantConsistency = {
    generatedAt: new Date().toISOString(),
    sampledProposalCount: accountantSamples.length,
    samples: accountantSamples,
    status:
      accountantSamples.length > 0 &&
      accountantSamples.every((sample) => sample.countMatches && sample.visibleAndReady)
        ? "GREEN"
        : "NOT GREEN",
  };

  const summary = {
    status:
      Object.values(canonicalModel.structural).every(Boolean) &&
      accountantConsistency.status === "GREEN" &&
      smoke.status === "GREEN"
        ? "GREEN"
        : "NOT GREEN",
    structural: canonicalModel.structural,
    accountantConsistencyStatus: accountantConsistency.status,
    smokeStatus: smoke.status,
    sampledProposalCount: accountantSamples.length,
  };

  writeJson("artifacts/attachments-source-map.json", sourceMap);
  writeJson("artifacts/attachments-canonical-read-model.json", canonicalModel);
  writeJson("artifacts/accountant-attachments-consistency.json", accountantConsistency);
  writeJson("artifacts/attachments-smoke.json", smoke);
  console.log(JSON.stringify(summary, null, 2));

  if (summary.status !== "GREEN") {
    process.exitCode = 1;
  }
}

void main();
