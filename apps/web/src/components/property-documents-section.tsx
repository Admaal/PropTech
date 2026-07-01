"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DocumentAnalysisWithFilename } from "@proptech/shared";
import { DocumentDropzone } from "@/components/document-dropzone";
import { PropertyAnalysesHistory } from "@/components/property-analyses-history";

interface PropertyDocumentsSectionProps {
  propertyId: string;
  initialAnalyses: DocumentAnalysisWithFilename[];
}

export function PropertyDocumentsSection({
  propertyId,
  initialAnalyses,
}: PropertyDocumentsSectionProps) {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <DocumentDropzone
        propertyId={propertyId}
        onUploaded={() => {
          setRefreshKey((k) => k + 1);
          router.refresh();
        }}
      />
      <PropertyAnalysesHistory
        propertyId={propertyId}
        initialAnalyses={initialAnalyses}
        refreshKey={refreshKey}
      />
    </>
  );
}
