import { Router } from "express";
import { z } from "zod";
import {
  authMiddleware,
  platformAdminMiddleware,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { createUserClient } from "../lib/supabase.js";
import {
  AdminDataNotFoundError,
  AdminDataService,
} from "../services/admin-data.service.js";
import { requestError } from "../middleware/request-id.js";

const IdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const adminRouter: Router = Router();

adminRouter.use(authMiddleware, platformAdminMiddleware);

adminRouter.delete("/properties/:id", async (req, res, next) => {
  try {
    const { id } = IdParamsSchema.parse(req.params);
    const authReq = req as unknown as AuthenticatedRequest;
    const service = new AdminDataService(createUserClient(authReq.accessToken));

    await service.deleteProperty(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

adminRouter.delete("/analyses/:id", async (req, res, next) => {
  try {
    const { id } = IdParamsSchema.parse(req.params);
    const authReq = req as unknown as AuthenticatedRequest;
    const service = new AdminDataService(createUserClient(authReq.accessToken));

    await service.deleteAnalysis(id);
    res.status(204).send();
  } catch (err) {
    if (err instanceof AdminDataNotFoundError) {
      res.status(404).json(requestError(req, "NOT_FOUND", err.message));
      return;
    }
    next(err);
  }
});
