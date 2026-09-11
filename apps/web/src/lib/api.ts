import type {
  DocumentAnalysis,
  DocumentAnalysisWithFilename,
  PropertyListItem,
  UploadDocumentResponse,
} from "@proptech/shared";
import {
  ApiErrorSchema,
  DocumentAnalysisSchema,
  DocumentAnalysisWithFilenameSchema,
  PaginatedPropertiesSchema,
  PropertyListItemSchema,
  UploadDocumentResponseSchema,
} from "@proptech/shared";
import { fetchWithRetry } from "@/lib/fetch-with-retry";
import { publicEnv } from "@/lib/public-env";

const API_URL = publicEnv.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseError(res: Response): Promise<ApiError> {
  const body: unknown = await res.json().catch(() => ({}));
  const parsed = ApiErrorSchema.safeParse(body);
  return new ApiError(
    parsed.success ? parsed.data.error.message : "Error en la petición",
    parsed.success ? parsed.data.error.code : undefined,
    res.status,
  );
}

export async function fetchProperties(
  accessToken: string,
  params?: Record<string, string>,
): Promise<{
  data: PropertyListItem[];
  total: number;
  page: number;
  limit: number;
}> {
  const search = new URLSearchParams(params);
  const res = await fetchWithRetry(`${API_URL}/api/v1/properties?${search}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  return PaginatedPropertiesSchema.parse(await res.json());
}

export async function fetchProperty(
  accessToken: string,
  id: string,
): Promise<PropertyListItem> {
  const res = await fetchWithRetry(`${API_URL}/api/v1/properties/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  return PropertyListItemSchema.parse(await res.json());
}

export async function uploadDocument(
  accessToken: string,
  propertyId: string,
  file: File,
): Promise<UploadDocumentResponse> {
  const form = new FormData();
  form.append("propertyId", propertyId);
  form.append("file", file);

  const res = await fetchWithRetry(`${API_URL}/api/v1/documents`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: form,
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  return UploadDocumentResponseSchema.parse(await res.json());
}

export async function fetchAnalysis(
  accessToken: string,
  id: string,
): Promise<DocumentAnalysis> {
  const res = await fetchWithRetry(`${API_URL}/api/v1/analyses/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  return DocumentAnalysisSchema.parse(await res.json());
}

export async function fetchAnalyses(
  accessToken: string,
  propertyId?: string,
): Promise<DocumentAnalysisWithFilename[]> {
  const search = propertyId
    ? `?propertyId=${encodeURIComponent(propertyId)}`
    : "";
  const res = await fetchWithRetry(`${API_URL}/api/v1/analyses${search}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  const body: unknown = await res.json();
  const data =
    Array.isArray(body)
      ? body
      : body !== null && typeof body === "object" && "data" in body
        ? body.data
        : undefined;
  return DocumentAnalysisWithFilenameSchema.array().parse(data);
}

async function deleteAdminResource(
  accessToken: string,
  resource: "properties" | "analyses",
  id: string,
): Promise<void> {
  const res = await fetchWithRetry(`${API_URL}/api/v1/admin/${resource}/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw await parseError(res);
  }
}

export function deleteAdminProperty(
  accessToken: string,
  propertyId: string,
): Promise<void> {
  return deleteAdminResource(accessToken, "properties", propertyId);
}

export function deleteAdminAnalysis(
  accessToken: string,
  analysisId: string,
): Promise<void> {
  return deleteAdminResource(accessToken, "analyses", analysisId);
}
