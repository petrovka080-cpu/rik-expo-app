import {
  buildCanonicalArtifactMetadata,
  buildCanonicalProcurementProjection,
  canonicalArtifactPreliminaryNeeds,
  canonicalArtifactQuantity,
  canonicalArtifactSection,
  canonicalArtifactVisibleRowTitle,
  canonicalProfessionalArtifactMetadataIdentityMatches,
  selectCanonicalArtifactRows,
} from "./canonicalEstimateArtifactContract";

const revision = {
  id: "revision-1",
  release_id: "release-1",
  catalog_id: "catalog-1",
  checksum_sha256: "a".repeat(64),
  row_count: 3,
  currency_code: "KGS",
  source_request_hash: "b".repeat(64),
};

const rows = [
  { row_id: "material", ordinal: 0, section: "materials", category: "material", title_ru: "Материал", unit_id: "m2", quantity: "12.5", unit_price: null, amount: null, currency_code: "KGS", procurement_eligible: true, included_in_estimate: true, included_in_procurement: true, ownership_status: "OWNED", row_sha256: "c".repeat(64) },
  { row_id: "labor", ordinal: 1, section: "labor", category: "labor", title_ru: "Работа", unit_id: "m2", quantity: "10", unit_price: null, amount: null, currency_code: "KGS", procurement_eligible: false, included_in_estimate: true, included_in_procurement: false, ownership_status: "OWNED", row_sha256: "d".repeat(64) },
  { row_id: "legacy", ordinal: 2, section: "legacy", category: "legacy", title_ru: "Legacy", unit_id: "item", quantity: "999", unit_price: null, amount: null, currency_code: "KGS", procurement_eligible: true, included_in_estimate: false, included_in_procurement: false, ownership_status: "MIGRATED_UNOWNED_EXCLUDED_FROM_TOTAL", row_sha256: "e".repeat(64) },
];

describe("canonical estimate artifact contract", () => {
  it("presents a known product version in saved resources without rewriting quantities or source rows", () => {
    const row = { ...rows[0], title_ru: "CT127en_GL: сухой порошок — CT127_EN_GL_0120", calculation_trace: { resourceGraph: { titleSpecificationParameterIds: ["ct127_delivered_version"] } } };
    const before = JSON.stringify(row);
    expect(canonicalArtifactVisibleRowTitle(row)).toBe("Ceresit CT 127, версия en GL: сухой порошок — Ceresit CT 127, технический лист en GL 01.2020");
    expect(JSON.stringify(row)).toBe(before);
    expect(canonicalArtifactVisibleRowTitle({ ...row, title_ru: "Фактический продукт — CUSTOM_MODEL_127" })).toBe("Фактический продукт — CUSTOM_MODEL_127");
  });
  it("keeps material kits within an equipment operation as materials without changing procurement data", () => {
    const kit = { ...rows[0], section: "Оборудование армирования", title_ru: "Полный комплект оснастки станка", unit_id: "set", quantity: "3" };
    expect(canonicalArtifactSection(kit)).toBe("Материалы");
    const projection = buildCanonicalProcurementProjection({ revision, procurementRows: [kit] });
    expect(projection.rows[0]).toMatchObject({ category: "material", section: "Оборудование армирования", unitId: "set", quantity: "3" });
    expect(canonicalArtifactSection({ category: "equipment", section: "Оборудование армирования" })).toBe("Механизмы");
  });
  it.each([
    { titleSpecificationParameterIds: ["selected_vibrator"], titleSpecificationMode: "APPEND" },
    { titleSpecificationParameterId: "selected_vibrator" },
    { titleSpecificationParameterIds: ["selected_vibrator"], titleSpecificationMode: "REPLACE" },
  ])("retains an explicitly selected specification in public documents: %p", resourceGraph => {
    const title = "Глубинный вибратор для уплотнения бетонной смеси — DEMO: compatible head45, shaft2m and actual kit";
    const row = { ...rows[0], title_ru: title, calculation_trace: { resourceGraph } };
    expect(canonicalArtifactVisibleRowTitle(row)).toBe(title);
    const projection = buildCanonicalProcurementProjection({ revision, procurementRows: [row] });
    expect(projection.rows[0]?.titleRu).toBe(title);
    expect(row.title_ru).toBe(title);
    expect(row.quantity).toBe("12.5");
  });
  it("keeps established public aliases on rows without declared specification parameters", () => {
    expect(canonicalArtifactVisibleRowTitle({ title_ru: "Глубинный вибратор для уплотнения бетонной смеси" })).toBe("Глубинный вибратор");
    expect(canonicalArtifactVisibleRowTitle({ title_ru: "Глубинный вибратор для уплотнения бетонной смеси", calculation_trace: { resourceGraph: { titleSpecificationParameterIds: [] } } })).toBe("Глубинный вибратор");
  });
  it("selects immutable revision rows once for PDF and procurement", () => {
    const selection = selectCanonicalArtifactRows(rows);
    expect(selection.estimateRows.map((row) => row.row_id)).toEqual(["material", "labor"]);
    expect(selection.professionalPdfRows.map((row) => row.row_id)).toEqual(["material", "labor"]);
    expect(selection.procurementRows.map((row) => row.row_id)).toEqual(["material"]);
    expect(canonicalArtifactQuantity(selection.procurementRows[0]?.quantity)).toBe("12,5");
  });

  it("builds the one canonical procurement projection and artifact provenance", () => {
    const selection = selectCanonicalArtifactRows(rows);
    const projection = buildCanonicalProcurementProjection({ revision, procurementRows: selection.procurementRows });
    expect(projection.schemaVersion).toBe("canonical_estimate_procurement_r10");
    expect(projection.rows).toHaveLength(1);
    expect(projection.rows[0]?.quantity).toBe("12.5");
    expect(buildCanonicalArtifactMetadata({
      operation: "procurement",
      renderer: "test",
      revision,
      sourceRowCount: selection.sourceRows.length,
      projectedRowCount: selection.procurementRows.length,
      selectedProcurementRowCount: selection.procurementRows.length,
    })).toMatchObject({ sourceRowCount: 3, projectedRowCount: 1, selectedProcurementRowCount: 1 });
  });

  it("keeps preliminary needs visible but outside totals and procurement", () => {
    const preliminaryNeeds = canonicalArtifactPreliminaryNeeds({
      ...revision,
      amendment_contract: {
        parameterSources: {
          preliminaryNeeds: [{
            row_id: "primer",
            ordinal: 7,
            section: "materials",
            category: "material",
            title_ru: "Совместимая грунтовка",
            unit_id: "kg",
            quantity: null,
            unit_price: null,
            need_state: "QUANTITY_REQUIRED",
            missing_parameter_ids: ["primer_consumption_kg_m2"],
            selected: true,
            procurement_eligible: true,
            need_sha256: "f".repeat(64),
          }],
        },
      },
    });

    expect(preliminaryNeeds).toHaveLength(1);
    expect(preliminaryNeeds[0]).toMatchObject({
      row_id: "primer",
      quantity: null,
      included_in_estimate: false,
      included_in_procurement: false,
      procurement_eligible: false,
      ownership_status: "PRELIMINARY_NEED",
    });
    expect(selectCanonicalArtifactRows([...rows, ...preliminaryNeeds]).procurementRows)
      .toHaveLength(1);
  });

  it("records the complete production identity for the professional PDF artifact", () => {
    const metadata = buildCanonicalArtifactMetadata({
      operation: "professional_pdf",
      renderer: "canonical-professional-pdf.r4-a6",
      revision,
      sourceRowCount: 3,
      projectedRowCount: 2,
      selectedProcurementRowCount: 1,
      definitionVersionId: "definition-version-1",
      pageCount: 4,
      grandTotalStatus: "PARTIAL_NEEDS_PRICE",
    });
    expect(metadata).toMatchObject({
      artifactKind: "professional_pdf",
      revisionId: "revision-1",
      definitionVersionId: "definition-version-1",
      sourceReleaseId: "release-1",
      sourceRevisionChecksumSha256: "a".repeat(64),
      sourceRowCount: 3,
      rowCount: 2,
      grandTotalStatus: "PARTIAL_NEEDS_PRICE",
      pageCount: 4,
      generatorVersion: "canonical-professional-pdf.r4-a6",
      templateVersion: "professional-estimate-pdf:11",
    });
    expect(canonicalProfessionalArtifactMetadataIdentityMatches({
      metadata,
      revision: { ...revision, definition_version_id: "definition-version-1" },
    })).toBe(true);
    expect(canonicalProfessionalArtifactMetadataIdentityMatches({
      metadata: { ...metadata, pageCount: null },
      revision: { ...revision, definition_version_id: "definition-version-1" },
    })).toBe(false);
    expect(canonicalProfessionalArtifactMetadataIdentityMatches({
      metadata: { ...metadata, definitionVersionId: "wrong-definition" },
      revision: { ...revision, definition_version_id: "definition-version-1" },
    })).toBe(false);
    expect(canonicalProfessionalArtifactMetadataIdentityMatches({
      metadata: { templateVersion: "professional-estimate-pdf:4" },
      revision,
    })).toBe(true);
  });

  it.each([6, 7, 8, 9, 10, 11])("keeps the bound metadata checks for historical PDF template %s", (version) => {
    const historicalRevision = { ...revision, definition_version_id: "definition-version-1" };
    const metadata = {
      templateVersion: `professional-estimate-pdf:${version}`,
      artifactKind: "professional_pdf",
      revisionId: "revision-1",
      definitionVersionId: "definition-version-1",
      pageCount: 4,
      grandTotalStatus: "PARTIAL_NEEDS_PRICE",
    };
    const matches = (candidate: Record<string, unknown>) => canonicalProfessionalArtifactMetadataIdentityMatches({
      metadata: candidate,
      revision: historicalRevision,
    });
    expect(matches(metadata)).toBe(true);
    expect(matches({ ...metadata, revisionId: "other-revision" })).toBe(false);
    expect(matches({ ...metadata, definitionVersionId: "other-definition" })).toBe(false);
    expect(matches({ ...metadata, pageCount: null })).toBe(false);
    expect(matches({ ...metadata, pageCount: 1.5 })).toBe(false);
    expect(matches({ ...metadata, artifactKind: "procurement" })).toBe(false);
    expect(matches({ ...metadata, grandTotalStatus: null })).toBe(false);
  });

  it.each([
    "professional-estimate-pdf:12",
    "professional-estimate-pdf:0",
    "professional-estimate-pdf:06",
    "professional-estimate-pdf:6-extra",
    "professional-estimate-pdf:",
  ])("rejects an unsupported or malformed PDF template identity %s", (templateVersion) => {
    expect(canonicalProfessionalArtifactMetadataIdentityMatches({ metadata: { templateVersion }, revision })).toBe(false);
  });
});
