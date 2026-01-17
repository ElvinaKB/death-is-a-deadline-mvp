import { useState, useCallback, useRef, useEffect } from "react";
import { MapPin, Search, Loader2 } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { cn } from "../ui/utils";

interface LocationPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  onLocationChange: (location: {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
    address: string;
  }) => void;
  className?: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
    road?: string;
    house_number?: string;
    postcode?: string;
  };
}

// Debounce function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function LocationPicker({
  latitude,
  longitude,
  onLocationChange,
  className,
}: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(latitude && longitude ? { lat: latitude, lng: longitude } : null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search for locations using Nominatim
  const searchLocations = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&addressdetails=1&limit=5`,
        {
          headers: {
            "User-Agent": "EducationBidding/1.0",
          },
        }
      );
      const data: NominatimResult[] = await response.json();
      setSearchResults(data);
      setShowResults(true);
    } catch (error) {
      console.error("Error searching locations:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((query: string) => searchLocations(query), 500),
    [searchLocations]
  );

  // Reverse geocode to get address from coordinates
  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      setIsReverseGeocoding(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
          {
            headers: {
              "User-Agent": "EducationBidding/1.0",
            },
          }
        );
        const data: NominatimResult = await response.json();

        const address = data.address;
        const city =
          address.city ||
          address.town ||
          address.village ||
          address.municipality ||
          address.county ||
          "";
        const country = address.country || "";
        const streetAddress = [address.house_number, address.road]
          .filter(Boolean)
          .join(" ");
        const fullAddress =
          streetAddress || data.display_name.split(",").slice(0, 2).join(",");

        onLocationChange({
          latitude: lat,
          longitude: lng,
          city,
          country,
          address: fullAddress,
        });
      } catch (error) {
        console.error("Error reverse geocoding:", error);
        // Still update coordinates even if reverse geocoding fails
        onLocationChange({
          latitude: lat,
          longitude: lng,
          city: "",
          country: "",
          address: "",
        });
      } finally {
        setIsReverseGeocoding(false);
      }
    },
    [onLocationChange]
  );

  // Handle search result selection
  const handleSelectResult = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setSelectedLocation({ lat, lng });
    setSearchQuery(result.display_name);
    setShowResults(false);

    const address = result.address;
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.county ||
      "";
    const country = address.country || "";
    const streetAddress = [address.house_number, address.road]
      .filter(Boolean)
      .join(" ");
    const fullAddress =
      streetAddress || result.display_name.split(",").slice(0, 2).join(",");

    onLocationChange({
      latitude: lat,
      longitude: lng,
      city,
      country,
      address: fullAddress,
    });
  };

  // Handle map click
  const handleMapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert click position to approximate lat/lng
    // This is a simplified projection - the embedded map doesn't support click events
    // So we'll use the visible bounds to estimate
    const centerLat = selectedLocation?.lat || 40.7128;
    const centerLng = selectedLocation?.lng || -74.006;

    // Approximate: each pixel ~0.001 degrees at this zoom
    const latOffset = ((rect.height / 2 - y) / rect.height) * 0.1;
    const lngOffset = ((x - rect.width / 2) / rect.width) * 0.15;

    const newLat = centerLat + latOffset;
    const newLng = centerLng + lngOffset;

    setSelectedLocation({ lat: newLat, lng: newLng });
    reverseGeocode(newLat, newLng);
  };

  // Generate map URL
  const getMapUrl = () => {
    if (selectedLocation) {
      return `https://www.openstreetmap.org/export/embed.html?bbox=${
        selectedLocation.lng - 0.01
      },${selectedLocation.lat - 0.01},${selectedLocation.lng + 0.01},${
        selectedLocation.lat + 0.01
      }&layer=mapnik&marker=${selectedLocation.lat},${selectedLocation.lng}`;
    }
    // Default to a world view
    return "https://www.openstreetmap.org/export/embed.html?bbox=-180,-60,180,70&layer=mapnik";
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Input */}
      <div ref={searchRef} className="relative">
        <Label htmlFor="location-search">Search Location</Label>
        <div className="relative mt-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="location-search"
            type="text"
            placeholder="Search for a city, address, or place..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              debouncedSearch(e.target.value);
            }}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            className="pl-10"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-bg border border-white/10 rounded-md shadow-lg max-h-60 overflow-auto">
            {searchResults.map((result, index) => (
              <button
                key={index}
                type="button"
                className="w-full px-4 py-2 text-left hover:bg-white/10 flex items-start gap-2 text-fg"
                onClick={() => handleSelectResult(result)}
              >
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <span className="text-sm">{result.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div
        ref={mapRef}
        className="relative w-full h-64 rounded-lg overflow-hidden border cursor-crosshair"
        onClick={handleMapClick}
      >
        <iframe
          title="Location Map"
          width="100%"
          height="100%"
          style={{ border: 0, pointerEvents: "none" }}
          loading="lazy"
          src={getMapUrl()}
        />

        {/* Overlay for click detection */}
        <div className="absolute inset-0 bg-transparent" />

        {/* Loading indicator */}
        {isReverseGeocoding && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {/* Instructions */}
        <div className="absolute bottom-2 left-2 right-2 text-center">
          <span className="text-xs bg-white/90 px-2 py-1 rounded shadow">
            Search above or click on the map to set location
          </span>
        </div>
      </div>

      {/* Selected Coordinates Display */}
      {selectedLocation && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>
            Lat: {selectedLocation.lat.toFixed(6)}, Lng:{" "}
            {selectedLocation.lng.toFixed(6)}
          </span>
        </div>
      )}
    </div>
  );
}
