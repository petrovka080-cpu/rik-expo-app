import { estimatePdfTextHasMojibake } from "./estimatePdfEncodingPolicy";

export function validateNoPdfMojibake(text: string): { passed: boolean; failures: string[] } {
  const forbiddenRuntimeText = /undefined|\[object Object\]|NaN|null null/.test(text);
  const mojibakeFound = estimatePdfTextHasMojibake(text);
  const failures = [
    ...(mojibakeFound ? ["pdf_mojibake_found"] : []),
    ...(forbiddenRuntimeText ? ["pdf_runtime_placeholder_text_found"] : []),
  ];
  return { passed: failures.length === 0, failures };
}
