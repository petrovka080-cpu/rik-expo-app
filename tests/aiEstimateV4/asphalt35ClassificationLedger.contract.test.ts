import {
  NORMATIVE_SOURCE_REGISTRY_V3,
  ROADWORKS_WAVE_A_NORMATIVE_SOURCES,
  RoadworksWaveAInventory,
  auditAsphalt35ClassificationLedger,
  buildAsphalt35ClassificationLedger,
  resolveRoadworksWaveANormativeApplicability,
  resolveRoadworksWaveANormativeConflicts,
} from "../../src/lib/estimate/v4/roadworks";

describe("Asphalt 35/35 classification and normative applicability ledger", () => {
  const ledger = buildAsphalt35ClassificationLedger();

  test("classifies the exact 35-key denominator without inventing a twelfth disputed key", () => {
    expect(auditAsphalt35ClassificationLedger()).toMatchObject({
      catalog_records: 35,
      classification_records: 35,
      unique_work_keys: 35,
      unique_catalog_item_ids: 35,
      actual_disputed_catalog_records: 11,
      wet_zone_records: 8,
      technical_room_records: 3,
      missing_classification: 0,
      missing_kr_primary: 0,
      missing_estimate_resource: 0,
      unresolved_interstate_status: 0,
      unresolved_international_crosswalk: 0,
      unresolved_conflicts: 0,
      krer_27_bound_to_industrial_floor: 0,
      silent_fallback: 0,
    });
    expect(new Set(ledger.map((row) => row.workId))).toEqual(
      new Set(RoadworksWaveAInventory.map((row) => row.workId)),
    );
  });

  test("resolves all eight wet-zone labels as exterior paved-area operations, never building wet-room work", () => {
    const rows = ledger.filter((row) => row.workId.endsWith("_wet_zone"));
    expect(rows).toHaveLength(8);
    for (const row of rows) {
      expect(row.verdictClass).toBe("PARKING_OR_EXTERNAL_AREA_ASPHALT");
      expect(row.finalDomainOwner).toBe("external_paved_areas");
      expect(row.roadwork).toBe(true);
      expect(row.krEstimateResourceSourceId).toBe("kg_krer_27_roadworks_2015");
      expect(row.negativeExclusionEvidence).toEqual(expect.arrayContaining([
        "не санитарная мокрая зона",
        "не гидроизоляция здания",
        "не промышленный внутренний пол",
      ]));
      expect(row.requiredParameters).toEqual(expect.arrayContaining([
        "exterior_surface_kind",
        "drainage_outfall_confirmed",
        "base_dry_and_accepted",
      ]));
      expect(row.calculationReadiness).toBe("NEEDS_REQUIRED_INPUTS");
    }
  });

  test("routes all three technical-room keys to the industrial-floor owner and KRER 11", () => {
    const rows = ledger.filter((row) => row.workId.endsWith("_technical_room"));
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.verdictClass).toBe("INDUSTRIAL_ASPHALT_FLOOR");
      expect(row.finalDomainOwner).toBe("asphalt_industrial_floors");
      expect(row.roadwork).toBe(false);
      expect(row.krPrimarySourceId).toBe("kg_sp_31_101_2024_floors");
      expect(row.krEstimateResourceSourceId).toBe("kg_krer_11_floors_2015");
      expect(row.krEstimateRateIds).toEqual([
        "11-01-019-01",
        "11-01-019-02",
        "11-01-019-03",
        "11-01-019-04",
      ]);
      expect(row.negativeExclusionEvidence).toEqual(expect.arrayContaining([
        "КРЕР-27 запрещён для этого внутреннего пола",
        "roadwork=false",
      ]));
      expect(row.requiredParameters).toEqual(expect.arrayContaining([
        "floor_mechanical_impact_class",
        "floor_liquid_exposure_class",
        "approved_floor_mix_type",
      ]));
      expect(row.calculationReadiness).toBe("NEEDS_REQUIRED_INPUTS");
    }
  });

  test("keeps technical, estimate, interstate, international and price authority layers separate", () => {
    const quantityAuthorities = NORMATIVE_SOURCE_REGISTRY_V3
      .filter((source) => source.quantityNormAuthority)
      .map((source) => source.sourceId)
      .sort();
    expect(quantityAuthorities).toEqual([
      "kg_krer_11_floors_2015",
      "kg_krer_27_roadworks_2015",
    ]);
    expect(NORMATIVE_SOURCE_REGISTRY_V3.find((source) => source.sourceId === "kg-sp-32-107-2024-draft"))
      .toMatchObject({ status: "DRAFT_PUBLIC_DISCUSSION", quantityNormAuthority: false });
    for (const sourceId of ["astm-d6927-22", "iso-12006-2-2015", "ifc-4.3"]) {
      expect(NORMATIVE_SOURCE_REGISTRY_V3.find((source) => source.sourceId === sourceId)?.quantityNormAuthority)
        .toBe(false);
    }
    expect(ledger.some((row) => [
      row.krPrimarySourceId,
      row.krEstimateResourceSourceId,
      row.interstateSourceId,
      ...row.internationalCrosswalkIds,
    ].includes("kg-sp-32-107-2024-draft"))).toBe(false);
  });

  test("binds every source evidence record and every verdict to deterministic immutable hashes", () => {
    expect(ROADWORKS_WAVE_A_NORMATIVE_SOURCES.every((source) => /^eh_[a-f0-9]{16}$/.test(source.evidenceHash)))
      .toBe(true);
    expect(ledger.every((row) => /^eh_[a-f0-9]{16}$/.test(row.verdictHash))).toBe(true);
    expect(new Set(ledger.map((row) => row.verdictHash)).size).toBe(35);
  });

  test("declares exclusive quantity ownership for component rates to prevent double counting", () => {
    for (const row of ledger) {
      if (/_asphalt_(?:lay|compact)_/.test(row.workId)) {
        expect(row.estimateBindingMode).toBe("COMPONENT_REFERENCE_WITH_EXCLUSIVE_OWNER");
        expect(row.conflictResolution.join(" ")).toContain("exclusive component owner");
      } else {
        expect(row.estimateBindingMode).toBe("FULL_COMPLEX_RATE_SELECTION");
      }
    }
  });

  test("resolves source applicability and conflicts without choosing a convenient coefficient", () => {
    for (const row of ledger) {
      const applicability = resolveRoadworksWaveANormativeApplicability(row.workId);
      expect(applicability.allowed).toBe(true);
      expect(applicability.estimateRateIds.length).toBeGreaterThan(0);
      expect(applicability.resolutionHash).toMatch(/^eh_[a-f0-9]{16}$/);
      const conflicts = resolveRoadworksWaveANormativeConflicts(row.workId);
      expect(conflicts.unresolvedConflictIds).toEqual([]);
      expect(conflicts.resolutions.length).toBeGreaterThan(0);
      expect(conflicts.precedence[0]).toBe("ACTIVE_KG_TECHNICAL_REQUIREMENT");
    }
  });
});
