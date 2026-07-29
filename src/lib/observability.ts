import { createHash, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const SENSITIVE_KEYS =
  /message|text|content|summary|email|phone|name|token|authorization|password|comment/i;
const IDENTIFIER_KEYS = /userId|uid|counsellorId|sessionId|conversationId/i;

export function pseudonymizeIdentifier(value: string): string {
  const salt = process.env.TELEMETRY_HASH_SALT || "development-only";
  return createHash("sha256")
    .update(`${salt}:${value}`)
    .digest("hex")
    .slice(0, 16);
}

export function sanitizeTelemetry(
  value: unknown,
  key = "",
): unknown {
  if (SENSITIVE_KEYS.test(key)) return "[REDACTED]";
  if (IDENTIFIER_KEYS.test(key) && typeof value === "string") {
    return pseudonymizeIdentifier(value);
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeTelemetry(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([childKey, child]) => [
        childKey,
        sanitizeTelemetry(child, childKey),
      ]),
    );
  }
  return value;
}

export function logOperationalEvent(
  level: "info" | "warn" | "error",
  event: string,
  fields: Record<string, unknown> = {},
): void {
  const output = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...(sanitizeTelemetry(fields) as Record<string, unknown>),
  });
  if (level === "error") console.error(output);
  else if (level === "warn") console.warn(output);
  else console.info(output);
}

export async function recordOperationalMetric(
  metric: string,
  value = 1,
): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);
  try {
    const { error } = await getSupabaseAdmin().rpc("increment_daily_metric", {
      metric_date: day,
      metric_name: metric,
      metric_value: value,
    });
    if (error) throw error;
  } catch (error) {
    logOperationalEvent("warn", "metric.write_failed", {
      metric,
      errorType: error instanceof Error ? error.name : "unknown",
    });
  }
}

type RouteHandler<TArgs extends unknown[]> = (
  request: NextRequest,
  ...args: TArgs
) => Promise<Response>;

export function withApiObservability<TArgs extends unknown[]>(
  routeName: string,
  handler: RouteHandler<TArgs>,
): RouteHandler<TArgs> {
  return async (request, ...args) => {
    const requestId =
      request.headers.get("x-request-id")?.slice(0, 128) || randomUUID();
    const startedAt = Date.now();
    try {
      const response = await handler(request, ...args);
      const durationMs = Date.now() - startedAt;
      logOperationalEvent("info", "api.request_completed", {
        requestId,
        route: routeName,
        method: request.method,
        status: response.status,
        durationMs,
      });
      void recordOperationalMetric(`route_${routeName}_requests`);
      if (response.status >= 500) {
        void recordOperationalMetric(`route_${routeName}_errors`);
      }
      response.headers.set("x-request-id", requestId);
      response.headers.set("server-timing", `app;dur=${durationMs}`);
      return response;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      logOperationalEvent("error", "api.request_failed", {
        requestId,
        route: routeName,
        method: request.method,
        durationMs,
        errorType: error instanceof Error ? error.name : "unknown",
      });
      void recordOperationalMetric(`route_${routeName}_errors`);
      return NextResponse.json(
        { success: false, error: "Internal service error", requestId },
        { status: 500, headers: { "x-request-id": requestId } },
      );
    }
  };
}
