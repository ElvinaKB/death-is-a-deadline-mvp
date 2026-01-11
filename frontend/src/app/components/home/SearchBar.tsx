import { useState } from "react";
import { Search, Calendar, DollarSign, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar as CalendarComponent } from "../ui/calendar";

type DateOption = "tonight" | "tomorrow" | "custom";

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  maxBid: string;
  onMaxBidChange: (value: string) => void;
  selectedDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  onSearch: () => void;
}

export function SearchBar({
  searchQuery,
  onSearchChange,
  maxBid,
  onMaxBidChange,
  selectedDate,
  onDateChange,
  onSearch,
}: SearchBarProps) {
  const [dateOption, setDateOption] = useState<DateOption>("tonight");
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSearch();
    }
  };

  const handleDateOptionSelect = (option: DateOption) => {
    setDateOption(option);
    if (option === "tonight") {
      onDateChange(new Date());
      setIsDateOpen(false);
      setShowCalendar(false);
    } else if (option === "tomorrow") {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      onDateChange(tomorrow);
      setIsDateOpen(false);
      setShowCalendar(false);
    } else {
      setShowCalendar(true);
    }
  };

  const handleCustomDateSelect = (date: Date | undefined) => {
    onDateChange(date);
    if (date) {
      setIsDateOpen(false);
      setShowCalendar(false);
    }
  };

  const getDateLabel = () => {
    if (dateOption === "tonight") return "Tonight";
    if (dateOption === "tomorrow") return "Tomorrow";
    if (selectedDate) return format(selectedDate, "MMM d");
    return "Select date";
  };

  return (
    <div className="flex items-center bg-white rounded-full shadow-lg border">
      {/* Location Search */}
      <div className="flex items-center gap-2 px-4 py-3 flex-1 min-w-0">
        <Search className="h-4 w-4 text-gray-400 shrink-0" />
        <input
          type="text"
          placeholder="Los Angeles"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent border-0 outline-none text-sm text-gray-900 placeholder:text-gray-400"
        />
      </div>

      {/* Divider */}
      <div className="h-8 w-px bg-gray-200 shrink-0" />

      {/* Date Picker */}
      <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-2 px-4 py-3 min-w-[120px] hover:bg-gray-50 transition-colors">
            <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="text-sm text-gray-700 whitespace-nowrap">
              {getDateLabel()}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          {!showCalendar ? (
            <div className="py-1">
              <button
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                  dateOption === "tonight" ? "bg-blue-50 text-blue-600" : ""
                }`}
                onClick={() => handleDateOptionSelect("tonight")}
              >
                Tonight
              </button>
              <button
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                  dateOption === "tomorrow" ? "bg-blue-50 text-blue-600" : ""
                }`}
                onClick={() => handleDateOptionSelect("tomorrow")}
              >
                Tomorrow
              </button>
              <button
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                  dateOption === "custom" ? "bg-blue-50 text-blue-600" : ""
                }`}
                onClick={() => handleDateOptionSelect("custom")}
              >
                Custom date...
              </button>
            </div>
          ) : (
            <div className="p-2">
              <button
                className="text-sm text-blue-600 hover:underline mb-2"
                onClick={() => setShowCalendar(false)}
              >
                ← Back
              </button>
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={handleCustomDateSelect}
                disabled={(date) => date < new Date()}
                initialFocus
              />
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Divider */}
      <div className="h-8 w-px bg-gray-200 shrink-0" />

      {/* Max Bid */}
      <div className="flex items-center gap-2 px-4 py-3 min-w-[100px]">
        <DollarSign className="h-4 w-4 text-gray-400 shrink-0" />
        <input
          type="number"
          placeholder="Max Bid"
          value={maxBid}
          onChange={(e) => onMaxBidChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-20 bg-transparent border-0 outline-none text-sm text-gray-900 placeholder:text-gray-400"
        />
      </div>

      {/* Search Button */}
      <Button
        size="icon"
        className="rounded-full bg-blue-600 hover:bg-blue-700 h-10 w-10 shrink-0 mr-1"
        onClick={onSearch}
      >
        <Search className="h-4 w-4" />
      </Button>
    </div>
  );
}
