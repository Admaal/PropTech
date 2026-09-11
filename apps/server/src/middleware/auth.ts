import type { NextFunction, Request, Response } from "express";
import { createUserClient } from "../lib/supabase.js";
import { isPlatformAdmin } from "../lib/platform-admin.js";
import { requestError } from "./request-id.js";

export interface AuthenticatedRequest extends Request {
  accessToken: string;
  userId: string;
  isPlatformAdmin: boolean;
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      res
        .status(401)
        .json(requestError(req, "UNAUTHORIZED", "Token de autenticación requerido"));
      return;
    }

    const accessToken = header.slice(7).trim();
    if (!accessToken) {
      res
        .status(401)
        .json(requestError(req, "UNAUTHORIZED", "Token de autenticación requerido"));
      return;
    }

    const supabase = createUserClient(accessToken);
    const { data, error } = await supabase.auth.getUser(accessToken);

    if (error || !data.user) {
      res
        .status(401)
        .json(requestError(req, "UNAUTHORIZED", "Token inválido o expirado"));
      return;
    }

    (req as AuthenticatedRequest).accessToken = accessToken;
    (req as AuthenticatedRequest).userId = data.user.id;
    (req as AuthenticatedRequest).isPlatformAdmin = await isPlatformAdmin(
      supabase,
      data.user.id,
    );

    next();
  } catch (error) {
    next(error);
  }
}

export function platformAdminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!(req as AuthenticatedRequest).isPlatformAdmin) {
    res
      .status(403)
      .json(requestError(req, "FORBIDDEN", "Permisos insuficientes"));
    return;
  }

  next();
}
