import "./env.js";
import express from "express";
import { AnalyzeJobSchema } from "@proptech/shared";
import { ZodError } from "zod";
import {
  reconcileAnalysisJobs,
  resolveGeminiModels,
  runAnalysis,
} from "./analyze.js";
import { parseMcpConfig } from "./runtime-config.js";

const runtimeConfig = parseMcpConfig(process.env);
const { internalServiceKey: internalKey } = runtimeConfig;

const app = express();
const port = runtimeConfig.port;

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

function verifyInternal(req: express.Request, res: express.Response): boolean {
  const key = req.headers["x-internal-key"];
  if (key !== internalKey) {
    res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "No autorizado" },
    });
    return false;
  }
  return true;
}

app.post("/analyze", (req, res) => {
  if (!verifyInternal(req, res)) return;

  try {
    const job = AnalyzeJobSchema.parse(req.body);
    res.status(202).json({ accepted: true, analysisId: job.analysisId });
    void runAnalysis(job).catch(() => {
      console.error(`[mcp-ai] Fallo inesperado del job ${job.analysisId}`);
    });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: err.issues.map((i) => i.message).join(", "),
        },
      });
      return;
    }
    res.status(400).json({
      error: {
        code: "INVALID_PAYLOAD",
        message: "Payload inválido",
      },
    });
  }
});

function scheduleRecovery(): void {
  void reconcileAnalysisJobs().catch(() => {
    console.error("[mcp-ai] Falló la reconciliación de jobs");
  });
}

const recoveryTimer = setInterval(scheduleRecovery, 60_000);
recoveryTimer.unref();
scheduleRecovery();

app.listen(port, "0.0.0.0", () => {
  console.log(`MCP-AI escuchando en el puerto ${port}`);
  console.log(`Modelos Gemini: ${resolveGeminiModels().join(", ")}`);
});
