import { Search } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Slider } from "../ui/slider";
import { ACCOMMODATION_TYPE_LABELS } from "../../../types/place.types";

export type SortOption = "price-asc" | "price-desc";

export interface PlacesFiltersState {
  searchQuery: string;
  selectedType: string;
  priceRange: number[];
  sortBy: SortOption;
}

export interface PriceRangeData {
  minPrice: number;
  maxPrice: number;
}

interface PlacesFiltersProps {
  filters: PlacesFiltersState;
  setFilters: React.Dispatch<React.SetStateAction<PlacesFiltersState>>;
  resultsCount: number;
  priceRangeData?: PriceRangeData;
}

export function PlacesFilters({
  filters,
  setFilters,
  resultsCount,
  priceRangeData,
}: PlacesFiltersProps) {
  const { searchQuery, selectedType, priceRange, sortBy } = filters;

  const minPrice = 0;
  const maxPrice = priceRangeData?.maxPrice ?? 1000;

  const updateFilter = <K extends keyof PlacesFiltersState>(
    key: K,
    value: PlacesFiltersState[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      searchQuery: "",
      selectedType: "all",
      priceRange: [0, 0],
      sortBy: "price-asc",
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 mb-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="lg:col-span-2">
          <label className="text-sm font-medium mb-2 block">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by place name, city, or country..."
              value={searchQuery}
              onChange={(e) => updateFilter("searchQuery", e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Accommodation Type */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Accommodation Type
          </label>
          <Select
            value={selectedType}
            onValueChange={(v) => updateFilter("selectedType", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(ACCOMMODATION_TYPE_LABELS).map(
                ([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Sort */}
        <div>
          <label className="text-sm font-medium mb-2 block">Sort By</label>
          <Select
            value={sortBy}
            onValueChange={(v) => updateFilter("sortBy", v as SortOption)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Price Range */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          Price Range: ${priceRange[0] || minPrice} - $
          {priceRange[1] || maxPrice} per night
        </label>
        <Slider
          min={minPrice}
          max={maxPrice}
          step={5}
          value={[priceRange[0] || minPrice, priceRange[1] || maxPrice]}
          onValueChange={(v) => updateFilter("priceRange", v)}
          className="mt-2"
        />
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <p className="text-sm text-muted-foreground">
          {resultsCount} place{resultsCount !== 1 ? "s" : ""} found
        </p>
        <Button variant="outline" size="sm" onClick={clearFilters}>
          Clear Filters
        </Button>
      </div>
    </div>
  );
}
