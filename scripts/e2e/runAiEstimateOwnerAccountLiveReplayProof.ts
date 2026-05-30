import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

import {
  hashOwnerAccountReplayValue,
  resolveOwnerAccountReplayIdentity,
  type AiEstimateOwnerAccountReplayIdentity,
} from "../../src/lib/ai/productionCanary";
import {
  buildOwnerAccountReplayMatrix,
  runAndroidApi34OwnerAccountReplay,
  runOwnerAccountKillSwitchProof,
  writeOwnerAccountFeedbackAudit,
  writeOwnerAccountPdfArtifacts,
  writeOwnerAccountPolicyArtifacts,
  writeOwnerAccountRuntimeArtifacts,
  writeOwnerAccountTelemetryPrivacyAudit,
  writeOwnerAccountWebArtifacts,
  writeOwnerReplayJson,
  writeOwnerReplayText,
} from "./aiEstimateOwnerAccountLiveReplayCore";

loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });

async function resolveIdentityWithOptionalOwnerSession(): Promise<AiEstimateOwnerAccountReplayIdentity> {
  const base = resolveOwnerAccountReplayIdentity();
  const email = String(process.env.AI_ESTIMATE_OWNER_ACCOUNT_EMAIL ?? "").trim();
  const password = String(process.env.AI_ESTIMATE_OWNER_ACCOUNT_PASSWORD ?? "").trim();
  const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
  const anonKey = String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

  if (!email || !password || !supabaseUrl || !anonKey) {
    return base;
  }

  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "x-client-info": "ai-estimate-owner-account-replay-proof" } },
  });
  const result = await client.auth.signInWithPassword({ email, password });
  if (result.error || !result.data.session?.user) {
    return {
      ...base,
      source: "env",
      testOwnerEmailHash: hashOwnerAccountReplayValue(email),
    };
  }
  const userId = result.data.session.user.id;
  await client.auth.signOut().catch(() => {});
  return {
    source: "env",
    ownerUserId: base.ownerUserId ?? userId,
    ownerAccountId: base.ownerAccountId,
    ownerOrganizationId: base.ownerOrganizationId,
    authenticatedSessionUserId: userId,
    testOwnerEmailHash: base.testOwnerEmailHash ?? hashOwnerAccountReplayValue(email),
  };
}

export async function runAiEstimateOwnerAccountLiveReplayProof() {
  const identity = await resolveIdentityWithOptionalOwnerSession();
  const policyArtifacts = writeOwnerAccountPolicyArtifacts(identity);
  const runtime = writeOwnerAccountRuntimeArtifacts(identity);
  const web = writeOwnerAccountWebArtifacts(identity);
  const android = runAndroidApi34OwnerAccountReplay(identity);
  const pdf = writeOwnerAccountPdfArtifacts(identity);
  const telemetry = writeOwnerAccountTelemetryPrivacyAudit(identity);
  const feedback = writeOwnerAccountFeedbackAudit(identity);
  const killSwitch = runOwnerAccountKillSwitchProof();
  const proof = buildOwnerAccountReplayMatrix({
    policyArtifacts,
    runtime,
    web,
    android,
    pdf,
    telemetry,
    feedback,
    killSwitch,
  });

  writeOwnerReplayJson("failures.json", proof.failures);
  writeOwnerReplayJson("matrix.json", proof.matrix);
  writeOwnerReplayText(
    "proof.md",
    [
      "# AI Estimate Owner Account Live Replay",
      "",
      `Status: ${proof.matrix.final_status}`,
      `Owner account live replay proven: ${String(proof.matrix.owner_account_live_replay_proven)}`,
      `Real external user traffic proven: ${String(proof.matrix.real_external_user_traffic_proven)}`,
      `Owner identity present: ${String(proof.matrix.owner_account_identity_present)}`,
      `Owner identity redacted: ${String(proof.matrix.owner_account_identity_redacted)}`,
      `Public beta enabled: ${String(proof.matrix.public_beta_enabled)}`,
      `Production rollout enabled: ${String(proof.matrix.production_rollout_enabled)}`,
      `Fake green claimed: ${String(proof.matrix.fake_green_claimed)}`,
      "",
      "Failures:",
      ...(proof.failures.length > 0
        ? proof.failures.map((failure) => `- ${failure.classification}: ${failure.reason}${failure.artifact ? ` (${failure.artifact})` : ""}`)
        : ["- none"]),
      "",
    ].join("\n"),
  );

  if (proof.matrix.final_status === "UNKNOWN_NEEDS_TRACE") {
    throw new Error(`UNKNOWN_NEEDS_TRACE:${proof.failures.map((failure) => failure.reason).join(";")}`);
  }
  if (proof.failures.length > 0) {
    throw new Error(`${proof.matrix.final_status}:${proof.failures.map((failure) => failure.classification).join(";")}`);
  }
  return proof;
}

if (require.main === module) {
  runAiEstimateOwnerAccountLiveReplayProof().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

