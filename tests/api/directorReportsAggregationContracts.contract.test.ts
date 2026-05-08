import { readFileSync } from "node:fs";
import path from "node:path";

import {
  DIRECTOR_REPORTS_SERVER_AGGREGATION_CONTRACT,
  buildDirectorReportsAggregationErrorEnvelope,
  buildDirectorReportsAggregationRequest,
  toDirectorReportsAggregationRpcParams,
} from "../../src/lib/api/director_reports.aggregation.contracts";

const repoRoot = path.resolve(__dirname, "..", "..");
const read = (...parts: string[]) => readFileSync(path.join(repoRoot, ...parts), "utf8");

describe("S-FETCHALL director reports server-side aggregation contracts", () => {
  it("defines the permanent typed aggregation contract surface", () => {
    expect(DIRECTOR_REPORTS_SERVER_AGGREGATION_CONTRACT).toEqual(
      expect.objectContaining({
        contractId: "director_report_transport_scope_v1",
        version: "v1",
        rpcName: "director_report_transport_scope_v1",
        documentType: "director_report_transport_scope",
        responseEnvelope: "DirectorReportsAggregationEnvelope",
        listOutput: "full_aggregate_rows_not_preview",
        noSilentTruncation: true,
        fullReportTotalsServerSide: true,
      }),
    );
    expect(DIRECTOR_REPORTS_SERVER_AGGREGATION_CONTRACT.filters).toEqual([
      "period.from",
      "period.to",
      "objectName",
      "companyId",
      "userId",
    ]);
    expect(DIRECTOR_REPORTS_SERVER_AGGREGATION_CONTRACT.scopes).toEqual([
      "period",
      "company",
      "user",
      "object",
    ]);
  });

  it("maps period, object, company, user, and include-cost flags deterministically", () => {
    const request = buildDirectorReportsAggregationRequest({
      from: " 2026-04-01 ",
      to: "2026-04-30",
      objectName: " Object A ",
      includeDiscipline: true,
      skipDisciplinePrices: false,
      companyId: " company-1 ",
      userId: " user-1 ",
    });

    expect(request).toEqual({
      contractId: "director_report_transport_scope_v1",
      version: "v1",
      filters: {
        period: {
          from: "2026-04-01",
          to: "2026-04-30",
        },
        objectName: "Object A",
        companyId: "company-1",
        userId: "user-1",
      },
      include: {
        options: true,
        materials: true,
        discipline: true,
        costs: true,
      },
    });
    expect(toDirectorReportsAggregationRpcParams(request)).toEqual({
      p_from: "2026-04-01",
      p_to: "2026-04-30",
      p_object_name: "Object A",
      p_include_discipline: true,
      p_include_costs: true,
    });
  });

  it("keeps optional RPC filters omitted instead of sending null", () => {
    const request = buildDirectorReportsAggregationRequest({
      from: "",
      to: "",
      objectName: null,
      includeDiscipline: false,
      skipDisciplinePrices: false,
    });

    expect(toDirectorReportsAggregationRpcParams(request)).toEqual({
      p_from: undefined,
      p_to: undefined,
      p_object_name: undefined,
      p_include_discipline: false,
      p_include_costs: false,
    });
  });

  it("returns generic error envelopes without raw payload or secret-shaped content", () => {
    const envelope = buildDirectorReportsAggregationErrorEnvelope(
      "DIRECTOR_REPORTS_AGGREGATION_INVALID_PAYLOAD",
      "person@example.test token=secretvalue raw row should not leak",
    );

    const serialized = JSON.stringify(envelope);
    expect(envelope).toEqual({
      ok: false,
      error: {
        code: "DIRECTOR_REPORTS_AGGREGATION_INVALID_PAYLOAD",
        message: "Director reports aggregation failed.",
      },
    });
    expect(serialized).not.toContain("person@example.test");
    expect(serialized).not.toContain("secretvalue");
    expect(serialized).not.toContain("raw row");
  });

  it("routes legacy service exports through the aggregation transport contract", () => {
    const optionsService = read("src", "lib", "api", "director_reports.service.options.ts");
    const reportService = read("src", "lib", "api", "director_reports.service.report.ts");
    const disciplineService = read("src", "lib", "api", "director_reports.service.discipline.ts");

    for (const source of [optionsService, reportService, disciplineService]) {
      expect(source).toContain("loadDirectorReportTransportScope");
      expect(source).not.toContain("fetchAllFactRowsFromTables");
      expect(source).not.toContain("fetchAllFactRowsFromView");
      expect(source).not.toContain("fetchFactRowsForDiscipline");
      expect(source).not.toContain("fetchDirectorFactViaAccRpc");
    }
  });

  it("removes executable full-scan fallback reads from director reports transports", () => {
    const factsTransport = read("src", "lib", "api", "director_reports.transport.facts.ts");
    const disciplineTransport = read("src", "lib", "api", "director_reports.transport.discipline.ts");
    const productionTransport = read("src", "lib", "api", "director_reports.transport.production.ts");

    for (const source of [factsTransport, disciplineTransport, productionTransport]) {
      expect(source).not.toContain("while (true)");
      expect(source).not.toContain(".range(");
      expect(source).not.toContain(".limit(50000)");
      expect(source).not.toContain(".from(\"warehouse_issues\"");
      expect(source).not.toContain(".from(\"warehouse_issue_items\"");
      expect(source).not.toContain(".from(\"v_director_issued_fact_rows\"");
      expect(source).not.toContain(".from(\"purchase_items\"");
      expect(source).not.toContain(".from(\"proposal_items\"");
    }
    expect(disciplineTransport).toContain("createDirectorReportsAggregationContractRequiredError");
    expect(factsTransport).toContain("createDirectorReportsAggregationContractRequiredError");
  });

  it("keeps active transport scope on typed RPC params and validation envelope", () => {
    const transportService = read("src", "lib", "api", "directorReportsTransport.service.ts");
    const transport = read("src", "lib", "api", "directorReportsTransport.transport.ts");

    expect(transportService).toContain("buildDirectorReportsAggregationRequest");
    expect(transportService).toContain("DIRECTOR_REPORTS_SERVER_AGGREGATION_CONTRACT.documentType");
    expect(transportService).toContain("DIRECTOR_REPORTS_SERVER_AGGREGATION_CONTRACT.sourceKind");
    expect(transport).toContain("toDirectorReportsAggregationRpcParams");
    expect(transport).toContain("DIRECTOR_REPORTS_SERVER_AGGREGATION_CONTRACT.rpcName");
  });
});
