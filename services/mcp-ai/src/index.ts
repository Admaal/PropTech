import "./env.js";
import express from "express";
import { AnalyzeJobSchema } from "@proptech/shared";
import { resolveGeminiModels, runAnalysis } from "./analyze.js";

const app = express();
const port = Number(process.env.MCP_PORT ?? 3002);
const internalKey = process.env.INTERNAL_SERVICE_KEY ?? "dev-internal-key";

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "proptech-mcp-ai" });
});

function verifyInternal(req: express.Request, res: express.Response): boolean {
  const key = req.headers["x-internal-key"];
  if (key !== internalKey) {
    res.status(401).json({ error: "No autorizado" });
    return false;
  }
  return true;
}

// ponytail: fire-and-forget — el gateway no espera la inferencia
app.post("/analyze", (req, res) => {
  if (!verifyInternal(req, res)) return;

  try {
    const job = AnalyzeJobSchema.parse(req.body);
    res.status(202).json({ accepted: true, analysisId: job.analysisId });
    void runAnalysis(job);
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Payload inválido",
    });
  }
});

app.listen(port, () => {
  console.log(`MCP-AI escuchando en http://localhost:${port}`);
  console.log(`Modelos Gemini: ${resolveGeminiModels().join(", ")}`);
});
