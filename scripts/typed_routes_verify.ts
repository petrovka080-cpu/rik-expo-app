import fs from "node:fs";
import path from "node:path";

type TargetDelta = {
  file: string;
  before: number;
  after: number;
};

const root = process.cwd();
const artifactsDir = path.join(root, "artifacts");

const navTargets: TargetDelta[] = [
  { file: "src/features/reports/ReportsHubScreen.tsx", before: 1, after: 0 },
  { file: "src/features/chat/ChatScreen.tsx", before: 6, after: 0 },
  { file: "src/features/auctions/AuctionsScreen.tsx", before: 4, after: 0 },
  { file: "src/features/auctions/AuctionDetailScreen.tsx", before: 4, after: 0 },
  { file: "app/(tabs)/profile.tsx", before: 7, after: 0 },
];

const queryTargets: TargetDelta[] = [
  { file: "src/features/reports/ReportsDashboardScreen.tsx", before: 1, after: 0 },
  { file: "src/screens/buyer/buyer.fetchers.ts", before: 3, after: 0 },
  { file: "src/lib/api/contractor.scope.service.ts", before: 4, after: 0 },
  { file: "src/lib/api/director_reports.transport.base.ts", before: 2, after: 0 },
];

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function writeArtifact(name: string, payload: unknown): void {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, name), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function countNavRouteHacks(source: string): number {
  const directLineMatches = source.match(/router\.(push|replace)\([^)\n]*as any/g) ?? [];
  const multilineObjectMatches =
    source.match(/router\.(push|replace)\([\s\S]{0,260}?as any\)/g) ?? [];
  return Math.max(directLineMatches.length, multilineObjectMatches.length);
}

function countAsNever(source: string): number {
  return (source.match(/\bas never\b/g) ?? []).length;
}

function relative(file: string): string {
  return file.replace(/\\/g, "/");
}

function main(): void {
  const appJson = JSON.parse(readProjectFile("app.json")) as {
    expo?: {
      experiments?: {
        typedRoutes?: boolean;
      };
    };
  };
  const typedRoutesEnabled = appJson.expo?.experiments?.typedRoutes === true;

  const navDelta = navTargets.map((target) => {
    const after = countNavRouteHacks(readProjectFile(target.file));
    return {
      ...target,
      after,
      delta: target.before - after,
    };
  });

  const queryDelta = queryTargets.map((target) => {
    const after = countAsNever(readProjectFile(target.file));
    return {
      ...target,
      after,
      delta: target.before - after,
    };
  });

  const totalBeforeNav = navDelta.reduce((sum, entry) => sum + entry.before, 0);
  const totalAfterNav = navDelta.reduce((sum, entry) => sum + entry.after, 0);
  const totalBeforeQuery = queryDelta.reduce((sum, entry) => sum + entry.before, 0);
  const totalAfterQuery = queryDelta.reduce((sum, entry) => sum + entry.after, 0);

  const coreRoutesSource = readProjectFile("src/lib/navigation/coreRoutes.ts");
  const queryBoundarySource = readProjectFile("src/lib/api/queryBoundary.ts");

  const navBoundaryChecks = {
    typedRoutesEnabled,
    coreRoutesOwnerExists: coreRoutesSource.includes("REPORTS_MODULE_ROUTES"),
    targetFilesImportBoundary: navTargets.every((target) =>
      readProjectFile(target.file).includes("coreRoutes"),
    ),
    routeHackCountAfter: totalAfterNav,
  };

  const queryBoundaryChecks = {
    containmentOwner: "src/lib/api/queryBoundary.ts",
    targetFilesUseBoundary: queryTargets.every((target) =>
      readProjectFile(target.file).includes("runContainedRpc"),
    ),
    allowedSuppressionZone: queryBoundarySource.includes("Allowed suppression zone"),
    remainingAsNeverOnTargets: totalAfterQuery,
    allowedCasts: [
      "client.rpc as unknown as UnsafeRpcInvoker",
      "(result.data ?? null) as TData | null",
    ],
  };

  const status =
    typedRoutesEnabled &&
    totalAfterNav === 0 &&
    totalAfterQuery === 0 &&
    navBoundaryChecks.targetFilesImportBoundary &&
    queryBoundaryChecks.targetFilesUseBoundary
      ? "GREEN"
      : "NOT_GREEN";

  writeArtifact("typed-routes-summary.json", {
    status,
    typedRoutesEnabled,
    navBoundaryOwner: "src/lib/navigation/coreRoutes.ts",
    navTargets: navDelta.map((target) => ({
      file: relative(target.file),
      beforeRouteHacks: target.before,
      afterRouteHacks: target.after,
      delta: target.delta,
    })),
    summary: {
      beforeRouteHacks: totalBeforeNav,
      afterRouteHacks: totalAfterNav,
      removedRouteHacks: totalBeforeNav - totalAfterNav,
    },
    checks: navBoundaryChecks,
  });

  writeArtifact("query-wrapper-containment.json", {
    status,
    containmentOwner: queryBoundaryChecks.containmentOwner,
    queryTargets: queryDelta.map((target) => ({
      file: relative(target.file),
      beforeAsNever: target.before,
      afterAsNever: target.after,
      delta: target.delta,
    })),
    summary: {
      beforeAsNever: totalBeforeQuery,
      afterAsNever: totalAfterQuery,
      removedAsNever: totalBeforeQuery - totalAfterQuery,
    },
    checks: queryBoundaryChecks,
  });

  writeArtifact("type-suppression-delta.json", {
    status,
    nav: {
      totalBefore: totalBeforeNav,
      totalAfter: totalAfterNav,
      targets: navDelta.map((target) => ({
        file: relative(target.file),
        before: target.before,
        after: target.after,
      })),
    },
    query: {
      totalBefore: totalBeforeQuery,
      totalAfter: totalAfterQuery,
      targets: queryDelta.map((target) => ({
        file: relative(target.file),
        before: target.before,
        after: target.after,
      })),
    },
    allowedSuppressionZones: [
      {
        file: "src/lib/api/queryBoundary.ts",
        reason: "Contain Supabase RPC typing gaps in one boundary instead of spreading `as never` on critical paths.",
        casts: queryBoundaryChecks.allowedCasts,
      },
      {
        file: "src/features/reports/ReportsDashboardScreen.tsx",
        reason: "Legacy FileSystem compat cast remains outside route/query correctness scope.",
        casts: ["FileSystem as any"],
      },
      {
        file: "app/(tabs)/profile.tsx",
        reason: "Non-route profile metadata and native payload casts remain outside TЗ-9 scope.",
        casts: ["user.user_metadata as any", "encoding: \"base64\" as any", "finalKind = \"mixed\" as any"],
      },
    ],
  });

  console.log(
    JSON.stringify(
      {
        status,
        typedRoutesEnabled,
        beforeRouteHacks: totalBeforeNav,
        afterRouteHacks: totalAfterNav,
        beforeAsNever: totalBeforeQuery,
        afterAsNever: totalAfterQuery,
      },
      null,
      2,
    ),
  );

  if (status !== "GREEN") {
    process.exitCode = 1;
  }
}

main();
