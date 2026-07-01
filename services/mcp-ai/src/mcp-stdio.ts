import "./env.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { runAnalysis } from "./analyze.js";

const server = new McpServer({
  name: "proptech-mcp-ai",
  version: "1.0.0",
});

server.tool(
  "analyze_financial_document",
  "Analiza un PDF financiero y actualiza document_analyses en Supabase",
  {
    analysisId: z.string().uuid(),
    documentId: z.string().uuid(),
    storagePath: z.string(),
    organizationId: z.string().uuid(),
  },
  async (job) => {
    await runAnalysis(job);
    return {
      content: [
        {
          type: "text",
          text: `Análisis ${job.analysisId} procesado`,
        },
      ],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
