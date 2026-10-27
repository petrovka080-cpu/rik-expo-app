import {
  matchesDirectorObjectIdentity,
  resolveDirectorFactContext,
} from "./director_reports.shared";

describe("director_reports identity solidification", () => {
  it("matches by stable object key before falling back to canonical name", () => {
    const row = {
      object_id_resolved: "BLD-ADMIN",
      object_name_resolved: "legacy free-form text",
    };

    expect(
      matchesDirectorObjectIdentity("Административное здание", row, {
        "Административное здание": "BLD-ADMIN",
      }),
    ).toBe(true);

    expect(
      matchesDirectorObjectIdentity("Ангар", row, {
        "Ангар": "BLD-IND-HANGAR",
      }),
    ).toBe(false);
  });

  it("prefers request identity projection over legacy request display fields", () => {
    const context = resolveDirectorFactContext({
      request_id: "request-1",
      request: {
        id: "request-1",
        request_no: null,
        display_no: null,
        status: "submitted",
        object_id: null,
        object_name: "legacy object text",
        object_type_code: null,
        object_identity_key: "BLD-ADMIN",
        object_identity_name: "Административное здание",
        object_identity_status: "shadow_backfill",
        object_identity_source: "exact_alias_backfill_v1",
        system_code: null,
        level_code: null,
        zone_code: null,
        object: null,
        submitted_at: null,
        created_at: null,
        note: null,
        comment: null,
        item_count_total: 0,
        item_count_active: 0,
        item_qty_total: 0,
        item_qty_active: 0,
      },
      request_object_type_name: "should not win",
    });

    expect(context.object_id_resolved).toBe("BLD-ADMIN");
    expect(context.object_name_resolved).toBe("Административное здание");
  });
});
