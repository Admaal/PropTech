"use client";

import { useCallback, useState } from "react";
import { uploadDocument, ApiError } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { alertErrorClasses } from "@/lib/ui-styles";

interface DocumentDropzoneProps {
  propertyId: string;
  onUploaded?: (analysisId: string) => void;
  onError?: (message: string) => void;
}

type UploadState = "idle" | "dragging" | "uploading" | "success" | "error";

export function DocumentDropzone({
  propertyId,
  onUploaded,
  onError,
}: DocumentDropzoneProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        setState("error");
        const msg = "Solo se permiten archivos PDF";
        setLocalError(msg);
        onError?.(msg);
        return;
      }

      setState("uploading");
      setLocalError(null);

      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setState("error");
          const msg = "Sesión expirada. Vuelve a iniciar sesión.";
          setLocalError(msg);
          onError?.(msg);
          return;
        }

        const result = await uploadDocument(
          session.access_token,
          propertyId,
          file,
        );
        setState("success");
        onUploaded?.(result.analysis_id);
      } catch (e) {
        setState("error");
        let msg = e instanceof Error ? e.message : "Error al subir";
        if (e instanceof ApiError && e.code === "QUOTA_EXCEEDED") {
          msg =
            "Límite diario alcanzado en la demo (3 análisis/día). Vuelve mañana o prueba con la otra cuenta demo.";
        }
        setLocalError(msg);
        onError?.(msg);
      }
    },
    [propertyId, onUploaded, onError],
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

      {localError && state === "error" && (
        <p className={`rounded-lg border px-4 py-3 text-sm ${alertErrorClasses}`}>
          {localError}
        </p>
      )}
    </div>
  );
}
