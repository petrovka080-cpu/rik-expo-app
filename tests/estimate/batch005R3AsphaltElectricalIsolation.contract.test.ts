import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import {
  auditCrossDomainContentIsolationR3,
  auditQueueIsolationR3,
  resolveExactReferenceCandidateR3,
} from "../../scripts/estimate/batch005R3IsolationCore";

describe("BATCH005 R3 Asphalt/Electrical strict isolation", () => {
  it("rejects filename/path matches and selects only the exact final-chain candidate", () => {
    const exact = { candidateId: "exact", artifactPath: "arbitrary/a.md", head: "h", tree: "t", transferContractSha256: "s", admissionGreen: true, verifiedByFinalChain: true };
    const stale = { candidateId: "same-name-stale", artifactPath: "ASPHALT_PROFESSIONAL_DEPTH_TRANSFER_CONTRACT.md", head: "old", tree: "old", transferContractSha256: "old", admissionGreen: true, verifiedByFinalChain: false };
    const resolved = resolveExactReferenceCandidateR3([stale, exact], { head: "h", tree: "t", transferContractSha256: "s" });
    expect(resolved.selected.candidateId).toBe("exact");
    expect(resolved.stale.map((item) => item.candidateId)).toEqual(["same-name-stale"]);
  });

  it("detects exact identity contamination without banning common logistics words", () => {
    const clean = auditCrossDomainContentIsolationR3([{
      catalogId: "electrical:cable",
      rowId: "electrical:cable:delivery",
      semanticKey: "electrical:cable:delivery",
      owner: "electrical-owner",
      formulaId: "electrical-delivery-formula",
      resourceGraphIds: ["electrical:delivery"],
      parameterIds: ["distance_km"],
      priceRouteIds: ["electrical:supplier"],
      rateCodes: ["KRERM-08"],
      stageName: "Доставка",
    }], {
      catalogIds: new Set(["asphalt:road"]), rowIds: new Set(["asphalt:delivery"]), semanticKeys: new Set(),
      owners: new Set(), formulaIds: new Set(), resourceGraphIds: new Set(), parameterIds: new Set(),
      priceRouteIds: new Set(), rateCodes: new Set(), stageNames: new Set(["Укладка асфальта"]),
    });
    expect(clean.contamination).toBe(0);
  });

  it("blocks repeated Asphalt subtraction and external entrypoint insertion", () => {
    const result = auditQueueIsolationR3({
      batchRemovedIds: ["electrical:1"],
      electricalIds: new Set(["electrical:1"]),
      admittedAsphaltGlobalIds: new Set(["asphalt:1"]),
      externalAsphaltIds: new Set(["asphalt:external"]),
      globalPartitionIds: new Set(["electrical:1", "asphalt:1"]),
    });
    expect(result.green).toBe(true);
  });

  it("keeps the global core free of Asphalt/Electrical production imports", () => {
    const source = readFileSync(path.resolve("src/lib/estimate/v4/professionalDepth/professionalDepthReferenceContractV2.ts"), "utf8");
    expect(source.match(/^\s*(?:import|export\s+\*)\s.+from\s+["'][^"']+["']/gmu) ?? []).toHaveLength(0);
    expect(source).not.toMatch(/domains\/(?:asphalt|electrical)/iu);
  });

  it("keeps both runtime production graphs free of direct, re-export and transitive cross-domain imports", () => {
    const transitiveRuntimeFiles = (entry: string): string[] => {
      const pending = [entry];
      const visited = new Set<string>();
      while (pending.length > 0) {
        const relative = pending.shift()!.replace(/\\/gu, "/");
        if (visited.has(relative)) continue;
        visited.add(relative);
        const absolute = path.resolve(relative);
        const source = readFileSync(absolute, "utf8");
        const specifiers = [...source.matchAll(/((?:import|export)\s+(?:type\s+)?(?:[^"']*?\s+from\s+)?["']([^"']+)["'])/gu)]
          .filter((match) => !/^(?:import|export)\s+type\b/u.test(match[1]))
          .map((match) => match[2])
          .filter((specifier) => specifier.startsWith("."));
        for (const specifier of specifiers) {
          const base = path.resolve(path.dirname(absolute), specifier);
          const resolved = [base, `${base}.ts`, path.join(base, "index.ts")].find((candidate) =>
            existsSync(candidate) && statSync(candidate).isFile()
          );
          if (!resolved) throw new Error(`R3_TEST_IMPORT_UNRESOLVED:${relative}:${specifier}`);
          pending.push(path.relative(process.cwd(), resolved).replace(/\\/gu, "/"));
        }
      }
      return [...visited];
    };
    const electrical = [
      "src/lib/estimate/v4/domains/electricalComplete/productionBinding.ts",
      "src/lib/estimate/v4/domains/electricalComplete/domainPackage.ts",
      "src/lib/estimate/v4/domains/electricalComplete/maximumResourceScopeV2.ts",
    ].flatMap(transitiveRuntimeFiles);
    const asphalt = transitiveRuntimeFiles("src/lib/estimate/v4/asphalt/index.ts");
    expect(electrical.filter((file) => /(?:^|\/)asphalt(?:\/|\.)/iu.test(file))).toEqual([]);
    expect(asphalt.filter((file) => /domains\/electricalComplete/iu.test(file))).toEqual([]);
  });
});
