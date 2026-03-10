import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma";

// Sensitive headers to exclude from logging
const SENSITIVE_HEADERS = [
  "authorization",
  "cookie",
  "x-api-key",
  "x-auth-token",
];

// Sensitive body fields to mask
const SENSITIVE_FIELDS = ["password", "token", "secret", "creditCard", "cvv"];

// Paths to exclude from audit logging (e.g., health checks, webhooks)
const EXCLUDED_PATHS = ["/"];

function maskSensitiveData(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;

  const masked = { ...obj };
  for (const key of Object.keys(masked)) {
    if (SENSITIVE_FIELDS.some((field) => key.toLowerCase().includes(field))) {
      masked[key] = "[REDACTED]";
    } else if (typeof masked[key] === "object") {
      masked[key] = maskSensitiveData(masked[key]);
    }
  }
  return masked;
}

function filterHeaders(headers: any): any {
  const filtered: any = {};
  for (const [key, value] of Object.entries(headers)) {
    if (!SENSITIVE_HEADERS.includes(key.toLowerCase())) {
      filtered[key] = value;
    } else {
      filtered[key] = "[REDACTED]";
    }
  }
  return filtered;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

export async function auditLogger(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Skip excluded paths
  if (EXCLUDED_PATHS.includes(req.path)) {
    return next();
  }

  const startTime = Date.now();

  // Capture response body by intercepting res.json and res.send
  let responseBody: any = null;
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  res.json = function (body: any) {
    responseBody = body;
    return originalJson(body);
  };

  res.send = function (body: any) {
    // Only capture if it looks like JSON and we haven't captured via res.json
    if (responseBody === null && typeof body === "string") {
      try {
        responseBody = JSON.parse(body);
      } catch {
        responseBody = { raw: body.substring(0, 1000) }; // Truncate non-JSON
      }
    }
    return originalSend(body);
  };

  // Continue with request
  next();

  // Log after response is finished
  res.on("finish", async () => {
    const responseTime = Date.now() - startTime;

    // Build complete request object
    const requestObject = {
      method: req.method,
      path: req.path,
      url: req.originalUrl,
      query: req.query,
      params: req.params,
      body: maskSensitiveData(req.body),
      headers: filterHeaders(req.headers),
      ip: getClientIp(req),
      userAgent: req.headers["user-agent"],
      user: req.user
        ? {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role,
          }
        : null,
    };

    // Build complete response object
    const responseObject = {
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
      headers: res.getHeaders(),
      body: maskSensitiveData(responseBody),
      responseTimeMs: responseTime,
    };

    try {
      await prisma.$executeRaw`
        INSERT INTO audit_logs (
          method,
          path,
          query,
          body,
          headers,
          user_id,
          user_email,
          user_role,
          status_code,
          response_time_ms,
          response_body,
          ip_address,
          user_agent
        ) VALUES (
          ${req.method},
          ${req.path},
          ${JSON.stringify(req.query)}::jsonb,
          ${JSON.stringify(requestObject)}::jsonb,
          ${JSON.stringify(filterHeaders(req.headers))}::jsonb,
          ${req.user?.id ? req.user.id : null}::uuid,
          ${req.user?.email || null},
          ${req.user?.role || null},
          ${res.statusCode},
          ${responseTime},
          ${JSON.stringify(responseObject)}::jsonb,
          ${getClientIp(req)},
          ${req.headers["user-agent"] || null}
        )
      `;
    } catch (error) {
      // Don't let audit logging failures affect the request
      console.error("Audit logging failed:", error);
    }
  });
}
