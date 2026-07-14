import estimate10000Manifest from "../../../../data/estimate-templates/estimate-10000-readiness-manifest.json";
import expandedComplexManifest from "../../../../data/estimate-catalog/expanded-complex-readiness-manifest.json";
import sourceQualityRegistry from "../../../../data/estimate-governance/source-quality-registry.json";
import expertReviewRegistry from "../../../../data/estimate-governance/expert-review-registry.json";
import pricebookIndex from "../../../../data/estimate-pricebooks/pricebook-index.json";

import { buildProductionTrustDashboard } from "./productionTrust";

export type ProductionTrustInventory = {
  base_template_count: number;
  expanded_template_count: number;
  catalog_total_templates: number;
  base_ready_professional_count: number;
  expanded_quantity_only_price_missing_count: number;
  not_ready_count: number;
  generic_fallback_count: number;
  source_quality_registry_count: number;
  expert_review_registry_count: number;
  pricebook_registry_count: number;
  production_trust_dashboard: ReturnType<typeof buildProductionTrustDashboard>;
};

export function buildProductionTrustInventory(): ProductionTrustInventory {
  const baseTemplateCount = Number(estimate10000Manifest.manifest_total_templates);
  const expandedTemplateCount = Number(expandedComplexManifest.expanded_templates_count);
  const dashboard = buildProductionTrustDashboard({
    baseTemplateCount,
    expandedTemplateCount,
  });

  return {
    base_template_count: baseTemplateCount,
    expanded_template_count: expandedTemplateCount,
    catalog_total_templates: baseTemplateCount + expandedTemplateCount,
    base_ready_professional_count: Number(estimate10000Manifest.ready_professional_count),
    expanded_quantity_only_price_missing_count: expandedTemplateCount,
    not_ready_count:
      Number(estimate10000Manifest.not_ready_count) +
      Number(expandedComplexManifest.not_ready_count),
    generic_fallback_count:
      Number(estimate10000Manifest.generic_fallback_count) +
      Number(expandedComplexManifest.generic_fallback_count),
    source_quality_registry_count: sourceQualityRegistry.sources.length,
    expert_review_registry_count: expertReviewRegistry.reviews.length,
    pricebook_registry_count: pricebookIndex.pricebooks.length,
    production_trust_dashboard: dashboard,
  };
}

export function assertProductionTrustInventoryReady(): Record<string, true> {
  const inventory = buildProductionTrustInventory();
  if (inventory.catalog_total_templates <= 10000) {
    throw new Error(`catalog_total_templates_not_expanded:${inventory.catalog_total_templates}`);
  }
  if (inventory.base_ready_professional_count !== inventory.base_template_count) {
    throw new Error(`base_ready_professional_count_mismatch:${inventory.base_ready_professional_count}`);
  }
  if (inventory.not_ready_count !== 0) {
    throw new Error(`not_ready_count:${inventory.not_ready_count}`);
  }
  if (inventory.generic_fallback_count !== 0) {
    throw new Error(`generic_fallback_count:${inventory.generic_fallback_count}`);
  }
  if (inventory.source_quality_registry_count < 2) throw new Error("source_quality_registry_too_small");
  if (inventory.expert_review_registry_count < 2) throw new Error("expert_review_registry_too_small");
  if (inventory.pricebook_registry_count < 1) throw new Error("pricebook_registry_missing");
  return {
    catalog_total_templates_more_than_10000: true,
    ready_professional_count_matches_catalog_baseline: true,
    no_not_ready_templates: true,
    no_generic_fallback_templates: true,
    governance_registries_present: true,
  };
}
