import { createServer as createNodeServer } from "node:http";
import { URL } from "node:url";

import type { IncomingMessage, Server, ServerResponse } from "node:http";
import type { Logger } from "../lib/logging/types.js";
import type { HttpResponse } from "./simulate-by-id.controller.js";

type ControllerHandler = (request: { body: unknown }) => Promise<HttpResponse>;

export interface HttpServerConfig {
  port: number;
  host?: string;
  logger: Logger;
  controllers: {
    simulateById: ControllerHandler;
  };
  bodyLimitBytes?: number;
}

const DEFAULT_LIMIT = 512 * 1024; // 512 KiB; suficiente para JSON de disparos

export async function startHttpServer(config: HttpServerConfig): Promise<Server> {
  const logger = config.logger.child({ module: "http" });
  const limit = config.bodyLimitBytes ?? DEFAULT_LIMIT;

  const server = createNodeServer((req, res) => {
    void handleRequest(req, res, {
      controllers: config.controllers,
      limit,
      logger,
    });
  });

  const listenHost = config.host ?? "0.0.0.0";

  return new Promise<Server>((resolve, reject) => {
    server.on("error", (error) => {
      logger.error("http server failed", { evt: "http.listen.error", err: error.message });
      reject(error);
    });

    server.listen(config.port, listenHost, () => {
      logger.info("http server listening", {
        evt: "http.listen",
        port: config.port,
        host: listenHost,
      });
      resolve(server);
    });
  });
}

class PayloadTooLargeError extends Error {}
class BadRequestError extends Error {}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  ctx: {
    controllers: HttpServerConfig["controllers"];
    limit: number;
    logger: Logger;
  },
): Promise<void> {
  const method = req.method ?? "GET";
  const reqUrl = req.url ?? "/";
  const url = new URL(reqUrl, `http://${req.headers.host ?? "localhost"}`);

  if (method === "POST" && url.pathname === "/simulate/by-id") {
    try {
      const body = await readJsonBody(req, ctx.limit);
      const response = await ctx.controllers.simulateById({ body });
      sendJson(res, response.status, response.body);
    } catch (error) {
      if (error instanceof PayloadTooLargeError) {
        ctx.logger.warn("payload too large", { evt: "http.reject", path: url.pathname });
        sendJson(res, 413, { error: "Payload too large" });
        return;
      }
      if (error instanceof BadRequestError) {
        ctx.logger.warn("bad request body", { evt: "http.reject", reason: error.message });
        sendJson(res, 400, { error: error.message });
        return;
      }

      ctx.logger.error("unexpected error handling request", {
        evt: "http.error",
        path: url.pathname,
        err: error instanceof Error ? error.message : "unknown",
      });
      sendJson(res, 500, { error: "Internal Server Error" });
    }
    return;
  }

  sendJson(res, 404, { error: "Not Found" });
}

async function readJsonBody(req: IncomingMessage, limit: number): Promise<unknown> {
  const contentType = req.headers["content-type"];
  if (contentType && !contentType.startsWith("application/json")) {
    throw new BadRequestError("Content-Type must be application/json");
  }

  const chunks: Buffer[] = [];
  let total = 0;
  const iterable = req as AsyncIterable<string | Buffer>;
  for await (const chunk of iterable) {
    const buffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
    total += buffer.length;
    if (total > limit) {
      throw new PayloadTooLargeError();
    }
    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed;
  } catch {
    throw new BadRequestError("Invalid JSON payload");
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = body !== undefined ? JSON.stringify(body) : "";
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Length", Buffer.byteLength(payload));
  res.end(payload);
}
