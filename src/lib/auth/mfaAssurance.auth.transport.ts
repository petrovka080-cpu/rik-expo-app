import { supabaseClientAvailability } from "../supabaseClient";

export type MfaAssuranceLevel = "aal1" | "aal2" | null;
export type MfaAssuranceDecision = {
  status: "not_required" | "challenge_required" | "satisfied";
  currentLevel: MfaAssuranceLevel;
  nextLevel: MfaAssuranceLevel;
};

export function classifyMfaAssuranceLevels(input: {
  currentLevel: unknown;
  nextLevel: unknown;
}): MfaAssuranceDecision {
  const { currentLevel, nextLevel } = input;
  if (currentLevel === "aal2" && nextLevel === "aal2") {
    return { status: "satisfied", currentLevel, nextLevel };
  }
  if ((currentLevel === "aal1" || currentLevel === null) && nextLevel === "aal2") {
    return { status: "challenge_required", currentLevel, nextLevel };
  }
  if ((currentLevel === "aal1" && nextLevel === "aal1") ||
      (currentLevel === null && nextLevel === null)) {
    return { status: "not_required", currentLevel, nextLevel };
  }
  throw new Error("MFA_ASSURANCE_RESPONSE_INVALID");
}

/**
 * Pass the exact session token so the SDK validates it with getUser(jwt) and
 * reads current verified factors. The no-argument SDK path uses cached user
 * factors, which cannot detect enrollment made after the session was issued.
 * Invoke outside onAuthStateChange's synchronous callback; lifecycle owns the
 * result epoch and routing. This transport never installs or logs a session.
 */
export async function readMfaAssuranceForSessionToken(
  accessToken: string,
): Promise<MfaAssuranceDecision> {
  if (typeof accessToken !== "string" || !accessToken || accessToken.trim() !== accessToken) {
    throw new Error("MFA_SESSION_TOKEN_REQUIRED");
  }
  if (supabaseClientAvailability.status !== "ready") {
    throw new Error("MFA_ASSURANCE_UNAVAILABLE");
  }
  let result: { data: { currentLevel: unknown; nextLevel: unknown } | null; error: unknown };
  try {
    result = await supabaseClientAvailability.client.auth.mfa.getAuthenticatorAssuranceLevel(accessToken);
  } catch {
    throw new Error("MFA_ASSURANCE_UNAVAILABLE");
  }
  if (!result || result.error || !result.data) throw new Error("MFA_ASSURANCE_UNAVAILABLE");
  return classifyMfaAssuranceLevels(result.data);
}
