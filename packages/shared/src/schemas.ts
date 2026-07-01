import { z } from "zod";

export const RiskLevelSchema = z.enum(["low", "medium", "high"]);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const MemberRoleSchema = z.enum(["admin", "member"]);
export type MemberRole = z.infer<typeof MemberRoleSchema>;

export const AnalysisStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
]);
export type AnalysisStatus = z.infer<typeof AnalysisStatusSchema>;

export const PropertyFiltersSchema = z.object({
  priceMin: z.coerce.number().min(0).optional(),
  priceMax: z.coerce.number().min(0).optional(),
  sqmMin: z.coerce.number().min(0).optional(),
  bbox: z
    .string()
    .regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/)
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PropertyFilters = z.infer<typeof PropertyFiltersSchema>;

export const PropertySchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  title: z.string(),
  address: z.string(),
  city: z.string(),
  price_monthly: z.number(),
  sqm: z.number(),
  bedrooms: z.number().int(),
  risk_level: RiskLevelSchema.nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  description: z.string().nullable().optional(),
  image_urls: z.array(z.string().url()).default([]),
  created_at: z.string(),
});
export type Property = z.infer<typeof PropertySchema>;

export const LatestAnalysisSummarySchema = z.object({
  id: z.string().uuid(),
  risk_level: RiskLevelSchema.nullable(),
  solvency_score: z.number().nullable(),
  completed_at: z.string().nullable(),
});
export type LatestAnalysisSummary = z.infer<typeof LatestAnalysisSummarySchema>;

export const PropertyListItemSchema = PropertySchema.extend({
  latest_analysis: LatestAnalysisSummarySchema.nullable(),
});
export type PropertyListItem = z.infer<typeof PropertyListItemSchema>;

const aiOptionalString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => v ?? undefined);

const aiOptionalNumber = z
  .union([z.number(), z.null()])
  .optional()
  .transform((v) => v ?? undefined);

export const ExtractedDataSchema = z.object({
  monthly_income: aiOptionalNumber,
  employer: aiOptionalString,
  contract_type: aiOptionalString,
  anomalies: z
    .union([z.array(z.string()), z.null()])
    .optional()
    .transform((v) => v ?? []),
});
export type ExtractedData = z.infer<typeof ExtractedDataSchema>;

export const AnalysisResultSchema = z.object({
  solvency_score: z.number().min(0).max(100),
  risk_level: RiskLevelSchema,
  extracted_data: ExtractedDataSchema,
  report_markdown: z.string(),
});
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

export const DocumentAnalysisSchema = z.object({
  id: z.string().uuid(),
  document_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  status: AnalysisStatusSchema,
  risk_level: RiskLevelSchema.nullable(),
  solvency_score: z.number().nullable(),
  extracted_data: ExtractedDataSchema.nullable(),
  report_markdown: z.string().nullable(),
  tokens_used: z.number().nullable(),
  duration_ms: z.number().nullable(),
  error_message: z.string().nullable(),
  created_at: z.string(),
  completed_at: z.string().nullable(),
});
export type DocumentAnalysis = z.infer<typeof DocumentAnalysisSchema>;

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const PaginatedPropertiesSchema = z.object({
  data: z.array(PropertyListItemSchema),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
});
export type PaginatedProperties = z.infer<typeof PaginatedPropertiesSchema>;

export const DocumentSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  property_id: z.string().uuid().nullable(),
  filename: z.string(),
  storage_path: z.string(),
  mime_type: z.string(),
  created_at: z.string(),
});
export type Document = z.infer<typeof DocumentSchema>;

export const UploadDocumentResponseSchema = z.object({
  document: DocumentSchema,
  analysis_id: z.string().uuid(),
});
export type UploadDocumentResponse = z.infer<typeof UploadDocumentResponseSchema>;

export const AnalyzeJobSchema = z.object({
  analysisId: z.string().uuid(),
  documentId: z.string().uuid(),
  storagePath: z.string(),
  organizationId: z.string().uuid(),
});
export type AnalyzeJob = z.infer<typeof AnalyzeJobSchema>;

export const DocumentAnalysisWithFilenameSchema = DocumentAnalysisSchema.extend({
  filename: z.string().nullable().optional(),
  property_id: z.string().uuid().nullable().optional(),
});
export type DocumentAnalysisWithFilename = z.infer<
  typeof DocumentAnalysisWithFilenameSchema
>;

export const AnalysisListQuerySchema = z.object({
  propertyId: z.string().uuid().optional(),
});
export type AnalysisListQuery = z.infer<typeof AnalysisListQuerySchema>;
