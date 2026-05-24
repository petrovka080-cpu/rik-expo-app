import { estimatePdfInputToBytes, extractEstimatePdfText, validateEstimatePdf } from "./validateEstimatePdf";

export type EstimatePdfTextExtractionProof = {
  text: string;
  byteLength: number;
  binaryHeader: string;
  valid: boolean;
  failures: string[];
  cyrillicReadable: boolean;
  mojibakeFound: boolean;
  blankText: boolean;
};

export function extractEstimatePdfTextForProof(input: {
  pdf: Uint8Array | string;
  knownWorkKey?: string;
  requiredText?: string[];
}): EstimatePdfTextExtractionProof {
  const bytes = estimatePdfInputToBytes(input.pdf);
  const validation = validateEstimatePdf(input);
  return {
    text: extractEstimatePdfText(bytes),
    byteLength: bytes.length,
    binaryHeader: String.fromCharCode(...bytes.slice(0, 5)),
    valid: validation.valid,
    failures: validation.failures,
    cyrillicReadable: validation.details.cyrillicReadable,
    mojibakeFound: validation.details.mojibakeFound,
    blankText: validation.details.blankText,
  };
}
