"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";

interface PropertyImageCarouselProps {
  images: string[];
  alt: string;
}

export function PropertyImageCarousel({
  images,
  alt,
}: PropertyImageCarouselProps) {
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set());
  const [index, setIndex] = useState(0);

  const visibleImages = useMemo(
    () => images.filter((url) => !failedUrls.has(url)),
    [images, failedUrls],
  );

  const safeIndex =
    visibleImages.length === 0
      ? 0
      : Math.min(index, visibleImages.length - 1);

  const markFailed = useCallback((url: string) => {
    setFailedUrls((prev) => {
      if (prev.has(url)) return prev;
      const next = new Set(prev);
      next.add(url);
      return next;
    });
    setIndex((i) => Math.max(0, i));
  }, []);

  if (visibleImages.length === 0) return null;

  const hasMultiple = visibleImages.length > 1;

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-muted">
      <div className="relative aspect-16/10 w-full">
        <Image
          src={visibleImages[safeIndex]}
          alt={`${alt} — foto ${safeIndex + 1}`}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority={safeIndex === 0}
          onError={() => markFailed(visibleImages[safeIndex])}
        />
      </div>
      {hasMultiple && (
        <>
          <button
            type="button"
            aria-label="Foto anterior"
            onClick={() =>
              setIndex((i) =>
                i === 0 ? visibleImages.length - 1 : i - 1,
              )
            }
            className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-border bg-card/90 text-sm shadow-sm hover:bg-card"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Foto siguiente"
            onClick={() =>
              setIndex((i) =>
                i === visibleImages.length - 1 ? 0 : i + 1,
              )
            }
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-border bg-card/90 text-sm shadow-sm hover:bg-card"
          >
            ›
          </button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {visibleImages.map((url, i) => (
              <button
                key={url}
                type="button"
                aria-label={`Ir a foto ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === safeIndex ? "w-4 bg-primary" : "w-1.5 bg-card/80"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
