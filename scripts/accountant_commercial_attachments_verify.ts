import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "../src/lib/database.types";
import { listCanonicalProposalAttachments } from "../src/lib/api/proposalAttachments.service";
import { listProposalAttachments } from "../src/screens/accountant/accountant.attachments";

type ProposalRow = Database["public"]["Tables"]["proposals"]["Row"];
type ProposalAttachmentRow = Database["public"]["Tables"]["proposal_attachments"]["Row"];
type AdminClient = ReturnType<typeof createClient<Database>>;

const ROOT = path.resolve(__dirname, "..");
const ARTIFACTS_DIR = path.join(ROOT, "artifacts");
const ENV_FILE = path.join(ROOT, ".env.local");
const SURROGATE_GROUPS = new Set(["proposal_pdf", "proposal_html"]);
const TARGET_PROPOSAL_NOS = ["PR-0419/2026", "PR-0381/2026"];

function loadEnvFile(filePath: string) {
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalIndex = trimmed.indexOf("=");
    if (equalIndex === -1) continue;
    const key = trimmed.slice(0, equalIndex).trim();
    const value = trimmed.slice(equalIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function lower(value: unknown) {
  return text(value).toLowerCase();
}

function groupCounts(rows: Array<{ group_key?: string | null } | { groupKey?: string | null }>) {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const key = "group_key" in row ? text(row.group_key) : text((row as { groupKey?: string | null }).groupKey);
    const normalized = key || "ungrouped";
    counts[normalized] = (counts[normalized] ?? 0) + 1;
  }
  return counts;
}

async function loadProposal(admin: AdminClient, proposalNo: string): Promise<ProposalRow | null> {
  const query = await admin
    .from("proposals")
    .select("*")
    .eq("proposal_no", proposalNo)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (query.error) throw query.error;
  return query.data ?? null;
}

async function loadProposalAttachmentRows(admin: AdminClient, proposalId: string): Promise<ProposalAttachmentRow[]> {
  const query = await admin
    .from("proposal_attachments")
    .select("*")
    .eq("proposal_id", proposalId)
    .order("created_at", { ascending: false });
  if (query.error) throw query.error;
  return Array.isArray(query.data) ? query.data : [];
}

async function buildCase(admin: AdminClient, proposalNo: string) {
  const proposal = await loadProposal(admin, proposalNo);
  if (!proposal?.id) {
    return {
      proposalNo,
      found: false,
    };
  }

  const persistedRows = await loadProposalAttachmentRows(admin, proposal.id);
  const canonical = await listCanonicalProposalAttachments(admin, proposal.id, {
    screen: "accountant",
  });
  const accountant = await listProposalAttachments(admin, proposal.id);

  return {
    proposalNo,
    found: true,
    proposalId: proposal.id,
    requestId: proposal.request_id,
    status: proposal.status,
    submittedAt: proposal.submitted_at,
    sentToAccountantAt: proposal.sent_to_accountant_at,
    persistedRows: persistedRows.map((row) => ({
      attachmentId: row.id,
      ownerType: "proposal",
      ownerId: row.proposal_id,
      fileName: row.file_name,
      groupKey: row.group_key,
      bucketId: row.bucket_id,
      storagePath: row.storage_path,
      createdAt: row.created_at,
    })),
    persistedGroupCounts: groupCounts(persistedRows),
    canonical: {
      state: canonical.state,
      sourceKind: canonical.sourceKind,
      fallbackUsed: canonical.fallbackUsed,
      rawCount: canonical.rawCount,
      mappedCount: canonical.mappedCount,
      filteredCount: canonical.filteredCount,
      rows: canonical.rows.map((row) => ({
        attachmentId: row.attachmentId,
        ownerType: row.ownerType,
        ownerId: row.ownerId,
        fileName: row.fileName,
        groupKey: row.groupKey,
        createdAt: row.createdAt,
      })),
      groupCounts: groupCounts(canonical.rows),
    },
    accountant: {
      state: accountant.state,
      sourceKind: accountant.sourceKind,
      fallbackUsed: accountant.fallbackUsed,
      rawCount: accountant.rawCount,
      mappedCount: accountant.mappedCount,
      filteredCount: accountant.filteredCount,
      errorMessage: accountant.errorMessage,
      rows: accountant.rows.map((row) => ({
        attachmentId: row.attachmentId,
        ownerType: row.ownerType,
        ownerId: row.ownerId,
        basisKind: row.basisKind,
        fileName: row.fileName,
        groupKey: row.groupKey,
        sourceDetailKind: row.sourceDetailKind,
      })),
      diagnostics: accountant.diagnostics,
    },
  };
}

function writeArtifact(fileName: string, payload: unknown) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, fileName), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function main() {
  loadEnvFile(ENV_FILE);
  const supabaseUrl = text(process.env.EXPO_PUBLIC_SUPABASE_URL);
  const supabaseKey = text(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE key");
  }

  const admin = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const cases = [];
  for (const proposalNo of TARGET_PROPOSAL_NOS) {
    cases.push(await buildCase(admin, proposalNo));
  }

  const ownerChainArtifact = {
    generatedAt: new Date().toISOString(),
    cases: cases.map((entry) => {
      if (!entry.found) return entry;
      return {
        proposalNo: entry.proposalNo,
        proposalId: entry.proposalId,
        requestId: entry.requestId,
        status: entry.status,
        submittedAt: entry.submittedAt,
        sentToAccountantAt: entry.sentToAccountantAt,
        ownerChain: {
          buyerCommercialAttachmentOwner: entry.persistedRows.length > 0 ? "proposal" : null,
          canonicalProposalAttachmentOwner: entry.canonical.rows.length > 0 ? "proposal" : null,
          accountantBasisOwner: entry.accountant.rows.length > 0 ? "proposal_commercial" : null,
        },
        persistedRows: entry.persistedRows,
        persistedGroupCounts: entry.persistedGroupCounts,
      };
    }),
  };

  const proofArtifact = {
    generatedAt: new Date().toISOString(),
    cases: cases.map((entry) => {
      if (!entry.found) return entry;
      return {
        proposalNo: entry.proposalNo,
        canonicalState: entry.canonical.state,
        accountantState: entry.accountant.state,
        canonicalGroupCounts: entry.canonical.groupCounts,
        accountantRows: entry.accountant.rows,
        accountantDiagnostics: entry.accountant.diagnostics,
        surrogateVisible: entry.accountant.rows.some((row) => SURROGATE_GROUPS.has(lower(row.groupKey))),
      };
    }),
  };

  const commercialVsSurrogateArtifact = {
    generatedAt: new Date().toISOString(),
    cases: cases.map((entry) => {
      if (!entry.found) return entry;
      const persistedCommercialCount = entry.persistedRows.filter(
        (row) => !SURROGATE_GROUPS.has(lower(row.groupKey)),
      ).length;
      const persistedSurrogateCount = entry.persistedRows.filter((row) =>
        SURROGATE_GROUPS.has(lower(row.groupKey)),
      ).length;
      const visibleCommercialCount = entry.accountant.rows.filter(
        (row) => !SURROGATE_GROUPS.has(lower(row.groupKey)),
      ).length;
      const visibleSurrogateCount = entry.accountant.rows.filter((row) =>
        SURROGATE_GROUPS.has(lower(row.groupKey)),
      ).length;
      return {
        proposalNo: entry.proposalNo,
        persistedCommercialCount,
        persistedSurrogateCount,
        visibleCommercialCount,
        visibleSurrogateCount,
        surrogateRejectedCount: entry.accountant.diagnostics.filterReasons.surrogate_group,
      };
    }),
  };

  const smokeChecks = [
    {
      name: "PR-0419 accountant shows only supplier commercial attachment",
      passed: cases.some(
        (entry) =>
          entry.found &&
          entry.proposalNo === "PR-0419/2026" &&
          entry.accountant.rows.some((row) => lower(row.groupKey) === "supplier_quote") &&
          entry.accountant.rows.every((row) => !SURROGATE_GROUPS.has(lower(row.groupKey))),
      ),
    },
    {
      name: "surrogate proposal_pdf is not visible in accountant basis list",
      passed: cases
        .filter((entry) => entry.found)
        .every((entry) => entry.accountant.rows.every((row) => !SURROGATE_GROUPS.has(lower(row.groupKey)))),
    },
    {
      name: "PR-0381 stays empty when no commercial attachments exist",
      passed: cases.some(
        (entry) =>
          entry.found &&
          entry.proposalNo === "PR-0381/2026" &&
          entry.accountant.state === "empty" &&
          entry.accountant.rows.length === 0,
      ),
    },
    {
      name: "canonical raw row count matches persisted proposal attachment rows",
      passed: cases
        .filter((entry) => entry.found)
        .every((entry) => entry.canonical.rawCount === entry.persistedRows.length),
    },
  ];

  const smokeArtifact = {
    generatedAt: new Date().toISOString(),
    checks: smokeChecks,
    allPassed: smokeChecks.every((check) => check.passed),
  };

  writeArtifact("accountant-commercial-attachments-owner-chain.json", ownerChainArtifact);
  writeArtifact("accountant-commercial-attachments-proof.json", proofArtifact);
  writeArtifact("accountant-commercial-vs-surrogate.json", commercialVsSurrogateArtifact);
  writeArtifact("accountant-commercial-attachments-smoke.json", smokeArtifact);

  console.log(JSON.stringify(smokeArtifact, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
