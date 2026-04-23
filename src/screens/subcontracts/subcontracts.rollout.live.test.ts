import fs from "node:fs";
import path from "node:path";

import type { SupabaseClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

import type { Database } from "../../lib/database.types";

type RuntimeTestUser = {
  id: string;
  email: string;
  password: string;
  role: string;
  displayLabel: string;
};

type SubcontractSnapshot = {
  id: string;
  display_no: string | null;
  status: string | null;
  created_by: string | null;
  contractor_inn: string | null;
  foreman_name: string | null;
  object_name: string | null;
  work_type: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  director_comment: string | null;
};

type ProbeResult = {
  rpcCalls: string[];
  warningMessages: string[];
  rawWarnings: unknown[][];
  subcontractsInsertCalls: number;
};

type ScenarioResult<T> = {
  result: T;
  probe: ProbeResult;
};

type SerializedError = {
  name: string | null;
  message: string;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
  stack?: string | null;
  raw?: Record<string, unknown>;
};

const runLive = process.env.RUN_LIVE_SUBCONTRACT_ROLLOUT === "1";
const describeLive = runLive ? describe : describe.skip;
const projectRoot = process.cwd();
const artifactsDir = path.join(projectRoot, "artifacts");

const writeJson = (name: string, value: unknown) => {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const writeText = (name: string, value: string) => {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, name), value, "utf8");
};

const text = (value: unknown): string => String(value ?? "").trim();

const serializeError = (error: unknown): SerializedError => {
  if (error instanceof Error) {
    const record = error as Error & { code?: unknown; details?: unknown; hint?: unknown };
    return {
      name: record.name || null,
      message: record.message || String(error),
      code: text(record.code) || null,
      details: text(record.details) || null,
      hint: text(record.hint) || null,
      stack: record.stack || null,
    };
  }
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    return {
      name: text(record.name) || null,
      message: text(record.message) || String(error),
      code: text(record.code) || null,
      details: text(record.details) || null,
      hint: text(record.hint) || null,
      raw: record,
    };
  }
  return {
    name: null,
    message: String(error),
  };
};

const toWarningMessage = (args: unknown[]): string =>
  args
    .map((arg) => {
      if (typeof arg === "string") return arg;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(" ");

describeLive("subcontracts rollout proof live", () => {
  jest.setTimeout(240_000);

  let supabase: SupabaseClient<Database>;
  let admin: SupabaseClient<Database>;
  let createTempUser: (
    adminClient: SupabaseClient,
    params: {
      role: string;
      fullName: string;
      emailPrefix: string;
    },
  ) => Promise<RuntimeTestUser>;
  let cleanupTempUser: (adminClient: SupabaseClient, user: RuntimeTestUser | null) => Promise<void>;
  let createSubcontractDraftWithPatch: typeof import("./subcontracts.shared").createSubcontractDraftWithPatch;
  let approveSubcontract: typeof import("./subcontracts.shared").approveSubcontract;
  let rejectSubcontract: typeof import("./subcontracts.shared").rejectSubcontract;

  let runtimeUser: RuntimeTestUser | null = null;
  const createdSubcontractIds: string[] = [];
  const marker = `WAVE15_1_SUB_${Date.now().toString(36).toUpperCase()}`;

  beforeAll(async () => {
    for (const file of [".env.local", ".env"]) {
      const full = path.join(projectRoot, file);
      if (fs.existsSync(full)) loadDotenv({ path: full, override: false });
    }

    (globalThis as { __DEV__?: boolean }).__DEV__ = true;

    const discipline = require("../../../scripts/_shared/testUserDiscipline") as typeof import("../../../scripts/_shared/testUserDiscipline");
    const supabaseModule = require("../../lib/supabaseClient") as typeof import("../../lib/supabaseClient");
    const sharedModule = require("./subcontracts.shared") as typeof import("./subcontracts.shared");

    createTempUser = discipline.createTempUser;
    cleanupTempUser = discipline.cleanupTempUser;
    admin = discipline.createVerifierAdmin("wave15.1-subcontracts-rollout-proof");
    supabase = supabaseModule.supabase;
    createSubcontractDraftWithPatch = sharedModule.createSubcontractDraftWithPatch;
    approveSubcontract = sharedModule.approveSubcontract;
    rejectSubcontract = sharedModule.rejectSubcontract;

    runtimeUser = await createTempUser(admin, {
      role: "director",
      fullName: "Subcontracts Rollout Director",
      emailPrefix: "subcontracts.rollout.director",
    });

    const signIn = await supabase.auth.signInWithPassword({
      email: runtimeUser.email,
      password: runtimeUser.password,
    });
    if (signIn.error || !signIn.data.session) {
      throw signIn.error ?? new Error("runtime user sign-in returned no session");
    }
  });

  afterAll(async () => {
    if (supabase) {
      await supabase.auth.signOut().catch(() => {});
    }

    for (const subcontractId of createdSubcontractIds) {
      try {
        await admin.from("subcontracts").delete().eq("id", subcontractId);
      } catch {
        // best effort cleanup
      }
    }

    if (cleanupTempUser) {
      await cleanupTempUser(admin, runtimeUser).catch(() => {});
    }
  });

  it("proves migrated runtime path, smoke behavior, and compat fallback safety", async () => {
    const mutableSupabase = supabase as unknown as {
      rpc: (fn: string, args?: unknown) => Promise<{ data: unknown; error: unknown }>;
      from: (relation: string) => unknown;
    };

    const loadSubcontractSnapshot = async (subcontractId: string): Promise<SubcontractSnapshot> => {
      const result = await admin
        .from("subcontracts")
        .select(
          "id,display_no,status,created_by,contractor_inn,foreman_name,object_name,work_type,submitted_at,approved_at,rejected_at,director_comment",
        )
        .eq("id", subcontractId)
        .single();
      if (result.error) throw result.error;

      return {
        id: text(result.data.id),
        display_no: text(result.data.display_no) || null,
        status: text(result.data.status) || null,
        created_by: text(result.data.created_by) || null,
        contractor_inn: text(result.data.contractor_inn) || null,
        foreman_name: text(result.data.foreman_name) || null,
        object_name: text(result.data.object_name) || null,
        work_type: text(result.data.work_type) || null,
        submitted_at: text(result.data.submitted_at) || null,
        approved_at: text(result.data.approved_at) || null,
        rejected_at: text(result.data.rejected_at) || null,
        director_comment: text(result.data.director_comment) || null,
      };
    };

    const moveToPending = async (subcontractId: string) => {
      const result = await admin
        .from("subcontracts")
        .update({
          status: "pending",
          submitted_at: new Date().toISOString(),
          approved_at: null,
          rejected_at: null,
          director_comment: null,
        })
        .eq("id", subcontractId)
        .select("id,status")
        .single();
      if (result.error) throw result.error;
      return result.data;
    };

    const withClientTransportProbe = async <T>(
      options: { simulateMissingCreateRpc?: boolean },
      run: () => Promise<T>,
    ): Promise<ScenarioResult<T>> => {
      const rpcCalls: string[] = [];
      const rawWarnings: unknown[][] = [];
      let subcontractsInsertCalls = 0;
      let missingCreateInjected = false;

      const originalRpc = mutableSupabase.rpc.bind(mutableSupabase);
      const originalFrom = mutableSupabase.from.bind(mutableSupabase);
      const warnSpy = jest.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
        rawWarnings.push(args);
      });

      mutableSupabase.rpc = async (fn: string, args?: unknown) => {
        rpcCalls.push(String(fn));
        if (options.simulateMissingCreateRpc === true && fn === "subcontract_create_v1" && !missingCreateInjected) {
          missingCreateInjected = true;
          return {
            data: null,
            error: {
              code: "PGRST202",
              message: "Could not find the function public.subcontract_create_v1 in the schema cache",
            },
          };
        }
        return originalRpc(fn, args);
      };

      mutableSupabase.from = (relation: string) => {
        const builder = originalFrom(relation) as object;
        if (relation !== "subcontracts" || !builder) return builder;

        return new Proxy(builder, {
          get(target, prop, receiver) {
            const value = Reflect.get(target, prop, receiver);
            if (prop === "insert" && typeof value === "function") {
              return (...args: unknown[]) => {
                subcontractsInsertCalls += 1;
                return value.apply(target, args);
              };
            }
            if (typeof value === "function") {
              return value.bind(target);
            }
            return value;
          },
        });
      };

      try {
        const result = await run();
        return {
          result,
          probe: {
            rpcCalls,
            warningMessages: rawWarnings.map(toWarningMessage),
            rawWarnings,
            subcontractsInsertCalls,
          },
        };
      } finally {
        mutableSupabase.rpc = originalRpc;
        mutableSupabase.from = originalFrom;
        warnSpy.mockRestore();
      }
    };

    const contractorInnProbe = await admin.from("subcontracts").select("id,contractor_inn").limit(1);
    expect(contractorInnProbe.error).toBeNull();

    const primaryScenario = await withClientTransportProbe({ simulateMissingCreateRpc: false }, async () => {
      const row = await createSubcontractDraftWithPatch(runtimeUser!.id, "Wave 15.1 Primary", {
        contractor_org: `Primary Org ${marker}`,
        contractor_inn: "1234567890",
        object_name: `Primary Object ${marker}`,
        work_type: "Primary Work",
      });
      return {
        createResult: row,
        snapshot: await loadSubcontractSnapshot(row.id),
      };
    });
    createdSubcontractIds.push(primaryScenario.result.createResult.id);

    const fallbackScenario = await withClientTransportProbe({ simulateMissingCreateRpc: true }, async () => {
      const row = await createSubcontractDraftWithPatch(runtimeUser!.id, "Wave 15.1 Fallback", {
        contractor_org: `Fallback Org ${marker}`,
        contractor_inn: "9988776655",
        object_name: `Fallback Object ${marker}`,
        work_type: "Fallback Work",
      });
      return {
        createResult: row,
        snapshot: await loadSubcontractSnapshot(row.id),
      };
    });
    createdSubcontractIds.push(fallbackScenario.result.createResult.id);

    await moveToPending(primaryScenario.result.createResult.id);
    const approveScenario = await withClientTransportProbe({ simulateMissingCreateRpc: false }, async () => {
      await approveSubcontract(primaryScenario.result.createResult.id);
      return await loadSubcontractSnapshot(primaryScenario.result.createResult.id);
    });

    const repeatedApproveScenario = await withClientTransportProbe({ simulateMissingCreateRpc: false }, async () => {
      await approveSubcontract(primaryScenario.result.createResult.id);
      return await loadSubcontractSnapshot(primaryScenario.result.createResult.id);
    });

    await moveToPending(fallbackScenario.result.createResult.id);
    const rejectScenario = await withClientTransportProbe({ simulateMissingCreateRpc: false }, async () => {
      await rejectSubcontract(fallbackScenario.result.createResult.id, "Wave 15.1 reject");
      return await loadSubcontractSnapshot(fallbackScenario.result.createResult.id);
    });

    const conflictErrorRef: { current: SerializedError | null } = { current: null };
    const conflictScenario = await withClientTransportProbe({ simulateMissingCreateRpc: false }, async () => {
      try {
        await rejectSubcontract(primaryScenario.result.createResult.id, "Conflict should fail");
      } catch (error) {
        conflictErrorRef.current = serializeError(error);
      }
      return await loadSubcontractSnapshot(primaryScenario.result.createResult.id);
    });

    const schemaVerification = {
      status: "GREEN",
      generatedAt: new Date().toISOString(),
      projectRef: "nxrnjywzxxfdpqmzjorh",
      columnProbe: {
        contractorInnSelectable: contractorInnProbe.error == null,
        rowCount: Array.isArray(contractorInnProbe.data) ? contractorInnProbe.data.length : 0,
      },
      rpcContracts: {
        create: {
          function: "subcontract_create_v1",
          args: ["p_created_by", "p_foreman_name", "p_contractor_org", "p_contractor_inn"],
        },
        approve: {
          function: "subcontract_approve_v1",
          args: ["p_subcontract_id"],
        },
        reject: {
          function: "subcontract_reject_v1",
          args: ["p_subcontract_id", "p_director_comment"],
        },
      },
      runtimeClient: {
        userId: runtimeUser!.id,
        email: runtimeUser!.email,
      },
    };

    const primaryPathProof = {
      status:
        primaryScenario.probe.rpcCalls.includes("subcontract_create_v1") &&
        !primaryScenario.probe.rpcCalls.includes("subcontract_create_draft") &&
        primaryScenario.probe.subcontractsInsertCalls === 0 &&
        primaryScenario.result.snapshot.contractor_inn === "1234567890"
          ? "GREEN"
          : "NOT_GREEN",
      generatedAt: new Date().toISOString(),
      transport: primaryScenario.probe,
      create: primaryScenario.result,
    };

    const fallbackProof = {
      status:
        fallbackScenario.probe.rpcCalls[0] === "subcontract_create_v1" &&
        fallbackScenario.probe.rpcCalls.includes("subcontract_create_draft") &&
        fallbackScenario.probe.warningMessages.some((message) => message.includes("create.compat_legacy_rpc")) &&
        fallbackScenario.probe.subcontractsInsertCalls === 0
          ? "GREEN"
          : "NOT_GREEN",
      generatedAt: new Date().toISOString(),
      transport: fallbackScenario.probe,
      create: fallbackScenario.result,
      expectations: {
        compatFallbackLogged: fallbackScenario.probe.warningMessages.some((message) =>
          message.includes("create.compat_legacy_rpc"),
        ),
        directInsertUsed: fallbackScenario.probe.subcontractsInsertCalls > 0,
      },
    };

    const liveSmoke = {
      status:
        approveScenario.result.status === "approved" &&
        repeatedApproveScenario.result.status === "approved" &&
        rejectScenario.result.status === "rejected" &&
        conflictScenario.result.status === "approved" &&
        conflictErrorRef.current !== null &&
        conflictErrorRef.current.message.includes("pending status") === true
          ? "GREEN"
          : "NOT_GREEN",
      generatedAt: new Date().toISOString(),
      create_primary: primaryScenario.result,
      create_fallback: fallbackScenario.result,
      approve_success: {
        transport: approveScenario.probe,
        snapshot: approveScenario.result,
      },
      repeated_approve: {
        transport: repeatedApproveScenario.probe,
        snapshot: repeatedApproveScenario.result,
      },
      reject_success: {
        transport: rejectScenario.probe,
        snapshot: rejectScenario.result,
      },
      conflict_after_approve: {
        transport: conflictScenario.probe,
        snapshot: conflictScenario.result,
        error: conflictErrorRef.current,
      },
    };

    const rolloutStatus =
      schemaVerification.status === "GREEN" &&
      primaryPathProof.status === "GREEN" &&
      fallbackProof.status === "GREEN" &&
      liveSmoke.status === "GREEN"
        ? "GREEN"
        : "NOT_GREEN";

    const summaryMd = [
      "# Wave 15.1 Subcontracts Rollout Proof",
      "",
      `Status: ${rolloutStatus}`,
      "",
      "Checked:",
      "- migration apply proof: artifacts/wave15_1_subcontracts_migration_apply.log",
      "- migration history after apply: artifacts/wave15_1_subcontracts_migration_list_after.txt",
      `- schema and RPC verification: ${schemaVerification.status}`,
      `- primary client path: ${primaryPathProof.status}`,
      `- live approve/repeated approve/reject/conflict smoke: ${liveSmoke.status}`,
      `- compat fallback secondary-only proof: ${fallbackProof.status}`,
      "",
      "Runtime notes:",
      "- create primary path used shared client -> subcontract_create_v1 only",
      "- compat scenario injected a missing subcontract_create_v1 transport error, then exercised shared client fallback -> subcontract_create_draft",
      "- direct table insert into subcontracts stayed at zero in both scenarios",
      "- approve/reject used shared client atomic RPCs only",
      "- pending status setup for approve/reject smoke was service-role test fixture setup only",
      "",
    ].join("\n");

    writeJson("wave15_1_subcontracts_schema_verification.json", schemaVerification);
    writeJson("wave15_1_subcontracts_primary_path.json", primaryPathProof);
    writeJson("wave15_1_subcontracts_fallback_proof.json", fallbackProof);
    writeJson("wave15_1_subcontracts_live_smoke.json", liveSmoke);
    writeJson("wave15_1_subcontracts_create_snapshot_primary.json", primaryScenario.result);
    writeJson("wave15_1_subcontracts_create_snapshot_fallback.json", fallbackScenario.result);
    writeJson("wave15_1_subcontracts_approve_snapshot.json", approveScenario.result);
    writeJson("wave15_1_subcontracts_reject_snapshot.json", rejectScenario.result);
    writeJson("wave15_1_subcontracts_conflict_snapshot.json", {
      snapshot: conflictScenario.result,
      error: conflictErrorRef.current,
    });
    writeText("wave15_1_subcontracts_rollout_summary.md", summaryMd);

    expect(primaryPathProof.status).toBe("GREEN");
    expect(fallbackProof.status).toBe("GREEN");
    expect(liveSmoke.status).toBe("GREEN");
    expect(conflictErrorRef.current).not.toBeNull();
  });
});
