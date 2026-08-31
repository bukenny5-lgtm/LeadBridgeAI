import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DemoStore } from "./store.js";
import { renderDashboardShell } from "./render.js";

const store = new DemoStore();

const browserAssets = new Map<string, string>([
  ["/assets/client.js", "client.js"],
  ["/assets/render.js", "render.js"],
  ["/assets/alerts.js", "alerts.js"],
]);

function sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  const body = `${JSON.stringify(payload, null, 2)}\n`;
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(body);
}

function sendText(response: ServerResponse, statusCode: number, payload: string, contentType = "text/plain; charset=utf-8"): void {
  response.writeHead(statusCode, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
  });
  response.end(payload);
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) {
    return {};
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text.trim() ? JSON.parse(text) : {};
}

function getMessageIdFromPath(pathname: string, suffix: string): string | null {
  if (!pathname.startsWith("/api/demo/messages/")) {
    return null;
  }
  const remainder = pathname.slice("/api/demo/messages/".length);
  const [messageId, maybeSuffix] = remainder.split("/", 2);
  if (!messageId || maybeSuffix !== suffix) {
    return null;
  }
  return decodeURIComponent(messageId);
}

function getMessageIdFromDetails(pathname: string): string | null {
  if (!pathname.startsWith("/api/demo/messages/")) {
    return null;
  }
  const remainder = pathname.slice("/api/demo/messages/".length);
  const [messageId, maybeSuffix] = remainder.split("/", 2);
  if (!messageId || maybeSuffix) {
    return null;
  }
  return decodeURIComponent(messageId);
}

function getAssetPath(urlPath: string): string | null {
  const assetFile = browserAssets.get(urlPath);
  if (!assetFile) {
    return null;
  }
  const projectRoot = process.cwd();
  const distCandidate = join(projectRoot, "dist", "demo", assetFile);
  if (existsSync(distCandidate)) {
    return distCandidate;
  }
  const serverDir = dirname(fileURLToPath(import.meta.url));
  const localCandidate = join(serverDir, assetFile);
  if (existsSync(localCandidate)) {
    return localCandidate;
  }
  return null;
}

function buildMessageResponse(messageId: string) {
  const message = store.getMessage(messageId);
  if (!message) {
    return null;
  }
  return {
    message,
    metrics: store.getSnapshot().metrics,
  };
}

function readReason(body: unknown): string {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "";
  }
  const value = (body as { reason?: unknown }).reason;
  return typeof value === "string" ? value : "";
}

function handleMessageAction(
  action: "process" | "approve" | "request-revision" | "resolve" | "ignore" | "restore" | "simulate",
  messageId: string,
  body: unknown = {},
): { statusCode: number; payload: unknown } {
  if (action === "simulate") {
    const result = store.simulateIncomingMessage();
    return { statusCode: 200, payload: { ...result, message: store.getMessage(result.message.id) } };
  }
  if (action === "process") {
    const result = store.processMessage(messageId);
    return { statusCode: 200, payload: { ...result, message: store.getMessage(messageId) } };
  }
  if (action === "approve") {
    const result = store.approveMessage(messageId);
    return { statusCode: 200, payload: { ...result, message: store.getMessage(messageId) } };
  }
  if (action === "request-revision") {
    const result = store.requestRevision(messageId);
    return { statusCode: 200, payload: { ...result, message: store.getMessage(messageId) } };
  }
  if (action === "resolve") {
    const result = store.resolveSpecializedReview(messageId);
    return { statusCode: 200, payload: { ...result, message: store.getMessage(messageId) } };
  }
  if (action === "ignore") {
    const result = store.ignoreMessage(messageId, readReason(body));
    return { statusCode: 200, payload: { ...result, message: store.getMessage(messageId) } };
  }
  const result = store.restoreMessage(messageId);
  return { statusCode: 200, payload: { ...result, message: store.getMessage(messageId) } };
}

async function handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url ?? "/", "http://localhost");
  const { pathname } = url;

  try {
    if (request.method === "GET" && pathname === "/api/health") {
      sendJson(response, 200, { ok: true, service: "leadbridge-demo", synthetic: true });
      return;
    }

    if (request.method === "GET" && pathname === "/api/demo/messages") {
      sendJson(response, 200, { messages: store.listMessages({ channel: "all", status: "all_messages", search: "" }) });
      return;
    }

    if (request.method === "GET" && pathname.startsWith("/api/demo/messages/")) {
      const messageId = getMessageIdFromDetails(pathname);
      if (!messageId) {
        sendJson(response, 404, { error: "message_not_found" });
        return;
      }
      const messageResponse = buildMessageResponse(messageId);
      if (!messageResponse) {
        sendJson(response, 404, { error: "message_not_found" });
        return;
      }
      sendJson(response, 200, messageResponse);
      return;
    }

    if (request.method === "POST") {
      if (pathname === "/api/demo/messages/simulate") {
        const body = await readJsonBody(request);
        void body;
        const payload = handleMessageAction("simulate", "synthetic");
        sendJson(response, payload.statusCode, payload.payload);
        return;
      }
      const messageId = getMessageIdFromPath(pathname, "process");
      if (messageId) {
        if (!store.getMessage(messageId)) {
          sendJson(response, 404, { error: "message_not_found" });
          return;
        }
        const payload = handleMessageAction("process", messageId);
        sendJson(response, payload.statusCode, payload.payload);
        return;
      }
      const approveId = getMessageIdFromPath(pathname, "approve");
      if (approveId) {
        if (!store.getMessage(approveId)) {
          sendJson(response, 404, { error: "message_not_found" });
          return;
        }
        const payload = handleMessageAction("approve", approveId);
        sendJson(response, payload.statusCode, payload.payload);
        return;
      }
      const reviseId = getMessageIdFromPath(pathname, "request-revision");
      if (reviseId) {
        if (!store.getMessage(reviseId)) {
          sendJson(response, 404, { error: "message_not_found" });
          return;
        }
        const payload = handleMessageAction("request-revision", reviseId);
        sendJson(response, payload.statusCode, payload.payload);
        return;
      }
      const resolveId = getMessageIdFromPath(pathname, "resolve");
      if (resolveId) {
        if (!store.getMessage(resolveId)) {
          sendJson(response, 404, { error: "message_not_found" });
          return;
        }
        const payload = handleMessageAction("resolve", resolveId);
        sendJson(response, payload.statusCode, payload.payload);
        return;
      }
      const ignoreId = getMessageIdFromPath(pathname, "ignore");
      if (ignoreId) {
        if (!store.getMessage(ignoreId)) {
          sendJson(response, 404, { error: "message_not_found" });
          return;
        }
        const body = await readJsonBody(request);
        const payload = handleMessageAction("ignore", ignoreId, body);
        sendJson(response, payload.statusCode, payload.payload);
        return;
      }
      const restoreId = getMessageIdFromPath(pathname, "restore");
      if (restoreId) {
        if (!store.getMessage(restoreId)) {
          sendJson(response, 404, { error: "message_not_found" });
          return;
        }
        const payload = handleMessageAction("restore", restoreId);
        sendJson(response, payload.statusCode, payload.payload);
        return;
      }

      if (pathname === "/api/demo/metrics") {
        const body = await readJsonBody(request);
        void body;
        sendJson(response, 200, store.getSnapshot().metrics);
        return;
      }
    }

    if (request.method === "GET" && pathname === "/api/demo/metrics") {
      sendJson(response, 200, store.getSnapshot().metrics);
      return;
    }

    if (request.method === "GET" && pathname === "/api/demo/evaluation") {
      sendJson(response, 200, { evaluation: store.createBootstrap().evaluation });
      return;
    }

    if (request.method === "GET" && pathname === "/") {
      const bootstrap = store.createBootstrap();
      sendText(response, 200, renderDashboardShell(JSON.stringify(bootstrap)), "text/html; charset=utf-8");
      return;
    }

    const assetPath = getAssetPath(pathname);
    if (request.method === "GET" && assetPath) {
      const asset = readFileSync(assetPath, "utf8");
      sendText(response, 200, asset, "application/javascript; charset=utf-8");
      return;
    }

    sendJson(response, 404, { error: "not_found" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    sendJson(response, 400, { error: "demo_request_failed", message });
  }
}

export function startDemoServer(port = 3000): Promise<{ port: number; close: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const server = createServer((request, response) => {
      void handleRequest(request, response);
    });

    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      if (typeof address === "object" && address && "port" in address) {
        resolve({
          port: address.port,
          close: () =>
            new Promise<void>((closeResolve, closeReject) => {
              server.close((error) => {
                if (error) {
                  closeReject(error);
                  return;
                }
                closeResolve();
              });
            }),
        });
      }
    });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 4173);
  startDemoServer(port).then(({ port: actualPort }) => {
    process.stdout.write(`LeadBridge demo running at http://127.0.0.1:${actualPort}\n`);
  });
}
