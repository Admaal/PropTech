"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  deleteAdminAnalysis,
  deleteAdminProperty,
} from "@/lib/api";
import { alertErrorClasses } from "@/lib/ui-styles";

interface Organization {
  id: string;
  name: string;
}

interface PropertyRow {
  id: string;
  title: string;
  address: string;
  city: string;
}

interface AnalysisRow {
  id: string;
  filename: string | null;
  status: string;
  created_at: string;
  document_id: string;
  storage_path: string | null;
}

function mapAnalysisRows(
  rows: {
    id: string;
    status: string;
    created_at: string;
    document_id: string;
    documents:
      | { filename: string; storage_path: string }
      | { filename: string; storage_path: string }[]
      | null;
  }[],
): AnalysisRow[] {
  return rows.map((row) => {
    const doc = row.documents;
    const d = Array.isArray(doc) ? doc[0] : doc;
    return {
      id: row.id,
      status: row.status,
      created_at: row.created_at,
      document_id: row.document_id,
      filename: d?.filename ?? null,
      storage_path: d?.storage_path ?? null,
    };
  });
}

export function AdminPanel() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [orgId, setOrgId] = useState("");
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function loadOrgData(selectedOrgId: string) {
    if (!selectedOrgId) return;
    const supabase = createClient();
    setError(null);

    const [propsRes, analysesRes] = await Promise.all([
      supabase
        .from("properties")
        .select("id, title, address, city")
        .eq("organization_id", selectedOrgId)
        .order("title"),
      supabase
        .from("document_analyses")
        .select(
          "id, status, created_at, document_id, documents(filename, storage_path)",
        )
        .eq("organization_id", selectedOrgId)
        .order("created_at", { ascending: false }),
    ]);

    if (propsRes.error) {
      setError(propsRes.error.message);
      return;
    }
    if (analysesRes.error) {
      setError(analysesRes.error.message);
      return;
    }

    setProperties(propsRes.data ?? []);
    setAnalyses(mapAnalysisRows(analysesRes.data ?? []));
  }

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from("organizations")
        .select("id, name")
        .order("name");

      if (cancelled) return;
      if (err) {
        setError(err.message);
        return;
      }

      setOrgs(data ?? []);
      if (data?.length) {
        setOrgId((prev) => prev || data[0]!.id);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;

    void (async () => {
      const supabase = createClient();
      setError(null);

      const [propsRes, analysesRes] = await Promise.all([
        supabase
          .from("properties")
          .select("id, title, address, city")
          .eq("organization_id", orgId)
          .order("title"),
        supabase
          .from("document_analyses")
          .select(
            "id, status, created_at, document_id, documents(filename, storage_path)",
          )
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false }),
      ]);

      if (cancelled) return;
      if (propsRes.error) {
        setError(propsRes.error.message);
        return;
      }
      if (analysesRes.error) {
        setError(analysesRes.error.message);
        return;
      }

      setProperties(propsRes.data ?? []);
      setAnalyses(mapAnalysisRows(analysesRes.data ?? []));
    })();

    return () => {
      cancelled = true;
    };
  }, [orgId]);

  async function deleteProperty(propertyId: string) {
    if (!confirm("¿Eliminar este inmueble y sus documentos asociados?")) return;
    setBusy(propertyId);
    const supabase = createClient();
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !data.session) {
      setBusy(null);
      setError("Sesión no disponible");
      return;
    }
    try {
      await deleteAdminProperty(data.session.access_token, propertyId);
      await loadOrgData(orgId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar");
    } finally {
      setBusy(null);
    }
  }

  async function deleteAnalysis(analysis: AnalysisRow) {
    if (!confirm("¿Eliminar este análisis y su documento PDF?")) return;
    setBusy(analysis.id);
    const supabase = createClient();
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !data.session) {
      setBusy(null);
      setError("Sesión no disponible");
      return;
    }
    try {
      await deleteAdminAnalysis(data.session.access_token, analysis.id);
      await loadOrgData(orgId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <label htmlFor="org" className="mb-2 block text-sm font-medium">
          Organización
        </label>
        <select
          id="org"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          className="w-full max-w-md rounded-lg border border-border bg-card px-4 py-2 text-sm"
        >
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className={`rounded-lg border px-4 py-3 text-sm ${alertErrorClasses}`}>
          {error}
        </p>
      )}

      <section>
        <h2 className="mb-4 text-lg font-medium">Inmuebles</h2>
        {properties.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin inmuebles.</p>
        ) : (
          <ul className="space-y-2">
            {properties.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{p.title}</p>
                  <p className="text-muted-foreground">
                    {p.address}, {p.city}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy === p.id}
                  onClick={() => void deleteProperty(p.id)}
                  className="shrink-0 rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-medium">Historial de análisis</h2>
        {analyses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin análisis.</p>
        ) : (
          <ul className="space-y-2">
            {analyses.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{a.filename ?? "PDF"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleString("es-ES")} · {a.status}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy === a.id}
                  onClick={() => void deleteAnalysis(a)}
                  className="shrink-0 rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
