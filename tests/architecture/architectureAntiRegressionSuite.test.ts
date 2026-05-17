import {
  buildDirectSupabaseExceptionRegistry,
  classifyDirectSupabaseTransportOwner,
  evaluateCacheColdMissProofGuardrail,
  evaluateCacheRateScopeGuardrail,
  evaluateDirectSupabaseGuardrail,
  evaluateDirectSupabaseExceptionGuardrail,
  evaluateAiAppKnowledgeRegistryGuardrail,
  evaluateAiCommandCenterTaskStreamRuntimeGuardrail,
  evaluateAiCommandCenterStateBudgetGuardrail,
  evaluateAiCrossScreenRuntimeMatrixGuardrail,
  evaluateAiExternalIntelGatewayGuardrail,
  evaluateAiApprovalInboxRuntimeGuardrail,
  evaluateAiApprovedProcurementExecutorGuardrail,
  evaluateAiPersistentActionLedgerGuardrail,
  evaluateAiProcurementCopilotRuntimeChainGuardrail,
  evaluateAiAppActionGraphArchitectureGuardrail,
  evaluateAiKnowledgePreviewE2eContractGuardrail,
  evaluateAiResponseSmokeNonBlockingContractGuardrail,
  evaluateAiModelBoundaryGuardrail,
  evaluateAndroidEmulatorIosBuildSubmitGateGuardrail,
  evaluateAiRoleRiskApprovalControlPlaneGuardrail,
  evaluateAiRoleScreenEmulatorGateGuardrail,
  evaluateSubmitForApprovalAuditTrailGuardrail,
  evaluateAiPolicyGateScaleProofGuardrail,
  evaluatePostInstallReleaseSignoffGateGuardrail,
  evaluateProductionRawLoopGuardrail,
  evaluateProductionReadonlyCanaryGuardrail,
  evaluateRateLimitMarketplace5PctCanaryProofGuardrail,
  evaluateRateLimitMarketplaceCanaryProofGuardrail,
  evaluateUnboundedSelectRatchetGuardrail,
  evaluateUnsafeCastRatchetGuardrail,
  formatDirectSupabaseServiceBypassFailure,
  scanComponentDebtSource,
  scanDirectSupabaseSource,
  scanProductionRawLoopSource,
  scanProductionRawLoops,
  scanUnboundedSelectRatchetSource,
  scanUnsafeCastSource,
  type UnboundedSelectAllowlistEntry,
  type UnsafeCastPattern,
} from "../../scripts/architecture_anti_regression_suite";

describe("architecture anti-regression suite", () => {
  it("blocks direct Supabase service bypasses with readable owner failures", () => {
    const findings = scanDirectSupabaseSource({
      filePath: "src/screens/example/example.service.ts",
      source: [
        'await supabase.from("requests").select("*");',
        'await supabase.rpc("request_update_v1", payload);',
      ].join("\n"),
    });

    expect(findings).toEqual([
      expect.objectContaining({
        file: "src/screens/example/example.service.ts",
        line: 1,
        operation: "read",
        callTarget: "table:requests",
        matchedCall: "supabase.from (table:requests)",
        classification: "service_bypass",
        transportOwner: "none",
      }),
      expect.objectContaining({
        file: "src/screens/example/example.service.ts",
        line: 2,
        operation: "rpc",
        callTarget: "rpc:request_update_v1",
        matchedCall: "supabase.rpc (rpc:request_update_v1)",
        classification: "service_bypass",
        transportOwner: "none",
      }),
    ]);

    const guardrail = evaluateDirectSupabaseGuardrail(findings);
    expect(guardrail.summary.serviceBypassBudget).toBe(0);
    expect(guardrail.check).toEqual(
      expect.objectContaining({
        name: "direct_supabase_service_bypass_budget",
        status: "fail",
      }),
    );
    expect(guardrail.check.errors).toEqual(
      expect.arrayContaining([
        "direct_supabase_service_bypass:file=src/screens/example/example.service.ts:line=1:matched_call=supabase.from (table:requests):expected_transport_owner=src/lib/supabaseClient.ts root client or transport-owned file (*.transport.*, *.bff.*, /server/)",
        "direct_supabase_service_bypass:file=src/screens/example/example.service.ts:line=2:matched_call=supabase.rpc (rpc:request_update_v1):expected_transport_owner=src/lib/supabaseClient.ts root client or transport-owned file (*.transport.*, *.bff.*, /server/)",
        "service_bypass_budget_exceeded:2>0",
      ]),
    );
    expect(formatDirectSupabaseServiceBypassFailure(findings[0])).toContain("expected_transport_owner=");
    expect(evaluateDirectSupabaseGuardrail(findings, 2).check.status).toBe("fail");
  });

  it("keeps new transport-owned Supabase calls out of service bypass", () => {
    const findings = scanDirectSupabaseSource({
      filePath: "src/lib/catalog/catalog.transport.supabase.ts",
      source: [
        'return await supabase.rpc("rik_quick_search", args);',
        "await supabase.realtime.setAuth(accessToken);",
        "return supabase.auth.onAuthStateChange(callback);",
      ].join("\n"),
    });
    const summary = evaluateDirectSupabaseGuardrail(findings, 0).summary;

    expect(findings).toEqual([
      expect.objectContaining({
        classification: "transport_controlled",
        operation: "rpc",
        callTarget: "rpc:rik_quick_search",
        transportOwner: "transport_file",
        expectedTransportOwner: "transport-owned file (*.transport.*)",
      }),
      expect.objectContaining({
        classification: "transport_controlled",
        operation: "realtime",
        callTarget: "realtime:setAuth",
        transportOwner: "transport_file",
      }),
      expect.objectContaining({
        classification: "transport_controlled",
        operation: "auth",
        callTarget: "auth:onAuthStateChange",
        transportOwner: "transport_file",
      }),
    ]);
    expect(summary.serviceBypassFindings).toBe(0);
    expect(summary.transportControlledFindings).toBe(3);
  });

  it("classifies the Supabase root client as root client owner, not bypass", () => {
    const findings = scanDirectSupabaseSource({
      filePath: "src/lib/supabaseClient.ts",
      source: "return Promise.resolve(supabase.auth.getSession());",
    });
    const summary = evaluateDirectSupabaseGuardrail(findings).summary;

    expect(classifyDirectSupabaseTransportOwner("src/lib/supabaseClient.ts")).toBe("root_client");
    expect(findings).toEqual([
      expect.objectContaining({
        classification: "transport_controlled",
        operation: "auth",
        callTarget: "auth:getSession",
        transportOwner: "root_client",
        expectedTransportOwner: "root client initializer src/lib/supabaseClient.ts",
      }),
    ]);
    expect(summary.serviceBypassFindings).toBe(0);
    expect(summary.transportControlledFindings).toBe(1);
  });

  it("contains known direct Supabase exceptions and fails new unclassified calls", () => {
    const findings = scanDirectSupabaseSource({
      filePath: "src/screens/example/example.service.ts",
      source: [
        "await supabase.auth.getSession();",
        'await supabase.from("requests").select("*");',
      ].join("\n"),
    });
    const registry = buildDirectSupabaseExceptionRegistry({
      findings,
      generatedAtLocal: "2026-05-08T00:00:00.000Z",
    });

    expect(registry.summary).toEqual(
      expect.objectContaining({
        totalExceptions: 2,
        allowedExceptions: 2,
      }),
    );
    expect(registry.exceptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          operation: "auth",
          callTarget: "auth:getSession",
          category: "must_stay_direct_for_now",
          allowed: true,
        }),
        expect.objectContaining({
          operation: "read",
          callTarget: "table:requests",
          category: "can_be_migrated_later",
          allowed: true,
        }),
      ]),
    );
    expect(evaluateDirectSupabaseExceptionGuardrail({ findings, registry }).check.status).toBe("pass");

    const newFindings = [
      ...findings,
      ...scanDirectSupabaseSource({
        filePath: "src/screens/example/example.service.ts",
        source: 'await supabase.rpc("new_unclassified_rpc");',
      }),
    ];

    expect(evaluateDirectSupabaseExceptionGuardrail({ findings: newFindings, registry }).check).toEqual(
      expect.objectContaining({
        name: "direct_supabase_exception_registry",
        status: "fail",
      }),
    );
  });

  it("proves the production readonly canary whitelist, blacklist, and redaction contract", () => {
    const result = evaluateProductionReadonlyCanaryGuardrail();

    expect(result.check).toEqual({
      name: "production_readonly_canary_contract",
      status: "pass",
      errors: [],
    });
    expect(result.summary.whitelistRouteCount).toBeGreaterThan(0);
    expect(result.summary.forbiddenMutationOperationCount).toBeGreaterThan(0);
    expect(result.summary.redactionForbiddenKeysEnforced).toBe(true);
  });

  it("ratchets the AI model provider boundary", () => {
    const passing = evaluateAiModelBoundaryGuardrail({
      projectRoot: process.cwd(),
      sourceFiles: [
        "src/features/ai/assistantClient.ts",
        "src/features/ai/model/AiModelGateway.ts",
        "src/features/ai/model/AiModelTypes.ts",
        "src/features/ai/model/DisabledModelProvider.ts",
        "src/features/ai/model/LegacyGeminiModelProvider.ts",
        "src/lib/ai_reports.ts",
      ],
      readFile: (relativePath) => {
        if (relativePath === "src/features/ai/assistantClient.ts") return "AiModelGateway";
        if (relativePath === "src/lib/ai_reports.ts") {
          return "redactAiReportForStorage redactAiReportStorageText(input.content) rawprompt";
        }
        return "present";
      },
    });
    expect(passing.check).toEqual({
      name: "ai_model_provider_boundary",
      status: "pass",
      errors: [],
    });

    const failing = evaluateAiModelBoundaryGuardrail({
      projectRoot: process.cwd(),
      sourceFiles: [
        "src/features/ai/assistantClient.ts",
        "src/features/ai/model/AiModelGateway.ts",
        "src/features/ai/model/AiModelTypes.ts",
        "src/features/ai/model/DisabledModelProvider.ts",
        "src/features/ai/model/LegacyGeminiModelProvider.ts",
        "src/lib/ai_reports.ts",
        "src/screens/example/BadAiScreen.tsx",
      ],
      readFile: (relativePath) => {
        if (relativePath === "src/screens/example/BadAiScreen.tsx") {
          return [
            'import { invokeGeminiGateway } from "../../lib/ai/geminiGateway";',
            'import { DisabledModelProvider } from "../../features/ai/model";',
            'fetch("https://api.openai.com/v1/chat/completions");',
          ].join("\n");
        }
        if (relativePath === "src/features/ai/assistantClient.ts") return "requestAiGeneratedText";
        if (relativePath === "src/lib/ai_reports.ts") return "missing";
        return "present";
      },
    });

    expect(failing.check.status).toBe("fail");
    expect(failing.check.errors).toEqual(
      expect.arrayContaining([
        "assistant_client_not_using_ai_model_gateway",
        "ai_reports_redaction_contract_missing",
        "direct_gemini_import:file=src/screens/example/BadAiScreen.tsx",
        "ui_provider_implementation_import:file=src/screens/example/BadAiScreen.tsx",
        "openai_live_call:file=src/screens/example/BadAiScreen.tsx",
      ]),
    );
  });

  it("ratchets the AI role, risk, and approval control plane", () => {
    const passing = evaluateAiRoleRiskApprovalControlPlaneGuardrail({
      projectRoot: process.cwd(),
      sourceFiles: [
        "src/features/ai/policy/aiRolePolicy.ts",
        "src/features/ai/policy/aiRiskPolicy.ts",
        "src/features/ai/policy/aiScreenCapabilityRegistry.ts",
        "src/features/ai/approval/aiApprovalGate.ts",
        "src/features/ai/policy/aiProfessionalResponsePolicy.ts",
        "src/features/ai/assistantActions.ts",
        "src/features/ai/assistantPrompts.ts",
        "src/features/ai/assistantScopeContext.ts",
        "src/features/ai/context/aiContextRedaction.ts",
        "src/features/ai/audit/aiActionAuditTypes.ts",
      ],
      readFile: (relativePath) => {
        if (relativePath === "src/features/ai/policy/aiRolePolicy.ts") {
          return "director: AI_DOMAINS\ncontrol: AI_DOMAINS\nexecute_approved_action\nforeman: [\nbuyer: [\naccountant: [\ncontractor: [\nunknown: []";
        }
        if (relativePath === "src/features/ai/policy/aiRiskPolicy.ts") {
          return "direct_supabase_query raw_db_export delete_data bypass_approval AI action is forbidden";
        }
        if (relativePath === "src/features/ai/approval/aiApprovalGate.ts") {
          return 'action.status !== "approved"\nmissing idempotency key\nmissing audit event\nDirect AI mutation blocked';
        }
        if (relativePath === "src/features/ai/policy/aiProfessionalResponsePolicy.ts") {
          return "buildAiProfessionalResponsePolicyPrompt";
        }
        if (relativePath === "src/features/ai/assistantActions.ts") {
          return "assertNoDirectAiMutation\nsubmitAiActionForApproval";
        }
        if (relativePath === "src/features/ai/assistantPrompts.ts") {
          return "buildAiProfessionalResponsePolicyPrompt";
        }
        if (relativePath === "src/features/ai/assistantScopeContext.ts") {
          return "redactAiContextSummaryText";
        }
        if (relativePath === "src/features/ai/context/aiContextRedaction.ts") {
          return "redactAiContextForModel";
        }
        if (relativePath === "src/features/ai/audit/aiActionAuditTypes.ts") {
          return "ai.policy.checked ai.action.approval_required ai.prompt.policy_applied";
        }
        return "present";
      },
    });
    expect(passing.check).toEqual({
      name: "ai_role_risk_approval_control_plane",
      status: "pass",
      errors: [],
    });

    const failing = evaluateAiRoleRiskApprovalControlPlaneGuardrail({
      projectRoot: process.cwd(),
      sourceFiles: [
        "src/features/ai/assistantActions.ts",
        "src/features/ai/assistantPrompts.ts",
        "src/screens/example/BadAiScreen.tsx",
      ],
      readFile: (relativePath) => {
        if (relativePath === "src/features/ai/assistantActions.ts") return "submitRequestToDirector";
        if (relativePath === "src/features/ai/assistantPrompts.ts") return "ignore approval";
        if (relativePath === "src/screens/example/BadAiScreen.tsx") return "import { AiModelGateway } from '../../features/ai/model';";
        return "";
      },
    });

    expect(failing.check.status).toBe("fail");
    expect(failing.check.errors).toEqual(
      expect.arrayContaining([
        "assistant_actions_not_using_ai_approval_gate",
        "assistant_actions_direct_submit_not_blocked",
        "ai_prompt_forbidden_ignore_approval",
        "screen_ai_model_gateway_import:file=src/screens/example/BadAiScreen.tsx",
      ]),
    );
  });

  it("ratchets the AI app knowledge registry", () => {
    const passing = evaluateAiAppKnowledgeRegistryGuardrail({
      projectRoot: process.cwd(),
      sourceFiles: [
        "src/features/ai/knowledge/aiKnowledgeTypes.ts",
        "src/features/ai/knowledge/aiDomainKnowledgeRegistry.ts",
        "src/features/ai/knowledge/aiEntityRegistry.ts",
        "src/features/ai/knowledge/aiScreenKnowledgeRegistry.ts",
        "src/features/ai/knowledge/aiDocumentSourceRegistry.ts",
        "src/features/ai/knowledge/aiIntentRegistry.ts",
        "src/features/ai/knowledge/aiKnowledgeResolver.ts",
        "src/features/ai/knowledge/aiKnowledgeRedaction.ts",
        "src/features/ai/controlPlane/aiControlPlaneKnowledgeBridge.ts",
        "src/features/ai/assistantScopeContext.ts",
        "src/features/ai/assistantPrompts.ts",
      ],
      readFile: (relativePath) => {
        if (relativePath === "src/features/ai/knowledge/aiDomainKnowledgeRegistry.ts") {
          return [
            '"control"', '"projects"', '"procurement"', '"marketplace"', '"warehouse"', '"finance"',
            '"reports"', '"documents"', '"subcontracts"', '"contractors"', '"map"', '"chat"', '"office"',
          ].join("\n");
        }
        if (relativePath === "src/features/ai/knowledge/aiScreenKnowledgeRegistry.ts") {
          return [
            '"director.dashboard"', '"director.reports_modal"', '"buyer.main"', '"buyer.subcontracts"',
            '"market.home"', '"accountant.main"', '"foreman.main"', '"foreman.ai.quick_modal"',
            '"foreman.subcontract"', '"contractor.main"', '"office.hub"', '"map.main"',
            '"chat.main"', '"reports.modal"', '"warehouse.main"', "own_records_only",
          ].join("\n");
        }
        if (relativePath === "src/features/ai/knowledge/aiDocumentSourceRegistry.ts") {
          return [
            '"director_reports"', '"foreman_daily_reports"', '"ai_reports"', '"acts"',
            '"subcontract_documents"', '"request_documents"', '"warehouse_documents"',
            '"finance_documents"', '"chat_attachments"', '"pdf_exports"',
          ].join("\n");
        }
        if (relativePath === "src/features/ai/knowledge/aiIntentRegistry.ts") {
          return [
            '"find"', '"summarize"', '"compare"', '"explain"', '"draft"', '"prepare_report"',
            '"prepare_act"', '"prepare_request"', '"check_status"', '"find_risk"',
            '"submit_for_approval"', '"approve"', '"execute_approved"',
            'intent: "execute_approved"',
            'executionBoundary: "aiApprovalGate"',
          ].join("\n");
        }
        if (relativePath === "src/features/ai/knowledge/aiEntityRegistry.ts") {
          return "accounting_posting FINANCE_ROLES own_records_only";
        }
        if (relativePath === "src/features/ai/knowledge/aiKnowledgeResolver.ts") {
          return 'hasDirectorFullAiAccess AI_ENTITY_KNOWLEDGE_REGISTRY Unknown AI role is denied by default params.role === "unknown" AI APP KNOWLEDGE BLOCK';
        }
        if (relativePath === "src/features/ai/knowledge/aiKnowledgeRedaction.ts") {
          return "raw_finance_context_for_non_finance_role";
        }
        if (relativePath === "src/features/ai/assistantScopeContext.ts") {
          return "buildAiKnowledgePromptBlock ai_knowledge_registry";
        }
        if (relativePath === "src/features/ai/assistantPrompts.ts") {
          return "buildAiKnowledgePromptBlock";
        }
        return "present";
      },
    });

    expect(passing.check).toEqual({
      name: "ai_app_knowledge_registry",
      status: "pass",
      errors: [],
    });
  });

  it("ratchets the Command Center task-stream runtime boundary", () => {
    const passing = evaluateAiCommandCenterTaskStreamRuntimeGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath === "src/features/ai/agent/agentBffRouteShell.ts") {
          return 'GET /agent/task-stream\nfrom "./agentTaskStreamRoutes"\nagent.task_stream.read';
        }
        if (relativePath.includes("commandCenter")) {
          return [
            "GET /agent/task-stream",
            "runtimeStatus",
            "taskStreamLoaded",
            "submit_for_approval",
            "Final mutation was not executed",
            "mutationCount: 0",
          ].join("\n");
        }
        if (relativePath.includes("taskStream") || relativePath.includes("TaskStream")) {
          return [
            "canUseAiCapability",
            "loadAiTaskStreamRuntime",
            "getAllowedAiDomainsForRole",
            "roleScoped: true",
            "screenId",
            "ai.command.center",
            "sourceScreenId",
            "hasAiTaskStreamEvidence",
            "evidenceRequired: true",
            "evidenceBacked: true",
            "mutationCount: 0",
            "mutation_count: 0",
            "directMutationAllowed: false",
            "fakeCards: false",
            "hardcodedAiResponse: false",
            "Unknown AI role is denied by default",
          ].join("\n");
        }
        return "";
      },
    });

    expect(passing.check).toEqual({
      name: "ai_command_center_task_stream_runtime",
      status: "pass",
      errors: [],
    });

    const failing = evaluateAiCommandCenterTaskStreamRuntimeGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath.includes("commandCenter")) {
          return 'import { supabase } from "@supabase/supabase-js";\nconst rawPrompt = "leak";';
        }
        if (relativePath.includes("taskStream") || relativePath.includes("TaskStream")) {
          return "fake task card\nmutationCount: 1";
        }
        return "";
      },
    });

    expect(failing.check.status).toBe("fail");
    expect(failing.check.errors).toEqual(
      expect.arrayContaining([
        "command_center_task_stream_route_not_exposed",
        "command_center_not_using_runtime_task_stream",
        "task_stream_runtime_evidence_requirement_missing",
        "command_center_fake_cards_detected",
        "command_center_ui_supabase_import_detected",
      ]),
    );
  });

  it("ratchets the Command Center state and realtime budget", () => {
    const passingMatrix = JSON.stringify({
      max_cards_lte_20: true,
      pagination_required: true,
      refresh_throttle_required: true,
      refresh_timeout_required: true,
      cancellation_required: true,
      duplicate_in_flight_blocked: true,
      realtime_enabled_by_default: false,
      per_card_realtime_subscription_allowed: false,
      polling_loop_allowed: false,
      polling_loop_ceiling: 0,
      task_stream_uses_budgeted_limit: true,
      card_budget_enforced_in_view_model: true,
      empty_state_real: true,
      mutation_count: 0,
    });
    const passing = evaluateAiCommandCenterStateBudgetGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath.endsWith("aiCommandCenterRuntimeBudget.ts")) {
          return "AI_COMMAND_CENTER_MAX_CARDS = 20\npaginationRequired: true\nmutationCount: 0";
        }
        if (relativePath.endsWith("aiCommandCenterRefreshPolicy.ts")) {
          return [
            "minRefreshIntervalMs: 30_000",
            "requestTimeoutMs: 8_000",
            "cancellationRequired: true",
            "duplicateInFlightAllowed: false",
          ].join("\n");
        }
        if (relativePath.endsWith("aiCommandCenterRealtimePolicy.ts")) {
          return "realtimeEnabledByDefault: false\nperCardRealtimeSubscriptionAllowed: false";
        }
        if (relativePath === "scripts/ai/scanCommandCenterStateBudget.ts") {
          return "scanCommandCenterStateBudget\nGREEN_AI_COMMAND_CENTER_STATE_BUDGET_READY";
        }
        if (relativePath === "scripts/e2e/runAiCommandCenterStateBudgetMaestro.ts") {
          return "runAiCommandCenterStateBudgetMaestro\nBLOCKED_COMMAND_CENTER_EMULATOR_TARGETABILITY";
        }
        if (relativePath.endsWith("_matrix.json")) {
          return passingMatrix;
        }
        if (relativePath.includes("S_AI_HARDEN_05_COMMAND_CENTER_STATE_BUDGET")) {
          return "{}";
        }
        if (relativePath.includes("commandCenter")) {
          return [
            "normalizeAiCommandCenterPage",
            "getAgentTaskStream",
            "enforceAiCommandCenterCardBudget",
            "ai.command.center.empty-state",
            "state.viewModel.empty",
            "mutationCount: 0",
          ].join("\n");
        }
        return "";
      },
    });

    expect(passing.check).toEqual({
      name: "ai_command_center_state_budget",
      status: "pass",
      errors: [],
    });

    const failingMatrix = JSON.stringify({
      max_cards_lte_20: false,
      pagination_required: false,
      refresh_throttle_required: false,
      refresh_timeout_required: false,
      cancellation_required: false,
      duplicate_in_flight_blocked: false,
      realtime_enabled_by_default: true,
      per_card_realtime_subscription_allowed: true,
      task_stream_uses_budgeted_limit: false,
      card_budget_enforced_in_view_model: false,
      empty_state_real: false,
      mutation_count: 1,
    });
    const failing = evaluateAiCommandCenterStateBudgetGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath.endsWith("aiCommandCenterRuntimeBudget.ts")) {
          return "AI_COMMAND_CENTER_MAX_CARDS = 50\npaginationRequired: false\nmutationCount: 1";
        }
        if (relativePath.endsWith("aiCommandCenterRefreshPolicy.ts")) {
          return "minRefreshIntervalMs: 0\nrequestTimeoutMs: 60_000\ncancellationRequired: false\nduplicateInFlightAllowed: true";
        }
        if (relativePath.endsWith("aiCommandCenterRealtimePolicy.ts")) {
          return "realtimeEnabledByDefault: true\nperCardRealtimeSubscriptionAllowed: true";
        }
        if (relativePath === "scripts/ai/scanCommandCenterStateBudget.ts") {
          return "scanCommandCenterStateBudget";
        }
        if (relativePath === "scripts/e2e/runAiCommandCenterStateBudgetMaestro.ts") {
          return "runAiCommandCenterStateBudgetMaestro";
        }
        if (relativePath.endsWith("_matrix.json")) {
          return failingMatrix;
        }
        if (relativePath.includes("S_AI_HARDEN_05_COMMAND_CENTER_STATE_BUDGET")) {
          return "{}";
        }
        if (relativePath.includes("commandCenter")) {
          return "limit: 50\n.subscribe(\nsetInterval(\nmutationCount: 1";
        }
        return "";
      },
    });

    expect(failing.check.status).toBe("fail");
    expect(failing.check.errors).toEqual(
      expect.arrayContaining([
        "command_center_max_cards_not_bounded_to_20",
        "command_center_realtime_subscription_detected",
        "command_center_polling_loop_detected",
        "command_center_task_stream_limit_not_budgeted",
        "command_center_mutation_surface_detected",
      ]),
    );
  });

  it("ratchets deterministic AI knowledge preview e2e assertions", () => {
    const flow = [
      'id: "ai.knowledge.preview"',
      'id: "ai.knowledge.role"',
      'id: "ai.knowledge.screen"',
      'id: "ai.knowledge.domain"',
      'id: "ai.knowledge.allowed-intents"',
      'id: "ai.knowledge.blocked-intents"',
      'id: "ai.knowledge.approval-boundary"',
      'id: "ai.assistant.send"',
      "waitForAnimationToEnd",
    ].join("\n");
    const passing = evaluateAiKnowledgePreviewE2eContractGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath === "src/features/ai/AIAssistantScreen.tsx") {
          return [
            '"ai.knowledge.preview"',
            'testID="ai.knowledge.role"',
            'testID="ai.knowledge.screen"',
            'testID="ai.knowledge.domain"',
            'testID="ai.knowledge.allowed-intents"',
            'testID="ai.knowledge.blocked-intents"',
            'testID="ai.knowledge.approval-boundary"',
            "numberOfLines={1}",
            "numberOfLines={2}",
            "sendAssistantMessage({",
          ].join("\n");
        }
        if (relativePath === "src/features/ai/AIAssistantScreen.styles.ts") {
          return 'maxHeight: 260\noverflow: "hidden"';
        }
        if (relativePath === "src/features/ai/assistantScopeContext.ts") {
          return "knowledgePreview resolveAiScreenKnowledge";
        }
        if (relativePath === "scripts/e2e/runAiRoleScreenKnowledgeMaestro.ts") {
          return "resolveExplicitAiRoleAuthEnv redactE2eSecrets";
        }
        if (relativePath.endsWith(".yaml")) return flow;
        return "";
      },
    });

    expect(passing.check).toEqual({
      name: "ai_knowledge_preview_e2e_contract",
      status: "pass",
      errors: [],
    });

    const failing = evaluateAiKnowledgePreviewE2eContractGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath === "src/features/ai/AIAssistantScreen.tsx") {
          return "AI APP KNOWLEDGE BLOCK\n{scopedFacts.summary}\nfake AI answer";
        }
        if (relativePath === "scripts/e2e/runAiRoleScreenKnowledgeMaestro.ts") {
          return "listUsers auth.admin signInWithPassword";
        }
        if (relativePath.endsWith(".yaml")) {
          return 'visible: "AI APP KNOWLEDGE BLOCK"\nscrollUntilVisible:\nvisible: "exact LLM text"';
        }
        return "";
      },
    });

    expect(failing.check.status).toBe("fail");
    expect(failing.check.errors).toEqual(
      expect.arrayContaining([
        "ai_knowledge_preview_missing",
        "ai_knowledge_raw_prompt_block_rendered_in_ui",
        "maestro_flows_assert_system_prompt_block",
        "maestro_llm_smoke_asserts_exact_text",
        "fake_or_hardcoded_ai_answer_source_detected",
        "ai_role_runner_auth_discovery_detected",
      ]),
    );
  });

  it("ratchets AI response smoke as non-blocking loading-or-response canary", () => {
    const releaseFlow = [
      'id: "ai.knowledge.preview"',
      'id: "ai.knowledge.approval-boundary"',
      'id: "ai.assistant.input"',
      'id: "ai.assistant.send"',
      "waitForAnimationToEnd",
    ].join("\n");
    const passing = evaluateAiResponseSmokeNonBlockingContractGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath === "src/features/ai/AIAssistantScreen.tsx") {
          return [
            "loading ? (",
            'testID="ai.assistant.loading"',
            'accessibilityLabel="AI assistant loading"',
            "styles.loadingBubble",
            "<ActivityIndicator",
            "sendAssistantMessage({",
          ].join("\n");
        }
        if (relativePath === "scripts/e2e/runAiRoleScreenKnowledgeMaestro.ts") {
          return [
            "GREEN_AI_ROLE_SCREEN_DETERMINISTIC_RELEASE_GATE",
            "release_gate_status",
            "prompt_pipeline_status",
            "prompt_pipeline_observations",
            "observePromptPipeline",
            'resource-id="ai.assistant.loading"',
            'resource-id="ai.assistant.response"',
            "AI prompt pipeline proof missing",
            "response_smoke_status",
            "createResponseSmokeFlowFiles",
            "responseSmokeReportFile",
            "BLOCKED_AI_RESPONSE_SMOKE_TIMEOUT_CANARY",
            "response_smoke_blocking_release: false",
            'responseSmokeStatus = "BLOCKED_AI_RESPONSE_SMOKE_TIMEOUT_CANARY"',
            'artifact.final_status !== "GREEN_AI_ROLE_SCREEN_DETERMINISTIC_RELEASE_GATE"',
            "resolveExplicitAiRoleAuthEnv redactE2eSecrets",
          ].join("\n");
        }
        if (relativePath.endsWith(".yaml")) return releaseFlow;
        return "";
      },
    });

    expect(passing.check).toEqual({
      name: "ai_response_smoke_non_blocking_contract",
      status: "pass",
      errors: [],
    });

    const failing = evaluateAiResponseSmokeNonBlockingContractGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath === "src/features/ai/AIAssistantScreen.tsx") return "fake AI answer";
        if (relativePath === "scripts/e2e/runAiRoleScreenKnowledgeMaestro.ts") {
          return "listUsers auth.admin signInWithPassword";
        }
        if (relativePath.endsWith(".yaml")) {
          return 'scrollUntilVisible:\nid: "ai.assistant.response"\nvisible: "exact LLM text"';
        }
        return "";
      },
    });

    expect(failing.check.status).toBe("fail");
    expect(failing.check.errors).toEqual(
      expect.arrayContaining([
        "ai_assistant_loading_testid_missing",
        "release_flows_require_ai_response_as_blocking_gate",
        "runner_does_not_separate_release_gate_and_response_smoke",
        "response_timeout_canary_not_non_blocking",
        "exact_llm_text_assertion_detected",
        "fake_or_hardcoded_ai_answer_source_detected",
        "ai_role_runner_auth_discovery_detected",
      ]),
    );
  });

  it("ratchets the AI role-screen emulator gate", () => {
    const greenArtifact = {
      final_status: "GREEN_AI_ROLE_SCREEN_DETERMINISTIC_RELEASE_GATE",
      role_auth_source: "explicit_env",
      all_role_credentials_resolved: true,
      service_role_discovery_used_for_green: false,
      auth_admin_list_users_used_for_green: false,
      db_seed_used: false,
      auth_users_created: 0,
      auth_users_updated: 0,
      auth_users_deleted: 0,
      auth_users_invited: 0,
      credentials_in_cli_args: false,
      credentials_printed: false,
      stdout_redacted: true,
      stderr_redacted: true,
      fake_pass_claimed: false,
      release_gate_status: "PASS",
      prompt_pipeline_status: "PASS",
      response_smoke_status: "BLOCKED_AI_RESPONSE_SMOKE_TIMEOUT_CANARY",
      response_smoke_blocking_release: false,
      response_smoke_exact_llm_text_assertion: false,
      flows: {
        director: "PASS",
        foreman: "PASS",
        buyer: "PASS",
        accountant: "PASS",
        contractor: "PASS",
      },
      mutations_created: 0,
      approval_required_observed: true,
      role_leakage_observed: false,
      exactReason: null,
    };
    const passing = evaluateAiRoleScreenEmulatorGateGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath === "scripts/e2e/ensureAndroidEmulatorReady.ts") {
          return "ensureAndroidEmulatorReady -list-avds sys.boot_completed fakePassClaimed: false";
        }
        if (relativePath === "scripts/e2e/runAiRoleScreenKnowledgeMaestro.ts") {
          return "runAiRoleScreenKnowledgeMaestro ensureAndroidEmulatorReady resolveExplicitAiRoleAuthEnv redactE2eSecrets mutations_created: 0 approval_required_observed";
        }
        if (relativePath === "scripts/e2e/resolveExplicitAiRoleAuthEnv.ts") {
          return "resolveExplicitAiRoleAuthEnv BLOCKED_NO_E2E_ROLE_SECRETS E2E_DIRECTOR_EMAIL";
        }
        if (relativePath === "scripts/e2e/redactE2eSecrets.ts") {
          return "redactE2eSecrets Authorization SUPABASE_SERVICE_ROLE_KEY EXPO_PUBLIC_SUPABASE_ANON_KEY";
        }
        if (relativePath.endsWith(".yaml")) return "role flow";
        if (relativePath.endsWith("_emulator.json")) return JSON.stringify(greenArtifact);
        return "";
      },
    });

    expect(passing.check).toEqual({
      name: "ai_role_screen_emulator_gate",
      status: "pass",
      errors: [],
    });

    const failing = evaluateAiRoleScreenEmulatorGateGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath === "scripts/e2e/ensureAndroidEmulatorReady.ts") {
          return "ensureAndroidEmulatorReady";
        }
        if (relativePath === "scripts/e2e/runAiRoleScreenKnowledgeMaestro.ts") {
          return "runAiRoleScreenKnowledgeMaestro";
        }
        if (relativePath === "scripts/e2e/resolveExplicitAiRoleAuthEnv.ts") {
          return "resolveExplicitAiRoleAuthEnv listUsers";
        }
        if (relativePath === "scripts/e2e/redactE2eSecrets.ts") {
          return "";
        }
        if (relativePath.endsWith(".yaml")) return "role flow";
        if (relativePath.endsWith("_emulator.json")) {
          return JSON.stringify({
            final_status: "GREEN_AI_EXPLICIT_ROLE_SECRETS_E2E_CLOSEOUT",
            role_auth_source: "service_role",
            service_role_discovery_used_for_green: true,
            auth_admin_list_users_used_for_green: true,
            db_seed_used: true,
            auth_users_created: 1,
            auth_users_updated: 0,
            auth_users_deleted: 0,
            auth_users_invited: 0,
            credentials_in_cli_args: true,
            credentials_printed: true,
            stdout_redacted: false,
            stderr_redacted: false,
            fake_pass_claimed: true,
            flows: { director: "PASS" },
            mutations_created: 1,
            approval_required_observed: false,
            role_leakage_observed: true,
          });
        }
        return "";
      },
    });

    expect(failing.check.status).toBe("fail");
    expect(failing.check.errors).toEqual(
      expect.arrayContaining([
        "emulator_artifact_fake_pass_not_false",
        "emulator_artifact_role_flow_missing",
        "emulator_artifact_status_not_accepted",
        "fake_emulator_pass_claimed",
        "emulator_mutation_count_nonzero",
        "emulator_role_leakage_observed",
        "e2e_artifact_auth_discovery_or_seed_used",
        "green_artifact_role_auth_source_not_explicit_env",
        "e2e_credentials_cli_args_not_blocked",
        "e2e_credentials_printing_not_false",
        "e2e_stdout_stderr_redaction_not_proven",
        "e2e_credentials_printing_claimed",
      ]),
    );
  });

  it("fails if cache or rate-limit canary scope broadens", () => {
    const passing = evaluateCacheRateScopeGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath === "scripts/rate_limit_real_user_canary.ts") {
          return 'const CANARY_ROUTE = "marketplace.catalog.search" as const;\nconst CANARY_PERCENT = "1";\n';
        }
        if (relativePath === "scripts/cache_one_route_read_through_canary.ts") {
          return 'const CACHE_ENV_WRITE_VALUES = buildCacheReadThroughOneRouteApplyEnv("canary");';
        }
        if (relativePath === "scripts/server/stagingBffServerBoundary.ts") {
          return [
            "buildCacheReadThroughReadinessDiagnostics(config)",
            "CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.readThroughV1Enabled",
          ].join("\n");
        }
        if (relativePath === "src/shared/scale/providerRuntimeConfig.ts") {
          return "CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.readThroughV1Enabled";
        }
        return [
              'const DEFAULT_CACHE_SHADOW_ROUTE: CachePolicyRoute = "marketplace.catalog.search";',
              "CACHE_SHADOW_RUNTIME_ENV_NAMES",
              'export const CACHE_READ_THROUGH_APPLY_PATHS = ["canary", "persistent"] as const;',
              "export const buildCacheReadThroughOneRouteApplyEnv = () => ({})",
              "CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.readThroughV1Enabled",
              "const routeAllowed = () => config.routeAllowlist.includes(route);",
              "parseRouteAllowlist(env.SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST);",
              "SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST",
              '"SCALE_REDIS_CACHE_READ_THROUGH_V1_ENABLED"',
              "CACHE_READ_THROUGH_V1_ALLOWED_ROUTES",
              "isCacheReadThroughV1RouteAllowed",
            ].join("\n");
      },
    });

    expect(passing.check.status).toBe("pass");

    const failing = evaluateCacheRateScopeGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) =>
        relativePath === "scripts/rate_limit_real_user_canary.ts"
          ? 'const CANARY_ROUTE = "proposal.submit" as const;\nconst CANARY_PERCENT = "25";\n'
          : "const routeAllowed = () => true;",
    });

    expect(failing.check.status).toBe("fail");
    expect(failing.check.errors).toEqual(
      expect.arrayContaining([
        "cache_canary_not_route_scoped",
        "cache_persistent_readiness_contract_drifted",
        "cache_read_through_v1_literal_key_duplicated_outside_contract",
        "rate_limit_canary_route_changed:proposal.submit",
        "rate_limit_canary_percent_changed:25",
      ]),
    );
  });

  it("ratchets S_RATE_01 marketplace 1 percent canary proof artifacts", () => {
    const passingMatrix = {
      final_status: "GREEN_RATE_LIMIT_1_PERCENT_MARKETPLACE_CANARY_PASS",
      env_snapshot_captured: true,
      env_snapshot_redacted: Object.fromEntries(
        [
          "SCALE_RATE_ENFORCEMENT_MODE",
          "SCALE_RATE_LIMIT_REAL_USER_CANARY_ROUTE_ALLOWLIST",
          "SCALE_RATE_LIMIT_REAL_USER_CANARY_PERCENT",
          "SCALE_RATE_LIMIT_PRODUCTION_ENABLED",
          "SCALE_RATE_LIMIT_STORE_URL",
          "SCALE_RATE_LIMIT_NAMESPACE",
          "BFF_RATE_LIMIT_METADATA_ENABLED",
        ].map((key) => [key, { present: true, valueClass: "present_redacted" }]),
      ),
      route: "marketplace.catalog.search",
      canary_route_class: "marketplace.catalog.search",
      route_allowlist_count: 1,
      route_scoped_enforcement: true,
      global_real_user_enforcement: false,
      canary_percent: 1,
      broad_mutation_route_enforcement: false,
      second_route_enabled: false,
      selected_subject_proof: "selected_redacted",
      selected_canary_request_status_class: "2xx",
      selected_error_category: "none",
      non_selected_subject_proof: "non_selected_redacted",
      non_selected_allow_request_status_class: "2xx",
      non_selected_error_category: "none",
      private_in_service_smoke_green: true,
      synthetic_private_smoke_status_class: "2xx",
      synthetic_private_smoke_error_category: "none",
      synthetic_throttle_still_works: true,
      health_ready_stable: true,
      production_health_before: 200,
      production_ready_before: 200,
      production_health_after_deploy: 200,
      production_ready_after_deploy: 200,
      production_health_after_canary: 200,
      production_ready_after_canary: 200,
      redaction_enabled: true,
      raw_keys_printed: false,
      jwt_printed: false,
      ip_user_company_printed: false,
      secrets_printed: false,
      urls_printed: false,
      raw_payloads_printed: false,
      raw_db_rows_printed: false,
      business_rows_printed: false,
      db_writes: false,
      migrations_applied: false,
      cache_changes: false,
      canary_retained: true,
      rollback_triggered: false,
      rollback_succeeded: false,
    };
    const passingProof = [
      "final_status: GREEN_RATE_LIMIT_1_PERCENT_MARKETPLACE_CANARY_PASS",
      "- route: marketplace.catalog.search",
      "- canary_percent: 1",
      "- selected_subject_proof: selected_redacted",
      "- non_selected_subject_proof: non_selected_redacted",
      "- private_smoke_green: true",
    ].join("\n");
    const passing = evaluateRateLimitMarketplaceCanaryProofGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) =>
        relativePath.endsWith("_matrix.json") ? JSON.stringify(passingMatrix) : passingProof,
    });

    expect(passing.check).toEqual({
      name: "rate_limit_marketplace_1_percent_canary_proof",
      status: "pass",
      errors: [],
    });
    expect(passing.summary.routeScoped).toBe(true);
    expect(passing.summary.selectedSubjectProof).toBe(true);
    expect(passing.summary.nonSelectedSubjectProof).toBe(true);
    expect(passing.summary.privateSmokeProof).toBe(true);

    const failing = evaluateRateLimitMarketplaceCanaryProofGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) =>
        relativePath.endsWith("_matrix.json")
          ? JSON.stringify({
              ...passingMatrix,
              route_allowlist_count: 2,
              canary_percent: 5,
              selected_subject_proof: "raw_subject_leaked",
              private_in_service_smoke_green: false,
              secrets_printed: true,
            })
          : "stale proof",
    });

    expect(failing.check.status).toBe("fail");
    expect(failing.check.errors).toEqual(
      expect.arrayContaining([
        "rate_limit_marketplace_canary_proof_missing_or_stale",
        "rate_limit_marketplace_canary_scope_not_locked",
        "rate_limit_marketplace_selected_subject_not_proven",
        "rate_limit_marketplace_private_smoke_not_green",
        "rate_limit_marketplace_redaction_or_safety_not_proven",
      ]),
    );
  });

  it("ratchets Wave 27B and 28 marketplace 5 percent proof artifacts", () => {
    const passingMatrix = {
      final_status: "GREEN_RATE_LIMIT_5PCT_MARKETPLACE_RAMP_STABLE",
      route: "marketplace.catalog.search",
      percent: 5,
      route_allowlist_count: 1,
      retained: true,
      negative_confirmations: {
        all_routes: false,
        ten_percent: false,
        cache_changes: false,
        db_writes: false,
        production_mutations: false,
        raw_subject_user_token_values_printed: false,
      },
      health_ready: {
        before: { health: 200, ready: 200 },
        after_deploy: { health: 200, ready: 200 },
        after: { health: 200, ready: 200 },
      },
      verification: {
        selected_subject_proof: "selected_redacted",
        non_selected_subject_proof: "non_selected_redacted",
        selected_status_class: "2xx",
        non_selected_status_class: "2xx",
        private_smoke_2xx: true,
        wouldAllow: true,
        wouldThrottle: true,
        false_positive_count: 0,
        health_after: 200,
        ready_after: 200,
        metrics_redacted: true,
      },
    };
    const passingMonitor = {
      final_status: "GREEN_RATE_LIMIT_5PCT_MONITOR_WINDOW_STABLE",
      route: "marketplace.catalog.search",
      route_count: 1,
      percent: 5,
      health_after: 200,
      ready_after: 200,
      metrics_redacted: true,
      non_selected_blocked: false,
      private_smoke_2xx: true,
      negative_confirmations: {
        cache_changes: false,
        db_writes: false,
        production_mutations: false,
        raw_subject_user_token_values_printed: false,
      },
    };
    const passingMetrics = {
      sample_size: 10,
      allowed_count: 10,
      throttled_count: 0,
      selected_subject_count: 5,
      non_selected_subject_count: 5,
      selected_blocked_count: 0,
      non_selected_blocked_count: 0,
      false_positive_count: 0,
      private_smoke_status_class: "2xx",
      wouldAllow: true,
      wouldThrottle: true,
    };
    const passingProof = [
      "final_status: GREEN_RATE_LIMIT_5PCT_MARKETPLACE_RAMP_STABLE",
      "- route: marketplace.catalog.search",
      "- percent: 5",
      "- false_positive_count: 0",
    ].join("\n");
    const passing = evaluateRateLimitMarketplace5PctCanaryProofGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath.endsWith("RAMP_RETRY_matrix.json")) return JSON.stringify(passingMatrix);
        if (relativePath.endsWith("MONITOR_WINDOW_matrix.json")) return JSON.stringify(passingMonitor);
        if (relativePath.endsWith("MONITOR_WINDOW_metrics.json")) return JSON.stringify(passingMetrics);
        return passingProof;
      },
    });

    expect(passing.check).toEqual({
      name: "rate_limit_marketplace_5pct_canary_proof",
      status: "pass",
      errors: [],
    });
    expect(passing.summary.routeScoped).toBe(true);
    expect(passing.summary.falsePositiveCountZero).toBe(true);
    expect(passing.summary.monitorStable).toBe(true);

    const failing = evaluateRateLimitMarketplace5PctCanaryProofGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath.endsWith("RAMP_RETRY_matrix.json")) {
          return JSON.stringify({
            ...passingMatrix,
            percent: 10,
            route_allowlist_count: 2,
            retained: false,
            negative_confirmations: {
              ...passingMatrix.negative_confirmations,
              ten_percent: true,
              raw_subject_user_token_values_printed: true,
            },
            verification: {
              ...passingMatrix.verification,
              selected_subject_proof: "raw_subject_leaked",
              false_positive_count: 1,
              private_smoke_2xx: false,
            },
          });
        }
        if (relativePath.endsWith("MONITOR_WINDOW_matrix.json")) {
          return JSON.stringify({
            ...passingMonitor,
            non_selected_blocked: true,
            negative_confirmations: {
              ...passingMonitor.negative_confirmations,
              cache_changes: true,
            },
          });
        }
        if (relativePath.endsWith("MONITOR_WINDOW_metrics.json")) {
          return JSON.stringify({
            ...passingMetrics,
            false_positive_count: 1,
            non_selected_blocked_count: 1,
          });
        }
        return "stale proof";
      },
    });

    expect(failing.check.status).toBe("fail");
    expect(failing.check.errors).toEqual(
      expect.arrayContaining([
        "rate_limit_marketplace_5pct_proof_missing_or_stale",
        "rate_limit_marketplace_5pct_scope_not_locked",
        "rate_limit_marketplace_5pct_selected_subject_not_proven",
        "rate_limit_marketplace_5pct_false_positive_nonzero",
        "rate_limit_marketplace_5pct_redaction_or_safety_not_proven",
        "rate_limit_marketplace_5pct_monitor_not_stable",
      ]),
    );
  });

  it("ratchets the Android emulator and iOS build submit gate", () => {
    const matrix = {
      android: {
        aab_used_for_direct_install: false,
        google_play_submit: false,
      },
      ios: {
        simulator_build_used_for_submit: false,
      },
      ota: {
        used: false,
        production_ota_used: false,
      },
      ai_role_screen_e2e: {
        auth_admin_used: false,
        service_role_used: false,
        list_users_used: false,
      },
      secrets: {
        credentials_in_cli_args: false,
        credentials_printed: false,
        artifacts_redacted: true,
      },
    };
    const android = {
      build_profile: "preview",
      aab_used_for_direct_install: false,
      google_play_submit: false,
    };
    const ios = {
      submit_profile: "production",
      simulator_build_used_for_submit: false,
    };
    const passing = evaluateAndroidEmulatorIosBuildSubmitGateGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath === "eas.json") {
          return JSON.stringify({
            build: {
              preview: { android: { buildType: "apk" }, channel: "preview" },
              production: { distribution: "store", ios: { simulator: false } },
            },
            submit: { production: { ios: {} } },
          });
        }
        if (relativePath === "scripts/release/runAndroidEmulatorAndIosSubmitGate.ts") {
          return [
            "runAndroidEmulatorAndIosSubmitGate",
            "ensureAndroidEmulatorReady",
            "preview",
            "production",
            "E2E_ALLOW_IOS_BUILD",
            "E2E_ALLOW_IOS_SUBMIT",
            "E2E_ALLOW_ANDROID_APK_BUILD",
            "buildIosSubmitArgs",
            "resolveExplicitAiRoleAuthEnv",
          ].join("\n");
        }
        if (relativePath === "scripts/release/redactReleaseOutput.ts") {
          return "redactReleaseOutput EXPO_TOKEN EXPO_APPLE_APP_SPECIFIC_PASSWORD SUPABASE_SERVICE_ROLE_KEY";
        }
        if (relativePath === "maestro/flows/foundation/launch-and-login-screen.yaml") {
          return "appId: com.azisbek_dzhantaev.rikexpoapp\nlaunchApp";
        }
        if (relativePath.endsWith("_matrix.json")) return JSON.stringify(matrix);
        if (relativePath.endsWith("_android.json")) return JSON.stringify(android);
        if (relativePath.endsWith("_ios.json")) return JSON.stringify(ios);
        if (relativePath.endsWith("_inventory.json")) return "{}";
        return "";
      },
    });

    expect(passing.check).toEqual({
      name: "android_emulator_ios_build_submit_gate",
      status: "pass",
      errors: [],
    });

    const failing = evaluateAndroidEmulatorIosBuildSubmitGateGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath.endsWith("_matrix.json")) {
          return JSON.stringify({
            ...matrix,
            ota: { used: true, production_ota_used: true },
            secrets: { credentials_in_cli_args: true, credentials_printed: true, artifacts_redacted: false },
          });
        }
        if (relativePath.endsWith("_android.json")) {
          return JSON.stringify({ ...android, aab_used_for_direct_install: true, google_play_submit: true });
        }
        if (relativePath.endsWith("_ios.json")) {
          return JSON.stringify({ ...ios, simulator_build_used_for_submit: true });
        }
        if (relativePath === "scripts/release/runAndroidEmulatorAndIosSubmitGate.ts") {
          return '"submit", "--platform", "android"\neas update';
        }
        return "";
      },
    });

    expect(failing.check.status).toBe("fail");
    expect(failing.check.errors).toEqual(
      expect.arrayContaining([
        "android_emulator_apk_profile_missing",
        "ios_appstore_submit_profile_missing",
        "android_emulator_apk_contract_not_proven",
        "android_play_submit_not_blocked",
        "ios_simulator_submit_not_blocked",
        "production_ota_not_blocked",
        "release_credentials_cli_args_not_blocked",
      ]),
    );
  });

  it("ratchets the post-install release signoff gate", () => {
    const matrix = {
      android: {
        apk_installed_on_emulator: true,
        runtime_smoke: "PASS",
        google_play_submit: false,
      },
      ios: {
        submit_started: true,
        submit_status_captured: true,
      },
      ai_role_screen_e2e: {
        auth_admin_used: false,
        service_role_used: false,
        list_users_used: false,
      },
      ota: {
        used: false,
        production_ota_used: false,
      },
      secrets: {
        credentials_in_cli_args: false,
        credentials_printed: false,
        artifacts_redacted: true,
      },
    };
    const passing = evaluatePostInstallReleaseSignoffGateGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath === "scripts/release/verifyAndroidInstalledBuildRuntime.ts") {
          return 'verifyAndroidInstalledBuildRuntime ensureAndroidEmulatorReady "pm", "path" "monkey" fake_emulator_pass: false';
        }
        if (relativePath === "scripts/release/verifyIosBuildSubmitStatus.ts") {
          return 'verifyIosBuildSubmitStatus "eas", "build:view" simulator_build_used_for_submit post_build_commits_non_runtime_only fake_submit_pass: false';
        }
        if (relativePath.endsWith("_matrix.json")) return JSON.stringify(matrix);
        if (relativePath.endsWith("_android.json")) {
          return JSON.stringify({ apk_installed_on_emulator: true, runtime_smoke: "PASS", fake_emulator_pass: false });
        }
        if (relativePath.endsWith("_ios.json")) {
          return JSON.stringify({ submit_started: true, submit_status_captured: true, fake_submit_pass: false });
        }
        if (relativePath.endsWith("_ai_e2e.json")) {
          return JSON.stringify({ auth_admin_used: false, service_role_used: false, list_users_used: false });
        }
        if (relativePath.endsWith("_inventory.json")) return "{}";
        return "";
      },
    });

    expect(passing.check).toEqual({
      name: "post_install_release_signoff_gate",
      status: "pass",
      errors: [],
    });

    const failing = evaluatePostInstallReleaseSignoffGateGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath.endsWith("_matrix.json")) {
          return JSON.stringify({
            ...matrix,
            android: { apk_installed_on_emulator: false, runtime_smoke: "BLOCKED", google_play_submit: true },
            ios: { submit_started: false, submit_status_captured: false },
            ota: { used: true, production_ota_used: true },
            secrets: { credentials_in_cli_args: true, credentials_printed: true, artifacts_redacted: false },
          });
        }
        if (relativePath.endsWith("_android.json")) {
          return JSON.stringify({ apk_installed_on_emulator: false, runtime_smoke: "BLOCKED", fake_emulator_pass: true });
        }
        if (relativePath.endsWith("_ios.json")) {
          return JSON.stringify({ submit_started: false, submit_status_captured: false, fake_submit_pass: true });
        }
        return "";
      },
    });

    expect(failing.check.status).toBe("fail");
    expect(failing.check.errors).toEqual(
      expect.arrayContaining([
        "android_post_install_runtime_smoke_not_proven",
        "ios_submit_status_not_proven",
        "credentials_cli_args_not_blocked",
        "production_ota_not_blocked",
      ]),
    );
  });

  it("ratchets the AI app action graph and internal-first intelligence boundary", () => {
    const passing = evaluateAiAppActionGraphArchitectureGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath === "src/features/ai/agent/agentBffRouteShell.ts") {
          return [
            "GET /agent/app-graph/screen/:screenId",
            "GET /agent/app-graph/action/:buttonId",
            "POST /agent/app-graph/resolve",
            "POST /agent/intel/compare",
            "resolveAiActionGraph",
            "resolveInternalFirstDecision",
            "mutates: false",
            "executesTool: false",
            "mutationCount: 0",
          ].join("\n");
        }
        if (relativePath.includes("appGraph")) {
          return [
            "AI_BUTTON_ACTION_REGISTRY",
            "buttonId",
            "testId",
            "sourceEntities",
            'screenId: "director.dashboard"',
            'screenId: "ai.command.center"',
            'screenId: "buyer.main"',
            'screenId: "market.home"',
            'screenId: "accountant.main"',
            'screenId: "foreman.main"',
            'screenId: "foreman.subcontract"',
            'screenId: "warehouse.main"',
            'screenId: "contractor.main"',
            'screenId: "office.hub"',
            'screenId: "map.main"',
            'screenId: "chat.main"',
            'riskLevel: "safe_read"',
            'riskLevel: "draft_only"',
            'riskLevel: "approval_required"',
            'riskLevel: "forbidden"',
            "approvalRequired",
            "evidenceRequired",
            "directExecutionAllowed: false",
            "mutationCount: 0",
          ].join("\n");
        }
        if (relativePath.includes("domainGraph")) return "project request supplier rawRowsAllowed: false";
        if (relativePath.includes("internalFirstPolicy")) {
          return "InternalFirstDecision external_source_used_before_internal_search final_decision_from_external_only";
        }
        if (relativePath.includes("externalIntel")) {
          return [
            "ExternalSourcePolicy",
            "EXTERNAL_SOURCE_REGISTRY",
            "EXTERNAL_LIVE_FETCH_ENABLED = false",
            "externalLiveFetchEnabled: false",
            "requiresCitation: true",
            "citationsRequired: true",
            "forbiddenForFinalAction: true",
            "finalActionForbidden: true",
          ].join("\n");
        }
        if (relativePath === "scripts/ai/scanAppActionGraphCoverage.ts") {
          return [
            "Pressable",
            "TouchableOpacity",
            "ai_relevant_button_missing_registry_entry",
            "approval_required_action_executes_directly",
          ].join("\n");
        }
        if (relativePath.includes("commandCenter")) return "ai command center";
        return "present";
      },
    });

    expect(passing.check).toEqual({
      name: "ai_app_action_graph_architecture",
      status: "pass",
      errors: [],
    });

    const failing = evaluateAiAppActionGraphArchitectureGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath.includes("externalIntel")) return "fetch('https://example.com') forbiddenForFinalAction: false";
        if (relativePath.includes("appGraph")) return 'riskLevel: "approval_required"\nrequiredTool: "direct_execute"';
        if (relativePath.includes("commandCenter")) return 'import { supabase } from "@supabase/supabase-js";';
        return "";
      },
    });

    expect(failing.check.status).toBe("fail");
    expect(failing.check.errors).toEqual(
      expect.arrayContaining([
        "domain_entity_graph_files_missing",
        "internal_first_policy_missing",
        "external_live_fetch_enabled",
        "mobile_external_live_fetch_detected",
        "ui_supabase_import_for_ai_graph_detected",
      ]),
    );
  });

  it("ratchets the AI external intelligence gateway boundary", () => {
    const passing = evaluateAiExternalIntelGatewayGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath === "src/features/ai/agent/agentBffRouteShell.ts") {
          return [
            "GET /agent/external-intel/sources",
            "POST /agent/external-intel/search/preview",
            "POST /agent/procurement/external-supplier-candidates/preview",
            "AGENT_EXTERNAL_INTEL_BFF_CONTRACT",
            "liveEnabled: false",
            "finalActionAllowed: false",
            "supplierConfirmationAllowed: false",
            "orderCreationAllowed: false",
            "mutationCount: 0",
          ].join("\n");
        }
        if (relativePath.includes("externalIntel")) {
          return [
            "ExternalIntelGateway",
            "DisabledExternalIntelProvider",
            "new DisabledExternalIntelProvider()",
            'EXTERNAL_INTEL_PROVIDER_DEFAULT = "disabled"',
            "external_policy_not_enabled",
            "resolveExternalIntelProviderFlags",
            "AI_EXTERNAL_INTEL_LIVE_ENABLED",
            "AI_EXTERNAL_INTEL_PROVIDER",
            "approvedProviderConfigured",
            "resolveInternalFirstExternalGate",
            "internal_evidence_required",
            "marketplace_check_required_for_procurement",
            "EXTERNAL_SOURCE_REGISTRY",
            "supplier_public_catalog",
            "currency_or_macro_reference",
            "requiresCitation: true",
            "citationsRequired: true",
            "citationsForResults",
            "requiresCheckedAt: true",
            "checkedAtRequired: true",
            "checkedAt",
            "EXTERNAL_LIVE_FETCH_ENABLED = false",
            "forbiddenForFinalAction: true",
          ].join("\n");
        }
        if (relativePath.includes("procurement")) {
          return [
            "previewProcurementExternalSupplierCandidates",
            "finalActionAllowed: false",
            "requiresApprovalForAction: true",
          ].join("\n");
        }
        if (relativePath.includes("runAiProcurementExternalIntelMaestro")) {
          return "runAiProcurementExternalIntelMaestro mutations_created: 0";
        }
        if (relativePath.includes("commandCenter")) return "command center";
        return "";
      },
    });

    expect(passing.check).toEqual({
      name: "ai_external_intel_gateway",
      status: "pass",
      errors: [],
    });

    const failing = evaluateAiExternalIntelGatewayGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath.includes("externalIntel")) {
          return "fetch('https://example.com') requiresCitation: false checkedAtRequired: false finalActionAllowed: true";
        }
        if (relativePath.includes("commandCenter")) return "ExternalIntelGateway fetch('https://example.com')";
        if (relativePath.includes("procurement")) return "createOrder() finalActionAllowed: true";
        if (relativePath === "src/features/ai/agent/agentBffRouteShell.ts") return "orderCreationAllowed: true";
        return "";
      },
    });

    expect(failing.check.status).toBe("fail");
    expect(failing.check.errors).toEqual(
      expect.arrayContaining([
        "external_disabled_provider_default_missing",
        "external_internal_first_gate_missing",
        "mobile_external_fetch_detected",
        "ui_external_provider_import_detected",
        "external_mutation_surface_detected",
        "external_final_action_allowed",
      ]),
    );
  });

  it("ratchets the AI procurement copilot runtime chain", () => {
    const passing = evaluateAiProcurementCopilotRuntimeChainGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath === "src/features/ai/agent/agentBffRouteShell.ts") {
          return [
            "GET /agent/procurement/copilot/context",
            "POST /agent/procurement/copilot/plan",
            "POST /agent/procurement/copilot/draft-preview",
            "POST /agent/procurement/copilot/submit-for-approval-preview",
          ].join("\n");
        }
        if (relativePath.includes("externalIntel")) {
          return 'EXTERNAL_LIVE_FETCH_ENABLED = false\nEXTERNAL_INTEL_PROVIDER_DEFAULT = "disabled"';
        }
        if (relativePath.includes("procurementCopilot")) {
          return [
            "ProcurementCopilotPlan",
            "buildProcurementCopilotPlan",
            "runProcurementCopilotRuntimeChain",
            "resolveProcurementRequestContext",
            "previewProcurementSupplierMatch",
            "PROCUREMENT_COPILOT_SOURCE_ORDER",
            "internal_request_context",
            "internal_marketplace",
            "compare_suppliers",
            "external_intel_status",
            "draft_request_preview",
            "approval_boundary",
            "search_catalog",
            "recordStep?.(\"internal_marketplace\")",
            "recordStep?.(\"external_intel_status\")",
            "previewProcurementCopilotExternalIntel",
            "ExternalIntelGateway",
            "externalResultCanFinalize: false",
            "buildProcurementDraftPreview",
            "draft_request",
            "previewProcurementCopilotSubmitForApproval",
            "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_READY",
            "finalExecution: 0",
            "persisted: false",
            "assertProcurementCopilotSupplierEvidence",
            "card.evidenceRefs.length > 0",
            "supplier_card_",
            "mutationCount: 0",
            "orderCreationAllowed: false",
            "supplierConfirmationAllowed: false",
          ].join("\n");
        }
        if (relativePath.includes("runAiProcurementCopilotMaestro")) {
          return [
            "runAiProcurementCopilotMaestro",
            "ai.procurement.copilot.screen",
            "BLOCKED_PROCUREMENT_TEST_REQUEST_NOT_AVAILABLE",
            "mutations_created: 0",
          ].join("\n");
        }
        if (relativePath.includes("commandCenter")) return "command center";
        return "";
      },
    });

    expect(passing.check).toEqual({
      name: "ai_procurement_copilot_runtime_chain",
      status: "pass",
      errors: [],
    });

    const failing = evaluateAiProcurementCopilotRuntimeChainGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath.includes("procurementCopilot")) {
          return [
            "buildProcurementCopilotPlan",
            "external_intel_status",
            "internal_marketplace",
            'supplierCards: [{ supplierLabel: "Supplier Alpha" }]',
            "mutationCount: 1",
            "orderCreationAllowed: true",
          ].join("\n");
        }
        if (relativePath.includes("commandCenter")) return "fetch('https://example.com')";
        return "";
      },
    });

    expect(failing.check.status).toBe("fail");
    expect(failing.check.errors).toEqual(
      expect.arrayContaining([
        "procurement_copilot_bff_routes_missing",
        "procurement_copilot_marketplace_second_missing",
        "procurement_copilot_external_live_fetch_enabled",
        "procurement_copilot_hardcoded_supplier_cards_detected",
        "procurement_copilot_mutation_surface_detected",
      ]),
    );
  });

  it("ratchets the AI cross-screen runtime matrix", () => {
    const passing = evaluateAiCrossScreenRuntimeMatrixGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath === "src/features/ai/agent/agentBffRouteShell.ts") {
          return "agent.screen_runtime.read\nAgentScreenRuntimeEnvelope";
        }
        if (relativePath.includes("screenRuntime")) {
          return [
            "AI_SCREEN_RUNTIME_CONTRACT",
            "resolveAiScreenRuntime",
            "AI_SCREEN_RUNTIME_PRODUCERS",
            "allowedRoles",
            "roleAllowed",
            "hasAiScreenRuntimeEvidence",
            "result.cards.length === 0",
            "evidenceRequired: true",
            "GET /agent/screen-runtime/:screenId",
            "POST /agent/screen-runtime/:screenId/intent-preview",
            "POST /agent/screen-runtime/:screenId/action-plan",
            "getAiScreenRuntimeEntry",
            "screenId is not registered",
            "cursor must be a non-negative integer string",
            'input.auth.role === "unknown"',
            'auth.role !== "unknown"',
            "future_or_not_mounted",
            'status: "not_mounted"',
            "fakeCards: false",
            "hardcodedAiResponse: false",
            "mutationCount: 0",
            "finalMutationAllowed: false",
            "directMutationAllowed: false",
            "executed: false",
            "contractorOwnWorkProducer",
            "own_task",
            "own_document",
            '"director.dashboard"',
            '"ai.command.center"',
            '"buyer.main"',
            '"market.home"',
            '"accountant.main"',
            '"foreman.main"',
            '"foreman.subcontract"',
            '"warehouse.main"',
            '"contractor.main"',
            '"office.hub"',
            '"map.main"',
            '"chat.main"',
            '"reports.modal"',
            '"documents.surface"',
            "producerName: \"directorControlProducer\"",
            "producerName: \"accountantFinanceProducer\"",
            "producerName: \"buyerProcurementProducer\"",
            "producerName: \"foremanObjectProducer\"",
            "producerName: \"warehouseStatusProducer\"",
            "producerName: \"contractorOwnWorkProducer\"",
            "producerName: \"officeAccessProducer\"",
            "producerName: \"mapObjectProducer\"",
            "producerName: \"chatContextProducer\"",
            "producerName: \"reportsDocumentsProducer\"",
          ].join("\n");
        }
        if (relativePath.includes("runAiCrossScreenRuntimeMaestro")) {
          return [
            "runAiCrossScreenRuntimeMaestro",
            "ai.screen.runtime.screen",
            "BLOCKED_ROLE_ISOLATION_REQUIRES_SEPARATE_E2E_USERS",
            "mutations_created: 0",
          ].join("\n");
        }
        if (relativePath.includes("commandCenter")) return "command center";
        return "";
      },
    });

    expect(passing.check).toEqual({
      name: "ai_cross_screen_runtime_matrix",
      status: "pass",
      errors: [],
    });

    const failing = evaluateAiCrossScreenRuntimeMatrixGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath.includes("screenRuntime")) {
          return "AI_SCREEN_RUNTIME_PRODUCERS\nfake_card\nmutationCount: 1\nfinalMutationAllowed: true";
        }
        if (relativePath.includes("commandCenter")) return "fetch('https://example.com')";
        return "";
      },
    });

    expect(failing.check.status).toBe("fail");
    expect(failing.check.errors).toEqual(
      expect.arrayContaining([
        "screen_runtime_major_screen_missing",
        "screen_runtime_producer_role_policy_missing",
        "screen_runtime_bff_routes_missing",
        "screen_runtime_fake_cards_detected",
        "screen_runtime_mutation_surface_detected",
      ]),
    );
  });

  it("ratchets the AI persistent approval action ledger", () => {
    const passing = evaluateAiPersistentActionLedgerGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath === "supabase/migrations/20260512120000_ai_action_ledger.sql") {
          return [
            "create table if not exists public.ai_action_ledger",
            "idempotency_key text not null",
            "unique (organization_id, idempotency_key)",
            "create index if not exists ai_action_ledger_org_status_created_idx",
          ].join("\n");
        }
        if (relativePath === "supabase/migrations/20260513100000_ai_action_ledger_audit_rls_contract.sql") {
          return [
            "create table if not exists public.ai_action_ledger_audit",
            "ai.action.submitted_for_approval",
            "ai.action.idempotency_reused",
            "ai_action_ledger_audit_payload_redacted_check",
            "create index if not exists ai_action_ledger_audit_action_created_idx",
            "alter table public.ai_action_ledger enable row level security",
            "alter table public.ai_action_ledger_audit enable row level security",
            "force row level security",
            "ai_action_ledger_select_company_scope",
            "ai_action_ledger_insert_pending_company_scope",
            "ai_action_ledger_audit_insert_company_scope",
            "ai_action_ledger_submit_for_approval_v1",
            "ai_action_ledger_get_status_v1",
            "ai_action_ledger_approve_v1",
            "ai_action_ledger_reject_v1",
            "ai_action_ledger_execute_approved_v1",
            "security invoker",
            "BLOCKED_DOMAIN_EXECUTOR_NOT_READY",
            "'finalExecution', false",
            "ai_action_ledger_lifecycle_guard_v1",
            "old.status = 'pending'",
            "old.status = 'approved'",
            "status transition is blocked",
            "approval actor is outside company management scope",
          ].join("\n");
        }
        if (relativePath === "supabase/migrations/20260513230000_ai_action_ledger_apply.sql") {
          return [
            "Additive only",
            "Forward-fix plan",
            "Rollback plan",
            "Verify query: select public.ai_action_ledger_verify_apply_v1();",
            "create index if not exists ai_action_ledger_org_hash_status_created_idx",
            "create index if not exists ai_action_ledger_status_expires_idx",
            "create policy ai_action_ledger_update_executed_company_scope",
            "ai_action_ledger_actor_can_manage_company_v1",
            "ai_action_ledger_submit_for_approval_v1",
            "ai_action_ledger_get_status_v1",
            "ai_action_ledger_approve_v1",
            "ai_action_ledger_reject_v1",
            "ai_action_ledger_execute_approved_v1",
            "ai_action_ledger_find_by_idempotency_key_v1",
            "ai_action_ledger_list_by_org_v1",
            "'submitForApprovalRpcPresent'",
            "'approveRpcPresent'",
            "'rejectRpcPresent'",
            "'rawRowsPrinted', false",
            "'secretsPrinted', false",
          ].join("\n");
        }
        if (relativePath === "scripts/db/preflightAiActionLedgerMigration.ts") {
          return "preflightAiActionLedgerMigration\nresolveAiActionLedgerDatabaseUrlEnv";
        }
        if (relativePath === "scripts/db/applyAiActionLedgerMigration.ts") {
          return "runAiActionLedgerMigrationApply\nBLOCKED_DB_PREFLIGHT_FAILED";
        }
        if (relativePath === "src/features/ai/actionLedger/aiActionLedgerRuntimeHealth.ts") {
          return [
            "probeAiActionLedgerRuntimeHealth",
            "BLOCKED_LEDGER_RPC_NOT_DEPLOYED",
            "PGRST202",
            "Could not find the function",
            "schema cache",
            "rawDbRowsExposed: false",
          ].join("\n");
        }
        if (relativePath === "scripts/e2e/runAiApprovalLedgerPersistenceMaestro.ts") {
          return [
            "runAiApprovalLedgerPersistenceMaestro",
            "submit_for_approval_persists_pending",
            "approve_reject_persist_status",
            "fake_local_approval: false",
            "BLOCKED_LEDGER_RPC_NOT_DEPLOYED",
          ].join("\n");
        }
        if (relativePath === "artifacts/S_AI_MAGIC_08_APPROVAL_LEDGER_BACKEND_MOUNT_write_rpc_mount.sql") {
          return [
            "Additive proposal only",
            "Apply only after explicit migration approval",
            "add column if not exists requested_by_user_id_hash",
            "add column if not exists organization_id_hash",
            "ai_action_ledger_to_safe_json_v1",
            "ai_action_ledger_find_by_idempotency_key_v1",
            "ai_action_ledger_list_by_org_v1",
            "insert into public.ai_action_ledger",
            "insert into public.ai_action_ledger_audit",
            "ai.action.idempotency_reused",
            "update public.ai_action_ledger",
            "'finalExecution', false",
          ].join("\n");
        }
        if (relativePath === "src/features/ai/agent/agentBffRouteShell.ts") {
          return "AgentActionLedgerEnvelope\nagent.action.execute_approved";
        }
        if (relativePath === "src/features/ai/tools/submitForApprovalTool.ts") {
          return [
            "submitForApprovalTransport",
            "persisted: true",
            "local_gate_only: false",
            "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND",
          ].join("\n");
        }
        if (relativePath === "src/features/ai/tools/transport/submitForApproval.transport.ts") {
          return "repository.submitForApproval";
        }
        if (relativePath === "src/features/ai/tools/getActionStatusTool.ts") {
          return "readActionStatusTransport\nlookup_performed: true\npersisted: true";
        }
        if (relativePath === "src/features/ai/tools/transport/getActionStatus.transport.ts") {
          return "repository.getStatus";
        }
        if (relativePath.includes("runAiApprovalActionLedgerMaestro")) {
          return "runAiApprovalActionLedgerMaestro\nBLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND\nmutations_created: 0\nfake_local_approval: false";
        }
        if (relativePath.includes("commandCenter")) return "command center";
        if (relativePath.includes("aiActionLedgerPolicy")) {
          return [
            "AiActionLedgerRecord",
            "AiActionStatus",
            "SubmitAiActionForApprovalInput",
            "auditRequired: true",
            "evidenceRequired: true",
            "idempotencyRequired: true",
            "idempotencyKey.trim().length < 16",
            "AI action ledger requires evidence",
            "ALLOWED_TRANSITIONS",
            'draft: ["pending"]',
            'pending: ["approved", "rejected", "expired"]',
            'approved: ["executed", "expired"]',
            'status !== "approved"',
          ].join("\n");
        }
        if (relativePath.includes("aiActionLedgerRepository")) {
          return [
            "AiActionLedgerRecord",
            "AiActionStatus",
            "SubmitAiActionForApprovalInput",
            "ai.action.submitted_for_approval",
            "findByIdempotencyKey",
            "insertPending(record, auditEvent)",
            "createAiActionLedgerAuditEvent",
            "normalizeAiActionLedgerEvidenceRefs",
            'status: "pending"',
            "fakeLocalApproval: false",
          ].join("\n");
        }
        if (relativePath.includes("aiActionLedgerRpcBackend")) {
          return [
            "createAiActionLedgerRpcBackend",
            "resolveAiActionLedgerRpcBackendReadiness",
            "runAiActionLedgerRpcTransport",
            "ai_action_ledger_submit_for_approval_v1",
            "ai_action_ledger_find_by_idempotency_key_v1",
            "ai_action_ledger_list_by_org_v1",
            "BLOCKED_APPROVAL_MIGRATION_NOT_APPROVED",
            "stableHashOpaqueId",
            "mounted: true",
            "fakeLocalApproval: false",
          ].join("\n");
        }
        if (relativePath.includes("aiActionLedgerAudit")) {
          return "AiActionLedgerRecord\nAiActionStatus\nSubmitAiActionForApprovalInput\ncreateAiActionLedgerAuditEvent\nhasAiActionLedgerAuditEvent";
        }
        if (relativePath.includes("aiActionLedgerRedaction")) {
          return "AiActionLedgerRecord\nAiActionStatus\nSubmitAiActionForApprovalInput\nFORBIDDEN_KEY_PATTERN\nraw_prompt\nprovider_payload";
        }
        if (relativePath.includes("executeApprovedAiAction")) {
          return [
            "AiActionLedgerRecord",
            "AiActionStatus",
            "SubmitAiActionForApprovalInput",
            "executeApprovedAiAction",
            "assertAiActionLedgerExecutePolicy",
            "canTransitionAiActionStatus",
            "hasAiActionLedgerAuditEvent",
            "BLOCKED_DOMAIN_EXECUTOR_NOT_READY",
            "Domain executor is not mounted",
            "fakeLocalApproval: false",
          ].join("\n");
        }
        if (relativePath.includes("aiActionLedgerBff")) {
          return [
            "AiActionLedgerRecord",
            "AiActionStatus",
            "SubmitAiActionForApprovalInput",
            "POST /agent/action/submit-for-approval",
            "GET /agent/action/:actionId/status",
            "POST /agent/action/:actionId/approve",
            "POST /agent/action/:actionId/reject",
            "POST /agent/action/:actionId/execute-approved",
            "executeApprovedActionLedgerBff",
            "domainExecutor: null",
            "evidenceBacked: true",
            "fakeLocalApproval: false",
          ].join("\n");
        }
        if (relativePath.includes("actionLedger")) {
          return "AiActionLedgerRecord\nAiActionStatus\nSubmitAiActionForApprovalInput\nfakeLocalApproval: false";
        }
        return "";
      },
    });

    expect(passing.check).toEqual({
      name: "ai_persistent_action_ledger",
      status: "pass",
      errors: [],
    });

    const failing = evaluateAiPersistentActionLedgerGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath.includes("submitForApprovalTool")) return "persisted: false\nlocal_gate_only: true";
        if (relativePath.includes("commandCenter")) return 'import { supabase } from "@supabase/supabase-js";';
        if (relativePath.includes("actionLedger")) return "fakeLocalApproval: true\ncreateOrder()";
        return "";
      },
    });

    expect(failing.check.status).toBe("fail");
    expect(failing.check.errors).toEqual(
      expect.arrayContaining([
        "ai_action_ledger_files_missing",
        "ai_action_ledger_audit_storage_proposal_missing",
        "ai_action_ledger_rls_policy_proposal_missing",
        "ai_action_ledger_rpc_contract_proposal_missing",
        "ai_action_ledger_rpc_backend_adapter_missing",
        "ai_action_ledger_write_rpc_mount_proposal_missing",
        "ai_action_ledger_bff_routes_missing",
        "submit_for_approval_not_persistent_pending",
        "ai_action_ledger_fake_local_approval_detected",
        "ai_action_ledger_direct_execution_path_detected",
        "ai_action_ledger_ui_supabase_import_detected",
      ]),
    );
  });

  it("ratchets the AI approval inbox runtime", () => {
    const passing = evaluateAiApprovalInboxRuntimeGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath === "src/features/ai/agent/agentBffRouteShell.ts") {
          return [
            "AgentApprovalInboxEnvelope",
            "agent.approval_inbox.execute_approved",
            "roleFiltered: true",
            "mutates: false",
          ].join("\n");
        }
        if (relativePath.includes("aiActionLedgerBff")) {
          return [
            "auditRequired: true",
            "idempotency",
            'status: "rejected"',
            "executeApprovedActionLedgerBff",
            "domainExecutor: null",
          ].join("\n");
        }
        if (relativePath.includes("aiActionLedgerPolicy")) {
          return 'status !== "approved"\nAI action execution requires idempotency\nrejected: []';
        }
        if (relativePath.includes("executeApprovedAiAction")) {
          return [
            "executeApprovedAiAction",
            "assertAiActionLedgerExecutePolicy",
            'status !== "approved"',
            "missing idempotency key",
            "BLOCKED_DOMAIN_EXECUTOR_NOT_READY",
          ].join("\n");
        }
        if (relativePath.includes("runAiApprovalInboxMaestro")) {
          return "runAiApprovalInboxMaestro\nBLOCKED_APPROVAL_TEST_ACTION_NOT_AVAILABLE\nmutations_created: 0\nfake_approval: false";
        }
        if (relativePath.includes("ApprovalActionCard")) {
          return [
            "ApprovalInboxActionCard",
            'testID="ai.approval.action.evidence"',
            'testID="ai.approval.action.approve"',
            "disabled",
            "fakeActions: false",
          ].join("\n");
        }
        if (relativePath.includes("ApprovalReviewPanel")) {
          return [
            "ApprovalInboxActionCard",
            'testID="ai.approval.review.panel"',
            'testID="ai.approval.review.confirm-approve"',
            'testID="ai.approval.review.confirm-reject"',
            "fakeActions: false",
          ].join("\n");
        }
        if (relativePath.includes("approvalInboxRuntime")) {
          return [
            "ApprovalInboxResponse",
            "ApprovalInboxActionCard",
            "ApprovalInboxScreen",
            "GET /agent/approval-inbox",
            "GET /agent/approval-inbox/:actionId",
            "POST /agent/approval-inbox/:actionId/approve",
            "POST /agent/approval-inbox/:actionId/reject",
            "POST /agent/approval-inbox/:actionId/edit-preview",
            "POST /agent/approval-inbox/:actionId/execute-approved",
            "backend.listByOrganization",
            "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND",
            "persistentLedgerUsed: true",
            "fakeLocalApproval: false",
            "fakeActions: false",
            "evidenceRefs.length === 0",
            "approveActionLedgerBff",
            "rejectActionLedgerBff",
            "executeApprovedActionLedgerBff",
            "auditRequired: true",
            "idempotencyRequired: true",
            "reviewPanelConfirmed",
            "reviewPanelRequired: true",
            "approveWithoutReviewAllowed: false",
            "directDomainMutation: false",
            "rawDbRowsExposed: false",
            "rawPromptExposed: false",
          ].join("\n");
        }
        if (relativePath.includes("approvalInboxActionPolicy")) {
          return [
            "ApprovalInboxResponse",
            "ApprovalInboxActionCard",
            "ApprovalInboxScreen",
            "canReadApprovalInboxAction",
            'role === "unknown"',
            "hasDirectorFullAiAccess",
            "requestedByUserIdHash",
            "fakeActions: false",
            "rawDbRowsExposed: false",
            "rawPromptExposed: false",
          ].join("\n");
        }
        if (relativePath.includes("approvalInboxEvidence")) {
          return [
            "ApprovalInboxResponse",
            "ApprovalInboxActionCard",
            "ApprovalInboxScreen",
            "normalizeApprovalInboxEvidenceRefs",
            "hasApprovalInboxEvidence",
            "rejected_blocks_execution",
            "fakeActions: false",
            "rawDbRowsExposed: false",
            "rawPromptExposed: false",
          ].join("\n");
        }
        if (relativePath.includes("approvalInbox")) {
          return [
            "ApprovalInboxResponse",
            "ApprovalInboxActionCard",
            "ApprovalInboxScreen",
            "fakeActions: false",
            "rawDbRowsExposed: false",
            "rawPromptExposed: false",
          ].join("\n");
        }
        return "";
      },
    });

    expect(passing.check).toEqual({
      name: "ai_approval_inbox_runtime",
      status: "pass",
      errors: [],
    });

    const failing = evaluateAiApprovalInboxRuntimeGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath.includes("ApprovalActionCard")) return 'testID="ai.approval.action.approve"';
        if (relativePath.includes("approvalInbox")) {
          return "fakeLocalApproval: true\nfakeActions: true\nlocalApprovalQueue\ncreateOrder()\nrawPrompt: hidden";
        }
        if (relativePath.includes("executeApprovedAiAction")) return "";
        if (relativePath.includes("agentBffRouteShell")) return "mutates: true";
        return "";
      },
    });

    expect(failing.check.status).toBe("fail");
    expect(failing.check.errors).toEqual(
      expect.arrayContaining([
        "approval_inbox_files_missing",
        "approval_inbox_bff_routes_missing",
        "approval_inbox_not_reading_persistent_ledger",
        "approval_inbox_fake_local_approval_detected",
        "approval_inbox_review_panel_not_required",
        "approval_inbox_direct_mutation_detected",
      ]),
    );
  });

  it("ratchets approved procurement executor to approved-only bounded execution", () => {
    const passing = evaluateAiApprovedProcurementExecutorGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath.includes("executeApprovedActionGateway")) {
          return [
            "executeApprovedActionGateway",
            "backend.updateStatus",
            '"executed"',
            'record.status === "executed"',
            "already_executed",
            "idempotency_reused",
            "duplicateExecutionCreatesDuplicate: false",
            "BLOCKED_PROCUREMENT_BFF_MUTATION_BOUNDARY_NOT_FOUND",
            "canPersistExecutedStatus",
            "Persistent action ledger executed-status transition is not mounted",
            "redactedPayload: withCreatedEntityRefPayload",
          ].join("\n");
        }
        if (relativePath.includes("approvedActionExecutorPolicy")) {
          return [
            'record.status !== "approved"',
            "AI action status",
            "canTransitionAiActionStatus",
            "idempotencyKey",
            "Execution idempotency key does not match",
            "evidenceRefs.length === 0",
            "AI action approval is expired",
            "FORBIDDEN_APPROVED_EXECUTOR_ACTION_TYPES",
            "create_order",
            "direct_supabase_query",
          ].join("\n");
        }
        if (relativePath.includes("procurementRequestExecutorTypes")) {
          return [
            "ProcurementRequestMutationBoundary",
            "executeApprovedProcurementRequest",
            'boundaryId: "existing_bff_procurement_request_mutation_boundary"',
            "routeScoped: true",
            "idempotencyRequired: true",
            "auditRequired: true",
            "directSupabaseMutation: false",
          ].join("\n");
        }
        if (relativePath.includes("procurementRequestExecutor.ts")) {
          return [
            "createProcurementRequestExecutor",
            "executeApprovedProcurementRequest",
            "hasProcurementRequestExecutorEvidence",
            "executor requires evidence",
            '"draft_request"',
            '"submit_request"',
            "directSupabaseMutation: false",
            "broadMutationRoute: false",
          ].join("\n");
        }
        if (relativePath.includes("approvedProcurementRequestBffMutationBoundary")) {
          return [
            "createApprovedProcurementRequestBffMutationBoundary",
            "request_sync_draft_v2",
            "requestDraftSync.service",
            "syncRequestDraftViaRpc",
            "existing_bff_procurement_request_mutation_boundary",
            "rikCode",
            'stableHashOpaqueId("request"',
          ].join("\n");
        }
        if (relativePath.includes("executeApprovedActionAudit")) {
          return "createApprovedActionExecutionAuditEvent\nai.action.execute_requested\nai.action.executed";
        }
        if (relativePath.includes("executeApprovedActionRedaction")) {
          return "FORBIDDEN_KEY_PATTERN\nrawPrompt\nprovider_payload\nAuthorization";
        }
        if (relativePath.includes("aiActionLedgerBff")) {
          return [
            "POST /agent/action/:actionId/execute-approved",
            "GET /agent/action/:actionId/execution-status",
            "auditRequired: true",
            "executeApprovedActionGateway",
            "createApprovedProcurementRequestBffMutationBoundary",
            "createProcurementRequestExecutor",
          ].join("\n");
        }
        if (relativePath.includes("approvalInboxTypes")) return "executionStatus";
        if (relativePath.includes("approvalInboxViewModel")) {
          return "approved_ready_to_execute\nblocked_executor_not_ready\ndirectExecuteAllowed: false";
        }
        if (relativePath.includes("ApprovalActionCard") || relativePath.includes("ApprovalReviewPanel")) {
          return [
            "ai.approval.execute-approved",
            "ai.approval.execution-status",
            "ai.approval.execution-blocked",
            "ai.approval.executed",
            "ai.approval.created-entity-ref",
          ].join("\n");
        }
        if (relativePath.includes("agentBffRouteShell")) {
          return "agent.action.execute_approved\nPOST /agent/action/:actionId/execute-approved";
        }
        if (relativePath.includes("runAiApprovedProcurementExecutorMaestro")) {
          return [
            "runAiApprovedProcurementExecutorMaestro",
            "BLOCKED_APPROVED_PROCUREMENT_ACTION_NOT_AVAILABLE",
            "BLOCKED_PROCUREMENT_BFF_MUTATION_BOUNDARY_NOT_FOUND",
            "fake_execution: false",
          ].join("\n");
        }
        if (relativePath.includes("executors")) {
          return "ApprovedActionExecutionRequest\ncreateProcurementRequestExecutor\nProcurementRequestMutationBoundary";
        }
        return "";
      },
    });

    expect(passing.check).toEqual({
      name: "ai_approved_procurement_executor",
      status: "pass",
      errors: [],
    });

    const failing = evaluateAiApprovedProcurementExecutorGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath.includes("ApprovalActionCard")) return 'import { supabase } from "@supabase/supabase-js"';
        if (relativePath.includes("procurementRequestExecutor")) return "create_order\nsupabase.from('requests').insert({})";
        if (relativePath.includes("executeApprovedActionGateway")) return 'status: "executed"';
        return "";
      },
    });

    expect(failing.check.status).toBe("fail");
    expect(failing.check.errors).toEqual(
      expect.arrayContaining([
        "approved_procurement_executor_files_missing",
        "approved_procurement_executor_gate_missing",
        "approved_procurement_executor_idempotency_not_required",
        "approved_procurement_executor_ui_supabase_import_detected",
      ]),
    );
  });

  it("ratchets deterministic cache cold-miss proof artifacts and invariants", () => {
    const passing = evaluateCacheColdMissProofGuardrail({ projectRoot: process.cwd() });

    expect(passing.check).toEqual({
      name: "cache_cold_miss_deterministic_proof",
      status: "pass",
      errors: [],
    });
    expect(passing.summary).toEqual(
      expect.objectContaining({
        proofTestPresent: true,
        matrixArtifactPresent: true,
        proofArtifactPresent: true,
        matrixStatus: "GREEN_CACHE_COLD_MISS_DETERMINISTIC_PROOF_READY",
        deterministicProofReady: true,
        knownEmptyKeyProof: true,
        firstMissSecondHitProof: true,
        utf8SafeProof: true,
        metricsRedactedProof: true,
        routeScopeUnchanged: true,
        rollbackSafeProof: true,
        productionCacheStillDisabled: true,
      }),
    );

    const failing = evaluateCacheColdMissProofGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath === "tests/scale/cacheColdMissDeterministicProof.test.ts") {
          return "describe('S_CACHE_01_COLD_MISS_DETERMINISTIC_PROOF', () => undefined);";
        }
        if (relativePath === "artifacts/S_CACHE_01_COLD_MISS_DETERMINISTIC_PROOF_proof.md") {
          return "# weakened proof";
        }
        if (relativePath === "artifacts/S_CACHE_01_COLD_MISS_DETERMINISTIC_PROOF_matrix.json") {
          return JSON.stringify({
            status: "BLOCKED_NO_SAFE_COLD_MISS_PROOF",
            baseline: {
              productionCacheEnabled: false,
              readThroughV1DefaultEnabled: false,
              cachePoliciesDefaultEnabled: false,
            },
            proofStrategy: {
              knownEmptyBeforeFirstRequest: false,
              utf8Safe: false,
              metricsRedacted: false,
              routeMetricsRedactionSafe: false,
              rawCacheKeyReturned: true,
              rawPayloadLogged: true,
              piiLogged: true,
            },
            routeScope: {
              readThroughAllowedRoutes: ["marketplace.catalog.search", "request.proposal.list"],
              publicCatalogReadThroughRoutes: ["marketplace.catalog.search"],
              routeExpansion: true,
              readRoutesCacheDefaultEnabled: true,
            },
            rollbackAndInvalidation: {
              cacheInvalidationExecutionEnabledByDefault: true,
              rollbackDeletedEntries: 0,
              postRollbackReadNull: false,
              dbWrites: true,
            },
            beforeAfterMetrics: {
              after: {
                deterministicColdMissProof: false,
                knownEmptyKeyProof: false,
                firstMissSecondHitProof: false,
                utf8SafeProof: false,
                rollbackSafeProof: false,
                missCount: 0,
                hitCount: 0,
                readThroughCount: 0,
                providerCalls: 2,
              },
            },
            safety: {
              productionCacheEnabled: false,
              cacheLeftEnabled: false,
              broadCacheConfigChange: false,
            },
          });
        }
        throw new Error(`Unexpected file ${relativePath}`);
      },
    });

    expect(failing.check.status).toBe("fail");
    expect(failing.check.errors).toEqual(
      expect.arrayContaining([
        "cache_cold_miss_proof_test_missing_or_weakened",
        "cache_cold_miss_proof_artifact_missing_or_weakened",
        "cache_cold_miss_status_not_ready:BLOCKED_NO_SAFE_COLD_MISS_PROOF",
        "cache_cold_miss_known_empty_key_not_proven",
        "cache_cold_miss_first_miss_second_hit_not_proven",
        "cache_cold_miss_utf8_not_proven",
        "cache_cold_miss_metrics_not_redaction_safe",
        "cache_cold_miss_route_scope_changed",
        "cache_cold_miss_rollback_not_safe",
      ]),
    );
  });

  it("blocks raw production infinite loops with readable owner failures", () => {
    const findings = scanProductionRawLoopSource({
      file: "src/workers/exampleWorker.ts",
      source: [
        "export async function runExampleWorker() {",
        "  while (true) {",
        "    await doWork();",
        "  }",
        "}",
        "export function spin() { for (;;) break; }",
      ].join("\n"),
    });

    expect(findings).toEqual([
      expect.objectContaining({
        file: "src/workers/exampleWorker.ts",
        line: 2,
        pattern: "while_true",
        matchedLoop: "while (true)",
        allowlisted: false,
        owner: null,
      }),
      expect.objectContaining({
        file: "src/workers/exampleWorker.ts",
        line: 6,
        pattern: "for_ever",
        matchedLoop: "for (;;)",
        allowlisted: false,
        owner: null,
      }),
    ]);

    const guardrail = evaluateProductionRawLoopGuardrail({ findings });
    expect(guardrail.check).toEqual(
      expect.objectContaining({
        name: "production_raw_loop_boundary",
        status: "fail",
      }),
    );
    expect(guardrail.check.errors).toEqual(
      expect.arrayContaining([
        "production_raw_loop:file=src/workers/exampleWorker.ts:line=2:matched_loop=while (true):expected=cancellable worker loop primitive or explicit allowlist with reason, owner, and test coverage",
        "production_raw_loop:file=src/workers/exampleWorker.ts:line=6:matched_loop=for (;;):expected=cancellable worker loop primitive or explicit allowlist with reason, owner, and test coverage",
        "production_raw_loop_budget_exceeded:2>0",
      ]),
    );
  });

  it("requires reason, owner, and test coverage for any explicit raw-loop allowlist", () => {
    const allowlist = [
      {
        file: "src/workers/exampleWorker.ts",
        line: 1,
        pattern: "while_true" as const,
        reason: "bounded by external blocking read and abort signal",
        owner: "platform-workers",
        testCoverage: "tests/workers/exampleWorker.contract.test.ts",
      },
    ];
    const findings = scanProductionRawLoopSource({
      file: "src/workers/exampleWorker.ts",
      source: "while (true) await next();",
      allowlist,
    });

    expect(findings).toEqual([
      expect.objectContaining({
        allowlisted: true,
        reason: "bounded by external blocking read and abort signal",
        owner: "platform-workers",
        testCoverage: "tests/workers/exampleWorker.contract.test.ts",
      }),
    ]);
    expect(evaluateProductionRawLoopGuardrail({ findings, allowlist }).check.status).toBe("pass");

    const invalidAllowlist = [{ ...allowlist[0], owner: "" }];
    const invalidFindings = scanProductionRawLoopSource({
      file: "src/workers/exampleWorker.ts",
      source: "while (true) await next();",
      allowlist: invalidAllowlist,
    });

    expect(evaluateProductionRawLoopGuardrail({
      findings: invalidFindings,
      allowlist: invalidAllowlist,
    }).check.errors).toEqual(
      expect.arrayContaining([
        "production_raw_loop_allowlist_missing_metadata:file=src/workers/exampleWorker.ts:line=1:pattern=while_true",
      ]),
    );
  });

  it("keeps production src raw infinite loop inventory at zero", () => {
    const findings = scanProductionRawLoops(process.cwd());
    const guardrail = evaluateProductionRawLoopGuardrail({ findings });

    expect(findings).toEqual([]);
    expect(guardrail.summary).toMatchObject({
      rawLoopBudget: 0,
      totalFindings: 0,
      unapprovedFindings: 0,
      allowlistedFindings: 0,
      allowlistEntries: 0,
    });
    expect(guardrail.check.status).toBe("pass");
  });

  it("ratchets submit_for_approval audit trail requirements", () => {
    const passing = evaluateSubmitForApprovalAuditTrailGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath.endsWith("submitForApprovalAuditTypes.ts")) {
          return "evidenceRequired: true\nidempotencyRequired: true\nfinalExecution: false\nfakeLocalApproval: false";
        }
        if (relativePath.endsWith("submitForApprovalAuditPolicy.ts")) {
          return "assertSubmitForApprovalAuditPolicy\nevidence_required\nidempotency_required";
        }
        if (relativePath.endsWith("submitForApprovalAuditEvent.ts")) {
          return "createAiActionLedgerAuditEvent\nai.action.submitted_for_approval";
        }
        if (relativePath.endsWith("submitForApprovalRedaction.ts")) return "redactSubmitForApprovalAuditPayload";
        if (relativePath.endsWith("submitForApproval.transport.ts")) {
          return "assertSubmitForApprovalAuditPolicy\nbuildSubmitForApprovalAuditTrail\nredactSubmitForApprovalAuditPayload";
        }
        if (relativePath.endsWith("submitForApprovalTool.ts")) {
          return [
            "audit_trail_ref",
            "audit_event_count",
            "audit_redacted",
            "evidence_refs",
            "idempotency_key",
            'action_status: "pending"',
            "final_execution: 0",
            "local_gate_only: false",
          ].join("\n");
        }
        if (relativePath.endsWith("aiToolSchemas.ts")) return "audit_trail_ref\naudit_event_count\naudit_redacted";
        if (relativePath.endsWith("runAiSubmitForApprovalAuditMaestro.ts")) return "submit_for_approval";
        return "";
      },
    });

    expect(passing.check).toEqual({
      name: "submit_for_approval_audit_trail",
      status: "pass",
      errors: [],
    });

    const failing = evaluateSubmitForApprovalAuditTrailGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath.endsWith("submitForApprovalAuditTypes.ts")) return "finalExecution: true";
        if (relativePath.endsWith("submitForApprovalTool.ts")) return 'action_status: "approved"\nlocal_gate_only: true';
        return "";
      },
    });

    expect(failing.check.status).toBe("fail");
    expect(failing.check.errors).toEqual(
      expect.arrayContaining([
        "submit_for_approval_transport_missing_audit_policy",
        "submit_for_approval_evidence_not_required",
        "submit_for_approval_idempotency_not_required",
        "submit_for_approval_audit_event_not_required",
        "submit_for_approval_not_pending_only",
        "submit_for_approval_can_final_execute",
        "submit_for_approval_fake_local_approval_detected",
      ]),
    );
  });

  it("ratchets the deterministic AI policy gate scale proof", () => {
    const passing = evaluateAiPolicyGateScaleProofGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath.endsWith("aiPolicyGateScaleProof.ts")) {
          return [
            "runAiPolicyGateScaleProof",
            "evaluateAiPolicyGateScaleDecision",
            "DECISION_TARGET = 10_000",
            "planAiToolUse",
            "AI_FORBIDDEN_ACTIONS",
            "directExecutionAllowed: false",
            "mutationCount: 0",
            "modelCalls: 0",
            "dbCalls: 0",
            "externalFetches: 0",
            ...[
              "director",
              "control",
              "foreman",
              "buyer",
              "accountant",
              "warehouse",
              "contractor",
              "office",
              "unknown",
              "director.dashboard",
              "ai.command.center",
              "buyer.main",
              "market.home",
              "accountant.main",
              "foreman.main",
              "foreman.subcontract",
              "warehouse.main",
              "contractor.main",
              "office.hub",
              "map.main",
              "chat.main",
              "reports.modal",
              "safe_read",
              "draft_only",
              "submit_for_approval",
              "approve",
              "execute_approved",
              "forbidden",
            ].map((value) => `"${value}"`),
          ].join("\n");
        }
        if (relativePath.endsWith("_matrix.json")) {
          return JSON.stringify({
            total_policy_decisions: 10530,
            deterministic_10k_decisions: true,
            unknown_role_denied: true,
            contractor_own_records_only: true,
            buyer_no_finance_mutation: true,
            accountant_no_supplier_confirmation: true,
            warehouse_no_finance_access: true,
            foreman_no_full_company_finance: true,
            director_control_no_silent_mutation: true,
            forbidden_action_always_denied: true,
            approval_required_never_direct_executes: true,
            execute_approved_gate_only: true,
            no_model_calls: true,
            no_db_calls: true,
            no_external_fetches: true,
            mutation_count: 0,
          });
        }
        if (relativePath.endsWith("_metrics.json")) {
          return JSON.stringify({
            modelCalls: 0,
            dbCalls: 0,
            externalFetches: 0,
            mutations: 0,
            explicitProof: {
              unknownRoleDenied: true,
              contractorOwnRecordsOnly: true,
              buyerNoFinanceMutation: true,
              accountantNoSupplierConfirmation: true,
              warehouseNoFinanceAccess: true,
              foremanNoFullCompanyFinance: true,
              directorControlNoSilentMutation: true,
              forbiddenAlwaysDenied: true,
              approvalRequiredNeverDirectExecutes: true,
              executeApprovedGateOnly: true,
            },
            toolPlanProof: {
              noDirectToolExecution: true,
              noToolMutation: true,
              noToolProviderCall: true,
              noToolDbAccess: true,
              noToolRawRows: true,
              noToolRawPromptStorage: true,
            },
          });
        }
        if (relativePath.endsWith("aiPolicyGateScaleArchitecture.contract.test.ts")) {
          return "evaluateAiPolicyGateScaleProofGuardrail";
        }
        if (relativePath.includes("aiPolicyGate") || relativePath.endsWith("_inventory.json")) return "present";
        if (relativePath.endsWith("_proof.md")) return "present";
        return "";
      },
    });

    expect(passing.check).toEqual({
      name: "ai_policy_gate_scale_proof",
      status: "pass",
      errors: [],
    });

    const failing = evaluateAiPolicyGateScaleProofGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath.endsWith("aiPolicyGateScaleProof.ts")) return "runAiPolicyGateScaleProof";
        if (relativePath.endsWith("_matrix.json")) {
          return JSON.stringify({
            total_policy_decisions: 120,
            deterministic_10k_decisions: false,
            forbidden_action_always_denied: false,
            mutation_count: 1,
          });
        }
        if (relativePath.endsWith("_metrics.json")) {
          return JSON.stringify({
            modelCalls: 1,
            dbCalls: 1,
            externalFetches: 1,
            mutations: 1,
            explicitProof: {
              forbiddenAlwaysDenied: false,
            },
            toolPlanProof: {
              noDirectToolExecution: false,
            },
          });
        }
        return "";
      },
    });

    expect(failing.check.status).toBe("fail");
    expect(failing.check.errors).toEqual(
      expect.arrayContaining([
        "ai_policy_gate_scale_10k_proof_missing",
        "ai_policy_gate_scale_model_call_detected",
        "ai_policy_gate_scale_db_call_detected",
        "ai_policy_gate_scale_external_fetch_detected",
        "ai_policy_gate_scale_mutation_detected",
        "ai_policy_gate_forbidden_action_not_denied",
        "ai_policy_gate_tool_plan_direct_execution_gap",
      ]),
    );
  });

  it("fails on new unbounded runtime list selects", () => {
    const findings = scanUnboundedSelectRatchetSource({
      file: "src/lib/api/example.transport.ts",
      source: 'await supabase.from("requests").select("id, title").order("created_at");',
      allowlist: [],
    });
    const guardrail = evaluateUnboundedSelectRatchetGuardrail({ findings, allowlist: [] });

    expect(findings).toEqual([
      expect.objectContaining({
        file: "src/lib/api/example.transport.ts",
        queryType: "list",
        action: "fix_now",
        selectStar: false,
      }),
    ]);
    expect(guardrail.check).toEqual(
      expect.objectContaining({
        name: "unbounded_select_ratchet",
        status: "fail",
      }),
    );
    expect(guardrail.check.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("unbounded_select:file=src/lib/api/example.transport.ts:line=1:action=fix_now"),
        "unbounded_select_budget_exceeded:1>0",
      ]),
    );
  });

  it("allows documented export allowlist entries and rejects missing metadata", () => {
    const allowlist: UnboundedSelectAllowlistEntry[] = [
      {
        file: "src/lib/pdf/exampleReport.ts",
        line: 1,
        queryString: "id, title",
        action: "export_allowlist",
        owner: "report export owner",
        reason: "Report export needs the selected rows to preserve document output.",
        migrationPath: "Move the report export behind a typed RPC/view contract.",
      },
    ];
    const findings = scanUnboundedSelectRatchetSource({
      file: "src/lib/pdf/exampleReport.ts",
      source: 'await supabase.from("requests").select("id, title").order("created_at");',
      allowlist,
    });

    expect(findings).toEqual([
      expect.objectContaining({
        action: "export_allowlist",
        allowlisted: true,
        owner: "report export owner",
        migrationPath: "Move the report export behind a typed RPC/view contract.",
      }),
    ]);
    expect(evaluateUnboundedSelectRatchetGuardrail({ findings, allowlist }).check).toEqual({
      name: "unbounded_select_ratchet",
      status: "pass",
      errors: [],
    });

    const invalidAllowlist = [{ ...allowlist[0], owner: "" }];
    const invalidFindings = scanUnboundedSelectRatchetSource({
      file: "src/lib/pdf/exampleReport.ts",
      source: 'await supabase.from("requests").select("id, title").order("created_at");',
      allowlist: invalidAllowlist,
    });

    expect(evaluateUnboundedSelectRatchetGuardrail({
      findings: invalidFindings,
      allowlist: invalidAllowlist,
    }).check.errors).toEqual(
      expect.arrayContaining([
        "unbounded_select_allowlist_missing_metadata:file=src/lib/pdf/exampleReport.ts:line=1:action=export_allowlist",
      ]),
    );
  });

  it("fails on undocumented select-star projections even when otherwise bounded", () => {
    const findings = scanUnboundedSelectRatchetSource({
      file: "src/lib/api/example.transport.ts",
      source: 'await supabase.from("requests").select("*").limit(1);',
      allowlist: [],
    });
    const guardrail = evaluateUnboundedSelectRatchetGuardrail({ findings, allowlist: [] });

    expect(findings).toEqual([
      expect.objectContaining({
        action: "already_bounded",
        selectStar: true,
      }),
    ]);
    expect(guardrail.check.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("select_star:file=src/lib/api/example.transport.ts:line=1:action=already_bounded"),
        "select_star_budget_exceeded:1>0",
      ]),
    );
  });

  it("blocks unsafe casts with readable ratchet and critical-folder failures", () => {
    const asAnyText = ["as", "any"].join(" ");
    const tsIgnoreText = ["@ts", "ignore"].join("-");
    const silentCatchText = ["catch", "{}"].join(" ");
    const unknownAsText = ["unknown", "as"].join(" ");
    const findings = scanUnsafeCastSource({
      file: "src/lib/workers/exampleWorker.ts",
      source: [
        `const value = payload ${asAnyText};`,
        tsIgnoreText,
        `try { runWorker(); } ${silentCatchText}`,
        `const row = payload ${unknownAsText} WorkerRow;`,
      ].join("\n"),
    });
    const baseline = {
      total: 0,
      productionSource: 0,
      testSource: 0,
      byPattern: {
        as_any: 0,
        ts_ignore: 0,
        silent_catch: 0,
        unsafe_unknown_as: 0,
      },
      productionByPattern: {
        as_any: 0,
        ts_ignore: 0,
        silent_catch: 0,
        unsafe_unknown_as: 0,
      },
      testByPattern: {
        as_any: 0,
        ts_ignore: 0,
        silent_catch: 0,
        unsafe_unknown_as: 0,
      },
      criticalFolderByPattern: [
        {
          folder: "src/lib/workers",
          byPattern: {
            as_any: 0,
            ts_ignore: 0,
            silent_catch: 0,
            unsafe_unknown_as: 0,
          },
        },
      ],
    };
    const guardrail = evaluateUnsafeCastRatchetGuardrail({ findings, baseline });

    expect(findings).toHaveLength(4);
    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: "src/lib/workers/exampleWorker.ts",
          line: 1,
          pattern: "as_any",
          matchedText: asAnyText,
          scope: "production_source",
          criticalFolder: "src/lib/workers",
        }),
        expect.objectContaining({
          line: 2,
          pattern: "ts_ignore",
          matchedText: tsIgnoreText,
        }),
        expect.objectContaining({
          line: 3,
          pattern: "silent_catch",
          matchedText: silentCatchText,
        }),
        expect.objectContaining({
          line: 4,
          pattern: "unsafe_unknown_as",
          matchedText: unknownAsText,
        }),
      ]),
    );
    expect(guardrail.check).toEqual(
      expect.objectContaining({
        name: "unsafe_cast_ratchet_contract",
        status: "fail",
      }),
    );
    expect(guardrail.check.errors).toEqual(
      expect.arrayContaining([
        "unsafe_cast_total_ratchet_exceeded:4>0",
        expect.stringContaining("unsafe_cast_critical_folder_violation:file=src/lib/workers/exampleWorker.ts:line=1"),
        expect.stringContaining(`matched=${asAnyText}`),
      ]),
    );
  });

  it("requires reason, owner, and expiration or migration wave for unsafe-cast allowlists", () => {
    const unknownAsText = ["unknown", "as"].join(" ");
    const pattern: UnsafeCastPattern = "unsafe_unknown_as";
    const allowlist = [
      {
        file: "src/lib/api/example.ts",
        line: 1,
        pattern,
        reason: "legacy provider payload narrowed in wave follow-up",
        owner: "api-transport",
        migrationWave: "S_AUDIT_NIGHT_BATTLE_138",
      },
    ];
    const findings = scanUnsafeCastSource({
      file: "src/lib/api/example.ts",
      source: `const row = payload ${unknownAsText} ExampleRow;`,
      allowlist,
    });
    const baseline = {
      total: 1,
      productionSource: 1,
      testSource: 0,
      byPattern: {
        as_any: 0,
        ts_ignore: 0,
        silent_catch: 0,
        unsafe_unknown_as: 1,
      },
      productionByPattern: {
        as_any: 0,
        ts_ignore: 0,
        silent_catch: 0,
        unsafe_unknown_as: 1,
      },
      testByPattern: {
        as_any: 0,
        ts_ignore: 0,
        silent_catch: 0,
        unsafe_unknown_as: 0,
      },
      criticalFolderByPattern: [
        {
          folder: "src/lib/api",
          byPattern: {
            as_any: 0,
            ts_ignore: 0,
            silent_catch: 0,
            unsafe_unknown_as: 1,
          },
        },
      ],
    };

    expect(findings).toEqual([
      expect.objectContaining({
        allowlisted: true,
        reason: "legacy provider payload narrowed in wave follow-up",
        owner: "api-transport",
        migrationWave: "S_AUDIT_NIGHT_BATTLE_138",
      }),
    ]);
    expect(evaluateUnsafeCastRatchetGuardrail({ findings, allowlist, baseline }).check.status).toBe("pass");

    const invalidAllowlist = [{ ...allowlist[0], owner: "", migrationWave: "" }];
    const invalidFindings = scanUnsafeCastSource({
      file: "src/lib/api/example.ts",
      source: `const row = payload ${unknownAsText} ExampleRow;`,
      allowlist: invalidAllowlist,
    });

    expect(evaluateUnsafeCastRatchetGuardrail({
      findings: invalidFindings,
      allowlist: invalidAllowlist,
      baseline,
    }).check.errors).toEqual(
      expect.arrayContaining([
        "unsafe_cast_allowlist_missing_metadata:file=src/lib/api/example.ts:line=1:pattern=unsafe_unknown_as",
      ]),
    );
  });

  it("separates test findings from production findings and ignores guarded unknown casts", () => {
    const asAnyText = ["as", "any"].join(" ");
    const unknownAsText = ["unknown", "as"].join(" ");
    const testFindings = scanUnsafeCastSource({
      file: "tests/example/example.contract.test.ts",
      source: `const value = payload ${asAnyText};`,
    });
    const guardedFindings = scanUnsafeCastSource({
      file: "src/lib/api/example.ts",
      source: `const query = createGuardedPagedQuery(payload ${unknownAsText} Query, isExampleRow, "example");`,
    });

    expect(testFindings).toEqual([
      expect.objectContaining({
        pattern: "as_any",
        scope: "test_source",
        criticalFolder: null,
      }),
    ]);
    expect(guardedFindings).toEqual([]);
  });

  it("reports component line and hook pressure without failing the build", () => {
    const entry = scanComponentDebtSource({
      file: "src/screens/example/LargeScreen.tsx",
      source: [
        "export function LargeScreen() {",
        "  useEffect(() => undefined, []);",
        "  useMemo(() => 1, []);",
        "  return null;",
        "}",
      ].join("\n"),
    });

    expect(entry).toEqual({
      file: "src/screens/example/LargeScreen.tsx",
      lineCount: 5,
      hookCount: 2,
    });
  });
});
