import { runAndroidApi34LimitedPublicBetaSmoke } from "./aiEstimateLimitedPublicBetaExecutionCore";

export function runAndroidApi34AiEstimateLimitedPublicBetaSmoke() {
  const result = runAndroidApi34LimitedPublicBetaSmoke();
  if (result.matrix.android_api34_tested !== true || result.matrix.api36_rejected !== true) {
    throw new Error("NO_GO_ANDROID_API34_MISSING");
  }
  return result;
}

if (require.main === module) {
  runAndroidApi34AiEstimateLimitedPublicBetaSmoke();
}
