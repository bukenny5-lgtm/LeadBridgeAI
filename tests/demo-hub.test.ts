import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DemoStore } from "../src/demo/store.js";
import { filterMessages, renderDashboardBody } from "../src/demo/render.js";
import { startDemoServer } from "../src/demo/server.js";
import { createToastFromMessage, createNotificationStatus, requestBrowserNotificationPermission } from "../src/demo/alerts.js";
import type { DemoMessageRecord, DemoListFilters } from "../src/demo/types.js";
import type { DashboardViewModel } from "../src/demo/render.js";

function makeViewModel(
  store: DemoStore,
  selectedMessage: DemoMessageRecord | null,
  overrides: Partial<DashboardViewModel> = {},
) {
  const bootstrap = store.createBootstrap();
  const filters: DemoListFilters = { channel: "all", status: "open", search: "" };
  return {
    messages: bootstrap.messages,
    selected_message: selectedMessage,
    filters,
    metrics: bootstrap.metrics,
    evaluation: bootstrap.evaluation,
    loading: false,
    error: null,
    detail_tab: "overview" as const,
    toasts: [],
    notification_status: createNotificationStatus("default"),
    ...overrides,
  };
}

function extractStaticJsImports(source: string): string[] {
  const imports = new Set<string>();
  const importRegex = /import\s+(?:[^'"]+from\s+)?["']([^"']+)["']/g;
  for (const match of source.matchAll(importRegex)) {
    const specifier = match[1];
    if (specifier.startsWith("./") && specifier.endsWith(".js")) {
      imports.add(specifier);
    }
  }
  return [...imports];
}

async function assertJavaScriptAsset(url: string): Promise<string> {
  const response = await fetch(url);
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("application/javascript");
  return response.text();
}

async function walkBrowserImportGraph(baseUrl: string): Promise<void> {
  const queue = ["/assets/client.js"];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const assetPath = queue.shift();
    if (!assetPath || seen.has(assetPath)) {
      continue;
    }
    seen.add(assetPath);
    const source = await assertJavaScriptAsset(`${baseUrl}${assetPath}`);
    for (const specifier of extractStaticJsImports(source)) {
      const resolved = new URL(specifier, `${baseUrl}${assetPath}`).pathname;
      expect(resolved.startsWith("/assets/")).toBe(true);
      queue.push(resolved);
    }
  }
}

describe("demo store and renderer", () => {
  it("keeps the bootstrap payload sanitized and renders the core dashboard sections", () => {
    const store = new DemoStore();
    const bootstrap = store.createBootstrap();
    const bootstrapText = JSON.stringify(bootstrap);

    expect(bootstrap.messages.length).toBeGreaterThan(0);
    expect(bootstrapText).not.toContain("expected");
    expect(bootstrapText).not.toContain("rationale");
    expect(bootstrapText).not.toContain("prohibited");
    expect(bootstrapText).not.toContain("minimum_permitted_price_ugx");
    expect(bootstrapText).not.toContain("OPENAI_API_KEY");
    expect(bootstrapText).not.toContain("Authorization");

    const filtered = filterMessages(bootstrap.messages, { channel: "facebook", status: "all_messages", search: "" });
    expect(filtered.every((message) => message.channel === "facebook")).toBe(true);

    const dashboard = renderDashboardBody(makeViewModel(store, bootstrap.messages[0] ?? null));

    expect(dashboard).toContain("LeadBridge AI");
    expect(dashboard).toContain("Unified inbox");
    expect(dashboard).toContain("metric-card-action");
    expect(dashboard).toContain("tab-button");
    expect(dashboard).toContain("Overview");
    expect(dashboard).toContain("Evaluation");
    expect(dashboard).toContain("Synthetic Demo");
    expect(dashboard).toContain("Synthetic demo · Verified tools · Human approval required · Nothing is automatically sent.");
  });

  it("updates lifecycle states without exposing hidden policy values", () => {
    const store = new DemoStore();
    const processResult = store.processMessage("demo-002");
    expect(processResult.message.result).not.toBeNull();
    expect(JSON.stringify(processResult.message)).not.toContain("minimum_permitted_price_ugx");
    expect(processResult.message.result?.tool_calls.map((call) => call.tool_name)).toContain("findProductByPost");
    expect(processResult.message.status).toBe("awaiting_approval");

    const approved = store.approveMessage("demo-002");
    expect(approved.message.status).toBe("resolved");
    expect(approved.message.approval_note).toBe("Approved in synthetic demo - not sent externally.");

    const rejectProcessed = store.processMessage("demo-003");
    expect(rejectProcessed.message.result).not.toBeNull();
    const revised = store.requestRevision("demo-003");
    expect(revised.message.status).toBe("needs_revision");
    expect(revised.message.approval_note).toBe("Revision requested in synthetic demo.");

    const approvedRender = renderDashboardBody(makeViewModel(store, store.getMessage("demo-002"), { filters: { channel: "all", status: "all_messages", search: "" } }));

    const rejectedRender = renderDashboardBody(makeViewModel(store, store.getMessage("demo-003"), { filters: { channel: "all", status: "all_messages", search: "" } }));

    expect(approvedRender).toContain("Approved in synthetic demo - not sent externally.");
    expect(rejectedRender).toContain("Revision requested in synthetic demo.");
  });

  it("renders a single lifecycle chip and tabbed detail panels", () => {
    const store = new DemoStore();
    const specialized = store.getMessage("demo-008");
    expect(specialized).not.toBeNull();
    const specializedMessage = specialized as DemoMessageRecord;
    const rendered = renderDashboardBody(
      makeViewModel(store, specialized, {
        messages: [specializedMessage],
        selected_message: specializedMessage,
        filters: { channel: "all", status: "all_messages", search: "" },
      }),
    );

    expect((rendered.match(/title="Workflow status"/g) ?? []).length).toBe(1);
    expect(rendered).toContain('aria-selected="true"');
    expect(rendered).toContain("Overview");
    expect(rendered).toContain("Evidence");
    expect(rendered).toContain("Audit trace");
  });

  it("keeps ignored messages visible in the ignored filter and allows restore", () => {
    const store = new DemoStore();
    const ignored = store.ignoreMessage("demo-011", "spam");
    expect(ignored.message.status).toBe("ignored");
    expect(ignored.message.ignore_reason).toBe("spam");
    expect(ignored.metrics.ignored_messages).toBe(1);

    const ignoredVisible = filterMessages(store.getSnapshot().messages, { channel: "all", status: "ignored", search: "" });
    expect(ignoredVisible.map((message) => message.id)).toContain("demo-011");

    const restored = store.restoreMessage("demo-011");
    expect(restored.message.status).toBe("new");
    expect(restored.message.ignore_reason).toBeNull();
  });

  it("requests browser notification permission only when explicitly enabled", async () => {
    let calls = 0;
    const status = await requestBrowserNotificationPermission(async () => {
      calls += 1;
      return "granted";
    });

    expect(calls).toBe(1);
    expect(status.permission).toBe("granted");
    expect(status.supported).toBe(true);
    expect(createNotificationStatus("denied").explanation).toContain("denied");
  });

  it("creates a synthetic incoming message and a toast without moving the current selection", () => {
    const store = new DemoStore();
    const before = store.createBootstrap();
    const selectedBefore = before.selected_message_id;
    const incoming = store.simulateIncomingMessage().message;
    const after = store.createBootstrap();

    expect(after.messages.length).toBe(before.messages.length + 1);
    expect(after.metrics.total_inbox_messages).toBe(before.metrics.total_inbox_messages + 1);
    expect(after.metrics.new_messages).toBe(before.metrics.new_messages + 1);
    expect(after.selected_message_id).toBe(selectedBefore);
    expect(filterMessages(after.messages, { channel: "all", status: "new", search: "" }).map((message) => message.id)).toContain(incoming.id);

    const toast = createToastFromMessage(incoming);
    expect(toast.body).toContain("Preview:");
    expect(toast.title).toContain("Synthetic message");
  });

  it("deduplicates repeated evidence items in the presentation layer", () => {
    const store = new DemoStore();
    const processed = store.processMessage("demo-002").message;
    const duplicatedEvidence = {
      category: "verified" as const,
      label: "Repeated proof",
      value: "Synthetic evidence should only appear once",
    };
    const duplicatedMessage: DemoMessageRecord = {
      ...processed,
      result: processed.result
        ? {
            ...processed.result,
            evidence_items: [duplicatedEvidence, duplicatedEvidence, ...processed.result.evidence_items],
          }
        : null,
    };
    const duplicatedRender = renderDashboardBody(
      makeViewModel(store, duplicatedMessage, {
        messages: [duplicatedMessage],
        selected_message: duplicatedMessage,
        detail_tab: "evidence",
      }),
    );

    expect((duplicatedRender.match(/Repeated proof/g) ?? []).length).toBe(1);
    expect((duplicatedRender.match(/Synthetic evidence should only appear once/g) ?? []).length).toBe(1);
  });

  it("renders loading and error states when requested", () => {
    const store = new DemoStore();
    const bootstrap = store.createBootstrap();
    const loadingView = renderDashboardBody(
      makeViewModel(store, bootstrap.messages[0] ?? null, {
        filters: { channel: "all", status: "open", search: "price" },
        loading: true,
        error: "Unable to refresh demo data",
      }),
    );

    expect(loadingView).toContain("Unable to refresh demo data");
    expect(loadingView).toContain("Runtime loading...");
  });
});

describe("demo api", () => {
  let baseUrl = "";
  let serverHandle: Awaited<ReturnType<typeof startDemoServer>>;

  beforeAll(async () => {
    serverHandle = await startDemoServer(0);
    baseUrl = `http://127.0.0.1:${serverHandle.port}`;
  });

  afterAll(async () => {
    await serverHandle.close();
  });

  it("serves health, inbox, metrics, and evaluation summaries without leaked authoring fields", async () => {
    const health = await fetch(`${baseUrl}/api/health`).then(async (response) => {
      expect(response.status).toBe(200);
      return response.json() as Promise<{ ok: boolean; synthetic: boolean }>;
    });
    expect(health.ok).toBe(true);
    expect(health.synthetic).toBe(true);

    const inboxResponse = await fetch(`${baseUrl}/api/demo/messages`);
    expect(inboxResponse.status).toBe(200);
    const inbox = (await inboxResponse.json()) as { messages: Array<Record<string, unknown>> };
    const inboxText = JSON.stringify(inbox);
    expect(inbox.messages.length).toBeGreaterThan(0);
    expect(inboxText).not.toContain("expected");
    expect(inboxText).not.toContain("rationale");
    expect(inboxText).not.toContain("prohibited");
    expect(inboxText).not.toContain("minimum_permitted_price_ugx");

    const detailResponse = await fetch(`${baseUrl}/api/demo/messages/demo-001`);
    expect(detailResponse.status).toBe(200);
    const detail = (await detailResponse.json()) as { message: Record<string, unknown> };
    expect(JSON.stringify(detail)).not.toContain("expected");
    expect(JSON.stringify(detail)).not.toContain("minimum_permitted_price_ugx");

    const metricsResponse = await fetch(`${baseUrl}/api/demo/metrics`);
    expect(metricsResponse.status).toBe(200);
    const metrics = (await metricsResponse.json()) as { total_inbox_messages: number; qualified_leads: number };
    expect(metrics.total_inbox_messages).toBeGreaterThan(0);
    expect(metrics.qualified_leads).toBeGreaterThan(0);

    const evaluationResponse = await fetch(`${baseUrl}/api/demo/evaluation`);
    expect(evaluationResponse.status).toBe(200);
    const evaluation = (await evaluationResponse.json()) as { evaluation: Array<{ label: string; score: number }> };
    expect(evaluation.evaluation.map((entry) => entry.score)).toEqual([20, 60, 40, 60]);
    expect(evaluation.evaluation.map((entry) => entry.label)).toEqual([
      "baseline",
      "verified-tools",
      "model-led-mock",
      "guarded-hybrid-mock",
    ]);
  });

  it("serves the browser modules from the allowlisted asset URLs and references them from the root HTML", async () => {
    const rootResponse = await fetch(`${baseUrl}/`);
    expect(rootResponse.status).toBe(200);
    expect(rootResponse.headers.get("content-type")).toContain("text/html");
    const rootHtml = await rootResponse.text();
    expect(rootHtml).toContain('<script type="module" src="/assets/client.js"></script>');

    const clientJs = await assertJavaScriptAsset(`${baseUrl}/assets/client.js`);
    expect(clientJs).toContain('from "./alerts.js"');
    expect(clientJs).toContain('from "./render.js"');

    const renderJs = await assertJavaScriptAsset(`${baseUrl}/assets/render.js`);
    expect(renderJs).not.toContain('from "./');

    const alertsJs = await assertJavaScriptAsset(`${baseUrl}/assets/alerts.js`);
    expect(alertsJs).not.toContain('from "./');

    await walkBrowserImportGraph(baseUrl);

    const serverAsset = await fetch(`${baseUrl}/assets/server.js`);
    expect(serverAsset.status).toBe(404);
    const storeAsset = await fetch(`${baseUrl}/assets/store.js`);
    expect(storeAsset.status).toBe(404);
    const dataAsset = await fetch(`${baseUrl}/assets/data.js`);
    expect(dataAsset.status).toBe(404);

    const traversalResponse = await fetch(`${baseUrl}/assets/../server.js`);
    expect(traversalResponse.status).toBe(404);
  });

  it("processes and updates approvals for the verified-tools workflow", async () => {
    const processResponse = await fetch(`${baseUrl}/api/demo/messages/demo-002/process`, { method: "POST", body: "{}" });
    expect(processResponse.status).toBe(200);
    const processed = (await processResponse.json()) as {
      message: {
        status: string;
        result: { tool_calls: Array<{ tool_name: string }>; evidence_items: Array<{ category: string }>; draft: string; prediction: { product_id: string | null; action: string } };
      };
    };
    expect(processed.message.status).toBe("awaiting_approval");
    expect(processed.message.result.tool_calls.map((call) => call.tool_name)).toContain("findProductByPost");
    expect(processed.message.result.evidence_items.some((item) => item.category === "verified")).toBe(true);
    expect(processed.message.result.draft).not.toContain("sent");

    const approveResponse = await fetch(`${baseUrl}/api/demo/messages/demo-002/approve`, { method: "POST", body: "{}" });
    expect(approveResponse.status).toBe(200);
    const approved = (await approveResponse.json()) as { message: { status: string; approval_note: string } };
    expect(approved.message.status).toBe("resolved");
    expect(approved.message.approval_note).toBe("Approved in synthetic demo - not sent externally.");

    const reviseResponse = await fetch(`${baseUrl}/api/demo/messages/demo-003/process`, { method: "POST", body: "{}" });
    expect(reviseResponse.status).toBe(200);
    const reviseProcessed = (await reviseResponse.json()) as { message: { status: string; result: { prediction: { action: string } } } };
    expect(reviseProcessed.message.status).toBe("awaiting_approval");

    const requestRevisionResponse = await fetch(`${baseUrl}/api/demo/messages/demo-003/request-revision`, { method: "POST", body: "{}" });
    expect(requestRevisionResponse.status).toBe(200);
    const revised = (await requestRevisionResponse.json()) as { message: { status: string; approval_note: string } };
    expect(revised.message.status).toBe("needs_revision");
    expect(revised.message.approval_note).toBe("Revision requested in synthetic demo.");

    const ignoreResponse = await fetch(`${baseUrl}/api/demo/messages/demo-011/ignore`, {
      method: "POST",
      body: JSON.stringify({ reason: "spam" }),
    });
    expect(ignoreResponse.status).toBe(200);
    const ignored = (await ignoreResponse.json()) as { message: { status: string; ignore_reason: string | null } };
    expect(ignored.message.status).toBe("ignored");
    expect(ignored.message.ignore_reason).toBe("spam");

    const restoreResponse = await fetch(`${baseUrl}/api/demo/messages/demo-011/restore`, { method: "POST", body: "{}" });
    expect(restoreResponse.status).toBe(200);
    const restored = (await restoreResponse.json()) as { message: { status: string; ignore_reason: string | null } };
    expect(restored.message.status).toBe("new");
    expect(restored.message.ignore_reason).toBeNull();
  });

  it("returns safe errors for invalid message ids", async () => {
    const missing = await fetch(`${baseUrl}/api/demo/messages/not-a-real-message`);
    expect(missing.status).toBe(404);
    const missingJson = (await missing.json()) as { error: string; message?: string };
    expect(missingJson.error).toBe("message_not_found");

    const invalidProcess = await fetch(`${baseUrl}/api/demo/messages/not-a-real-message/process`, { method: "POST", body: "{}" });
    expect(invalidProcess.status).toBe(404);
    const invalidJson = (await invalidProcess.json()) as { error: string };
    expect(invalidJson.error).toBe("message_not_found");
  });
});
