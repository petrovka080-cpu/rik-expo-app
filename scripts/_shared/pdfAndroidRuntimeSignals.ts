export function hasAndroidPdfRuntimeReadySignal(logText: string): boolean {
  const source = String(logText || "");
  return (
    source.includes("native_handoff_ready") ||
    source.includes("android_remote_pdf_open_ready") ||
    source.includes("android_view_intent_start") ||
    source.includes("android_remote_pdf_open_start")
  );
}

export function hasAndroidPdfRuntimeFailureSignal(logText: string): boolean {
  const source = String(logText || "");
  return (
    source.includes("native_handoff_error") ||
    source.includes("android_view_intent_failed") ||
    source.includes("android_remote_pdf_open_failed")
  );
}

export function hasAndroidPdfRuntimeControlledErrorSignal(logText: string): boolean {
  const source = String(logText || "");
  return (
    hasAndroidPdfRuntimeFailureSignal(source) ||
    source.includes("viewer_error_state") ||
    source.includes("load_error")
  );
}
