import { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";

interface ImageItem {
  id?: string;
  url: string;
  alt?: string;
}

interface ImageGalleryModalProps {
  images: ImageItem[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageGalleryModal({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
}: ImageGalleryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          goToPrevious();
          break;
        case "ArrowRight":
          goToNext();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, goToPrevious, goToNext]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      closeButtonRef.current?.focus();
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];
  const galleryLabel = `Photo gallery, image ${currentIndex + 1} of ${images.length}`;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={galleryLabel}
    >
      <Button
        ref={closeButtonRef}
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
        onClick={onClose}
        aria-label="Close gallery"
      >
        <X className="h-6 w-6" />
      </Button>

      <div
        className="absolute top-4 left-4 text-white text-sm bg-black/50 px-3 py-1.5 rounded-full"
        aria-live="polite"
        aria-atomic="true"
      >
        {currentIndex + 1} / {images.length}
      </div>

      {images.length > 1 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
          onClick={goToPrevious}
          aria-label="Previous photo"
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>
      )}

      <div className="flex items-center justify-center w-full h-full px-16 py-16">
        <img
          src={currentImage.url}
          alt={currentImage.alt || `Photo ${currentIndex + 1} of ${images.length}`}
          className="max-w-full max-h-full object-contain"
        />
      </div>

      {images.length > 1 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
          onClick={goToNext}
          aria-label="Next photo"
        >
          <ChevronRight className="h-8 w-8" />
        </Button>
      )}

      {images.length > 1 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 p-2 rounded-lg max-w-[90vw] overflow-x-auto"
          role="tablist"
          aria-label="Gallery thumbnails"
        >
          {images.map((image, index) => (
            <button
              key={image.id || index}
              type="button"
              role="tab"
              aria-selected={index === currentIndex}
              aria-label={`View photo ${index + 1}`}
              onClick={() => setCurrentIndex(index)}
              className={`w-16 h-12 rounded overflow-hidden shrink-0 border-2 transition-all ${
                index === currentIndex
                  ? "border-white opacity-100"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <img
                src={image.url}
                alt=""
                aria-hidden
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
