const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const AUTHORIZATION_PATTERN = /\bAuthorization\s*:\s*(?:Bearer\s+)?[^\s"'<>]+/gi;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const SECRET_ASSIGNMENT_PATTERN =
  /\b(?:EXPO_TOKEN|EAS_TOKEN|EXPO_APPLE_ID|EXPO_APPLE_APP_SPECIFIC_PASSWORD|EXPO_ASC_APP_ID|ASC_API_KEY|APP_STORE_CONNECT_API_KEY|FASTLANE_SESSION|SUPABASE_SERVICE_ROLE_KEY|EXPO_PUBLIC_SUPABASE_ANON_KEY|PASSWORD)\s*=\s*[^\s"'<>]+/gi;
const SIGNED_URL_QUERY_PATTERN =
  /(https?:\/\/[^\s"'<>?]+[^\s"'<>]*[?&](?:X-Goog-Signature|X-Goog-Credential|token|access_token|signature|key|apikey)=)[^\s"'<>]+/gi;
const GENERIC_QUERY_SECRET_PATTERN = /([?&](?:token|access_token|signature|key|apikey)=)[^&\s"'<>]+/gi;

export function collectReleaseSecretValues(env: NodeJS.ProcessEnv = process.env): readonly string[] {
  return [
    env.EXPO_TOKEN,
    env.EAS_TOKEN,
    env.EXPO_APPLE_ID,
    env.EXPO_APPLE_APP_SPECIFIC_PASSWORD,
    env.EXPO_ASC_APP_ID,
    env.ASC_API_KEY,
    env.APP_STORE_CONNECT_API_KEY,
    env.FASTLANE_SESSION,
    env.SUPABASE_SERVICE_ROLE_KEY,
    env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  ]
    .map((value) => String(value ?? "").trim())
    .filter((value) => value.length > 0);
}

export function redactReleaseOutput(
  value: string,
  secrets: readonly string[] = collectReleaseSecretValues(),
): string {
  let redacted = value;

  for (const secret of secrets) {
    redacted = redacted.split(secret).join("<redacted>");
  }

  return redacted
    .replace(AUTHORIZATION_PATTERN, "Authorization: <redacted>")
    .replace(JWT_PATTERN, "<redacted-jwt>")
    .replace(SECRET_ASSIGNMENT_PATTERN, "<redacted-secret-assignment>")
    .replace(SIGNED_URL_QUERY_PATTERN, "$1<redacted>")
    .replace(GENERIC_QUERY_SECRET_PATTERN, "$1<redacted>")
    .replace(EMAIL_PATTERN, "<redacted-email>");
}
