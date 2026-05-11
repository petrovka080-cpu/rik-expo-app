import { readFileSync } from "fs";
import { join } from "path";
import {
  classifyAssistantActionRequest,
} from "../../src/features/ai/assistantActions";

describe("assistant actions approval gate", () => {
  it("classifies dangerous chat actions as approval-required or forbidden", () => {
    expect(classifyAssistantActionRequest({
      role: "foreman",
      context: "foreman",
      message: "submit draft",
    })).toMatchObject({
      actionType: "submit_request",
      requiresApproval: true,
      forbidden: false,
    });
    expect(classifyAssistantActionRequest({
      role: "buyer",
      context: "buyer",
      message: "confirm supplier",
    })).toMatchObject({
      actionType: "confirm_supplier",
      requiresApproval: true,
    });
    expect(classifyAssistantActionRequest({
      role: "director",
      context: "director",
      message: "direct_supabase_query users",
    })).toMatchObject({
      actionType: "direct_supabase_query",
      forbidden: true,
    });
  });

  it("keeps draft and safe read actions out of direct final submission", () => {
    expect(classifyAssistantActionRequest({
      role: "foreman",
      context: "foreman",
      message: "cement 10 kg",
    })).toMatchObject({
      actionType: "draft_request",
      requiresApproval: false,
    });
    expect(classifyAssistantActionRequest({
      role: "buyer",
      context: "buyer",
      message: "find cement supplier",
    })).toMatchObject({
      actionType: "search_catalog",
      requiresApproval: false,
    });
  });

  it("does not retain direct submit-via-chat final action code", () => {
    const source = readFileSync(join(process.cwd(), "src/features/ai/assistantActions.ts"), "utf8");
    expect(source).toContain("assertNoDirectAiMutation");
    expect(source).toContain("submitAiActionForApproval");
    expect(source).not.toContain("submitRequestToDirector");
  });
});
