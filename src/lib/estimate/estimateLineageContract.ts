export type EstimateArtifactLineageRef = {
  artifactId: string;
  draftRevisionId: string;
  sourceSnapshotId: string;
  selectedTemplateId: string;
  family: string;
  paramsHash: string;
  boqHash: string;
  costHash: string;
};

export type EstimateLineageSeal = {
  draftRevisionId: string;
  sourceSnapshotId: string;
  selectedTemplateId: string;
  family: string;
  paramsHash: string;
  boqHash: string;
  costHash: string;
  pdfArtifactId: string;
  buyerHandoffId: string;
  historyRecordId: string;
  foremanEntryId: string;
  pdf: EstimateArtifactLineageRef;
  buyerHandoff: EstimateArtifactLineageRef;
  history: EstimateArtifactLineageRef;
  foreman: EstimateArtifactLineageRef;
  staleArtifactsAfterRecalc: {
    stale_pdf_not_marked_stale_after_recalc: boolean;
    stale_buyer_handoff_not_marked_stale_after_recalc: boolean;
    pdfInvalidated: boolean;
    buyerHandoffInvalidated: boolean;
  };
};

export type EstimateLineageValidation = {
  estimate_lineage_contract_created: boolean;
  all_artifacts_have_source_snapshot: boolean;
  pdf_snapshot_binding_passed: boolean;
  buyer_snapshot_binding_passed: boolean;
  history_snapshot_binding_passed: boolean;
  foreman_snapshot_binding_passed: boolean;
  stale_artifact_policy_passed: boolean;
  pdf_without_snapshot: boolean;
  buyer_handoff_without_snapshot: boolean;
  approved_history_without_snapshot: boolean;
  foreman_draft_without_revision: boolean;
  costing_without_boq_hash: boolean;
  material_quantity_without_boq_hash: boolean;
  stale_pdf_not_marked_stale_after_recalc: boolean;
  stale_buyer_handoff_not_marked_stale_after_recalc: boolean;
  passed: boolean;
  failures: string[];
  lineage: EstimateLineageSeal;
};
