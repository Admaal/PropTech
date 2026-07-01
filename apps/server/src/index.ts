import "./env.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { propertiesRouter } from "./routes/properties.js";
import { documentsRouter } from "./routes/documents.js";
import { analysesRouter } from "./routes/analyses.js";
import { errorHandler } from "./middleware/error-handler.js";
import { globalRateLimiter } from "./middleware/rate-limit.js";

const app = express();
const port = Number(process.env.API_PORT ?? 3001);
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:3000";

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());
app.use(globalRateLimiter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "proptech-server" });
});

app.use("/api/v1/properties", propertiesRouter);
app.use("/api/v1/documents", documentsRouter);
app.use("/api/v1/analyses", analysesRouter);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server escuchando en http://localhost:${port}`);
});
