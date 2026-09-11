import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DocumentAnalysis,
  DocumentAnalysisWithFilename,
} from "@proptech/shared";
import { AnalysisRepository } from "../repositories/analysis.repository.js";

export class AnalysisService {
  private readonly repository: AnalysisRepository;

  constructor(supabase: SupabaseClient) {
    this.repository = new AnalysisRepository(supabase);
  }

  async getById(id: string): Promise<DocumentAnalysis | null> {
    return this.repository.findById(id);
  }

  async listRecent(): Promise<DocumentAnalysisWithFilename[]> {
    return this.repository.findRecent(20);
  }

  async listByProperty(
    propertyId: string,
  ): Promise<DocumentAnalysisWithFilename[]> {
    return this.repository.findByPropertyId(propertyId, 20);
  }
}
