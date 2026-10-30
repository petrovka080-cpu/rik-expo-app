import { readFileSync } from "fs";
import { join } from "path";

import type { RequestDetails } from "../../src/lib/catalog_api";
import {
  applyForemanDraftHeaderEditPlanToRequestDetails,
  buildForemanDraftHeaderState,
  resolveForemanDraftActivityState,
  resolveForemanDraftHeaderEditPlan,
} from "../../src/screens/foreman/foreman.draftBoundaryIdentity.model";
import {
  buildForemanRequestDraftMeta,
  patchForemanRequestDetailsComment,
  patchForemanRequestDetailsLevel,
  patchForemanRequestDetailsName,
  patchForemanRequestDetailsObjectType,
  patchForemanRequestDetailsSystem,
  patchForemanRequestDetailsZone,
} from "../../src/screens/foreman/foreman.draftBoundary.helpers";
import type { ForemanLocalDraftSnapshot } from "../../src/screens/foreman/foreman.localDraft";

const makeSnapshot = (
  patch: Partial<ForemanLocalDraftSnapshot> = {},
): ForemanLocalDraftSnapshot => ({
  version: 1,
  ownerId: "owner-1",
  requestId: "req-1",
  displayNo: "REQ-0001/2026",
  status: "draft",
  header: {
    foreman: "Foreman",
    comment: "Comment",
    objectType: "OBJ",
    level: "L1",
    system: "SYS",
    zone: "ZONE",
  },
  items: [
    {
      local_id: "local-1",
      remote_item_id: "item-1",
      rik_code: "MAT-1",
      name_human: "Material",
      qty: 1,
      uom: "pcs",
      status: "draft",
      note: null,
      app_code: null,
      kind: "material",
      line_no: 1,
    },
  ],
  qtyDrafts: {},
  pendingDeletes: [],
  submitRequested: false,
  lastError: null,
  updatedAt: "2026-04-20T00:00:00.000Z",
  ...patch,
});

const makeDetails = (): RequestDetails => ({
  id: "req-1",
  status: "draft",
  display_no: "REQ-0001/2026",
  comment: "Old comment",
  foreman_name: "Old foreman",
  object_type_code: "OLD_OBJECT",
  level_code: "OLD_LEVEL",
  system_code: "OLD_SYSTEM",
  zone_code: "OLD_ZONE",
  object_name_ru: "Old object",
  level_name_ru: "Old level",
  system_name_ru: "Old system",
  zone_name_ru: "Old zone",
});

describe("foreman draft state boundary model", () => {
  it("stays free of runtime, network, queue, durable store, and React side effects", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "screens", "foreman", "foreman.draftBoundaryIdentity.model.ts"),
      "utf8",
    );

    expect(source).not.toContain("useEffect");
    expect(source).not.toContain("useCallback");
    expect(source).not.toContain("useState");
    expect(source).not.toContain("fetchRequestDetails");
    expect(source).not.toContain("enqueueForemanMutation");
    expect(source).not.toContain("flushForemanMutationQueue");
    expect(source).not.toContain("patchForemanDurableDraftRecoveryState");
    expect(source).not.toContain("persistForemanLocalDraftSnapshot");
    expect(source).not.toContain("AppState");
    expect(source).not.toContain("subscribePlatformNetwork");
  });

  it("preserves existing draft activity semantics, including null-status draft-like behavior", () => {
    expect(resolveForemanDraftActivityState({
      activeLocalDraftSnapshot: null,
      requestStatus: "submitted",
    })).toEqual({
      hasLocalDraft: false,
      isDraftActive: false,
    });

    expect(resolveForemanDraftActivityState({
      activeLocalDraftSnapshot: null,
      requestStatus: null,
    })).toEqual({
      hasLocalDraft: false,
      isDraftActive: true,
    });

    expect(resolveForemanDraftActivityState({
      activeLocalDraftSnapshot: makeSnapshot(),
      requestStatus: "submitted",
    })).toEqual({
      hasLocalDraft: true,
      isDraftActive: true,
    });

    expect(resolveForemanDraftActivityState({
      activeLocalDraftSnapshot: makeSnapshot({
        requestId: "",
        header: {
          foreman: "",
          comment: "",
          objectType: "",
          level: "",
          system: "",
          zone: "",
        },
        items: [],
        pendingDeletes: [],
      }),
      requestStatus: "submitted",
    })).toEqual({
      hasLocalDraft: false,
      isDraftActive: false,
    });
  });

  it("builds header state and request draft meta without changing trimming/null semantics", () => {
    const header = buildForemanDraftHeaderState({
      foreman: " Foreman ",
      comment: " ",
      objectType: "OBJ",
      level: "",
      system: "SYS",
      zone: "ZONE",
    });

    expect(buildForemanRequestDraftMeta(header)).toEqual({
      foreman_name: "Foreman",
      comment: null,
      object_type_code: "OBJ",
      level_code: null,
      system_code: "SYS",
      zone_code: "ZONE",
    });
  });

  it("keeps header edit request-details patches identical to the legacy helpers", () => {
    const details = makeDetails();

    const foremanPlan = resolveForemanDraftHeaderEditPlan({ field: "foreman", value: "New foreman" });
    expect(foremanPlan.headerPatch).toEqual({ foreman: "New foreman" });
    expect(applyForemanDraftHeaderEditPlanToRequestDetails(details, foremanPlan)).toEqual(
      patchForemanRequestDetailsName(details, "New foreman"),
    );

    const commentPlan = resolveForemanDraftHeaderEditPlan({ field: "comment", value: "New comment" });
    expect(commentPlan.headerPatch).toEqual({ comment: "New comment" });
    expect(applyForemanDraftHeaderEditPlanToRequestDetails(details, commentPlan)).toEqual(
      patchForemanRequestDetailsComment(details, "New comment"),
    );

    const objectPlan = resolveForemanDraftHeaderEditPlan({
      field: "objectType",
      code: "NEW_OBJECT",
      name: "New object",
    });
    expect(objectPlan.headerPatch).toEqual({
      objectType: "NEW_OBJECT",
      level: "",
      system: "",
      zone: "",
    });
    expect(applyForemanDraftHeaderEditPlanToRequestDetails(details, objectPlan)).toEqual(
      patchForemanRequestDetailsObjectType(details, "NEW_OBJECT", "New object"),
    );

    const levelPlan = resolveForemanDraftHeaderEditPlan({ field: "level", code: "L2", name: "Level 2" });
    expect(levelPlan.headerPatch).toEqual({ level: "L2" });
    expect(applyForemanDraftHeaderEditPlanToRequestDetails(details, levelPlan)).toEqual(
      patchForemanRequestDetailsLevel(details, "L2", "Level 2"),
    );

    const systemPlan = resolveForemanDraftHeaderEditPlan({ field: "system", code: "SYS2", name: "System 2" });
    expect(systemPlan.headerPatch).toEqual({ system: "SYS2" });
    expect(applyForemanDraftHeaderEditPlanToRequestDetails(details, systemPlan)).toEqual(
      patchForemanRequestDetailsSystem(details, "SYS2", "System 2"),
    );

    const zonePlan = resolveForemanDraftHeaderEditPlan({ field: "zone", code: "Z2", name: "Zone 2" });
    expect(zonePlan.headerPatch).toEqual({ zone: "Z2" });
    expect(applyForemanDraftHeaderEditPlanToRequestDetails(details, zonePlan)).toEqual(
      patchForemanRequestDetailsZone(details, "Z2", "Zone 2"),
    );
  });

  it("keeps the root hook thin by routing header decisions through the state boundary", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "screens", "foreman", "hooks", "useForemanDraftBoundary.ts"),
      "utf8",
    );

    expect(source).toContain("buildForemanDraftBoundaryViewState");
    expect(source).toContain("resolveForemanDraftBoundaryCanEditItem");
    expect(source).toContain("resolveForemanDraftHeaderEditPlan");
    expect(source).toContain("applyForemanDraftHeaderEditToBoundary");
    expect(source).not.toContain("patchForemanRequestDetailsName");
    expect(source).not.toContain("patchForemanRequestDetailsComment");
    expect(source).not.toContain("patchForemanRequestDetailsObjectType");
    expect(source).not.toContain("patchForemanRequestDetailsLevel");
    expect(source).not.toContain("patchForemanRequestDetailsSystem");
    expect(source).not.toContain("patchForemanRequestDetailsZone");
  });
});
