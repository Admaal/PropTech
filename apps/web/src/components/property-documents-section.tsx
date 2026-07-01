"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { DocumentAnalysisWithFilename } from "@proptech/shared";
import { DocumentDropzone } from "@/components/document-dropzone";
import { PropertyAnalysesHistory } from "@/components/property-analyses-history";
import { alertErrorClasses, alertSuccessClasses } from "@/lib/ui-styles";

interface PropertyDocumentsSectionProps {
  propertyId: string;
  initialAnalyses: DocumentAnalysisWithFilename[];
}

type UploadNotice = {
  variant: "info" | "success" | "error";
  text: string;
};

const noticeClasses: Record<UploadNotice["variant"], string> = {
  info: alertSuccessClasses,
  success: alertSuccessClasses,
  error: alertErrorClasses,
};

export function PropertyDocumentsSection({
  propertyId,
  initialAnalyses,
}: PropertyDocumentsSectionProps) {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);
  const [notice, setNotice] = useState<UploadNotice | null>(null);

  const handleUploaded = useCallback(
    (analysisId: string) => {
      setActiveAnalysisId(analysisId);
      setNotice({
        variant: "info",
        text: "Documento recibido. Analizando con IA…",
      });
      setRefreshKey((k) => k + 1);
      router.refresh();
    },
    [router],
  );

  const handleUploadError = useCallback((message: string) => {
    setNotice({ variant: "error", text: message });
  }, []);

  const handleAnalysisComplete = useCallback(() => {
    setNotice({
      variant: "success",
      text: "Análisis completado. Revisa el resultado en el historial.",
    });
  }, []);

  const handleAnalysisFailed = useCallback(() => {
    setNotice({
      variant: "error",
      text: "El análisis ha fallado. Consulta el historial para más detalle.",
    });
  }, []);

  return (
    <>
      <DocumentDropzone
        propertyId={propertyId}
        onUploaded={handleUploaded}
        onError={handleUploadError}
      />

      {notice && (
        <p
          className={`rounded-lg border px-4 py-3 text-sm ${noticeClasses[notice.variant]}`}
        >
          {notice.text}
        </p>
      )}

      <PropertyAnalysesHistory
        propertyId={propertyId}
        initialAnalyses={initialAnalyses}
        refreshKey={refreshKey}
        activeAnalysisId={activeAnalysisId}
        onActiveAnalysisComplete={handleAnalysisComplete}
        onActiveAnalysisFailed={handleAnalysisFailed}
      />
    </>
  );
}
