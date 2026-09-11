import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import {
  authMiddleware,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { createUserClient } from "../lib/supabase.js";
import {
  DocumentService,
  DocumentUploadError,
} from "../services/document.service.js";
import { uploadRateLimiter } from "../middleware/rate-limit.js";
import { requestError } from "../middleware/request-id.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const UploadBodySchema = z.object({
  propertyId: z.string().uuid(),
});
const IdempotencyKeySchema = z.string().trim().min(16).max(128);

export const documentsRouter: Router = Router();

documentsRouter.use(authMiddleware);

documentsRouter.post(
  "/",
  uploadRateLimiter,
  upload.single("file"),
  async (req, res, next) => {
    try {
      const authReq = req as unknown as AuthenticatedRequest;

      if (!req.file) {
        res
          .status(400)
          .json(requestError(req, "MISSING_FILE", "Archivo PDF requerido"));
        return;
      }

      const { propertyId } = UploadBodySchema.parse(req.body);
      const idempotencyKey = IdempotencyKeySchema.parse(
        req.header("Idempotency-Key"),
      );
      const supabase = createUserClient(authReq.accessToken);
      const service = new DocumentService(supabase);
      const result = await service.uploadForProperty({
        propertyId,
        file: req.file,
        skipQuota: authReq.isPlatformAdmin,
        accessToken: authReq.accessToken,
        idempotencyKey,
      });

      res.status(202).json(result);
    } catch (err) {
      if (err instanceof DocumentUploadError) {
        const status =
          err.code === "NOT_FOUND"
            ? 404
            : err.code === "QUOTA_EXCEEDED"
              ? 429
              : err.code === "UPLOAD_ROLLBACK_FAILED"
                ? 500
              : 400;
        res.status(status).json(requestError(req, err.code, err.message));
        return;
      }
      next(err);
    }
  },
);
