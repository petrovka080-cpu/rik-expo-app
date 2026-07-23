import {
  migrateAtomicMaterialManualPricesV4,
  projectMultiDomainReferenceEstimateV4,
  restoreMultiDomainReferenceProjectionV4,
} from "../../src/lib/estimate/v4/multiDomainReferenceProductProjectionV4";
import { MULTI_DOMAIN_REFERENCE_PASSPORTS_V4 } from "../../src/lib/estimate/v4/multiDomainReferencePassportsV4";
import { MULTI_DOMAIN_INDEPENDENT_GOLDENS_V4 } from "../fixtures/multiDomainReferenceGoldensV4";

describe("multi-domain revision, PDF and procurement data projection", () => {
  test.each(MULTI_DOMAIN_REFERENCE_PASSPORTS_V4)("$catalogWorkId projects and survives durable restart", (passport) => {
    const fixture = MULTI_DOMAIN_INDEPENDENT_GOLDENS_V4.find((item) =>
      item.catalogWorkId === passport.catalogWorkId && item.scenario === "normal")!;
    const firstMaterial = passport.boq.find((row) => row.category === "materials")!;
    const manualPrice = { amount: 123.45, currency: "KGS", region: "Бишкек", priceDate: "2026-07-23" };
    const projection = projectMultiDomainReferenceEstimateV4({
      catalogWorkId: passport.catalogWorkId,
      parameterValues: fixture.inputs,
      manualPrices: { [firstMaterial.rowDefinitionId]: manualPrice },
      comments: ["Проверено в программном контракте"],
      attachmentMetadata: [{ attachmentId: "att-1", name: "spec.pdf", mimeType: "application/pdf", size: 1000 }],
    });
    expect(projection.revision.requestedCatalogWorkId).toBe(passport.catalogWorkId);
    expect(projection.revision.professionalEstimatePassportId).toBe(passport.professionalEstimatePassportId);
    expect(projection.revision.semanticOwner).toBe(passport.semanticOwner);
    expect(projection.pdfModel.boq).toEqual(projection.revision.boq);
    expect(projection.procurementModel.rows.length).toBeGreaterThan(0);
    expect(projection.revision.boq.find((row) => row.rowDefinitionId === firstMaterial.rowDefinitionId)?.manualPrice)
      .toEqual(manualPrice);
    expect(restoreMultiDomainReferenceProjectionV4(JSON.stringify(projection))).toEqual(projection);
    expect(JSON.stringify(projection)).not.toMatch(/https?:\/\/.*(?:token|signature|private)/iu);
  });

  test("rejects a corrupted durable projection", () => {
    const fixture = MULTI_DOMAIN_INDEPENDENT_GOLDENS_V4.find((item) =>
      item.catalogWorkId === "trench_excavation" && item.scenario === "normal")!;
    const projection = projectMultiDomainReferenceEstimateV4({
      catalogWorkId: fixture.catalogWorkId,
      parameterValues: fixture.inputs,
    });
    const corrupted = JSON.stringify({ ...projection, checksum: "corrupted" });
    expect(() => restoreMultiDomainReferenceProjectionV4(corrupted)).toThrow("REFERENCE_PROJECTION_CHECKSUM_MISMATCH");
  });

  test.each(MULTI_DOMAIN_REFERENCE_PASSPORTS_V4)(
    "$catalogWorkId migrates only an exact atomic semantic price",
    (passport) => {
      const fixture = MULTI_DOMAIN_INDEPENDENT_GOLDENS_V4.find((item) =>
        item.catalogWorkId === passport.catalogWorkId && item.scenario === "normal")!;
      const firstMaterial = passport.boq.find((row) => row.category === "materials" && row.semanticKey)!;
      const manualPrice = { amount: 321, currency: "KGS", region: "Бишкек", priceDate: "2026-07-23" };
      const migration = migrateAtomicMaterialManualPricesV4([
        {
          rowDefinitionId: firstMaterial.rowDefinitionId,
          semanticKey: firstMaterial.semanticKey,
          manualPrice,
          aggregate: false,
        },
        {
          rowDefinitionId: `${passport.catalogWorkId}_legacy_auxiliary_materials`,
          manualPrice: { ...manualPrice, amount: 999 },
          aggregate: true,
        },
      ]);
      expect(migration.reviewRequired).toEqual([{
        rowDefinitionId: `${passport.catalogWorkId}_legacy_auxiliary_materials`,
        reason: "LEGACY_AGGREGATE_PRICE_CANNOT_BE_DISTRIBUTED",
      }]);
      const projection = projectMultiDomainReferenceEstimateV4({
        catalogWorkId: passport.catalogWorkId,
        parameterValues: fixture.inputs,
        manualPricesBySemanticKey: migration.pricesBySemanticKey,
      });
      expect(projection.revision.boq.find((row) => row.semanticKey === firstMaterial.semanticKey)?.manualPrice)
        .toEqual(manualPrice);
      expect(projection.revision.boq
        .filter((row) => row.semanticKey !== firstMaterial.semanticKey)
        .every((row) => row.manualPrice === null)).toBe(true);
    },
  );
});
