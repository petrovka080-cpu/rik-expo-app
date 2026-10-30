import { stableJsonStringify } from "./foremanRequestPdf.shared.ts";

type JsonObject = Record<string, unknown>;
const object = (value: unknown): JsonObject | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : null;
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

export type ForemanRequestPdfAuthoritySnapshot = {
  request: JsonObject;
  items: JsonObject[];
  refs: { object: JsonObject | null; level: JsonObject | null; system: JsonObject | null; zone: JsonObject | null };
  authority: { contract: "foreman_request_read_v1"; actorId: string; requestId: string; companyId: string | null; mode: "company" | "legacy_creator" };
};

// This validates a server authorization receipt. It never creates authority from
// a client actor/company hint, signed role metadata, or creator memberships.
export async function loadForemanRequestPdfAuthoritySnapshot(args: {
  requester: { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> };
  requestId: string;
  actorId: string;
}): Promise<ForemanRequestPdfAuthoritySnapshot> {
  if (!text(args.actorId) || !text(args.requestId)) throw new Error("PDF authority required");
  const result = await args.requester.rpc("foreman_request_pdf_snapshot_v1", { p_request_id: args.requestId });
  if (result.error) throw new Error("PDF authority denied");
  const data = object(result.data);
  const authority = object(data?.authority);
  const request = object(data?.request);
  const refs = object(data?.refs);
  if (!authority || authority.contract !== "foreman_request_read_v1" ||
      authority.actorId !== args.actorId || authority.requestId !== args.requestId ||
      !request || request.id !== args.requestId || !refs || !Array.isArray(data?.items) ||
      data.items.length > 5000 || data.items.some((item: unknown) => !object(item))) {
    throw new Error("Invalid PDF authority snapshot");
  }
  const companyId = text(authority.companyId) || null;
  if ((authority.mode === "company" && !companyId) ||
      (authority.mode === "legacy_creator" && companyId !== null) ||
      (authority.mode !== "company" && authority.mode !== "legacy_creator")) {
    throw new Error("Invalid PDF authority scope");
  }
  return {
    request, items: data.items as JsonObject[],
    refs: { object: object(refs.object), level: object(refs.level), system: object(refs.system), zone: object(refs.zone) },
    authority: { contract: "foreman_request_read_v1", actorId: args.actorId, requestId: args.requestId, companyId, mode: authority.mode },
  };
}

// Recheck after rendering before using service-role Storage. Membership/factor
// revocation and source changes during a slow render never release old bytes.
export async function assertForemanRequestPdfSnapshotCurrent(args: {
  requester: Parameters<typeof loadForemanRequestPdfAuthoritySnapshot>[0]["requester"];
  snapshot: ForemanRequestPdfAuthoritySnapshot;
}): Promise<void> {
  const current = await loadForemanRequestPdfAuthoritySnapshot({
    requester: args.requester, actorId: args.snapshot.authority.actorId,
    requestId: args.snapshot.authority.requestId,
  });
  if (stableJsonStringify(current) !== stableJsonStringify(args.snapshot)) {
    throw new Error("PDF source or authority changed; retry required");
  }
}
