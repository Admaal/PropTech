import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PropertyFilters,
  PropertyListItem,
} from "@proptech/shared";
import { PropertyRepository } from "../repositories/property.repository.js";
import { AnalysisRepository } from "../repositories/analysis.repository.js";

function enrichProperties(
  properties: PropertyListItem[],
  latestByProperty: Record<string, PropertyListItem["latest_analysis"]>,
): PropertyListItem[] {
  return properties.map((p) => ({
    ...p,
    latest_analysis: latestByProperty[p.id] ?? null,
  }));
}

export class PropertyService {
  private readonly repository: PropertyRepository;
  private readonly analysisRepository: AnalysisRepository;

  constructor(supabase: SupabaseClient) {
    this.repository = new PropertyRepository(supabase);
    this.analysisRepository = new AnalysisRepository(supabase);
  }

  async list(filters: PropertyFilters): Promise<{
    data: PropertyListItem[];
    page: number;
    limit: number;
    total: number;
  }> {
    const { data, total } = await this.repository.findMany(filters);
    const ids = data.map((p) => p.id);
    const latestMap =
      await this.analysisRepository.findLatestCompletedByPropertyIds(ids);
    const enriched = enrichProperties(
      data.map((p) => ({ ...p, latest_analysis: null })),
      latestMap,
    );

    return {
      data: enriched,
      page: filters.page,
      limit: filters.limit,
      total,
    };
  }

  async getById(id: string): Promise<PropertyListItem | null> {
    const property = await this.repository.findById(id);
    if (!property) return null;

    const latestMap =
      await this.analysisRepository.findLatestCompletedByPropertyIds([id]);

    return {
      ...property,
      latest_analysis: latestMap[id] ?? null,
    };
  }
}
