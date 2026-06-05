import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect } from "react";
import { PlaceImage } from "../../../types/place.types";

const AUTOPLAY_MS = 5_000;

interface ListingHeroCarouselProps {
  images: PlaceImage[];
  placeName: string;
  placeholderUrl?: string;
  onImageClick: (index: number) => void;
  onIndexChange?: (index: number) => void;
}

export function ListingHeroCarousel({
  images,
  placeName,
  placeholderUrl = "/placeholder-hotel.jpg",
  onImageClick,
  onIndexChange,
}: ListingHeroCarouselProps) {
  const hasMultiple = images.length > 1;
  const [emblaRef, emblaApi] = useEmblaCarousel(
    hasMultiple ? { loop: true, duration: 25 } : undefined,
  );

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    const syncIndex = () => {
      onIndexChange?.(emblaApi.selectedScrollSnap());
    };

    syncIndex();
    emblaApi.on("select", syncIndex);
    emblaApi.on("reInit", syncIndex);

    return () => {
      emblaApi.off("select", syncIndex);
      emblaApi.off("reInit", syncIndex);
    };
  }, [emblaApi, onIndexChange]);

  useEffect(() => {
    if (!emblaApi || !hasMultiple) return;

    const timer = window.setInterval(() => {
      emblaApi.scrollNext();
    }, AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [emblaApi, hasMultiple]);

  useEffect(() => {
    emblaApi?.reInit();
  }, [emblaApi, images]);

  if (images.length === 0) {
    return (
      <img
        src={placeholderUrl}
        alt={placeName}
        className="h-full w-full object-cover"
      />
    );
  }

  if (!hasMultiple) {
    return (
      <img
        src={images[0].url}
        alt={placeName}
        className="h-full w-full cursor-pointer object-cover"
        onClick={() => onImageClick(0)}
      />
    );
  }

  return (
    <div className="listing-hero-carousel relative h-full w-full">
      <div ref={emblaRef} className="h-full overflow-hidden">
        <div className="flex h-full">
          {images.map((image, index) => (
            <div
              key={image.id}
              className="min-w-0 shrink-0 grow-0 basis-full h-full"
            >
              <img
                src={image.url}
                alt={`${placeName} — photo ${index + 1}`}
                className="h-full w-full cursor-pointer object-cover"
                onClick={() => onImageClick(index)}
              />
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          scrollPrev();
        }}
        className="listing-hero-carousel__nav listing-hero-carousel__nav--prev"
        aria-label="Previous photo"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          scrollNext();
        }}
        className="listing-hero-carousel__nav listing-hero-carousel__nav--next"
        aria-label="Next photo"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
