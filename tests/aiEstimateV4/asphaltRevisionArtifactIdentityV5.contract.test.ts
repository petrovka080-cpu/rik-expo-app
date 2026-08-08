import { createSnapshotFromDraftRevision } from "../../src/features/estimates/createSnapshotFromDraftRevision";
import { renderPdfFromDraftRevision } from "../../src/features/pdf/renderPdfFromDraftRevision";
import { createBuyerHandoffFromDraftRevision } from "../../src/features/procurement/createBuyerHandoffFromDraftRevision";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import type { EstimateDraftRevisionParam } from "../../src/lib/estimate/estimateDraftRevisionContract";
import { validateAiEstimateBuyerPackageParity } from "../../src/lib/estimate/artifacts/validateAiEstimateBuyerPackageParity";
import { validateAiEstimatePdfSnapshotParity } from "../../src/lib/estimate/artifacts/validateAiEstimatePdfSnapshotParity";
import { ASPHALT_WORK_ID_V4 } from "../../src/lib/estimate/v4/asphalt/asphaltV4Constants";

function param(value: string | number | boolean, changedAt: string): EstimateDraftRevisionParam {
  return { value, source: "user_input", lastChangedAt: changedAt };
}

function buildRoadRevision() {
  const createdAt = "2026-08-07T07:00:00.000Z";
  return createEstimateDraftRevision({
    estimateDraftId: "asphalt-road-48000",
    rawInput: "Построить дорожную одежду: длина 6000 м, ширина 8 м",
    selectedWorkKey: ASPHALT_WORK_ID_V4,
    createdAt,
    paramOverrides: {
      selectedRoadScope: param("FULL_PAVEMENT_STRUCTURE", createdAt),
      scope_profile: param("full_pavement_structure", createdAt),
      geometry_method: param("length_width", createdAt),
      length_m: param(6000, createdAt),
      width_m: param(8, createdAt),
      exclusions_m2: param(0, createdAt),
      geotextile_required: param(false, createdAt),
      costing_mode: param("RESOURCE_MODE", createdAt),
    },
  });
}

function buildParkingRevision() {
  const createdAt = "2026-08-07T07:01:00.000Z";
  return createEstimateDraftRevision({
    estimateDraftId: "asphalt-parking-657",
    rawInput: "Построить новую парковку: длина 73 м, ширина 9 м, площадь 657 м²",
    selectedWorkKey: ASPHALT_WORK_ID_V4,
    createdAt,
    paramOverrides: {
      selectedRoadScope: param("NEW_PARKING_FULL_CONSTRUCTION", createdAt),
      scope_profile: param("parking_full_construction", createdAt),
      geometry_method: param("length_width", createdAt),
      length_m: param(73, createdAt),
      width_m: param(9, createdAt),
      exclusions_m2: param(0, createdAt),
      geotextile_required: param(false, createdAt),
      costing_mode: param("RESOURCE_MODE", createdAt),
    },
  });
}

describe("FINAL R5 immutable revision artifact identity", () => {
  it("binds exact independent road 48,000 m² and parking 657 m² identities through PDF and procurement", () => {
    const road = buildRoadRevision();
    const parking = buildParkingRevision();

    const roadPdf = renderPdfFromDraftRevision({ revision: road });
    const roadBuyer = createBuyerHandoffFromDraftRevision({ revision: road, snapshot: roadPdf.snapshot });
    const parkingPdf = renderPdfFromDraftRevision({ revision: parking });
    const parkingBuyer = createBuyerHandoffFromDraftRevision({ revision: parking, snapshot: parkingPdf.snapshot });

    expect(roadPdf.snapshot.presentationIdentity).toMatchObject({
      revisionId: road.revisionId,
      scopeId: "FULL_PAVEMENT_STRUCTURE",
      areaM2: 48_000,
      lengthM: 6_000,
      widthM: 8,
      currentOrHistory: "CURRENT",
      rowCount: road.boq.rows.length,
      pricingStatus: "QUANTITY_ONLY",
    });
    expect(parkingPdf.snapshot.presentationIdentity).toMatchObject({
      revisionId: parking.revisionId,
      scopeId: "NEW_PARKING_FULL_CONSTRUCTION",
      areaM2: 657,
      lengthM: 73,
      widthM: 9,
      currentOrHistory: "CURRENT",
      rowCount: parking.boq.rows.length,
      pricingStatus: "QUANTITY_ONLY",
    });
    expect(roadPdf.snapshot.presentationIdentityHash).not.toBe(parkingPdf.snapshot.presentationIdentityHash);
    expect(validateAiEstimatePdfSnapshotParity({ snapshot: roadPdf.snapshot, pdf: roadPdf.pdf })).toBe(true);
    expect(validateAiEstimateBuyerPackageParity({ snapshot: roadPdf.snapshot, buyerPackage: roadBuyer.buyerHandoff })).toBe(true);
    expect(validateAiEstimatePdfSnapshotParity({ snapshot: parkingPdf.snapshot, pdf: parkingPdf.pdf })).toBe(true);
    expect(validateAiEstimateBuyerPackageParity({ snapshot: parkingPdf.snapshot, buyerPackage: parkingBuyer.buyerHandoff })).toBe(true);
    expect(roadPdf.pdf.body).toContain("area_m2=48000");
    expect(parkingPdf.pdf.body).toContain("area_m2=657");
  });

  it("rejects cross-revision snapshot injection before rendering PDF or procurement", () => {
    const road = buildRoadRevision();
    const parking = buildParkingRevision();
    const roadSnapshot = createSnapshotFromDraftRevision(road).snapshot;

    expect(() => renderPdfFromDraftRevision({ revision: parking, snapshot: roadSnapshot }))
      .toThrow("DRAFT_REVISION_SNAPSHOT_IDENTITY_MISMATCH");
    expect(() => createBuyerHandoffFromDraftRevision({ revision: parking, snapshot: roadSnapshot }))
      .toThrow("DRAFT_REVISION_SNAPSHOT_IDENTITY_MISMATCH");
  });

  it("detects identity tampering even when ids and row hashes are copied", () => {
    const parking = buildParkingRevision();
    const snapshot = createSnapshotFromDraftRevision(parking).snapshot;
    const tampered = {
      ...snapshot,
      presentationIdentity: { ...snapshot.presentationIdentity, areaM2: 48_000 },
    };

    expect(() => renderPdfFromDraftRevision({ revision: parking, snapshot: tampered }))
      .toThrow("DRAFT_REVISION_SNAPSHOT_IDENTITY_MISMATCH");
  });
});
