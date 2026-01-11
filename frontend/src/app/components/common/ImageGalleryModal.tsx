import { useState, useEffect } from "react";
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

  // Reset index when modal opens with new initialIndex
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  // Handle keyboard navigation
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
  }, [isOpen, currentIndex]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || images.length === 0) return null;

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const currentImage = images[currentIndex];

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center">
      {/* Close Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Image Counter */}
      <div className="absolute top-4 left-4 text-white text-sm bg-black/50 px-3 py-1.5 rounded-full">
        {currentIndex + 1} / {images.length}
      </div>

      {/* Previous Button */}
      {images.length > 1 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
          onClick={goToPrevious}
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>
      )}

      {/* Main Image */}
      <div className="flex items-center justify-center w-full h-full px-16 py-16">
        <img
          src={currentImage.url}
          alt={currentImage.alt || `Image ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain"
        />
      </div>

      {/* Next Button */}
      {images.length > 1 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
          onClick={goToNext}
        >
          <ChevronRight className="h-8 w-8" />
        </Button>
      )}

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 p-2 rounded-lg max-w-[90vw] overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={image.id || index}
              onClick={() => setCurrentIndex(index)}
              className={`w-16 h-12 rounded overflow-hidden shrink-0 border-2 transition-all ${
                index === currentIndex
                  ? "border-white opacity-100"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <img
                src={image.url}
                alt={image.alt || `Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
