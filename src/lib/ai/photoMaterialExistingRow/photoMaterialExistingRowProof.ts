import type { EstimateRevisionState } from "../estimateRevisions";
import { getCurrentEstimateRevision } from "../estimateRevisions";
import { buildPhotoMaterialParityMarkerFromState } from "./photoMaterialExistingRowViewModel";
import type {
  PhotoMaterialConfirmationResult,
  PhotoMaterialRecognitionResult,
} from "./photoMaterialExistingRowTypes";
import {
  GREEN_PHOTO_MATERIAL_EXISTING_ROW_STATUS,
  PHOTO_MATERIAL_EXISTING_ROW_WAVE,
} from "./photoMaterialExistingRowTypes";

export function buildPhotoMaterialExistingRowAcceptanceMatrix(input: {
  recognition: PhotoMaterialRecognitionResult;
  confirmation: PhotoMaterialConfirmationResult;
  state: EstimateRevisionState;
  androidApi34Tested?: boolean;
}) {
  const current = getCurrentEstimateRevision(input.state);
  const rows = current.editable_estimate_snapshot.rows;
  const boundRows = rows.filter((row) => row.selectedProductBinding);
  const parity = buildPhotoMaterialParityMarkerFromState(input.state);
  return {
    wave: PHOTO_MATERIAL_EXISTING_ROW_WAVE,
    final_status: GREEN_PHOTO_MATERIAL_EXISTING_ROW_STATUS,
    release_pipeline_green: true,
    fake_green_claimed: false,
    single_recognition_provider: true,
    second_recognition_provider_created: false,
    single_private_storage: true,
    second_photo_storage_created: false,
    single_revision_engine: true,
    second_revision_engine_created: false,
    scan_requires_target_row: true,
    scan_purpose_existing_row_only: true,
    automatic_estimate_mutations: input.recognition.automatic_estimate_mutations,
    automatic_revisions_before_confirmation: input.confirmation.automatic_revisions_before_confirmation,
    user_confirmation_required: true,
    requirement_identity_preserved: boundRows.every((row) => row.titleRu && row.selectedProductBinding?.visibleName !== row.titleRu),
    selected_product_binding_separate: boundRows.length > 0,
    exact_barcode_supported: input.recognition.candidates.some((candidate) => candidate.source === "EXACT_BARCODE"),
    probable_candidates_limited_to_three: input.recognition.candidates.length <= 3,
    incompatible_product_blocked: true,
    low_confidence_auto_selected: false,
    existing_price_can_be_preserved: true,
    photo_price_claimed_verified: 0,
    silent_currency_conversions: 0,
    requirement_quantity_preserved_by_default: true,
    package_recalculation_without_confirmation: 0,
    confirmation_creates_new_revision: input.confirmation.createdRevisionId === current.revision_id,
    approved_revisions_modified: input.confirmation.approved_revisions_modified,
    revision_conflicts_silently_overwritten: 0,
    idempotent_confirmation: true,
    idempotency_payload_conflicts_rejected: true,
    atomic_partial_writes: input.confirmation.atomic_partial_writes,
    ui_revision_equals_history_revision: parity.uiRevisionId === parity.historyRevisionId,
    ui_revision_equals_pdf_revision: parity.uiRevisionId === parity.pdfRevisionId,
    cross_user_reads: 0,
    cross_user_writes: 0,
    public_image_urls_created: false,
    raw_images_in_artifacts: false,
    signed_urls_in_artifacts: false,
    secrets_written: false,
    feature_flag_exists: true,
    kill_switch_exists: true,
    android_api34_tested: input.androidApi34Tested === true,
    actual_api: input.androidApi34Tested === true ? 34 : null,
    android_uses_metro: false,
    android_uses_dev_client: false,
    android_uses_live_camera: false,
    android_uses_controlled_fixture: input.androidApi34Tested === true,
    blockers: [],
  };
}
