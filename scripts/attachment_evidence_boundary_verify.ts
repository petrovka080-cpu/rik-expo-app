import fs from "node:fs";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

import { attachProposalAttachmentEvidence } from "../src/lib/api/proposalAttachmentEvidence.api";
import { listCanonicalProposalAttachments } from "../src/lib/api/proposalAttachments.service";
import { listProposalAttachments } from "../src/screens/accountant/accountant.attachments";
import type { Database } from "../src/lib/database.types";
import { cleanupTempUser, createTempUser, createVerifierAdmin, runtimePassword } from "./_shared/testUserDiscipline";

const projectRoot = process.cwd();
for (const file of [".env.local", ".env"]) {
  const full = path.join(projectRoot, file);
  if (fs.existsSync(full)) loadDotenv({ path: full, override: false });
}

(globalThis as { __DEV__?: boolean }).__DEV__ = false;

const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const anonKey = String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

if (!supabaseUrl || !anonKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

type RuntimeUser = {
  id: string;
  email: string;
  password: string;
  role: string;
  displayLabel: string;
};

type ProposalSeed = {
  id: string;
  proposalNo: string | null;
  requestId: string | null;
  supplier: string | null;
};

type EvidenceBinding = {
  label: string;
  groupKey: string;
  expectedVisibleTo: Array<"buyer" | "director" | "accountant">;
  fileName: string;
  mimeType: string;
  storagePath: string;
};

type PersistedAttachmentRow = {
  id: number;
  proposal_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  evidence_kind: string | null;
  created_by: string | null;
  visibility_scope: string | null;
  file_name: string;
  group_key: string;
  bucket_id: string | null;
  storage_path: string | null;
  mime_type: string | null;
  created_at: string | null;
};

const text = (value: unknown) => String(value ?? "").trim();

const writeJson = (relativePath: string, value: unknown) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const writeText = (relativePath: string, value: string) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, value, "utf8");
};

function createRuntimeClient(clientInfo: string) {
  return createClient<Database>(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "x-client-info": clientInfo },
    },
  });
}

async function signIn(client: SupabaseClient<Database>, user: RuntimeUser) {
  const signInResult = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password || runtimePassword,
  });
  if (signInResult.error || !signInResult.data.session) {
    throw signInResult.error ?? new Error(`signInWithPassword returned no session for ${user.email}`);
  }
}

async function pickTargetProposal(admin: SupabaseClient<Database>): Promise<ProposalSeed> {
  const query = await admin
    .from("proposals")
    .select("id,proposal_no,request_id,supplier")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (query.error) throw query.error;
  if (!query.data?.id) throw new Error("No proposal found for attachment evidence verification");
  return {
    id: query.data.id,
    proposalNo: query.data.proposal_no ?? null,
    requestId: query.data.request_id ?? null,
    supplier: query.data.supplier ?? null,
  };
}

async function uploadFixtureObject(
  admin: SupabaseClient<Database>,
  bucketId: string,
  storagePath: string,
  contentType: string,
  content: string,
) {
  const upload = await admin.storage.from(bucketId).upload(storagePath, Buffer.from(content, "utf8"), {
    contentType,
    upsert: false,
  });
  if (upload.error) throw upload.error;
}

async function removeFixtureObjects(
  admin: SupabaseClient<Database>,
  bucketId: string,
  storagePaths: string[],
) {
  const unique = Array.from(new Set(storagePaths.map((entry) => text(entry)).filter(Boolean)));
  if (!unique.length) return;
  await admin.storage.from(bucketId).remove(unique).catch(() => {});
}

async function loadPersistedMarkerRows(
  admin: SupabaseClient<Database>,
  proposalId: string,
  markerPrefix: string,
) {
  const query = await admin
    .from("proposal_attachments")
    .select(
      "id,proposal_id,entity_type,entity_id,evidence_kind,created_by,visibility_scope,file_name,group_key,bucket_id,storage_path,mime_type,created_at",
    )
    .eq("proposal_id", proposalId)
    .like("storage_path", `${markerPrefix}%`)
    .order("created_at", { ascending: false });
  if (query.error) throw query.error;
  return (query.data ?? []) as unknown as PersistedAttachmentRow[];
}

function filterRowsByMarker<T extends { storagePath?: string | null }>(rows: T[], markerPrefix: string) {
  return rows.filter((row) => text(row.storagePath).startsWith(markerPrefix));
}

function filterPersistedRowsByMarker(rows: PersistedAttachmentRow[], markerPrefix: string) {
  return rows.filter((row) => text(row.storage_path).startsWith(markerPrefix));
}

function legacyDirectorVisibleIds(rows: PersistedAttachmentRow[]) {
  return rows.map((row) => String(row.id));
}

function legacyBuyerVisibleIds(rows: PersistedAttachmentRow[]) {
  return rows.map((row) => String(row.id));
}

function legacyAccountantVisibleIds(rows: PersistedAttachmentRow[]) {
  return rows
    .filter((row) => {
      const groupKey = text(row.group_key).toLowerCase();
      return groupKey === "supplier_quote" || groupKey === "commercial_doc" || groupKey === "invoice_source";
    })
    .map((row) => String(row.id));
}

function sortStrings(values: string[]) {
  return values.slice().sort((left, right) => left.localeCompare(right));
}

function diffIds(oldIds: string[], newIds: string[]) {
  const oldSet = new Set(oldIds);
  const newSet = new Set(newIds);
  return {
    onlyOld: sortStrings(oldIds.filter((id) => !newSet.has(id))),
    onlyNew: sortStrings(newIds.filter((id) => !oldSet.has(id))),
  };
}

async function main() {
  const admin = createVerifierAdmin("attachment-evidence-boundary-verify");
  const buyerClient = createRuntimeClient("attachment-evidence-boundary-buyer");
  const directorClient = createRuntimeClient("attachment-evidence-boundary-director");
  const accountantClient = createRuntimeClient("attachment-evidence-boundary-accountant");

  let buyerUser: RuntimeUser | null = null;
  let directorUser: RuntimeUser | null = null;
  let accountantUser: RuntimeUser | null = null;
  let markerPrefix = "";
  const uploadedStoragePaths: string[] = [];
  let stage = "bootstrap";

  try {
    stage = "create_temp_users";
    buyerUser = await createTempUser(admin, {
      role: "buyer",
      fullName: "Attachment Evidence Buyer",
      emailPrefix: "attachment.evidence.buyer",
    }) as RuntimeUser;
    directorUser = await createTempUser(admin, {
      role: "director",
      fullName: "Attachment Evidence Director",
      emailPrefix: "attachment.evidence.director",
    }) as RuntimeUser;
    accountantUser = await createTempUser(admin, {
      role: "accountant",
      fullName: "Attachment Evidence Accountant",
      emailPrefix: "attachment.evidence.accountant",
    }) as RuntimeUser;

    stage = "sign_in";
    await signIn(buyerClient, buyerUser);
    await signIn(directorClient, directorUser);
    await signIn(accountantClient, accountantUser);

    stage = "seed_target";
    const targetProposal = await pickTargetProposal(admin);
    const runId = `wave1g-${Date.now().toString(36)}`;
    markerPrefix = `proposals/${targetProposal.id}/evidence/${runId}/`;
    const bucketId = "proposal_files";

    const evidenceBindings: EvidenceBinding[] = [
      {
        label: "buyer_supplier_quote",
        groupKey: "supplier_quote",
        expectedVisibleTo: ["buyer", "director", "accountant"],
        fileName: "supplier-quote.pdf",
        mimeType: "application/pdf",
        storagePath: `${markerPrefix}supplier-quote.pdf`,
      },
      {
        label: "buyer_invoice_basis",
        groupKey: "invoice",
        expectedVisibleTo: ["buyer", "director", "accountant"],
        fileName: "invoice.pdf",
        mimeType: "application/pdf",
        storagePath: `${markerPrefix}invoice.pdf`,
      },
      {
        label: "accountant_payment_basis",
        groupKey: "payment",
        expectedVisibleTo: ["buyer", "director", "accountant"],
        fileName: "payment.pdf",
        mimeType: "application/pdf",
        storagePath: `${markerPrefix}payment.pdf`,
      },
      {
        label: "buyer_html_technical",
        groupKey: "proposal_html",
        expectedVisibleTo: ["buyer"],
        fileName: "proposal.html",
        mimeType: "text/html",
        storagePath: `${markerPrefix}proposal.html`,
      },
    ];

    for (const binding of evidenceBindings) {
      await uploadFixtureObject(
        admin,
        bucketId,
        binding.storagePath,
        binding.mimeType,
        binding.groupKey === "proposal_html"
          ? "<html><body>proposal html</body></html>"
          : `%PDF-1.4\n${binding.label}\n%%EOF`,
      );
      uploadedStoragePaths.push(binding.storagePath);
    }

    const unboundStoragePath = `${markerPrefix}unbound-orphan.pdf`;
    await uploadFixtureObject(admin, bucketId, unboundStoragePath, "application/pdf", "%PDF-1.4\norphan\n%%EOF");
    uploadedStoragePaths.push(unboundStoragePath);

    stage = "bind_evidence";
    const buyerBindings = evidenceBindings.filter((binding) => binding.label !== "accountant_payment_basis");
    const accountantBinding = evidenceBindings.find((binding) => binding.label === "accountant_payment_basis");
    for (const binding of buyerBindings) {
      await attachProposalAttachmentEvidence(buyerClient, {
        proposalId: targetProposal.id,
        bucketId,
        storagePath: binding.storagePath,
        fileName: binding.fileName,
        groupKey: binding.groupKey,
        mimeType: binding.mimeType,
      });
    }
    if (!accountantBinding) throw new Error("Missing accountant payment binding fixture");
    await attachProposalAttachmentEvidence(accountantClient, {
      proposalId: targetProposal.id,
      bucketId,
      storagePath: accountantBinding.storagePath,
      fileName: accountantBinding.fileName,
      groupKey: accountantBinding.groupKey,
      mimeType: accountantBinding.mimeType,
    });

    stage = "negative_guards";
    const invalidStorageAttempt = await buyerClient.rpc("proposal_attachment_evidence_attach_v1" as never, {
      p_proposal_id: targetProposal.id,
      p_bucket_id: bucketId,
      p_storage_path: `${markerPrefix}missing-storage.pdf`,
      p_file_name: "missing-storage.pdf",
      p_group_key: "supplier_quote",
      p_mime_type: "application/pdf",
      p_created_by: null,
    } as never);

    const invalidEntityAttempt = await buyerClient.rpc("proposal_attachment_evidence_attach_v1" as never, {
      p_proposal_id: "00000000-0000-0000-0000-000000000000",
      p_bucket_id: bucketId,
      p_storage_path: unboundStoragePath,
      p_file_name: "ghost.pdf",
      p_group_key: "supplier_quote",
      p_mime_type: "application/pdf",
      p_created_by: null,
    } as never);

    stage = "load_visibility";
    const buyerVisible = filterRowsByMarker(
      (await listCanonicalProposalAttachments(buyerClient, targetProposal.id, { screen: "buyer" })).rows,
      markerPrefix,
    );
    const directorVisible = filterRowsByMarker(
      (await listCanonicalProposalAttachments(directorClient, targetProposal.id, { screen: "director" })).rows,
      markerPrefix,
    );
    const accountantVisible = filterRowsByMarker(
      (await listCanonicalProposalAttachments(accountantClient, targetProposal.id, { screen: "accountant" })).rows,
      markerPrefix,
    );
    const accountantBasis = await listProposalAttachments(accountantClient, targetProposal.id);
    const accountantBasisVisible = filterRowsByMarker(accountantBasis.rows, markerPrefix);
    const persistedRows = filterPersistedRowsByMarker(
      await loadPersistedMarkerRows(admin, targetProposal.id, markerPrefix),
      markerPrefix,
    );

    const buyerVisibleIds = sortStrings(buyerVisible.map((row) => row.attachmentId));
    const directorVisibleIds = sortStrings(directorVisible.map((row) => row.attachmentId));
    const accountantVisibleIds = sortStrings(accountantVisible.map((row) => row.attachmentId));
    const accountantBasisIds = sortStrings(accountantBasisVisible.map((row) => row.attachmentId));
    const persistedIds = sortStrings(persistedRows.map((row) => String(row.id)));

    const expectedEvidenceKinds = new Set(evidenceBindings.map((binding) => binding.groupKey));
    const visibleByRole = {
      buyer: buyerVisible.map((row) => ({
        attachmentId: row.attachmentId,
        evidenceKind: row.evidenceKind,
        visibilityScope: row.visibilityScope,
        createdBy: row.createdBy,
        storagePath: row.storagePath,
      })),
      director: directorVisible.map((row) => ({
        attachmentId: row.attachmentId,
        evidenceKind: row.evidenceKind,
        visibilityScope: row.visibilityScope,
        createdBy: row.createdBy,
        storagePath: row.storagePath,
      })),
      accountant: accountantVisible.map((row) => ({
        attachmentId: row.attachmentId,
        evidenceKind: row.evidenceKind,
        visibilityScope: row.visibilityScope,
        createdBy: row.createdBy,
        storagePath: row.storagePath,
      })),
      accountantBasis: accountantBasisVisible.map((row) => ({
        attachmentId: row.attachmentId,
        basisKind: row.basisKind,
        groupKey: row.groupKey,
        storagePath: row.storagePath,
      })),
    };

    const roleChecks = {
      buyerSeesAllBoundEvidence:
        buyerVisible.length === evidenceBindings.length
        && buyerVisible.every((row) => expectedEvidenceKinds.has(row.groupKey ?? "")),
      directorTechnicalHtmlHidden:
        !directorVisible.some((row) => row.evidenceKind === "proposal_html"),
      directorSeesCommercialEvidence:
        directorVisible.length === evidenceBindings.length - 1,
      accountantGenericScopeHidesTechnicalHtml:
        !accountantVisible.some((row) => row.evidenceKind === "proposal_html"),
      accountantBasisListPreservesCurrentCommercialSemantics:
        accountantBasisVisible.length === 1
        && accountantBasisVisible[0]?.basisKind === "supplier_quote",
      unboundBlobIsNotVisible:
        !buyerVisible.some((row) => text(row.storagePath) === unboundStoragePath)
        && !directorVisible.some((row) => text(row.storagePath) === unboundStoragePath)
        && !accountantVisible.some((row) => text(row.storagePath) === unboundStoragePath),
      metadataBackfilledForBoundRows:
        persistedRows.length === evidenceBindings.length
        && persistedRows.every((row) =>
          text(row.entity_type) === "proposal"
          && text(row.entity_id) === targetProposal.id
          && text(row.evidence_kind)
          && text(row.visibility_scope)
          && text(row.created_by)
        ),
    };

    const parity = {
      buyer: {
        oldVisibleAttachmentIds: legacyBuyerVisibleIds(persistedRows),
        newVisibleAttachmentIds: buyerVisibleIds,
      },
      director: {
        oldVisibleAttachmentIds: legacyDirectorVisibleIds(persistedRows),
        newVisibleAttachmentIds: directorVisibleIds,
      },
      accountant: {
        oldVisibleAttachmentIds: legacyAccountantVisibleIds(persistedRows),
        newVisibleAttachmentIds: accountantBasisIds,
      },
    };

    const buyerDiff = diffIds(parity.buyer.oldVisibleAttachmentIds, parity.buyer.newVisibleAttachmentIds);
    const directorDiff = diffIds(parity.director.oldVisibleAttachmentIds, parity.director.newVisibleAttachmentIds);
    const accountantDiff = diffIds(parity.accountant.oldVisibleAttachmentIds, parity.accountant.newVisibleAttachmentIds);

    const mismatchCategories = [
      ...(buyerDiff.onlyOld.length || buyerDiff.onlyNew.length ? ["buyer_visibility_mismatch"] : []),
      ...(directorDiff.onlyOld.length || directorDiff.onlyNew.length ? ["director_visibility_mismatch"] : []),
      ...(accountantDiff.onlyOld.length || accountantDiff.onlyNew.length ? ["accountant_basis_mismatch"] : []),
    ];
    const mismatchExplanations: string[] = [];
    if (directorDiff.onlyOld.length === 1) {
      const directorOnlyOldRow = persistedRows.find((row) => String(row.id) === directorDiff.onlyOld[0]);
      if (directorOnlyOldRow?.group_key === "proposal_html") {
        mismatchExplanations.push(
          "director_visibility_mismatch is limited to proposal_html, which is now explicitly buyer_only evidence.",
        );
      }
    }

    const safeSwitchVerdict =
      roleChecks.buyerSeesAllBoundEvidence
      && roleChecks.directorTechnicalHtmlHidden
      && roleChecks.directorSeesCommercialEvidence
      && roleChecks.accountantGenericScopeHidesTechnicalHtml
      && roleChecks.accountantBasisListPreservesCurrentCommercialSemantics
      && roleChecks.unboundBlobIsNotVisible
      && roleChecks.metadataBackfilledForBoundRows
      && buyerDiff.onlyOld.length === 0
      && buyerDiff.onlyNew.length === 0
      && accountantDiff.onlyOld.length === 0
      && accountantDiff.onlyNew.length === 0
      && directorDiff.onlyNew.length === 0
      && directorDiff.onlyOld.every((attachmentId) => {
        const row = persistedRows.find((entry) => String(entry.id) === attachmentId);
        return row?.group_key === "proposal_html";
      });

    const smoke = {
      generatedAt: new Date().toISOString(),
      canonicalSourceUsed: "rpc:proposal_attachment_evidence_scope_v1 + rpc:proposal_attachment_evidence_attach_v1",
      uploadScenarioSummary: {
        targetProposalId: targetProposal.id,
        targetProposalNo: targetProposal.proposalNo,
        markerPrefix,
        boundAttachmentCount: evidenceBindings.length,
        unboundStoragePath,
      },
      linkedEntitySummary: {
        entityType: "proposal",
        entityId: targetProposal.id,
        requestId: targetProposal.requestId,
        supplier: targetProposal.supplier,
      },
      evidenceKinds: evidenceBindings.map((binding) => ({
        label: binding.label,
        groupKey: binding.groupKey,
        expectedVisibleTo: binding.expectedVisibleTo,
      })),
      visibilityResultPerRole: visibleByRole,
      retrievalResult: {
        buyerVisibleCount: buyerVisible.length,
        directorVisibleCount: directorVisible.length,
        accountantVisibleCount: accountantVisible.length,
        accountantBasisVisibleCount: accountantBasisVisible.length,
        persistedVisibleCount: persistedRows.length,
      },
      orphanInvalidLinkageAttemptResult: {
        invalidStorageContextRejected: Boolean(invalidStorageAttempt.error),
        invalidStorageContextDetail: text(invalidStorageAttempt.error?.details ?? invalidStorageAttempt.error?.message) || null,
        invalidEntityContextRejected: Boolean(invalidEntityAttempt.error),
        invalidEntityContextDetail: text(invalidEntityAttempt.error?.details ?? invalidEntityAttempt.error?.message) || null,
        unboundBlobVisible: !roleChecks.unboundBlobIsNotVisible,
      },
      finalStatus: safeSwitchVerdict ? "GREEN" : "NOT GREEN",
    };

    const parityArtifact = {
      generatedAt: new Date().toISOString(),
      oldVisibleAttachments: parity,
      newVisibleAttachments: {
        buyer: buyerVisibleIds,
        director: directorVisibleIds,
        accountant: accountantBasisIds,
      },
      mismatches: {
        buyer: buyerDiff,
        director: directorDiff,
        accountant: accountantDiff,
      },
      ambiguityCategories: mismatchCategories,
      mismatchExplanations,
      safeSwitchVerdict,
    };

    const proofLines = [
      "# Attachment / Commercial Evidence Boundary Proof",
      "",
      `- Canonical write boundary: \`proposal_attachment_evidence_attach_v1\``,
      `- Canonical read boundary: \`proposal_attachment_evidence_scope_v1\``,
      `- Target proposal: \`${targetProposal.id}\`${targetProposal.proposalNo ? ` (${targetProposal.proposalNo})` : ""}`,
      `- Bound evidence rows: ${persistedRows.length}`,
      `- Buyer visible rows: ${buyerVisible.length}`,
      `- Director visible rows: ${directorVisible.length}`,
      `- Accountant generic visible rows: ${accountantVisible.length}`,
      `- Accountant basis rows: ${accountantBasisVisible.length}`,
      "",
      "What changed:",
      "- Attachment linkage now stores explicit `entity_type`, `entity_id`, `evidence_kind`, `created_by`, `visibility_scope`, and `mime_type` on the server.",
      "- Buyer/accountant uploads bind through the canonical attach RPC instead of direct `proposal_attachments` inserts.",
      "- Buyer/director/accountant retrieval now reads the canonical evidence scope instead of inferring relation on the client.",
      "",
      "Proof points:",
      `- Invalid storage context rejected: ${invalidStorageAttempt.error ? "yes" : "no"}`,
      `- Invalid entity context rejected: ${invalidEntityAttempt.error ? "yes" : "no"}`,
      `- Unbound blob stayed invisible: ${roleChecks.unboundBlobIsNotVisible ? "yes" : "no"}`,
      `- Director mismatch is limited to buyer-only technical HTML: ${
        directorDiff.onlyOld.length === 1 && mismatchExplanations.length > 0 ? "yes" : "no"
      }`,
      "",
      "Out of scope kept unchanged:",
      "- Attachment UI, picker/viewer UX, storage provider design, proposal/request/accounting semantics.",
      "",
      `Final status: ${safeSwitchVerdict ? "GREEN" : "NOT GREEN"}`,
      "",
    ];

    writeJson("artifacts/attachment-evidence-boundary-smoke.json", smoke);
    writeJson("artifacts/attachment-evidence-parity.json", parityArtifact);
    writeText("artifacts/attachment-evidence-boundary-proof.md", proofLines.join("\n"));
    console.log(JSON.stringify({ status: smoke.finalStatus, safeSwitchVerdict }, null, 2));

    if (smoke.finalStatus !== "GREEN") {
      process.exitCode = 1;
    }

    stage = "cleanup_rows";
    const cleanupRows = await loadPersistedMarkerRows(admin, targetProposal.id, markerPrefix);
    const cleanupIds = cleanupRows.map((row) => row.id);
    if (cleanupIds.length) {
      await admin.from("proposal_attachments").delete().in("id", cleanupIds);
    }
    await removeFixtureObjects(admin, bucketId, uploadedStoragePaths);
  } catch (error) {
    writeJson("artifacts/attachment-evidence-boundary-smoke.json", {
      generatedAt: new Date().toISOString(),
      stage,
      status: "NOT GREEN",
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : String(error),
    });
    throw error;
  } finally {
    if (markerPrefix) {
      await removeFixtureObjects(admin, "proposal_files", uploadedStoragePaths);
    }
    await buyerClient.auth.signOut().catch(() => {});
    await directorClient.auth.signOut().catch(() => {});
    await accountantClient.auth.signOut().catch(() => {});
    await cleanupTempUser(admin, accountantUser).catch(() => {});
    await cleanupTempUser(admin, directorUser).catch(() => {});
    await cleanupTempUser(admin, buyerUser).catch(() => {});
  }
}

void main();
