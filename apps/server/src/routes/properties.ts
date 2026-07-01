import { Router } from "express";
import { PropertyFiltersSchema } from "@proptech/shared";
import {
  authMiddleware,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { createUserClient } from "../lib/supabase.js";
import { PropertyService } from "../services/property.service.js";

export const propertiesRouter: Router = Router();

propertiesRouter.use(authMiddleware);

propertiesRouter.get("/", async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const filters = PropertyFiltersSchema.parse(req.query);
    const supabase = createUserClient(authReq.accessToken);
    const service = new PropertyService(supabase);
    const result = await service.list(filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

propertiesRouter.get("/:id", async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const supabase = createUserClient(authReq.accessToken);
    const service = new PropertyService(supabase);
    const property = await service.getById(req.params.id);

    if (!property) {
      res.status(404).json({
        error: { code: "NOT_FOUND", message: "Propiedad no encontrada" },
      });
      return;
    }

    res.json(property);
  } catch (err) {
    next(err);
  }
});
