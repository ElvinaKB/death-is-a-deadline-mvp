import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "../ui/card";
import { cn } from "../ui/utils";
import { useState, useRef } from "react";
import {
  useTestimonials,
  useReviewPlatforms,
  Testimonial,
  ReviewPlatform,
} from "../../../hooks/useTestimonials";
import { Button } from "../ui/button";

interface TestimonialsProps {
  placeId: string;
}

export function Testimonials({ placeId }: TestimonialsProps) {
  const { data: testimonials = [], isLoading: loadingTestimonials } =
    useTestimonials(placeId);
  const { data: reviewPlatforms = [], isLoading: loadingReviews } =
    useReviewPlatforms(placeId);

  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Don't render anything if loading or no data
  if (loadingTestimonials || loadingReviews) {
    return null;
  }

  if (testimonials.length === 0 && reviewPlatforms.length === 0) {
    return null;
  }

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    return Array.from({ length: 5 }).map((_, index) => (
      <Star
        key={index}
        className={cn("w-5 h-5", {
          "fill-[#D4AF37] text-[#D4AF37]": index < fullStars,
          "fill-gray-600 text-gray-600": index >= fullStars,
        })}
      />
    ));
  };

  // Carousel navigation
  const canScrollLeft = currentIndex > 0;
  const canScrollRight = currentIndex < testimonials.length - 1;

  const scrollLeft = () => {
    if (canScrollLeft) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const scrollRight = () => {
    if (canScrollRight) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  // Get visible testimonials based on screen size (handled via CSS)
  const getVisibleCount = () => {
    if (typeof window === "undefined") return 3;
    if (window.innerWidth < 768) return 1;
    if (window.innerWidth < 1024) return 2;
    return 3;
  };

  return (
    <div className="mt-12">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-fg mb-3">
          What Students Are Saying
        </h2>
        <p className="text-base text-muted">
          Real stays. Real savings. Verified students only.
        </p>
      </div>

      {/* Review Platforms - Responsive grid */}
      {reviewPlatforms.length > 0 && (
        <div
          className={cn(
            "flex flex-wrap justify-center gap-4 md:gap-8 mb-10 max-w-3xl mx-auto",
            {
              "justify-center": reviewPlatforms.length === 1,
            },
          )}
        >
          {reviewPlatforms.map((platform) => (
            <div
              key={platform.id}
              className="flex flex-col items-center p-4 md:p-6 min-w-[200px]"
            >
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 fill-[#D4AF37] text-[#D4AF37]" />
                <span className="text-2xl md:text-3xl font-bold text-fg">
                  {Number(platform.rating).toFixed(1)}
                </span>
              </div>
              <p className="text-sm text-muted mb-1">on {platform.name}</p>
              <p className="text-xs text-muted/70 mb-2">
                ({platform.reviewCount} reviews)
              </p>
              <a
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted hover:text-fg transition-colors"
              >
                {platform.source
                  ? platform.source.charAt(0).toUpperCase() +
                    platform.source.slice(1)
                  : ""}
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Testimonial Cards */}
      {testimonials.length > 0 && (
        <div className="relative">
          {/* Carousel Navigation - Only show if more than 3 testimonials on desktop */}
          {testimonials.length > 3 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={scrollLeft}
                disabled={!canScrollLeft}
                className={cn(
                  "absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-bg/80 hover:bg-bg hidden md:flex",
                  { "opacity-50 cursor-not-allowed": !canScrollLeft },
                )}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={scrollRight}
                disabled={!canScrollRight}
                className={cn(
                  "absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-bg/80 hover:bg-bg hidden md:flex",
                  { "opacity-50 cursor-not-allowed": !canScrollRight },
                )}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}

          {/* Cards Container */}
          <div
            ref={carouselRef}
            className={cn("grid gap-4 md:gap-6 transition-all duration-300", {
              // Single testimonial - centered
              "grid-cols-1 max-w-md mx-auto": testimonials.length === 1,
              // Two testimonials - 2 columns on md+
              "grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto":
                testimonials.length === 2,
              // 3+ testimonials - responsive grid with carousel on overflow
              "grid-cols-1 md:grid-cols-2 lg:grid-cols-3":
                testimonials.length >= 3,
            })}
          >
            {testimonials
              .slice(
                testimonials.length <= 3 ? 0 : currentIndex,
                testimonials.length <= 3
                  ? testimonials.length
                  : currentIndex + 3,
              )
              .map((testimonial) => (
                <Card
                  key={testimonial.id}
                  className="p-5 md:p-6 flex flex-col gap-3 bg-glass border-[#2a2d3e] hover:border-[#3a3d4e] transition-all duration-300"
                >
                  {/* Stars */}
                  <div className="flex gap-0.5">
                    {renderStars(testimonial.rating)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-h-[60px]">
                    <h3 className="text-base md:text-lg font-semibold text-white mb-1">
                      {testimonial.title}
                    </h3>
                    {testimonial.content && (
                      <p className="text-gray-400 text-sm leading-relaxed line-clamp-3">
                        {testimonial.content}
                      </p>
                    )}
                  </div>

                  {/* Author */}
                  <div className="pt-3 border-t border-[#2a2d3e]">
                    <p className="text-gray-400 text-sm">
                      — {testimonial.author}
                    </p>
                    {testimonial.authorRole && (
                      <p className="text-gray-500 text-xs mt-0.5">
                        {testimonial.authorRole}
                      </p>
                    )}
                  </div>
                </Card>
              ))}
          </div>

          {/* Carousel Dots - Only for mobile when more than 1 testimonial */}
          {testimonials.length > 1 && (
            <div className="flex justify-center gap-2 mt-4 md:hidden">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    currentIndex === index ? "bg-[#D4AF37]" : "bg-gray-600",
                  )}
                />
              ))}
            </div>
          )}

          {/* Desktop dots for 3+ testimonials */}
          {testimonials.length > 3 && (
            <div className="hidden md:flex justify-center gap-2 mt-6">
              {Array.from({
                length: Math.ceil(testimonials.length - 2),
              }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    currentIndex === index ? "bg-[#D4AF37]" : "bg-gray-600",
                  )}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
