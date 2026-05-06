import {
  buildAssistantStoreReadQueryPlans,
  createAssistantStoreReadBffReadonlyDbPort,
} from "../../scripts/server/stagingBffAssistantStoreReadPort";

const sqlText = (plans: ReturnType<typeof buildAssistantStoreReadQueryPlans>): string =>
  plans.map((plan) => plan.sql).join("\n");

describe("assistant/store BFF readonly DB port", () => {
  it("builds bounded deterministic assistant listing plans", () => {
    const plans = buildAssistantStoreReadQueryPlans({
      operation: "assistant.market.active_listings",
      args: { pageSize: 250 },
    });

    expect(plans).toHaveLength(1);
    expect(plans[0]).toEqual(
      expect.objectContaining({
        operation: "assistant.market.active_listings",
        values: [100],
        maxRows: 100,
        readOnly: true,
      }),
    );
    expect(plans[0].sql).toContain("where status = 'active'");
    expect(plans[0].sql).toContain("order by created_at desc, id desc");
    expect(plans[0].sql).toContain("limit $1");
  });

  it("builds single-scope assistant actor context without expanding client fanout", () => {
    const plans = buildAssistantStoreReadQueryPlans({
      operation: "assistant.actor.context",
      args: { userId: "user-redacted" },
    });

    expect(plans).toHaveLength(1);
    expect(plans[0]).toEqual(
      expect.objectContaining({
        operation: "assistant.actor.context",
        values: ["user-redacted"],
        maxRows: 1,
        readOnly: true,
      }),
    );
    expect(plans[0].sql).toContain("from public.user_profiles");
    expect(plans[0].sql).toContain("from public.company_members");
    expect(plans[0].sql).toContain("from public.companies");
    expect(plans[0].sql).toContain("from public.market_listings");
  });

  it("builds bounded deterministic store list plans", () => {
    const requestItems = buildAssistantStoreReadQueryPlans({
      operation: "store.request_items.list",
      args: { requestId: "request-redacted", status: "draft" },
    });
    const inbox = buildAssistantStoreReadQueryPlans({
      operation: "store.director_inbox.list",
      args: {},
    });
    const approved = buildAssistantStoreReadQueryPlans({
      operation: "store.approved_request_items.list",
      args: { requestId: "request-redacted" },
    });

    expect(requestItems[0]).toEqual(
      expect.objectContaining({
        values: ["request-redacted", "draft", 5001],
        maxRows: 5000,
        readOnly: true,
      }),
    );
    expect(requestItems[0].sql).toContain("from public.request_items");
    expect(requestItems[0].sql).toContain("order by created_at asc, id asc");
    expect(inbox[0].sql).toContain("from public.request_items_pending_view");
    expect(inbox[0].sql).toContain("order by created_at desc, request_item_id asc");
    expect(inbox[0].values).toEqual([5001]);
    expect(approved[0].sql).toContain("from public.v_request_items_display");
    expect(approved[0].sql).toContain("order by id asc");
    expect(approved[0].values).toEqual(["request-redacted", 5001]);
  });

  it("keeps generated plans SELECT-only and does not create a port without readonly DB env", () => {
    const plans = [
      ...buildAssistantStoreReadQueryPlans({ operation: "assistant.actor.context", args: { userId: "u" } }),
      ...buildAssistantStoreReadQueryPlans({ operation: "assistant.market.companies_by_ids", args: { ids: ["c"] } }),
      ...buildAssistantStoreReadQueryPlans({
        operation: "assistant.market.profiles_by_user_ids",
        args: { ids: ["u"] },
      }),
      ...buildAssistantStoreReadQueryPlans({ operation: "store.director_inbox.list", args: {} }),
    ];

    expect(sqlText(plans)).not.toMatch(/\b(insert|update|delete|truncate|alter|drop|create|grant|revoke|call|copy|merge)\b/i);
    expect(createAssistantStoreReadBffReadonlyDbPort({})).toBeUndefined();
  });
});
