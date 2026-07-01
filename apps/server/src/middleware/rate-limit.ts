import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";
import { serverConfig } from "../lib/config.js";
import type { AuthenticatedRequest } from "./auth.js";

function clientKey(req: Request): string {
  const userId = (req as AuthenticatedRequest).userId;
  if (userId) return userId;
  const ip = req.ip;
  if (!ip) return "anonymous";
  return ipKeyGenerator(ip);
}

export const globalRateLimiter = rateLimit({
  windowMs: serverConfig.rateLimitWindowMs,
  max: serverConfig.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Demasiadas peticiones. Inténtalo más tarde.",
    },
  },
});

export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: serverConfig.uploadRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientKey,
  message: {
    error: {
      code: "UPLOAD_RATE_LIMITED",
      message: "Límite de subidas alcanzado. Máximo 5 por hora.",
    },
  },
});
