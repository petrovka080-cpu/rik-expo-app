import { config as loadDotenv } from "dotenv";

const EMAIL_PREFIX = "android-warm-link-probe.";

export async function cleanupAndroidWarmDeepLinkProbeResidue(): Promise<{
  companies: number;
  users: number;
}> {
  loadDotenv({ path: ".env.local", override: false });
  const {
    createVerifierAdmin,
    hasRuntimeTestCredentials,
    runtimeTestCredentialsBlocker,
  } = await import("../_shared/testUserDiscipline");
  if (!hasRuntimeTestCredentials) {
    throw new Error(runtimeTestCredentialsBlocker);
  }
  const admin = createVerifierAdmin(
    "cleanup-android-warm-deep-link-probe-residue",
  );
  const companies = await admin
    .from("companies")
    .select("id")
    .like("email", `${EMAIL_PREFIX}%@e.com`);
  if (companies.error) throw companies.error;
  const companyRows = (companies.data ?? []) as { id: string }[];
  for (const company of companyRows) {
    await admin.from("company_members").delete().eq("company_id", company.id);
    await admin.from("company_profiles").delete().eq("id", company.id);
    await admin.from("companies").delete().eq("id", company.id);
  }

  let page = 1;
  let deletedUsers = 0;
  while (true) {
    const listed = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (listed.error) throw listed.error;
    for (const user of listed.data.users) {
      if (!String(user.email ?? "").startsWith(EMAIL_PREFIX)) continue;
      const deleted = await admin.auth.admin.deleteUser(user.id);
      if (deleted.error) throw deleted.error;
      deletedUsers += 1;
    }
    if (listed.data.users.length < 200) break;
    page += 1;
  }
  return { companies: companyRows.length, users: deletedUsers };
}

if (require.main === module) {
  void cleanupAndroidWarmDeepLinkProbeResidue()
    .then((result) => {
      console.info(
        JSON.stringify({
          event: "ANDROID_WARM_DEEP_LINK_PROBE_STANDALONE_CLEANUP_GREEN",
          ...result,
        }),
      );
    })
    .catch((error: unknown) => {
      console.error(
        JSON.stringify({
          event: "ANDROID_WARM_DEEP_LINK_PROBE_STANDALONE_CLEANUP_RED",
          message:
            error instanceof Error
              ? error.message.slice(0, 500)
              : String(error).slice(0, 500),
        }),
      );
      process.exitCode = 1;
    });
}
