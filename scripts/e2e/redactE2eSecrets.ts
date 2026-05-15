import {
  getDeveloperControlSecretKeys,
  getExplicitAiRoleSecretKeys,
} from "./resolveExplicitAiRoleAuthEnv";

const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const AUTHORIZATION_PATTERN = /\bAuthorization\s*:\s*(?:Bearer\s+)?[^\s"'<>]+/gi;
const SUPABASE_KEY_PATTERN = /\b(?:SUPABASE_SERVICE_ROLE_KEY|EXPO_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_ANON_KEY|service_role)\s*=\s*[^\s"'<>]+/gi;
const TOKENIZED_URL_PATTERN = /(https?:\/\/[^\s"'<>?]+[^\s"'<>]*[?&](?:token|access_token|apikey|key)=)[^\s"'<>]+/gi;
const MAESTRO_ENV_FRAGMENT_PATTERN = /\b((?:MAESTRO_)?E2E_[A-Z_]+=(?:\"?))[^",\s}]+/g;
const MAESTRO_SECRET_ENV_FRAGMENT_PATTERN = /\b((?:MAESTRO_)?E2E_[A-Z_]*(?:EMAIL|PASSWORD|TOKEN|SECRET|KEY)[A-Z_]*=(?:\"?))[^",\s}]+/gi;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

export function collectExplicitE2eSecrets(
  env: NodeJS.ProcessEnv = process.env,
): readonly string[] {
  return [...new Set([...getExplicitAiRoleSecretKeys(), ...getDeveloperControlSecretKeys()])]
    .map((key) => String(env[key] ?? "").trim())
    .filter((value) => value.length > 0);
}

export function redactE2eSecrets(
  value: string,
  secrets: readonly string[] = collectExplicitE2eSecrets(),
): string {
  let redacted = value;

  for (const secret of secrets) {
    redacted = redacted.split(secret).join("<redacted>");
  }

  return redacted
    .replace(AUTHORIZATION_PATTERN, "Authorization: <redacted>")
    .replace(JWT_PATTERN, "<redacted-jwt>")
    .replace(SUPABASE_KEY_PATTERN, "<redacted-supabase-key>")
    .replace(TOKENIZED_URL_PATTERN, "$1<redacted>")
    .replace(MAESTRO_SECRET_ENV_FRAGMENT_PATTERN, "$1<redacted>")
    .replace(MAESTRO_ENV_FRAGMENT_PATTERN, "$1<redacted>")
    .replace(EMAIL_PATTERN, "<redacted-email>");
}
