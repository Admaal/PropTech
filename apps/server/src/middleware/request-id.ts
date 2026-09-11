import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;

export interface RequestWithId extends Request {
  requestId: string;
}

export function requestError(
  req: Request,
  code: string,
  message: string,
): {
  error: { code: string; message: string; request_id?: string };
} {
  return {
    error: {
      code,
      message,
      request_id: (req as RequestWithId).requestId,
    },
  };
}

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const supplied = req.header("x-request-id");
  const requestId =
    supplied && REQUEST_ID_PATTERN.test(supplied) ? supplied : randomUUID();

  (req as RequestWithId).requestId = requestId;
  res.setHeader("X-Request-ID", requestId);
  next();
}
