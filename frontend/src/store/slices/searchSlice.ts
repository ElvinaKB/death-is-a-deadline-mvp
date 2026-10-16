import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { format } from "date-fns";

/** A city picked from the search bar's suggestions (drives nearest-first). */
export interface SearchLocation {
  label: string;
  latitude: number;
  longitude: number;
}

interface SearchState {
  searchQuery: string;
  location: SearchLocation | null;
  maxBid: string;
  /** yyyy-MM-dd — matches backend public places `date` query */
  selectedDate: string | null;
  dateOption: "tonight" | "tomorrow" | "custom";
}

const initialState: SearchState = {
  searchQuery: "",
  location: null,
  maxBid: "",
  selectedDate: format(new Date(), "yyyy-MM-dd"),
  dateOption: "tonight",
};

const searchSlice = createSlice({
  name: "search",
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setLocation: (state, action: PayloadAction<SearchLocation | null>) => {
      state.location = action.payload;
    },
    setMaxBid: (state, action: PayloadAction<string>) => {
      state.maxBid = action.payload;
    },
    setSelectedDate: (state, action: PayloadAction<string | null>) => {
      state.selectedDate = action.payload;
    },
    setDateOption: (
      state,
      action: PayloadAction<"tonight" | "tomorrow" | "custom">,
    ) => {
      state.dateOption = action.payload;
    },
    resetSearch: (state) => {
      state.searchQuery = "";
      state.location = null;
      state.maxBid = "";
      state.selectedDate = format(new Date(), "yyyy-MM-dd");
      state.dateOption = "tonight";
    },
  },
});

export const {
  setSearchQuery,
  setLocation,
  setMaxBid,
  setSelectedDate,
  setDateOption,
  resetSearch,
} = searchSlice.actions;

export default searchSlice.reducer;
