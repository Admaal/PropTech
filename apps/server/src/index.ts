import "./env.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { propertiesRouter } from "./routes/properties.js";
import { documentsRouter } from "./routes/documents.js";
import { analysesRouter } from "./routes/analyses.js";
import { adminRouter } from "./routes/admin.js";
import { errorHandler } from "./middleware/error-handler.js";
import { globalRateLimiter } from "./middleware/rate-limit.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { serverConfig } from "./lib/config.js";

const app = express();
const port = serverConfig.apiPort;
const corsOrigin = serverConfig.corsOrigin;

app.set("trust proxy", 1);
app.use(requestIdMiddleware);
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
app.use("/api/v1/admin", adminRouter);

app.use(errorHandler);

app.listen(port, "0.0.0.0", () => {
  console.log(`Server escuchando en el puerto ${port}`);
});
