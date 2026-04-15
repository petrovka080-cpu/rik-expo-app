import fs from "fs";
import path from "path";
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Alert } from "react-native";

import { reportDirectorTopTabsScrollFailure } from "./director.observability";
import { fmtDateOnly } from "./director.helpers";
import { loadDirectorDashMetrics } from "./director.metrics";
import DirectorProposalAttachments from "./DirectorProposalAttachments";

const mockReportAndSwallow = jest.fn();

jest.mock("../../lib/observability/catchDiscipline", () => ({
  reportAndSwallow: (params: unknown) => mockReportAndSwallow(params),
}));

describe("director observability hardening", () => {
  beforeEach(() => {
    mockReportAndSwallow.mockReset();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("reports locale formatting fallback in fmtDateOnly and keeps the fallback return value", () => {
    jest.spyOn(Date.prototype, "toLocaleDateString").mockImplementation(() => {
      throw new Error("intl failed");
    });

    expect(fmtDateOnly("2026-04-01")).toBe("\u2014");
    expect(mockReportAndSwallow).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "director",
        surface: "helpers",
        event: "fmt_date_only_locale_failed",
        scope: "director.helpers.fmtDateOnly",
      }),
    );
  });

  it("reports dashboard metric fallbacks without changing the default metric shape", async () => {
    const makeRejectingBuilder = (error: Error) => {
      const builder = {
        select: jest.fn(() => builder),
        not: jest.fn(() => builder),
        limit: jest.fn(() => Promise.reject(error)),
      };
      return builder;
    };

    const supabase = {
      from: jest.fn((table: string) => makeRejectingBuilder(new Error(`${table} failed`))),
    };

    await expect(
      loadDirectorDashMetrics(supabase as never, {
        foreman_requests: 2,
        foreman_positions: 4,
        buyer_proposals: 6,
        buyer_positions: 8,
      }),
    ).resolves.toEqual({
      foreman_requests: 2,
      foreman_positions: 4,
      buyer_proposals: 6,
      buyer_positions: 8,
      pay_to_pay: 0,
      pay_partial: 0,
      pay_paid: 0,
      pay_rework: 0,
      wh_to_receive: 0,
      wh_partial: 0,
      wh_pending: 0,
    });

    expect(mockReportAndSwallow).toHaveBeenCalledWith(
      expect.objectContaining({
        surface: "metrics",
        event: "finance_counts_load_failed",
        scope: "director.metrics.financeCounts",
      }),
    );
    expect(mockReportAndSwallow).toHaveBeenCalledWith(
      expect.objectContaining({
        surface: "metrics",
        event: "warehouse_counts_load_failed",
        scope: "director.metrics.warehouseCounts",
      }),
    );
  });

  it("reports attachment open failures and keeps the alert fallback behavior", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <DirectorProposalAttachments
          files={[
            {
              id: "att-1",
              file_name: "test.pdf",
              url: "https://example.com/test.pdf",
              created_at: "2026-04-01T10:00:00.000Z",
              group_key: "proposal",
              bucket_id: null,
              storage_path: null,
            } as never,
          ]}
          busyAtt={false}
          onRefresh={() => {}}
          onOpenAttachment={() => {
            throw new Error("open failed");
          }}
        />,
      );
    });

    const openPressable = renderer.root
      .findAll((node) => typeof node.props?.onPress === "function")
      .slice(-1)[0];
    await act(async () => {
      openPressable.props.onPress();
    });

    expect(mockReportAndSwallow).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "director",
        surface: "proposal_attachments",
        event: "attachment_open_failed",
        scope: "director.attachments.openAttachment",
      }),
    );
    expect(Alert.alert).toHaveBeenCalledWith(expect.any(String), "open failed");
  });

  it("routes dashboard top-tab scroll failures through the director boundary", () => {
    const error = new Error("scroll failed");

    reportDirectorTopTabsScrollFailure(error);

    expect(mockReportAndSwallow).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "director",
        surface: "dashboard_top_tabs",
        event: "director_top_tabs_scroll_failed",
        scope: "director.dashboard.topTabs.scrollToOffset",
        category: "ui",
        sourceKind: "ui:top_tabs",
        errorStage: "scroll_to_offset",
      }),
    );
  });

  it("removes bare catches from the targeted director residual files", () => {
    const files = [
      "src/screens/director/director.metrics.ts",
      "src/screens/director/director.helpers.ts",
      "src/screens/director/director.data.ts",
      "src/screens/director/DirectorProposalAttachments.tsx",
      "src/screens/director/hooks/useDirectorReportsModalState.ts",
    ];

    for (const relativePath of files) {
      const source = fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
      expect(source).not.toContain("catch {}");
    }
  });
});
