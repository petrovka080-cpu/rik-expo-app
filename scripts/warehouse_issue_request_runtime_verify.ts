import fs from "node:fs";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

import type { Database } from "../src/lib/database.types";
import {
  createMaestroCriticalBusinessSeed,
  type MaestroCriticalBusinessSeed,
} from "./e2e/_shared/maestroCriticalBusinessSeed";
import type { RuntimeTestUser } from "./_shared/testUserDiscipline";

loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });

const projectRoot = process.cwd();
const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseAnonKey = String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
const artifactBase = "artifacts/warehouse-issue-request-runtime";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

type ProbeResult = {
  name: string;
  available: boolean;
  status: "passed" | "failed" | "warning";
  expectedErrorMatched: boolean;
  message: string;
  code: string | null;
  details: string | null;
  unexpectedSuccess: boolean;
};

type UnknownRpcResult = {
  data: unknown;
  error: {
    message?: string | null;
    code?: string | null;
    details?: string | null;
  } | null;
};

const warehouseIssueStockPreconditionNeedle = "Нельзя выдать больше, чем доступно";

const writeArtifact = (relativePath: string, payload: unknown) => {
  const full = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, `${JSON.stringify(payload, null, 2)}\n`);
};

const toText = (value: unknown) => String(value ?? "").trim();

const isMissingFunctionError = (fnName: string, message: string) => {
  const lower = toText(message).toLowerCase();
  const functionLower = fnName.toLowerCase();
  return (
    (lower.includes(`function public.${functionLower}`) && lower.includes("does not exist")) ||
    lower.includes(`could not find the function public.${functionLower}`) ||
    lower.includes(`public.${functionLower}(`)
  );
};

async function signInRuntimeUser(user: RuntimeTestUser) {
  const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "x-client-info": "warehouse-issue-request-runtime-verify-auth",
      },
    },
  });

  const signIn = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (signIn.error || !signIn.data.session) {
    throw signIn.error ?? new Error(`signInWithPassword returned no session for ${user.email}`);
  }
  return client;
}

async function runProbe(args: {
  name: string;
  fnName: string;
  exec: () => Promise<UnknownRpcResult>;
  expectedErrorNeedle?: string;
  expectedErrorNeedles?: string[];
  allowSuccess?: boolean;
  cleanupOnSuccess?: (data: unknown) => Promise<void>;
}): Promise<ProbeResult> {
  const result = await args.exec();
  const message = toText(result.error?.message);
  const code = toText(result.error?.code) || null;
  const details = toText(result.error?.details) || null;
  const expectedNeedles = args.expectedErrorNeedles
    ?? (args.expectedErrorNeedle ? [args.expectedErrorNeedle] : []);

  if (!result.error) {
    if (args.cleanupOnSuccess) {
      await args.cleanupOnSuccess(result.data);
    }
    return {
      name: args.name,
      available: true,
      status: args.allowSuccess ? "passed" : "warning",
      expectedErrorMatched: !!args.allowSuccess,
      message: args.allowSuccess ? "RPC succeeded" : "RPC succeeded unexpectedly during runtime probe",
      code,
      details,
      unexpectedSuccess: !args.allowSuccess,
    };
  }

  const missing = isMissingFunctionError(args.fnName, message);
  const expectedErrorMatched = expectedNeedles.length > 0
    ? expectedNeedles.some((needle) => message.includes(needle))
    : !missing;

  return {
    name: args.name,
    available: !missing,
    status: missing ? "failed" : expectedErrorMatched ? "passed" : args.allowSuccess ? "failed" : "warning",
    expectedErrorMatched,
    message,
    code,
    details,
    unexpectedSuccess: false,
  };
}

async function main() {
  let criticalSeed: MaestroCriticalBusinessSeed | null = null;
  let warehouseUser: RuntimeTestUser | null = null;
  let runtimeClientForCleanup: SupabaseClient<Database> | null = null;

  try {
    // Reuse the same seeded warehouse request path as Maestro so this verifier
    // catches real schema/runtime drift before the long device suite starts.
    criticalSeed = await createMaestroCriticalBusinessSeed();
    const seed = criticalSeed;
    const admin = seed.admin;
    warehouseUser = seed.users.warehouse;
    const runtimeClient = await signInRuntimeUser(warehouseUser);
    runtimeClientForCleanup = runtimeClient;
    const runtimeMutationId = `warehouse-issue-runtime-verify:${Date.now().toString(36)}`;

    const wrapperProbe = await runProbe({
      name: "wh_issue_request_atomic_v1",
      fnName: "wh_issue_request_atomic_v1",
      expectedErrorNeedle: "wh_issue_request_atomic_v1_missing_request_id",
      exec: async () =>
        (await runtimeClient.rpc("wh_issue_request_atomic_v1", {
          p_client_mutation_id: `warehouse-issue-runtime-probe:${Date.now().toString(36)}`,
          p_lines: [],
          p_note: "runtime-probe",
          p_request_id: "",
          p_who: "Runtime Verify",
          p_object_name: "runtime-probe",
          p_work_name: "runtime-probe",
        })) as UnknownRpcResult,
    });

    const wrapperHappyPathProbe = await runProbe({
      name: "wh_issue_request_atomic_v1_happy_path",
      fnName: "wh_issue_request_atomic_v1",
      allowSuccess: true,
      expectedErrorNeedles: [warehouseIssueStockPreconditionNeedle],
      exec: async () =>
        (await runtimeClient.rpc("wh_issue_request_atomic_v1", {
          p_client_mutation_id: runtimeMutationId,
          p_lines: [
            {
              qty: 1,
              request_item_id: seed.warehouse.requestItemId,
              rik_code: `MAT-WH-${seed.marker}`,
              uom_id: "шт",
            },
          ],
          p_note: "runtime-probe",
          p_request_id: seed.warehouse.requestId,
          p_who: "Runtime Verify",
          p_object_name: `Warehouse ${seed.marker}`,
          p_work_name: "runtime-probe",
        })) as UnknownRpcResult,
      cleanupOnSuccess: async (data) => {
        const payload =
          data && typeof data === "object" ? (data as { issue_id?: unknown }) : null;
        const issueId = Number(payload?.issue_id ?? 0);
        if (Number.isFinite(issueId) && issueId > 0) {
          await admin.from("warehouse_issue_items").delete().eq("issue_id", issueId);
          await admin.from("warehouse_issues").delete().eq("id", issueId);
        }
        await admin
          .from("warehouse_issue_request_mutations_v1" as never)
          .delete()
          .eq("client_mutation_id", runtimeMutationId as never);
      },
    });

    const issueViaUiProbe = await runProbe({
      name: "issue_via_ui",
      fnName: "issue_via_ui",
      exec: async () =>
        (await admin.rpc("issue_via_ui", {
          p_who: "Runtime Verify",
          p_note: "runtime-probe",
          p_request_id: "__warehouse_issue_runtime_probe__",
          p_object_name: "runtime-probe",
          p_work_name: "runtime-probe",
        })) as UnknownRpcResult,
      cleanupOnSuccess: async (data) => {
        const issueId = Number(data ?? 0);
        if (Number.isFinite(issueId) && issueId > 0) {
          await admin.from("warehouse_issue_items").delete().eq("issue_id", issueId);
          await admin.from("warehouse_issues").delete().eq("id", issueId);
        }
      },
    });

    const issueAddItemProbe = await runProbe({
      name: "issue_add_item_via_ui",
      fnName: "issue_add_item_via_ui",
      exec: async () =>
        (await admin.rpc("issue_add_item_via_ui", {
          p_issue_id: -1,
          p_qty: 1,
          p_request_item_id: "__warehouse_issue_runtime_probe__",
          p_rik_code: "MAT-RUNTIME-PROBE",
          p_uom_id: "шт",
        })) as UnknownRpcResult,
    });

    const commitLedgerProbe = await runProbe({
      name: "acc_issue_commit_ledger",
      fnName: "acc_issue_commit_ledger",
      exec: async () =>
        (await admin.rpc("acc_issue_commit_ledger", {
          p_issue_id: -1,
        })) as UnknownRpcResult,
    });

    const probes = [
      wrapperProbe,
      wrapperHappyPathProbe,
      issueViaUiProbe,
      issueAddItemProbe,
      commitLedgerProbe,
    ];

    const classification = !wrapperProbe.available
      ? "wrapper_missing"
      : wrapperHappyPathProbe.status !== "passed"
        ? "wrapper_happy_path_broken"
        : !issueViaUiProbe.available
        ? "legacy_issue_creator_missing"
        : !issueAddItemProbe.available
          ? "legacy_issue_line_mutation_missing"
          : !commitLedgerProbe.available
            ? "legacy_issue_ledger_commit_missing"
            : "ready";

    const status =
      probes.every((probe) => probe.available) && wrapperHappyPathProbe.status === "passed"
        ? "passed"
        : "failed";
    const summary = {
      status,
      gate: status === "passed" ? "GREEN" : "NOT_GREEN",
      classification,
      wrapperAvailable: wrapperProbe.available,
      wrapperHappyPathPassed: wrapperHappyPathProbe.status === "passed",
      issueViaUiAvailable: issueViaUiProbe.available,
      issueAddItemAvailable: issueAddItemProbe.available,
      commitLedgerAvailable: commitLedgerProbe.available,
      expectedWrapperGuardObserved: wrapperProbe.expectedErrorMatched,
      probes,
    };

    writeArtifact(`${artifactBase}.json`, {
      summary,
      warehouseUser: warehouseUser
        ? {
            id: warehouseUser.id,
            email: "[redacted-temp-user]",
            role: warehouseUser.role,
          }
        : null,
      probes,
    });
    writeArtifact(`${artifactBase}.summary.json`, summary);

    console.log(JSON.stringify(summary, null, 2));
    if (status !== "passed") {
      process.exitCode = 1;
    }
  } finally {
    await runtimeClientForCleanup?.auth.signOut().catch(() => undefined);
    await criticalSeed?.cleanup().catch(() => undefined);
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
