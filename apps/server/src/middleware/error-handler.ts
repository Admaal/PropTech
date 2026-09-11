import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { type RequestWithId } from "./request-id.js";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = (req as RequestWithId).requestId;

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: err.issues.map((issue) => issue.message).join(", "),
        request_id: requestId,
      },
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({
        error: {
          code: "FILE_TOO_LARGE",
          message: "El archivo no puede superar 10 MB",
          request_id: requestId,
        },
      });
      return;
    }
    res.status(400).json({
      error: {
        code: "UPLOAD_ERROR",
          message: "No se pudo procesar la subida",
          request_id: requestId,
      },
    });
    return;
  }

  console.error(
    `[request:${requestId ?? "unknown"}] Error interno`,
    err instanceof Error ? err.name : "UnknownError",
  );
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Error interno del servidor",
      request_id: requestId,
    },
  });
}
