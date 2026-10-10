import { useState } from "react";
import { Search, Calendar, ChevronDown, MapPin } from "lucide-react";
import { useApiQuery } from "../../../hooks/useApi";
import { ENDPOINTS } from "../../../config/endpoints.config";
import { QUERY_KEYS } from "../../../config/queryKeys.config";
import { GeoHint } from "../../../utils/geo";
import { addDays, format } from "date-fns";
import { parseApiDate, toApiDateOnly } from "../../../utils/dateHelpers";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar as CalendarComponent } from "../ui/calendar";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  setSearchQuery,
  setMaxBid,
  setSelectedDate,
  setDateOption,
} from "../../../store/slices/searchSlice";

interface SearchBarProps {
  onSearch?: () => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const dispatch = useAppDispatch();
  const { searchQuery, maxBid, selectedDate, dateOption } = useAppSelector(
    (state) => state.search
  );

  // Show the city the listings are near (same cached IP hint the homepage
  // uses to sort), so the bar reads "San Francisco" instead of a generic
  // placeholder. Typing a city still searches as before.
  const { data: geoHint } = useApiQuery<GeoHint>({
    queryKey: [QUERY_KEYS.GEO_HINT],
    endpoint: ENDPOINTS.GEO_HINT,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
  const nearCity = geoHint?.city || null;

  const [isDateOpen, setIsDateOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const parsedDate = selectedDate ? new Date(selectedDate) : undefined;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && onSearch) {
      onSearch();
    }
  };

  const handleDateOptionSelect = (
    option: "tonight" | "tomorrow" | "custom"
  ) => {
    dispatch(setDateOption(option));
    if (option === "tonight") {
      dispatch(setSelectedDate(format(new Date(), "yyyy-MM-dd")));
      setIsDateOpen(false);
      setShowCalendar(false);
    } else if (option === "tomorrow") {
      dispatch(setSelectedDate(format(addDays(new Date(), 1), "yyyy-MM-dd")));
      setIsDateOpen(false);
      setShowCalendar(false);
    } else {
      setShowCalendar(true);
    }
  };

  const handleCustomDateSelect = (date: Date | undefined) => {
    dispatch(setSelectedDate(date ? format(date, "yyyy-MM-dd") : null));
    if (date) {
      setIsDateOpen(false);
      setShowCalendar(false);
    }
  };

  const getDateLabel = () => {
    if (dateOption === "tonight") return "Tonight";
    if (dateOption === "tomorrow") return "Tomorrow";
    if (parsedDate) return format(parsedDate, "MMM d");
    return "Select date";
  };

  return (
    <form
      className="marketplace-search-bar flex flex-col sm:flex-row items-stretch sm:items-center w-full min-w-0"
      role="search"
      aria-label="Search hotel listings"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch?.();
      }}
    >
      <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 flex-1 min-w-0 relative">
        <label htmlFor="marketplace-location" className="sr-only">
          Location
        </label>
        {nearCity && !searchQuery ? (
          <MapPin className="h-5 w-5 text-gold shrink-0" aria-hidden />
        ) : (
          <Search className="h-4 w-4 text-gold shrink-0" aria-hidden />
        )}
        <input
          id="marketplace-location"
          type="search"
          placeholder={nearCity ? `${nearCity} · change city` : "Search a city"}
          aria-label={nearCity ? `Showing hotels near ${nearCity}. Type to change city` : "Search a city"}
          value={searchQuery}
          onChange={(e) => dispatch(setSearchQuery(e.target.value))}
          onKeyDown={handleKeyDown}
          className={`w-full bg-transparent border-0 outline-none text-base text-fg ${
            nearCity
              ? "placeholder:text-fg placeholder:font-semibold"
              : "placeholder:text-muted"
          }`}
        />
        {searchQuery && (
          <button
            type="button"
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-glass transition-colors"
            onClick={() => dispatch(setSearchQuery(""))}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="h-8 w-px bg-line shrink-0" aria-hidden />

      <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
        <PopoverTrigger asChild>
          <button
            id="marketplace-date"
            type="button"
            aria-haspopup="dialog"
            aria-expanded={isDateOpen}
            aria-label={
              parsedDate
                ? `Stay date: ${getDateLabel()}`
                : "Select stay date"
            }
            className="flex items-center justify-between sm:justify-start gap-2 px-3 sm:px-4 py-2.5 sm:py-3 w-full sm:w-auto sm:min-w-[120px] hover:bg-glass transition-colors rounded-lg"
          >
            <Calendar className="h-4 w-4 text-gold shrink-0" aria-hidden />
            <span className="text-sm text-fg whitespace-nowrap">
              {getDateLabel()}
            </span>
            <ChevronDown className="h-4 w-4 text-muted shrink-0" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 bg-glass-2 border-line"
          align="start"
        >
          {!showCalendar ? (
            <div className="py-1" role="menu">
              <button
                type="button"
                role="menuitem"
                className={`w-full px-4 py-2 text-left text-sm hover:bg-glass ${
                  dateOption === "tonight"
                    ? "bg-brand/10 text-brand"
                    : "text-fg"
                }`}
                onClick={() => handleDateOptionSelect("tonight")}
              >
                Tonight
              </button>
              <button
                type="button"
                role="menuitem"
                className={`w-full px-4 py-2 text-left text-sm hover:bg-glass ${
                  dateOption === "tomorrow"
                    ? "bg-brand/10 text-brand"
                    : "text-fg"
                }`}
                onClick={() => handleDateOptionSelect("tomorrow")}
              >
                Tomorrow
              </button>
              <button
                type="button"
                role="menuitem"
                className={`w-full px-4 py-2 text-left text-sm hover:bg-glass ${
                  dateOption === "custom" ? "bg-brand/10 text-brand" : "text-fg"
                }`}
                onClick={() => handleDateOptionSelect("custom")}
              >
                Custom date...
              </button>
            </div>
          ) : (
            <div className="p-2">
              <button
                type="button"
                className="text-sm text-brand hover:underline mb-2"
                onClick={() => setShowCalendar(false)}
              >
                ← Back
              </button>
              <CalendarComponent
                mode="single"
                selected={parsedDate}
                onSelect={handleCustomDateSelect}
                disabled={(date) => date < new Date()}
                initialFocus
              />
            </div>
          )}
        </PopoverContent>
      </Popover>

      <Button
        type="submit"
        size="icon"
        className="marketplace-search-btn rounded-full h-10 w-10 shrink-0 mr-1.5"
        aria-label="Search listings"
      >
        <Search className="h-4 w-4 text-gold" aria-hidden />
      </Button>
    </form>
  );
}
