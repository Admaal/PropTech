import type {
  DocumentAnalysis,
  DocumentAnalysisWithFilename,
  PropertyListItem,
  UploadDocumentResponse,
} from "@proptech/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

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
  const body = await res.json().catch(() => ({}));
  const error = (body as { error?: { code?: string; message?: string } }).error;
  return new ApiError(
    error?.message ?? "Error en la petición",
    error?.code,
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
  const res = await fetch(`${API_URL}/api/v1/properties?${search}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  return res.json();
}

export async function fetchProperty(
  accessToken: string,
  id: string,
): Promise<PropertyListItem> {
  const res = await fetch(`${API_URL}/api/v1/properties/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  return res.json();
}

export async function uploadDocument(
  accessToken: string,
  propertyId: string,
  file: File,
): Promise<UploadDocumentResponse> {
  const form = new FormData();
  form.append("propertyId", propertyId);
  form.append("file", file);

  const res = await fetch(`${API_URL}/api/v1/documents`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  return res.json();
}

export async function fetchAnalysis(
  accessToken: string,
  id: string,
): Promise<DocumentAnalysis> {
  const res = await fetch(`${API_URL}/api/v1/analyses/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  return res.json();
}

export async function fetchAnalyses(
  accessToken: string,
  propertyId?: string,
): Promise<DocumentAnalysisWithFilename[]> {
  const search = propertyId
    ? `?propertyId=${encodeURIComponent(propertyId)}`
    : "";
  const res = await fetch(`${API_URL}/api/v1/analyses${search}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  const body = (await res.json()) as { data: DocumentAnalysisWithFilename[] };
  return body.data;
}
