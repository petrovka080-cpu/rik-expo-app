import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

type JsonRecord = Record<string, unknown>;

const projectRoot = process.cwd();
const fullOutPath = path.join(projectRoot, "artifacts/foreman-ai-hardening-wave1.json");
const summaryOutPath = path.join(projectRoot, "artifacts/foreman-ai-hardening-wave1.summary.json");

dotenv.config({ path: path.join(projectRoot, ".env.local") });
dotenv.config({ path: path.join(projectRoot, ".env") });

const readText = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const writeJson = (fullPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const toErrorText = (error: unknown) => {
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

const servicePath = "src/lib/api/foremanAiResolve.service.ts";
const clientPath = "src/screens/foreman/foreman.ai.ts";
const migrationPath = "supabase/migrations/20260327120000_foreman_ai_resolve_scope_v1.sql";
const packageJsonPath = "package.json";

const serviceSource = readText(servicePath);
const clientSource = readText(clientPath);
const migrationSource = readText(migrationPath);
const packageJson = JSON.parse(readText(packageJsonPath)) as JsonRecord;
const dependencies = ((packageJson.dependencies as JsonRecord | undefined) ?? {}) as JsonRecord;

const structural = {
  migrationPresent: fs.existsSync(path.join(projectRoot, migrationPath)),
  servicePresent: fs.existsSync(path.join(projectRoot, servicePath)),
  synonymTablePresent: migrationSource.includes("create table if not exists public.catalog_synonyms"),
  packagingTablePresent: migrationSource.includes("create table if not exists public.catalog_packaging"),
  synonymRpcPresent: migrationSource.includes("create or replace function public.resolve_catalog_synonym_v1"),
  packagingRpcPresent: migrationSource.includes("create or replace function public.resolve_packaging_v1"),
  serviceUsesSynonymRpc: serviceSource.includes('supabase.rpc("resolve_catalog_synonym_v1" as never'),
  serviceUsesPackagingRpc: serviceSource.includes('supabase.rpc("resolve_packaging_v1" as never'),
  clientUsesSynonymPrimary: clientSource.includes("const synonymPrimary = await resolveCatalogBySynonymPrimary(input);"),
  clientUsesPackagingPrimary: clientSource.includes("const packagingResult = await applyPackagingResolution(input, synonymPrimary);")
    && clientSource.includes("const packagingResult = await applyPackagingResolution(input, {"),
  clientRetainsSearchFallback: clientSource.includes("const found = await rikQuickSearch(query, 10);"),
  packagingClarifyPathPresent:
    clientSource.includes('phase: "packaging_clarify_required"')
    && clientSource.includes("buildPackagingClarifyQuestion"),
  packagingUnitNormalizationPresent:
    clientSource.includes("normalizeResolveUnitCanonical")
    && clientSource.includes("PACKAGING_UNITS"),
  voiceDependencyInstalled: typeof dependencies["expo-speech-recognition"] === "string",
};

async function main() {
  const runtimeProbe = {
    envConfigured: false,
    synonymRpcReachable: false,
    packagingRpcReachable: false,
    synonymRpcError: null as string | null,
    packagingRpcError: null as string | null,
  };

  const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
  const supabaseServiceRole = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

  if (supabaseUrl && supabaseServiceRole) {
    runtimeProbe.envConfigured = true;
    const client = createClient(supabaseUrl, supabaseServiceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    try {
      const { error } = await client.rpc("resolve_catalog_synonym_v1" as never, {
        p_terms: ["dummy-term"],
        p_kind: null,
      } as never);
      if (error) throw error;
      runtimeProbe.synonymRpcReachable = true;
    } catch (error) {
      runtimeProbe.synonymRpcError = toErrorText(error);
    }

    try {
      const { error } = await client.rpc("resolve_packaging_v1" as never, {
        p_rik_code: "TEST-RIK-CODE",
        p_package_name: "мешок",
        p_qty: 1,
      } as never);
      if (error) throw error;
      runtimeProbe.packagingRpcReachable = true;
    } catch (error) {
      runtimeProbe.packagingRpcError = toErrorText(error);
    }
  }

  const structuralGateFields = [
    structural.migrationPresent,
    structural.servicePresent,
    structural.synonymTablePresent,
    structural.packagingTablePresent,
    structural.synonymRpcPresent,
    structural.packagingRpcPresent,
    structural.serviceUsesSynonymRpc,
    structural.serviceUsesPackagingRpc,
    structural.clientUsesSynonymPrimary,
    structural.clientUsesPackagingPrimary,
    structural.clientRetainsSearchFallback,
    structural.packagingClarifyPathPresent,
    structural.packagingUnitNormalizationPresent,
  ];
  const structuralPassed = structuralGateFields.every(Boolean);

  const backendContractsDeployed =
    runtimeProbe.envConfigured
    && runtimeProbe.synonymRpcReachable
    && runtimeProbe.packagingRpcReachable;

  const summary = {
    status: structuralPassed ? "passed" : "failed",
    gate: structuralPassed && backendContractsDeployed ? "GREEN" : structuralPassed ? "AMBER" : "RED",
    deterministicResolvePrimaryConfigured: structural.clientUsesSynonymPrimary && structural.clientUsesPackagingPrimary,
    synonymBackendContractPresent: structural.synonymRpcPresent && structural.serviceUsesSynonymRpc,
    packagingBackendContractPresent: structural.packagingRpcPresent && structural.serviceUsesPackagingRpc,
    searchFallbackRetained: structural.clientRetainsSearchFallback,
    packagingClarifyRequiredPath: structural.packagingClarifyPathPresent,
    packagingUnitNormalizationPresent: structural.packagingUnitNormalizationPresent,
    voiceLayerDeferred: !structural.voiceDependencyInstalled,
    backendContractsDeployed,
    runtimeProbe,
  };

  const full = {
    generatedAt: new Date().toISOString(),
    summary,
    structural,
    files: {
      migrationPath,
      servicePath,
      clientPath,
    },
  };

  writeJson(fullOutPath, full);
  writeJson(summaryOutPath, summary);

  if (!structuralPassed) {
    console.error(JSON.stringify(summary, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(summary, null, 2));
}

void main();
