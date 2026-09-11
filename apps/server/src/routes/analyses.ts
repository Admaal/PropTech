import { Router } from "express";
import { z } from "zod";
import { AnalysisListQuerySchema } from "@proptech/shared";
import {
  authMiddleware,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { createUserClient } from "../lib/supabase.js";
import { AnalysisService } from "../services/analysis.service.js";
import { requestError } from "../middleware/request-id.js";

import { analysesPollRateLimiter } from "../middleware/rate-limit.js";

export const analysesRouter: Router = Router();

analysesRouter.use(authMiddleware);
analysesRouter.use(analysesPollRateLimiter);

analysesRouter.get("/", async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const query = AnalysisListQuerySchema.parse(req.query);
    const supabase = createUserClient(authReq.accessToken);
    const service = new AnalysisService(supabase);
    const data = query.propertyId
      ? await service.listByProperty(query.propertyId)
      : await service.listRecent();
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

analysesRouter.get("/:id", async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const id = z.string().uuid().parse(req.params.id);
    const supabase = createUserClient(authReq.accessToken);
    const service = new AnalysisService(supabase);
    const analysis = await service.getById(id);

    if (!analysis) {
      res
        .status(404)
        .json(requestError(req, "NOT_FOUND", "Análisis no encontrado"));
      return;
    }

    res.json(analysis);
  } catch (err) {
    next(err);
  }
});
