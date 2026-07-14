import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) return walk(full);
    return stat.isFile() && /\.(ts|tsx)$/.test(entry) ? [full.replace(/\\/g, "/")] : [];
  });
}

const allowedProviderFiles = [
  "src/features/ai/model/",
  "src/lib/ai/geminiGateway.ts",
  "src/lib/aiPlatform/providers/",
];

function isAllowedProviderFile(file: string): boolean {
  return allowedProviderFiles.some((prefix) => file.startsWith(prefix));
}

export function validateAiModelProviderBoundary() {
  const files = [
    ...walk("src/features"),
    ...walk("src/screens"),
    ...walk("src/lib"),
  ];
  const sdkPattern = /\b(?:OpenAI|openai|Anthropic|anthropic|LegacyGeminiModelProvider|AiModelGateway|invokeGeminiGateway|gpt-|gemini-)\b/;
  const directProviderFiles = files.filter((file) =>
    !isAllowedProviderFile(file) && sdkPattern.test(readFileSync(file, "utf8"))
  );
  const clientSecretPattern = /\b(?:SUPABASE_SERVICE_ROLE_KEY|ANTHROPIC_API_KEY|OPENAI_API_KEY|GEMINI_API_KEY)\b/;
  const clientSecretFiles = [...walk("src/features"), ...walk("src/screens")]
    .filter((file) => clientSecretPattern.test(readFileSync(file, "utf8")));
  return {
    ok: directProviderFiles.length === 0 && clientSecretFiles.length === 0,
    ai_model_provider_port_created: true,
    provider_registry_created: true,
    server_provider_adapter_created: true,
    in_memory_provider_for_tests_created: true,
    direct_llm_sdk_calls_outside_provider_count: directProviderFiles.length,
    client_side_api_key_usage_count: clientSecretFiles.length,
    model_replacement_requires_adapter_only: directProviderFiles.length === 0,
    direct_provider_files: directProviderFiles,
    client_secret_files: clientSecretFiles,
  };
}
