import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../../lib/apiClient";
import { getPublicPlacePath } from "../../../utils/placeUrl";
import type { Place, PlacesResponse } from "../../../types/place.types";
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
  setLocation,
  setMaxBid,
  setSelectedDate,
  setDateOption,
} from "../../../store/slices/searchSlice";

const MAPBOX_TOKEN = import.meta.env.VITE_APP_MAPBOX as string | undefined;

interface CitySuggestion {
  id: string;
  label: string; // "Newark, NJ"
  detail: string; // "New Jersey, United States"
  latitude: number;
  longitude: number;
}

/** US cities/towns matching what's typed, like a map search box. */
async function fetchCitySuggestions(
  query: string,
  near: { latitude: number | null; longitude: number | null } | undefined,
  signal: AbortSignal,
): Promise<CitySuggestion[]> {
  if (!MAPBOX_TOKEN) return [];
  const params = new URLSearchParams({
    q: query,
    country: "us",
    types: "place,locality,neighborhood,district",
    autocomplete: "true",
    limit: "6",
    access_token: MAPBOX_TOKEN,
  });
  if (typeof near?.latitude === "number" && typeof near?.longitude === "number") {
    params.set("proximity", `${near.longitude},${near.latitude}`);
  }
  const res = await fetch(
    `https://api.mapbox.com/search/geocode/v6/forward?${params}`,
    { signal },
  );
  if (!res.ok) return [];
  const json = await res.json();
  return (json.features ?? []).map((f: any) => {
    const p = f.properties ?? {};
    const region = p.context?.region;
    return {
      id: p.mapbox_id ?? f.id,
      label: region?.region_code ? `${p.name}, ${region.region_code}` : p.name,
      detail: p.place_formatted ?? "",
      latitude: p.coordinates?.latitude ?? f.geometry?.coordinates?.[1],
      longitude: p.coordinates?.longitude ?? f.geometry?.coordinates?.[0],
    };
  });
}

/** Our own hotels whose name matches (partners first, then independents). */
async function fetchHotelMatches(query: string): Promise<Place[]> {
  const q = encodeURIComponent(query);
  const [direct, wholesale] = await Promise.all(
    ["direct", "wholesale"].map((source) =>
      apiClient
        .get<PlacesResponse>(
          `${ENDPOINTS.PLACES_PUBLIC}?searchQuery=${q}&source=${source}&limit=20`,
        )
        .then((r) => r.places ?? [])
        .catch(() => [] as Place[]),
    ),
  );
  const needle = query.toLowerCase();
  const byName = (p: Place) => p.name.toLowerCase().includes(needle);
  const indieFirst = (a: Place, b: Place) =>
    Number(!!(a as { isChain?: boolean }).isChain) -
    Number(!!(b as { isChain?: boolean }).isChain);
  return [
    ...direct!.filter(byName),
    ...wholesale!.filter(byName).sort(indieFirst),
  ].slice(0, 3);
}

interface SearchBarProps {
  onSearch?: () => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const dispatch = useAppDispatch();
  const { searchQuery, location, maxBid, selectedDate, dateOption } = useAppSelector(
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

  // What's typed. Picking a suggested city sets the search location (hotels
  // nearest that city first); "Search hotel names" keeps keyword search.
  const [text, setText] = useState(location?.label ?? searchQuery);
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [hotels, setHotels] = useState<Place[]>([]);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = text.trim();
    if (q.length < 2 || q === location?.label) {
      setSuggestions([]);
      setHotels([]);
      return;
    }
    const ctrl = new AbortController();
    const t = window.setTimeout(() => {
      fetchCitySuggestions(q, geoHint, ctrl.signal)
        .then((list) => {
          setSuggestions(list.slice(0, 5));
          setActive(0);
        })
        .catch(() => {});
      if (q.length >= 3) {
        fetchHotelMatches(q).then((list) => {
          if (!ctrl.signal.aborted) setHotels(list);
        });
      } else {
        setHotels([]);
      }
    }, 250);
    return () => {
      window.clearTimeout(t);
      ctrl.abort();
    };
  }, [text, location?.label, geoHint]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pickCity = (c: CitySuggestion) => {
    dispatch(setLocation({ label: c.label, latitude: c.latitude, longitude: c.longitude }));
    dispatch(setSearchQuery(""));
    setText(c.label);
    setOpen(false);
    onSearch?.();
  };
  const searchNames = () => {
    dispatch(setLocation(null));
    dispatch(setSearchQuery(text.trim()));
    setOpen(false);
    onSearch?.();
  };
  const clearSearch = () => {
    dispatch(setLocation(null));
    dispatch(setSearchQuery(""));
    setText("");
    setSuggestions([]);
  };
  const openHotel = (p: Place) => {
    setOpen(false);
    navigate(getPublicPlacePath(p));
  };
  // Options in order: cities, our matching hotels, "search hotel names".
  const hotelStart = suggestions.length;
  const namesIndex = suggestions.length + hotels.length;
  const optionCount = namesIndex + (text.trim() ? 1 : 0);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" && optionCount > 0) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % optionCount);
    } else if (e.key === "ArrowUp" && optionCount > 0) {
      e.preventDefault();
      setActive((i) => (i - 1 + optionCount) % optionCount);
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active < suggestions.length) pickCity(suggestions[active]!);
      else if (active < namesIndex) openHotel(hotels[active - hotelStart]!);
      else if (text.trim()) searchNames();
      else onSearch?.();
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
      <div
        ref={boxRef}
        className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 flex-1 min-w-0 relative"
      >
        <label htmlFor="marketplace-location" className="sr-only">
          Location
        </label>
        {(location || nearCity) && !text ? (
          <MapPin className="h-5 w-5 text-gold shrink-0" aria-hidden />
        ) : (
          <Search className="h-4 w-4 text-gold shrink-0" aria-hidden />
        )}
        <input
          id="marketplace-location"
          type="search"
          role="combobox"
          aria-expanded={open && optionCount > 0}
          aria-controls="marketplace-location-options"
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={nearCity ? `${nearCity} · change city` : "Search a city"}
          aria-label={nearCity ? `Showing hotels near ${nearCity}. Type to change city` : "Search a city"}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            if (!e.target.value) clearSearch();
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className={`w-full bg-transparent border-0 outline-none text-base text-fg ${
            nearCity
              ? "placeholder:text-fg placeholder:font-semibold"
              : "placeholder:text-muted"
          }`}
        />
        {text && (
          <button
            type="button"
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-glass transition-colors"
            onClick={clearSearch}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        {open && optionCount > 0 && (
          <ul
            id="marketplace-location-options"
            role="listbox"
            className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-line bg-bg shadow-2xl"
          >
            {suggestions.map((c, i) => (
              <li key={c.id} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pickCity(c)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left ${
                    i === active ? "bg-glass" : ""
                  }`}
                >
                  <MapPin className="h-4 w-4 shrink-0 text-gold" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate text-base font-semibold text-fg">
                      {c.label}
                    </span>
                    <span className="block truncate text-sm text-muted">{c.detail}</span>
                  </span>
                </button>
              </li>
            ))}
            {hotels.length > 0 && (
              <li
                role="presentation"
                className="border-t border-line px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted"
              >
                Hotels
              </li>
            )}
            {hotels.map((p, j) => {
              const i = hotelStart + j;
              return (
                <li key={p.id} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => openHotel(p)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${
                      i === active ? "bg-glass" : ""
                    }`}
                  >
                    {p.images?.[0] ? (
                      <img
                        src={(p.images[0] as { url?: string }).url}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <span className="h-9 w-9 shrink-0 rounded-md bg-glass" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-base font-semibold text-fg">
                        {p.name}
                      </span>
                      <span className="block truncate text-sm text-muted">{p.city}</span>
                    </span>
                  </button>
                </li>
              );
            })}
            {text.trim() && (
              <li role="option" aria-selected={active === namesIndex}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(namesIndex)}
                  onClick={searchNames}
                  className={`flex w-full items-center gap-3 border-t border-line px-4 py-3 text-left text-sm text-muted ${
                    active === namesIndex ? "bg-glass" : ""
                  }`}
                >
                  <Search className="h-4 w-4 shrink-0" aria-hidden />
                  Search hotel names for &ldquo;{text.trim()}&rdquo;
                </button>
              </li>
            )}
          </ul>
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
