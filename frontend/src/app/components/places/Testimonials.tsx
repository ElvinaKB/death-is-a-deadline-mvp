import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "../ui/card";
import { cn } from "../ui/utils";
import { useState, useRef } from "react";
import { useTestimonials } from "../../../hooks/useTestimonials";
import { Button } from "../ui/button";

interface TestimonialsProps {
  placeId: string;
}

/** Student-written testimonials only (Google/Yelp boxes removed — hero badge uses live data). */
export function Testimonials({ placeId }: TestimonialsProps) {
  const { data: testimonialsData, isLoading } = useTestimonials(placeId);

  const testimonials = Array.isArray(testimonialsData) ? testimonialsData : [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  if (isLoading || testimonials.length === 0) {
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

  return (
    <div className="mt-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-fg mb-3">
          What Students Are Saying
        </h2>
        <p className="text-base text-muted">
          Real stays. Real savings. Verified students only.
        </p>
      </div>

      <div className="relative">
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

        <div
          ref={carouselRef}
          className={cn("grid gap-4 md:gap-6 transition-all duration-300", {
            "grid-cols-1 max-w-md mx-auto": testimonials.length === 1,
            "grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto":
              testimonials.length === 2,
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
                <div className="flex gap-0.5">
                  {renderStars(testimonial.rating)}
                </div>

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

        {testimonials.length > 1 && (
          <div className="flex justify-center gap-2 mt-4 md:hidden">
            {testimonials.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  currentIndex === index ? "bg-[#D4AF37]" : "bg-gray-600",
                )}
              />
            ))}
          </div>
        )}

        {testimonials.length > 3 && (
          <div className="hidden md:flex justify-center gap-2 mt-6">
            {Array.from({
              length: Math.ceil(testimonials.length - 2),
            }).map((_, index) => (
              <button
                key={index}
                type="button"
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
    </div>
  );
}
