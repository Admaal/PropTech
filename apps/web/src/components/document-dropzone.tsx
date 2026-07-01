"use client";

import { useCallback, useState } from "react";
import { uploadDocument, ApiError } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { AnalysisPanel } from "@/components/analysis-panel";

import { alertErrorClasses, alertSuccessClasses } from "@/lib/ui-styles";

interface DocumentDropzoneProps {
  propertyId: string;
  onUploaded?: (analysisId: string) => void;
}

type UploadState = "idle" | "dragging" | "uploading" | "success" | "error";

export function DocumentDropzone({ propertyId, onUploaded }: DocumentDropzoneProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        setState("error");
        setMessage("Solo se permiten archivos PDF");
        return;
      }

      setState("uploading");
      setMessage(null);
      setAnalysisId(null);

      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setState("error");
          setMessage("Sesión expirada. Vuelve a iniciar sesión.");
          return;
        }

        const result = await uploadDocument(
          session.access_token,
          propertyId,
          file,
        );
        setAnalysisId(result.analysis_id);
        setState("success");
        setMessage("Documento recibido. Analizando con IA…");
        onUploaded?.(result.analysis_id);
      } catch (e) {
        setState("error");
        if (e instanceof ApiError && e.code === "QUOTA_EXCEEDED") {
          setMessage(
            "Límite diario alcanzado en la demo (3 análisis/día). Vuelve mañana o prueba con la otra cuenta demo.",
          );
          return;
        }
        setMessage(e instanceof Error ? e.message : "Error al subir");
      }
    },
    [propertyId, onUploaded],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setState("idle");
      const file = e.dataTransfer.files[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setState("dragging");
        }}
        onDragLeave={() => setState("idle")}
        onDrop={onDrop}
        className={`rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
          state === "dragging"
            ? "border-primary bg-primary/5"
            : "border-foreground bg-card"
        }`}
      >
        {state === "uploading" ? (
          <p className="text-sm text-muted-foreground">Subiendo PDF…</p>
        ) : (
          <>
            <p className="mb-2 text-sm font-medium">
              Arrastra un PDF aquí (nómina, contrato, informe de solvencia)
            </p>
            <p className="mb-4 text-xs text-muted-foreground">
              Máximo 10 MB · Solo PDF
            </p>
            <label className="inline-block cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              Seleccionar archivo
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
            </label>
          </>
        )}
      </div>

      {message && state !== "success" && (
        <p
          className={`rounded-lg border px-4 py-3 text-sm ${
            state === "error" ? alertErrorClasses : alertSuccessClasses
          }`}
        >
          {message}
        </p>
      )}

      {analysisId && (
        <>
          {state === "success" && (
            <p className="text-sm text-muted-foreground">{message}</p>
          )}
          <AnalysisPanel analysisId={analysisId} />
        </>
      )}
    </div>
  );
}
