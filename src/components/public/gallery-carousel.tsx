"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";

type GalleryCarouselProps = {
  images: { url: string; alt: string; title: string }[];
  startIndex?: number;
};

export function GalleryCarousel({ images, startIndex = 0 }: GalleryCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, startIndex });
  const [selectedIndex, setSelectedIndex] = useState(startIndex);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    emblaApi.on("init", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
      emblaApi.off("init", onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (!images.length) return null;

  return (
    <div className="relative w-full">
      <div className="overflow-hidden rounded-[1.75rem]" ref={emblaRef}>
        <div className="flex touch-pan-y">
          {images.map((image, index) => (
            <div key={index} className="relative min-w-0 flex-[0_0_100%]">
              <div className="relative aspect-[4/5] w-full">
                <Image
                  src={image.url}
                  alt={image.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 50vw"
                  priority={index === startIndex}
                />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-5 pb-5 pt-20">
                <p className="text-sm font-semibold text-white">{image.title}</p>
                <p className="mt-1 text-xs text-white/80">{image.alt}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {images.length > 1 ? (
        <>
          <button
            aria-label="Anterior"
            className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition hover:bg-white/35"
            type="button"
            onClick={scrollPrev}
            disabled={!canScrollPrev}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            aria-label="Siguiente"
            className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition hover:bg-white/35"
            type="button"
            onClick={scrollNext}
            disabled={!canScrollNext}
          >
            <ArrowRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
            {images.map((_, index) => (
              <button
                key={index}
                aria-label={`Ir a imagen ${index + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === selectedIndex ? "w-6 bg-white" : "w-1.5 bg-white/50"
                }`}
                type="button"
                onClick={() => emblaApi?.scrollTo(index)}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
