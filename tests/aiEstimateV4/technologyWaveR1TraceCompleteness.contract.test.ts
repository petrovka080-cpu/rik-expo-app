import {
  DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4,
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
  buildDrywallArchitecturalElementNormativeProofV4,
  buildDrywallArchitecturalElementProfessionalPackagePartsV4,
  interiorFinishesDomainFactory,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import { constructionNormativeRegistryV1 } from "../../src/lib/estimate/v4/domainFactory";
import { allTechnologyWaveParts } from "./technologyWaveR1TestSupport";

const REQUIRED_CATEGORIES = ["material", "labor", "equipment", "transport", "waste", "testing", "documentation"];

describe("technology-domain wave R1 formula/resource/price/completeness", () => {
  test("has total formula inputs, per-row traces and one price route", () => {
    for (const part of allTechnologyWaveParts()) {
      const parameters = new Set(part.schema.parameters.map((parameter) => parameter.parameter_id));
      const rows = part.child_assemblies.flatMap((child) => child.rows);
      expect(rows.length).toBeGreaterThanOrEqual(38);
      expect(new Set(rows.map((row) => row.row_id)).size).toBe(rows.length);
      expect(new Set(rows.map((row) => row.formula.formula_id)).size).toBe(rows.length);
      for (const row of rows) {
        expect(row.formula.input_parameter_ids.every((id) => parameters.has(id))).toBe(true);
        expect(row.normative_trace_v3).toHaveLength(4);
        expect(row.resource_graph_node_v3?.typed_child_boundary).toBe(part.contract.operation);
        expect(row.price_route_v3).toBeDefined();
        expect(row.cost_owner_id).toContain(part.contract.catalog_id);
        expect(`${row.row_id} ${row.title_ru}`).not.toMatch(/padding|placeholder|generic|one.?bundle/iu);
      }
      const categories = new Set(rows.map((row) => row.category));
      for (const category of REQUIRED_CATEGORIES) expect(categories.has(category as never)).toBe(true);
    }
  });

  test("closes 22/22 professional decisions with explicit typed-child/N-A boundaries", () => {
    for (const part of allTechnologyWaveParts()) {
      const rows = part.child_assemblies.flatMap((child) => child.rows);
      const text = rows.map((row) => `${row.row_id} ${row.title_ru} ${row.category}`).join("\n");
      const decisions = [
        /material/u, /material/u, part.contract.operation === "PREPARE" ? "N_A_WITH_REASON:no mechanical fastener in surface preparation" : /fastener|screw|tape|retainer|профил|винт|креп/u,
        part.contract.operation === "PREPARE" ? "N_A_WITH_REASON:no structural component in surface preparation" : /material/u,
        /labor/u, /survey|protection|подготов/u, new RegExp(part.contract.operation.toLowerCase(), "iu"),
        /protection|sealant|finish|подготов/u, /machine_hour|equipment/u, /tool|инструмент|mixer/u,
        /equipment/u, /delivery/u, /supplier_loading/u, /site_unloading/u, /intrasite_handling|vertical_lift/u,
        /temporary_work|access|safe_zone/u, /testing/u, /subcontract_service/u, /waste/u,
        /safe_zone|dust|lighting|Безопасность/u, /documentation/u, /quality|handover|control|прием/u,
      ];
      expect(decisions).toHaveLength(22);
      const missing = decisions.flatMap((decision, index) => typeof decision === "string" || decision.test(text) ? [] : [index + 1]);
      expect({ catalogId: part.contract.catalog_id, missing }).toEqual({ catalogId: part.contract.catalog_id, missing: [] });
    }
  });

  test("proves 11 regional lanes and relevant international decisions without foreign promotion", () => {
    for (const part of allTechnologyWaveParts()) {
      const proof = buildDrywallArchitecturalElementNormativeProofV4(part);
      expect(proof.kg_sources).toHaveLength(4);
      expect(proof.regional_decisions).toHaveLength(11);
      expect(proof.international_decisions).toHaveLength(8);
      expect(proof.unresolved_jurisdiction_decisions).toBe(0);
      expect(proof.foreign_promoted_to_kg_mandatory_without_basis).toBe(0);
    }
    for (const id of ["KG_SP_KR_65_101_2025", "KG_KRER_10_05_011", "kg_krerr_2015_application_guidance", "KG_SN_KR_12_01_2018", "KG_DRYWALL_MATERIAL_CONFORMITY_ROUTE"]) {
      expect(constructionNormativeRegistryV1.get(id)?.official_reference).toMatch(/^https:\/\//u);
    }
  });

  test("does not capture any owner outside the exact 55-member allowlist", () => {
    const selected = new Set(DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4);
    expect(INTERIOR_FINISHES_DOMAIN_INVENTORY.filter((row) => !selected.has(row.catalog_id))
      .every((row) => buildDrywallArchitecturalElementProfessionalPackagePartsV4(row) === null)).toBe(true);
    expect(DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4.every((id) => {
      const binding = interiorFinishesDomainFactory.binding_by_catalog_id.get(id);
      return binding != null && binding.catalog_id === id;
    })).toBe(true);
  });
});
