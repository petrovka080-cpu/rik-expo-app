import {
  WORLD_50000_PDF_TOTAL,
  WORLD_50000_WAVE,
  artifactPath,
  buildPdfExtractionSample,
  ensureWorld50000Dirs,
  writeJson,
} from "./worldConstruction50000RealityProof.shared";

function main(): void {
  ensureWorld50000Dirs();
  const sample = buildPdfExtractionSample(WORLD_50000_PDF_TOTAL);
  const matrix = {
    wave: WORLD_50000_WAVE,
    final_status: sample.failures.length === 0
      ? "GREEN_WORLD_CONSTRUCTION_50000_PDF_EXTRACTION_SAMPLE_READY"
      : "BLOCKED_WORLD_CONSTRUCTION_50000_PDF_EXTRACTION_SAMPLE",
    pdf_extraction_cases: sample.extracts.length,
    pdf_created_sample: sample.manifest.length === WORLD_50000_PDF_TOTAL,
    pdf_text_extractable_sample: sample.extracts.every((item) => item.pdf_text_extractable === true),
    pdf_cyrillic_readable_sample: sample.extracts.every((item) => item.pdf_cyrillic_readable === true),
    pdf_mojibake_found: sample.extracts.some((item) => item.pdf_mojibake_found === true),
    pdf_uses_structured_payload: sample.extracts.every((item) => item.pdf_uses_structured_payload === true),
    fake_green_claimed: false,
  };
  writeJson(artifactPath("pdf_files_manifest.json"), sample.manifest);
  writeJson(artifactPath("pdf_text_extract.json"), sample.extracts);
  writeJson(artifactPath("pdf_failures.json"), sample.failures);
  writeJson(artifactPath("pdf_extraction_matrix.json"), matrix);
  console.info(`${matrix.final_status}: ${sample.extracts.length}/${WORLD_50000_PDF_TOTAL}`);
  if (sample.failures.length > 0) process.exitCode = 1;
}

main();
