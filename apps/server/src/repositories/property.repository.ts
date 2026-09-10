import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PropertySchema,
  type Property,
  type PropertyFilters,
} from "@proptech/shared";

interface PropertyRow {
  id: string;
  organization_id: string;
  title: string;
  address: string;
  city: string;
  price_monthly: number;
  sqm: number;
  bedrooms: number;
  risk_level: "low" | "medium" | "high" | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  image_urls: string[];
  created_at: string;
}

function mapRow(row: PropertyRow): Property {
  return PropertySchema.parse({
    id: row.id,
    organization_id: row.organization_id,
    title: row.title,
    address: row.address,
    city: row.city,
    price_monthly: Number(row.price_monthly),
    sqm: Number(row.sqm),
    bedrooms: row.bedrooms,
    risk_level: row.risk_level,
    latitude: row.latitude,
    longitude: row.longitude,
    description: row.description,
    image_urls: row.image_urls ?? [],
    created_at: row.created_at,
  });
}

export class PropertyRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findMany(filters: PropertyFilters): Promise<{
    data: Property[];
    total: number;
  }> {
    const { page, limit, priceMin, priceMax, sqmMin, bbox } = filters;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = this.supabase
      .from("properties")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (priceMin !== undefined) {
      query = query.gte("price_monthly", priceMin);
    }
    if (priceMax !== undefined) {
      query = query.lte("price_monthly", priceMax);
    }
    if (sqmMin !== undefined) {
      query = query.gte("sqm", sqmMin);
    }
    if (bbox !== undefined) {
      const [minLng, minLat, maxLng, maxLat] = bbox.split(",").map(Number);
      if (
        [minLng, minLat, maxLng, maxLat].every((n) => Number.isFinite(n))
      ) {
        query = query
          .gte("latitude", minLat)
          .lte("latitude", maxLat)
          .gte("longitude", minLng)
          .lte("longitude", maxLng)
          .not("latitude", "is", null)
          .not("longitude", "is", null);
      }
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Error al consultar propiedades: ${error.message}`);
    }

    return {
      data: (data as PropertyRow[]).map(mapRow),
      total: count ?? 0,
    };
  }

  async findById(id: string): Promise<Property | null> {
    const { data, error } = await this.supabase
      .from("properties")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Error al consultar propiedad: ${error.message}`);
    }

    return data ? mapRow(data as PropertyRow) : null;
  }
}
