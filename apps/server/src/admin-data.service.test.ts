import { describe, expect, it, vi } from "vitest";
import { AdminDataService } from "./services/admin-data.service.js";

function createSupabaseFake() {
  const remove = vi.fn().mockResolvedValue({ error: null });
  const documents = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [
          {
            id: "document-1",
            storage_path: "org/property/document-1.pdf",
          },
        ],
        error: null,
      }),
    }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  };
  const analyses = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            document_id: "document-1",
            documents: { storage_path: "org/property/document-1.pdf" },
          },
          error: null,
        }),
      }),
    }),
  };
  const properties = {
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === "documents") return documents;
      if (table === "document_analyses") return analyses;
      if (table === "properties") return properties;
      throw new Error(`Unexpected table: ${table}`);
    }),
    storage: {
      from: vi.fn(() => ({ remove })),
    },
    documents,
    properties,
    remove,
  };
}

describe("AdminDataService", () => {
  it("removes property PDFs before deleting metadata and property", async () => {
    const supabase = createSupabaseFake();
    const service = new AdminDataService(supabase as never);

    await service.deleteProperty("property-1");

    expect(supabase.remove).toHaveBeenCalledWith([
      "org/property/document-1.pdf",
    ]);
    expect(supabase.documents.delete).toHaveBeenCalled();
    expect(supabase.properties.delete).toHaveBeenCalled();
  });

  it("removes the PDF before deleting an analysis document", async () => {
    const supabase = createSupabaseFake();
    const service = new AdminDataService(supabase as never);

    await service.deleteAnalysis("analysis-1");

    expect(supabase.remove).toHaveBeenCalledWith([
      "org/property/document-1.pdf",
    ]);
    expect(supabase.documents.delete).toHaveBeenCalled();
  });
});
