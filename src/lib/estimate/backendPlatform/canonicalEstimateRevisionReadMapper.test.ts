import {
  CanonicalEstimateRevisionReadContractError,
  canonicalEstimateRevisionDetailFromStorage,
  canonicalEstimateRevisionRowFromStorage,
} from "./canonicalEstimateRevisionReadMapper";

const revisionStorage = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: "10000000-0000-4000-8000-000000000001",
  parent_revision_id: null,
  organization_id: null,
  release_id: "20000000-0000-4000-8000-000000000001",
  catalog_id: "canonical-work:test",
  revision_number: 7,
  status: "ready",
  currency_code: "KGS",
  price_snapshot_ids: [
    "30000000-0000-4000-8000-000000000001",
    "30000000-0000-4000-8000-000000000002",
  ],
  input_parameters: { length_m: "150" },
  amendment_contract: { rowOverrides: {}, customRows: [], releaseMigration: null },
  totals: { amount: "441000.00" },
  row_count: 1,
  checksum_sha256: "a".repeat(64),
  compiler_version: "test",
  definition_version: 2,
  compiler_owner: "backend",
  parameter_schema_hash: "b".repeat(64),
  input_hash: "c".repeat(64),
  output_hash: "d".repeat(64),
  created_at: "2026-09-23T00:00:00.000Z",
  ...overrides,
});

const rowStorage = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  row_id: "main_concrete",
  ordinal: 0,
  section: "materials",
  category: "concrete",
  title_ru: "Бетон",
  unit_id: "m3",
  quantity: "126",
  unit_price: "3500",
  amount: "441000",
  currency_code: "KGS",
  procurement_eligible: true,
  included_in_estimate: true,
  included_in_procurement: true,
  ownership_status: "OWNED",
  calculation_trace: { formulaId: "volume" },
  normative_trace: [],
  row_sha256: "e".repeat(64),
  ...overrides,
});

describe("canonical revision read mapping", () => {
  it("preserves selected snapshot candidates in the full revision DTO", () => {
    const view = canonicalEstimateRevisionDetailFromStorage(revisionStorage());

    expect(view.priceSnapshotIds).toEqual([
      "30000000-0000-4000-8000-000000000001",
      "30000000-0000-4000-8000-000000000002",
    ]);
    expect(view.parameters).toEqual({ length_m: "150" });
    expect(view.rowCount).toBe(1);
  });

  it("rejects a full storage projection that silently omitted snapshot evidence", () => {
    const storage = revisionStorage();
    delete storage.price_snapshot_ids;

    expect(() => canonicalEstimateRevisionDetailFromStorage(storage))
      .toThrow(CanonicalEstimateRevisionReadContractError);
  });

  it("keeps an isolated personal storage scope out of the organization contract", () => {
    const ownerUserId = "50000000-0000-4000-8000-000000000001";
    const storage = revisionStorage({
      owner_user_id: ownerUserId,
      organization_id: ownerUserId,
    });

    expect(canonicalEstimateRevisionDetailFromStorage(storage, {
      principalOrganizationId: null,
    }).organizationId).toBeNull();
    expect(canonicalEstimateRevisionDetailFromStorage(storage).organizationId)
      .toBe(ownerUserId);
  });

  it("maps the actual immutable automatic price source independently of candidate snapshots", () => {
    const source = canonicalEstimateRevisionRowFromStorage(rowStorage(), {
      price_snapshot_id: "30000000-0000-4000-8000-000000000001",
      route_id: "40000000-0000-4000-8000-000000000001",
      unit_price: "3500",
      currency_code: "KGS",
      resolution_trace: { priceKey: "concrete:B25", resolved: true },
    }, {
      snapshot_captured_at: "2026-09-22T12:00:00.000Z",
      route_source_kind: "supplier",
    }).priceSource;

    expect(source).toEqual({
      kind: "AUTOMATIC_SNAPSHOT",
      snapshotId: "30000000-0000-4000-8000-000000000001",
      routeId: "40000000-0000-4000-8000-000000000001",
      priceKey: "concrete:B25",
      unitId: "m3",
      unitPrice: "3500",
      currencyCode: "KGS",
      snapshotCapturedAt: "2026-09-22T12:00:00.000Z",
      routeSourceKind: "supplier",
      resolutionTrace: { priceKey: "concrete:B25", resolved: true },
    });
  });

  it.each([
    [
      "MANUAL",
      { price_snapshot_id: null, route_id: null, unit_price: "3600", currency_code: "KGS",
        resolution_trace: { kind: "manual_override", resolved: true } },
      rowStorage({ unit_price: "3600" }),
    ],
    [
      "UNPRICED",
      { price_snapshot_id: null, route_id: null, unit_price: null, currency_code: null,
        resolution_trace: { priceKey: "unknown", resolved: false } },
      rowStorage({ unit_price: null, amount: null, currency_code: null }),
    ],
    [
      "LEGACY_UNKNOWN",
      null,
      rowStorage({ ownership_status: "MIGRATED_UNOWNED_EXCLUDED_FROM_TOTAL" }),
    ],
  ] as const)("distinguishes %s price provenance", (kind, price, row) => {
    expect(canonicalEstimateRevisionRowFromStorage(row, price).priceSource?.kind).toBe(kind);
  });
});
